"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { BrowserWallet } from '@meshsdk/core';

// Cardano wallet API types (kept for compatibility)
interface CardanoWalletAPI {
  enable(): Promise<any>;
  isEnabled(): Promise<boolean>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<number>;
  signData(address: string, payload: string): Promise<any>;
}

interface CardanoWindow {
  cardano?: {
    nami?: CardanoWalletAPI;
    eternl?: CardanoWalletAPI;
    flint?: CardanoWalletAPI;
    yoroi?: CardanoWalletAPI;
    lace?: CardanoWalletAPI;
    typhon?: CardanoWalletAPI;
    [key: string]: CardanoWalletAPI | undefined;
  };
}

interface WalletState {
  address: string | null;
  stakingAddress: string | null;
  walletType: string | null;
  isConnected: boolean;
  isRegistered: boolean;
  isVerified: boolean;
  reputationId: string | null;
  isLoading: boolean;
  error: string | null;
  availableWallets: string[];
}

interface WalletContextType extends WalletState {
  connectWallet: (walletType: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  checkWalletStatus: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const SUPPORTED_WALLETS = ['nami', 'eternl', 'flint', 'yoroi', 'lace', 'typhon'];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    stakingAddress: null,
    walletType: null,
    isConnected: false,
    isRegistered: false,
    isVerified: false,
    reputationId: null,
    isLoading: false,
    error: null,
    availableWallets: [],
  });

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      if (typeof window === 'undefined') return SUPPORTED_WALLETS;
      
      const cardano = (window as unknown as CardanoWindow).cardano;
      if (!cardano) return SUPPORTED_WALLETS;

      // Return all wallets, user will see error if they try to connect one not installed
      return SUPPORTED_WALLETS;
    };

    setState(prev => ({ ...prev, availableWallets: detectWallets() }));

    // Check for previously connected wallet
    const savedWallet = localStorage.getItem('cardano_wallet_connected');
    if (savedWallet) {
      try {
        const { walletType, timestamp } = JSON.parse(savedWallet);
        // Auto-reconnect if connected within last 7 days
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          connectWallet(walletType);
        }
      } catch (e) {
        console.error('Failed to parse saved wallet data:', e);
      }
    }
  }, []);

  const convertHexToBech32 = async (hexAddress: string): Promise<string> => {
    try {
      // Dynamically import the Cardano library only when needed (client-side only)
      const { Address } = await import('@emurgo/cardano-serialization-lib-browser');
      const addressBytes = Buffer.from(hexAddress, 'hex');
      const address = Address.from_bytes(addressBytes);
      return address.to_bech32();
    } catch (error) {
      console.error('Failed to convert address:', error);
      throw new Error('Invalid address format');
    }
  };

  const connectWallet = async (walletType: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window is not available');
      }

      // Use Mesh SDK for better wallet compatibility
      const wallet = await BrowserWallet.enable(walletType);
      
      // Get address using Mesh SDK (handles all wallet variations)
      const usedAddresses = await wallet.getUsedAddresses();
      const unusedAddresses = await wallet.getUnusedAddresses();
      const changeAddress = await wallet.getChangeAddress();
      
      // Try multiple address sources
      let address = '';
      if (usedAddresses && usedAddresses.length > 0) {
        address = usedAddresses[0];
      } else if (changeAddress) {
        address = changeAddress;
      } else if (unusedAddresses && unusedAddresses.length > 0) {
        address = unusedAddresses[0];
      } else {
        throw new Error('No addresses found in wallet. Please create an address first.');
      }
      
      // Get staking address (optional)
      let stakingAddress = null;
      try {
        const rewardAddresses = await wallet.getRewardAddresses();
        if (rewardAddresses && rewardAddresses.length > 0) {
          stakingAddress = rewardAddresses[0];
        }
      } catch (e) {
        // Staking address is optional
        console.log('No staking address available');
      }

      // Check network
      const networkId = await wallet.getNetworkId();
      if (networkId !== 0) { // 0 = Preprod, 1 = Mainnet
        console.warn(`Wallet is on network ${networkId}. Expected Preprod (0).`);
      }

      // Register wallet with backend
      try {
        const response = await api.post('/cardano/wallet/register', {
          address,
          stakingAddress,
          walletType
        });

        setState(prev => ({
          ...prev,
          address,
          stakingAddress,
          walletType,
          isConnected: true,
          isRegistered: true,
          isVerified: response.data.wallet?.verified || false,
          reputationId: response.data.wallet?.reputationId || null,
          isLoading: false,
          error: null
        }));

        // Save to localStorage
        localStorage.setItem('cardano_wallet_connected', JSON.stringify({
          walletType,
          timestamp: Date.now()
        }));

      } catch (registerError: any) {
        // Wallet connected but registration failed
        console.error('Failed to register wallet:', registerError);
        
        setState(prev => ({
          ...prev,
          address,
          stakingAddress,
          walletType,
          isConnected: true,
          isRegistered: false,
          isLoading: false,
          error: registerError.response?.data?.error || 'Failed to register wallet with backend'
        }));
      }

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect wallet'
      }));
      
      // Auto-dismiss error after 8 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 8000);
    }
  };

  const disconnectWallet = async () => {
    try {
      // Optional: Notify backend about disconnection
      if (state.isRegistered) {
        await api.delete('/cardano/wallet');
      }
    } catch (error) {
      console.error('Failed to disconnect from backend:', error);
    } finally {
      // Clear local state
      setState({
        address: null,
        stakingAddress: null,
        walletType: null,
        isConnected: false,
        isRegistered: false,
        isVerified: false,
        reputationId: null,
        isLoading: false,
        error: null,
        availableWallets: state.availableWallets
      });

      // Clear localStorage
      localStorage.removeItem('cardano_wallet_connected');
    }
  };

  const checkWalletStatus = async () => {
    if (!state.isConnected) return;

    try {
      const response = await api.get('/cardano/wallet/me');
      setState(prev => ({
        ...prev,
        isRegistered: true,
        isVerified: response.data.wallet?.verified || false,
        reputationId: response.data.wallet?.reputationId || null
      }));
    } catch (error) {
      console.error('Failed to check wallet status:', error);
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const value: WalletContextType = {
    ...state,
    connectWallet,
    disconnectWallet,
    checkWalletStatus,
    clearError
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
