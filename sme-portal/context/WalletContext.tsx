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
  verifyWalletOwnership: (signatureData: { signature: string; key: string; message: string }) => Promise<void>;
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
    const savedWallet = localStorage.getItem('sme_cardano_wallet_connected');
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
        localStorage.setItem('sme_cardano_wallet_connected', JSON.stringify({
          walletType,
          timestamp: Date.now()
        }));

      } catch (registerError: any) {
        // Wallet connected but registration failed
        console.error('Failed to register wallet:', registerError);
        
        // If wallet already registered, fetch its status
        if (registerError.response?.data?.error?.includes('already registered')) {
          try {
            const statusResponse = await api.get('/cardano/wallet/me');
            setState(prev => ({
              ...prev,
              address,
              stakingAddress,
              walletType,
              isConnected: true,
              isRegistered: true,
              isVerified: statusResponse.data.wallet?.verified || false,
              reputationId: statusResponse.data.wallet?.reputationId || null,
              isLoading: false,
              error: null
            }));

            // Save to localStorage
            localStorage.setItem('sme_cardano_wallet_connected', JSON.stringify({
              walletType,
              timestamp: Date.now()
            }));
          } catch (statusError) {
            console.error('Failed to fetch wallet status:', statusError);
            setState(prev => ({
              ...prev,
              address,
              stakingAddress,
              walletType,
              isConnected: true,
              isRegistered: false,
              isLoading: false,
              error: 'Failed to fetch wallet status. Please refresh the page.'
            }));
          }
        } else {
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
      // NOTE: We don't delete the wallet from the backend database
      // The wallet registration and verification should persist
      // Only clear the frontend state and localStorage
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
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
      localStorage.removeItem('sme_cardano_wallet_connected');
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

  const verifyWalletOwnership = async (signatureData: { signature: string; key: string; message: string }) => {
    try {
      const response = await api.post('/cardano/wallet/verify', {
        signature: signatureData.signature,
        publicKey: signatureData.key,
        message: signatureData.message
      });
      setState(prev => ({
        ...prev,
        isVerified: true
      }));
      return response.data;
    } catch (error: any) {
      console.error('Failed to verify wallet:', error);
      throw error;
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Auto-reconnect on mount
  useEffect(() => {
    const reconnectWallet = async () => {
      const savedConnection = localStorage.getItem('sme_cardano_wallet_connected');
      if (!savedConnection) return;

      try {
        const { walletType, timestamp } = JSON.parse(savedConnection);
        
        // Check if saved connection is less than 24 hours old
        const hoursSinceConnection = (Date.now() - timestamp) / (1000 * 60 * 60);
        if (hoursSinceConnection > 24) {
          localStorage.removeItem('sme_cardano_wallet_connected');
          return;
        }

        // Check if wallet is still available
        if (typeof window !== 'undefined' && window.cardano?.[walletType]) {
          // Reconnect silently
          await connectWallet(walletType);
        }
      } catch (error) {
        console.error('Failed to auto-reconnect wallet:', error);
        localStorage.removeItem('sme_cardano_wallet_connected');
      }
    };

    reconnectWallet();
  }, []);

  const value: WalletContextType = {
    ...state,
    connectWallet,
    disconnectWallet,
    checkWalletStatus,
    clearError,
    verifyWalletOwnership
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
