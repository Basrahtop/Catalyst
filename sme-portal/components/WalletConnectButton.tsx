"use client";
// SME Wallet connection component with all 6 supported Cardano wallets
import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Wallet, ChevronDown, Check, ExternalLink, Copy, LogOut, Loader2, X, Shield } from 'lucide-react';

export default function WalletConnectButton() {
  const {
    address,
    walletType,
    isConnected,
    isVerified,
    isLoading,
    error,
    availableWallets,
    connectWallet,
    disconnectWallet,
    clearError
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 9)}...${addr.slice(-6)}`;
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const openExplorer = () => {
    if (!address) return;
    // Preprod testnet explorer
    window.open(`https://preprod.cardanoscan.io/address/${address}`, '_blank');
  };

  const getWalletIcon = (wallet: string) => {
    // Using wallet brand colors and proper logos
    const icons: Record<string, { icon: string; color: string }> = {
      nami: { icon: '🌊', color: '#35A7FF' },
      eternl: { icon: '♾️', color: '#8B5CF6' },
      flint: { icon: '🔥', color: '#F97316' },
      yoroi: { icon: '🦋', color: '#1D4ED8' },
      lace: { icon: '🎴', color: '#EC4899' },
      typhon: { icon: '🌀', color: '#06B6D4' }
    };
    return icons[wallet] || { icon: '💳', color: '#6B7280' };
  };

  const getWalletName = (wallet: string) => {
    return wallet.charAt(0).toUpperCase() + wallet.slice(1);
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="hidden sm:inline">Connecting...</span>
      </button>
    );
  }

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
        >
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select Wallet
                </div>
                {availableWallets.map(wallet => (
                  <button
                    key={wallet}
                    onClick={() => {
                      connectWallet(wallet);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-2xl">{getWalletIcon(wallet).icon}</span>
                    <span className="text-sm font-medium text-gray-700">{getWalletName(wallet)}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="absolute right-0 mt-2 w-72 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg z-20">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-red-800 flex-1">{error}</p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg transition-colors text-sm ${
          isVerified 
            ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' 
            : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {isVerified && <Shield className="w-4 h-4 text-green-600" />}
          <span className="text-lg">{getWalletIcon(walletType || '').icon}</span>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-medium">{getWalletName(walletType || '')}</span>
            <span className={`text-xs font-mono ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {truncateAddress(address || '')}
            </span>
          </div>
          <span className="sm:hidden text-xs font-mono">{truncateAddress(address || '')}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Connected Wallet
                </p>
                <p className="text-sm font-medium text-gray-700">{getWalletName(walletType || '')}</p>
                <p className="text-xs text-gray-500 font-mono mt-1 break-all">{address}</p>
                {isVerified ? (
                  <div className="flex items-center gap-1 mt-2 text-green-600">
                    <Shield className="w-3 h-3" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-yellow-600">
                    <Shield className="w-3 h-3" />
                    <span className="text-xs font-medium">Not Verified</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  copyAddress();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-left"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Copy Address</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  openExplorer();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-left"
              >
                <ExternalLink className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">View on Explorer</span>
              </button>

              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={() => {
                    disconnectWallet();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-50 transition-colors text-left text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
