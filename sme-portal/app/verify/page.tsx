'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, CheckCircle, AlertCircle, Search, ExternalLink, ArrowLeft } from 'lucide-react';

interface VerificationResult {
  businessName: string;
  reputationId: string;
  verified: boolean;
  reputation: {
    overallScore: number;
    marketplaceScore: number;
    feedbackScore: number;
    platformTrustScore: number;
    financialScore: number;
    lastUpdated: string;
    txHash: string;
    utxoRef: string;
    explorerUrl: string;
  };
  blockchainVerification: {
    verified: boolean;
    message: string;
    onChainData?: any;
  };
}

export default function VerifyReputationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchType, setSearchType] = useState<'reputationId' | 'txHash'>('txHash');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');

  // Pre-fill from URL params
  useEffect(() => {
    const txParam = searchParams.get('tx');
    const repIdParam = searchParams.get('repId');
    
    if (txParam) {
      setSearchType('txHash');
      setSearchValue(txParam);
    } else if (repIdParam) {
      setSearchType('reputationId');
      setSearchValue(repIdParam);
    }
  }, [searchParams]);

  const handleVerify = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a value to verify');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const endpoint = searchType === 'txHash' 
        ? `/api/reputation/verify-tx/${searchValue}`
        : `/api/reputation/verify/${searchValue}`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${endpoint}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify reputation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verify SME Reputation on Blockchain
          </h1>
          <p className="text-gray-600">
            Independently verify any SME's reputation data stored on Cardano blockchain
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By:
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setSearchType('txHash')}
                className={`px-4 py-2 rounded-lg border ${
                  searchType === 'txHash'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                }`}
              >
                Transaction Hash (easiest)
              </button>
              <button
                onClick={() => setSearchType('reputationId')}
                className={`px-4 py-2 rounded-lg border ${
                  searchType === 'reputationId'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                }`}
              >
                Reputation ID
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'txHash' ? 'Transaction Hash' : 'Reputation ID'}
            </label>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                searchType === 'txHash'
                  ? 'e.g., 100b947c586a336a49e274c163839d5ab573b0b6f2711313d1369c68fbf814bf'
                  : 'e.g., 85516e0a1153d1239ab442230e6a435d67b2967f1026c0d646d8cbfe07ac6246'
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Verify Reputation
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-red-700">{error}</div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Business Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Business Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Business Name</div>
                  <div className="font-semibold text-gray-900">{result.businessName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Wallet Status</div>
                  <div className="flex items-center gap-2">
                    {result.verified ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-600 font-semibold">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-yellow-600 font-semibold">Not Verified</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain Verification Status */}
            <div className={`rounded-lg shadow-md p-6 ${
              result.blockchainVerification.verified
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-yellow-50 border-2 border-yellow-500'
            }`}>
              <div className="flex items-start gap-3 mb-4">
                {result.blockchainVerification.verified ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {result.blockchainVerification.verified 
                      ? '✓ Verified on Blockchain' 
                      : 'Blockchain Verification Pending'}
                  </h3>
                  <p className="text-gray-700">{result.blockchainVerification.message}</p>
                </div>
              </div>
            </div>

            {/* Reputation Scores */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reputation Scores</h2>
              <div className="grid grid-cols-2 gap-4">
                <ScoreCard label="Overall Score" score={result.reputation.overallScore} max={1000} />
                <ScoreCard label="Marketplace Score" score={result.reputation.marketplaceScore} max={300} />
                <ScoreCard label="Feedback Score" score={result.reputation.feedbackScore} max={350} />
                <ScoreCard label="Platform Trust" score={result.reputation.platformTrustScore} max={150} />
                <ScoreCard label="Financial Score" score={result.reputation.financialScore} max={200} />
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Last Updated: {new Date(result.reputation.lastUpdated).toLocaleString()}
              </div>
            </div>

            {/* On-Chain Data */}
            {result.blockchainVerification.onChainData && (
              <div className="bg-blue-50 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  On-Chain Data (Decoded from Blockchain)
                </h2>
                <pre className="bg-white p-4 rounded border overflow-x-auto text-xs">
                  {JSON.stringify(result.blockchainVerification.onChainData, null, 2)}
                </pre>
              </div>
            )}

            {/* Links */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Verification Links</h2>
              <div className="space-y-3">
                <a
                  href={result.reputation.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Cardanoscan Explorer
                </a>
                <div className="text-sm text-gray-600">
                  <div className="font-semibold">Transaction Hash:</div>
                  <code className="block mt-1 p-2 bg-gray-50 rounded text-xs break-all">
                    {result.reputation.txHash}
                  </code>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="font-semibold">UTxO Reference:</div>
                  <code className="block mt-1 p-2 bg-gray-50 rounded text-xs break-all">
                    {result.reputation.utxoRef}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = (score / max) * 100;
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mb-2">
        {score} / {max}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
