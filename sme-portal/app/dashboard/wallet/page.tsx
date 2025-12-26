"use client";
import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import WalletVerificationBadge from '@/components/WalletVerificationBadge';
import { Shield, AlertCircle, CheckCircle, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

export default function WalletPage() {
  const { 
    address,
    stakingAddress,
    walletType,
    isConnected,
    isRegistered,
    isVerified, 
    reputationId,
    verifyWalletOwnership,
    checkWalletStatus
  } = useWallet();

  // Fetch wallet status when page loads and wallet is connected
  useEffect(() => {
    if (isConnected && isRegistered) {
      checkWalletStatus();
    }
  }, [isConnected, isRegistered]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegisterWallet = async () => {
    if (!isConnected || !address) {
      setRegistrationError('Please connect your wallet first');
      return;
    }

    setIsRegistering(true);
    setRegistrationError(null);

    try {
      await api.post('/cardano/wallet/register', {
        address,
        stakingAddress,
        walletType
      });
      
      // Refresh wallet status
      await checkWalletStatus();
      
      setVerificationMessage('✅ Wallet registered successfully! You can now verify ownership.');
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegistrationError(error.response?.data?.error || 'Failed to register wallet. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifyWallet = async () => {
    if (!isConnected || !address) {
      setVerificationError('Please connect your wallet first');
      return;
    }

    if (!isRegistered) {
      setVerificationError('Please register your wallet first');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationMessage(null);

    try {
      // Create challenge message
      const timestamp = Date.now();
      const plainMessage = `Verify wallet ownership for Catalyst SME Portal\nAddress: ${address}\nTimestamp: ${timestamp}`;
      
      // Request signature from wallet using CIP-30 API directly
      setVerificationMessage('⏳ Please sign the message in your wallet...');
      
      // Get the wallet API from window.cardano
      const walletApi = window.cardano?.[walletType || 'eternl'];
      if (!walletApi) {
        throw new Error('Wallet not found');
      }
      
      // Enable the wallet
      const api = await walletApi.enable();
      
      // Convert message to hex
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(plainMessage);
      const payload = Array.from(messageBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Get used addresses
      const usedAddresses = await api.getUsedAddresses();
      let addressToUse = usedAddresses[0];
      
      // If no used addresses, try getting unused addresses or change address
      if (!addressToUse) {
        const unusedAddresses = await api.getUnusedAddresses();
        if (unusedAddresses && unusedAddresses.length > 0) {
          addressToUse = unusedAddresses[0];
        } else {
          // Fall back to change address
          addressToUse = await api.getChangeAddress();
        }
      }
      
      if (!addressToUse) {
        throw new Error('Could not retrieve wallet address');
      }
      
      // Sign the data using CIP-30 signData
      const signature = await api.signData(addressToUse, payload);
      
      // Send signature to backend for verification
      await verifyWalletOwnership({
        signature: signature.signature,
        key: signature.key,
        message: plainMessage
      });
      
      setVerificationMessage('✅ Wallet verified successfully! Your reputation is now on the blockchain.');
      
      // Refresh wallet status
      await checkWalletStatus();
    } catch (error: any) {
      console.error('Verification error:', error);
      
      if (error.message?.includes('User declined')) {
        setVerificationError('Signature request was declined. Please try again.');
      } else {
        setVerificationError(error.response?.data?.error || 'Failed to verify wallet. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const copyReputationId = async () => {
    if (!reputationId) return;
    try {
      await navigator.clipboard.writeText(reputationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
        <p className="text-gray-600 mt-1">
          Connect and verify your Cardano wallet to activate blockchain reputation tracking
        </p>
      </div>

      {/* Wallet Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Status</h2>
        
        <WalletVerificationBadge showDetails={false} size="large" />

        {!isConnected && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-2">Connect Your Wallet First</p>
                <p className="text-sm text-blue-800">
                  Click the "Connect Wallet" button in the top-right corner of the page to link your Cardano wallet. 
                  Your wallet will be automatically registered with your SME account.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <span>👆</span>
              <span className="font-medium">Look for the wallet button next to the "Log Out" button</span>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="mt-6 space-y-4">
            {!isRegistered && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900 mb-2">Wallet Not Registered</p>
                    <p className="text-sm text-yellow-800 mb-3">
                      Your wallet connection was successful, but registration with the backend failed. 
                      Click below to retry registration.
                    </p>
                    {registrationError && (
                      <p className="text-sm text-red-600 mb-3">{registrationError}</p>
                    )}
                    <button
                      onClick={handleRegisterWallet}
                      disabled={isRegistering}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:bg-yellow-400 disabled:cursor-not-allowed"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Registering...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>Register Wallet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Connected Address</p>
                <p className="font-mono text-sm text-gray-900 mt-1 break-all">{address}</p>
              </div>
              <button
                onClick={() => window.open(`https://preprod.cardanoscan.io/address/${address}`, '_blank')}
                className="text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>

            {reputationId && (
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-1">
                  <p className="text-sm text-green-800 font-medium">Reputation ID</p>
                  <p className="font-mono text-sm text-green-900 mt-1 break-all">{reputationId}</p>
                  <p className="text-xs text-green-700 mt-2">
                    This ID is used on-chain instead of your wallet address for privacy
                  </p>
                </div>
                <button
                  onClick={copyReputationId}
                  className="ml-4 text-green-600 hover:text-green-800"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verification Section */}
      {isConnected && isRegistered && !isVerified && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Verify Wallet Ownership</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Why verify your wallet?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your reputation scores will be recorded on the Cardano blockchain</li>
                  <li>Investors can verify your performance history is authentic</li>
                  <li>Your reputationId (not your wallet address) is used for privacy</li>
                  <li>You can replace your wallet up to 2 times if you lose access</li>
                </ul>
              </div>
            </div>
          </div>

          {verificationMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{verificationMessage}</p>
              </div>
            </div>
          )}

          {verificationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{verificationError}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleVerifyWallet}
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {verificationMessage?.includes('sign the message') 
                    ? 'Waiting for signature...' 
                    : 'Verifying...'}
                </span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Sign Message to Verify Wallet</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            You'll be prompted to sign a message in your wallet. This proves you own the wallet without exposing your private keys.
          </p>
        </div>
      )}

      {/* Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Connect Your Wallet</p>
              <p className="text-sm text-gray-600 mt-1">
                Link your Cardano wallet (Nami, Eternl, Lace, etc.) to your SME account
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Verify Ownership</p>
              <p className="text-sm text-gray-600 mt-1">
                Sign a message with your wallet to prove you own it
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Blockchain Reputation</p>
              <p className="text-sm text-gray-600 mt-1">
                Your reputation scores are recorded on Cardano blockchain using your private reputationId
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <p className="font-medium text-gray-900">Investor Trust</p>
              <p className="text-sm text-gray-600 mt-1">
                Investors can verify your reputation is authentic and backed by blockchain
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
