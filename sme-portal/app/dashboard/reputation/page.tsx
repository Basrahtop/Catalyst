"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle, AlertCircle, ExternalLink, Loader2, Upload, Clock, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { useWallet } from '@/context/WalletContext';

interface OnChainRecord {
  timestamp: string;
  overallScore: number;
  marketplaceScore: number;
  feedbackScore: number;
  platformTrustScore: number;
  financialScore: number;
  txHash: string;
  explorerUrl: string;
}

export default function ReputationOnChainPage() {
  const router = useRouter();
  const { isConnected, isVerified, reputationId } = useWallet();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  
  const [history, setHistory] = useState<OnChainRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load on-chain history
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get('/reputation/onchain-history');
      setHistory(response.data.history);
    } catch (error: any) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmitToBlockchain = async () => {
    if (!isConnected || !isVerified) {
      setSubmitError('Please connect and verify your wallet first');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setTxHash(null);

    try {
      const response = await api.post('/reputation/submit-onchain');
      
      setSubmitSuccess(true);
      setTxHash(response.data.txHash);
      setExplorerUrl(response.data.explorerUrl);
      
      // Reload history
      await loadHistory();
      
    } catch (error: any) {
      console.error('Failed to submit reputation:', error);
      setSubmitError(error.response?.data?.error || 'Failed to submit reputation to blockchain');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Blockchain Reputation
          </h1>
          <p className="text-gray-600">
            Record your reputation on the Cardano blockchain for permanent, tamper-proof verification
          </p>
        </div>

        {/* Wallet Status Warning */}
        {(!isConnected || !isVerified) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-yellow-900">Wallet Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You must connect and verify your Cardano wallet before submitting reputation to the blockchain.
                </p>
                <button
                  onClick={() => router.push('/dashboard/wallet')}
                  className="mt-3 text-sm font-medium text-yellow-600 hover:text-yellow-700"
                >
                  Go to Wallet Management →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Submit Current Reputation
              </h2>
              <p className="text-sm text-gray-600">
                Create a permanent, verifiable record of your current reputation scores on the Cardano blockchain
              </p>
            </div>
            <Shield className="h-8 w-8 text-blue-600" />
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-sm text-gray-900">Tamper-Proof</p>
                <p className="text-xs text-gray-600">Cannot be altered or deleted</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-sm text-gray-900">Privacy Protected</p>
                <p className="text-xs text-gray-600">Uses anonymous Reputation ID</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-sm text-gray-900">Investor Verified</p>
                <p className="text-xs text-gray-600">Investors can verify authenticity</p>
              </div>
            </div>
          </div>

          {submitSuccess && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-900">Successfully Recorded on Blockchain!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your reputation has been permanently recorded on the Cardano blockchain.
                  </p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-sm font-medium text-green-600 hover:text-green-700"
                    >
                      View on Blockchain Explorer
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-red-900">Submission Failed</h3>
                  <p className="text-sm text-red-700 mt-1">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmitToBlockchain}
            disabled={isSubmitting || !isConnected || !isVerified}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Submitting to Blockchain...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Record Reputation on Blockchain
              </>
            )}
          </button>
        </div>

        {/* On-Chain History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Blockchain History</h2>
            <TrendingUp className="h-6 w-6 text-gray-400" />
          </div>

          {isLoadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading blockchain records...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium">No Blockchain Records Yet</p>
              <p className="text-sm mt-1">Submit your reputation to create your first on-chain record</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 text-green-600 mr-2" />
                        <span className="font-medium text-gray-900">
                          Overall Score: {record.overallScore}/1000
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={record.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      View TX
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Marketplace</p>
                      <p className="font-medium text-gray-900">{record.marketplaceScore}/300</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Feedback</p>
                      <p className="font-medium text-gray-900">{record.feedbackScore}/350</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Trust</p>
                      <p className="font-medium text-gray-900">{record.platformTrustScore}/150</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Financial</p>
                      <p className="font-medium text-gray-900">{record.financialScore}/200</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-mono truncate">
                      TX: {record.txHash}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How It Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Your current reputation scores are packaged into a cryptographic transaction</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>The transaction is submitted to the Cardano blockchain (preprod testnet)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Once confirmed, the record is permanent and cannot be altered</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4.</span>
              <span>Investors can verify your reputation using your Reputation ID</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
