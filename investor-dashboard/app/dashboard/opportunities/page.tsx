'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ChevronRight, TrendingUp, Clock, Shield, CheckCircle2, ExternalLink } from 'lucide-react';
import BlockchainVerificationBadge from '@/components/BlockchainVerificationBadge';

interface SME {
  id: string;
  businessName: string;
  marketplaceScore: number;
  feedbackScore: number;
  user: {
    platformTrustScore: number;
    financialScore: number;
    cardanoWallet?: {
      reputationId: string;
      verified: boolean;
      address: string;
    };
  };
  blockchainReputation?: {
    verified: boolean;
    txHash?: string;
    utxoRef?: string;
    timestamp?: string;
    scores?: {
      overall: number;
      marketplace: number;
      feedback: number;
      trust: number;
      financial: number;
    };
    message?: string;
  };
}

interface FundingRequest {
  id: string;
  amount: number;
  amountFunded: number;
  purpose: string;
  profitSharePercentage: number;
  termInMonths: number;
  repaymentFrequency: string;
  status: string;
  createdAt: string;
  sme: SME;
  investments?: Array<{
    amount: number;
    investorId: string;
    createdAt: string;
  }>;
}

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<FundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchOpportunities = async () => {
      try {
        const response = await api.get('/funding-requests');
        setOpportunities(response.data);
      } catch (err: any) {
        console.error('Error fetching opportunities:', err);
        setError(err.response?.data?.error || 'Failed to load opportunities');
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [user, router]);

  const formatAmount = (amountInKobo: number) => {
    return `₦${(amountInKobo / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculateOverallScore = (sme: SME) => {
    // Sum all 4 components (out of 1000 total: 300 + 350 + 150 + 200)
    return (
      (sme.marketplaceScore || 0) +
      (sme.feedbackScore || 0) +
      (sme.user.platformTrustScore || 0) +
      (sme.user.financialScore || 0)
    );
  };

  const getScoreColor = (score: number) => {
    // Use consistent blue color for all scores
    return 'text-blue-600';
  };

  const formatRepaymentFrequency = (frequency: string) => {
    return frequency.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Investment Opportunities</h1>
          <p className="text-gray-600 mt-2">
            Review pending funding requests from verified SMEs
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Opportunities Grid */}
        {opportunities.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Opportunities Available
            </h2>
            <p className="text-gray-600">
              There are currently no pending funding requests. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {opportunities
              .filter((opportunity) => {
                // Filter out fully funded requests
                return opportunity.amountFunded < opportunity.amount;
              })
              .map((opportunity) => {
              // Always use current calculated score (not blockchain historical)
              const overallScore = calculateOverallScore(opportunity.sme);
              const fundingProgress = (opportunity.amountFunded / opportunity.amount) * 100;
              const remainingAmount = opportunity.amount - opportunity.amountFunded;
              const isPartiallyFunded = opportunity.status === 'PARTIALLY_FUNDED';
              
              return (
                <div
                  key={opportunity.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200"
                >
                  {/* SME Name & Score */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {opportunity.sme.businessName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Requested {new Date(opportunity.createdAt).toLocaleDateString('en-NG')}
                      </p>
                      
                      {/* Blockchain Verification Badge */}
                      {opportunity.sme.blockchainReputation?.verified ? (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">
                              Blockchain Verified
                            </span>
                          </div>
                          <a
                            href={`https://preprod.cardanoscan.io/transaction/${opportunity.sme.blockchainReputation.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Not on Blockchain
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {isPartiallyFunded && (
                        <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          PARTIALLY FUNDED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                        {overallScore}
                      </span>
                    </div>
                  </div>

                  {/* Amount & Purpose */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatAmount(opportunity.amount)}
                      </span>
                    </div>
                    
                    {/* Funding Progress Bar */}
                    {isPartiallyFunded && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {formatAmount(opportunity.amountFunded)} funded
                          </span>
                          <span className="font-semibold text-blue-600">
                            {fundingProgress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${fundingProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-sm font-semibold text-blue-700 mt-1">
                          {formatAmount(remainingAmount)} remaining
                        </p>
                      </div>
                    )}
                    
                    <p className="text-gray-700 line-clamp-2">
                      {opportunity.purpose}
                    </p>
                  </div>

                  {/* Investment Terms */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Profit Share</p>
                        <p className="font-semibold text-gray-900">
                          {opportunity.profitSharePercentage}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Term</p>
                        <p className="font-semibold text-gray-900">
                          {opportunity.termInMonths} months
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Repayment Frequency */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Repayment Schedule</p>
                    <p className="font-medium text-gray-900">
                      {formatRepaymentFrequency(opportunity.repaymentFrequency)}
                    </p>
                  </div>

                  {/* Score Breakdown */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Score Breakdown:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Marketplace:</span>{' '}
                        <span className="font-semibold text-gray-900">{opportunity.sme.marketplaceScore || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Feedback:</span>{' '}
                        <span className="font-semibold text-gray-900">{opportunity.sme.feedbackScore || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trust:</span>{' '}
                        <span className="font-semibold text-gray-900">{opportunity.sme.user.platformTrustScore || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Financial:</span>{' '}
                        <span className="font-semibold text-gray-900">{opportunity.sme.user.financialScore || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => router.push(`/dashboard/opportunities/${opportunity.id}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    View Full Details
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
