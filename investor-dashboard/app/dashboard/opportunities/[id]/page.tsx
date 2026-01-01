'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  ChevronLeft, 
  TrendingUp, 
  Clock, 
  Shield, 
  Building2, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface SME {
  id: string;
  businessName: string;
  marketplaceScore: number;
  feedbackScore: number;
  user: {
    email: string;
    phone: string | null;
    platformTrustScore: number;
    financialScore: number;
    firstName: string | null;
    lastName: string | null;
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

interface PaymentScheduleItem {
  month: number;
  dueDate: string;
  type: string;
  description: string;
}

export default function OpportunityDetailPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [opportunity, setOpportunity] = useState<FundingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchOpportunityDetail = async () => {
      try {
        // Fetch all requests and find the specific one
        const response = await api.get('/funding-requests');
        const requests = response.data;
        const foundRequest = requests.find((r: FundingRequest) => r.id === requestId);
        
        if (!foundRequest) {
          setError('Opportunity not found');
        } else {
          setOpportunity(foundRequest);
          // Set default funding amount to remaining amount
          const remainingAmount = foundRequest.amount - foundRequest.amountFunded;
          setFundingAmount((remainingAmount / 100).toString());
        }
      } catch (err: any) {
        console.error('Error fetching opportunity:', err);
        setError(err.response?.data?.error || 'Failed to load opportunity');
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunityDetail();
  }, [user, router, requestId]);

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

  const generatePaymentSchedule = (): PaymentScheduleItem[] => {
    if (!opportunity) return [];

    const schedule: PaymentScheduleItem[] = [];
    const startDate = new Date();

    if (opportunity.repaymentFrequency === 'END_OF_TERM_LUMP_SUM') {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + opportunity.termInMonths);
      
      schedule.push({
        month: opportunity.termInMonths,
        dueDate: dueDate.toLocaleDateString('en-NG'),
        type: 'FINAL_PAYMENT',
        description: 'Principal + Total Profit Share (Lump Sum)'
      });
    } else {
      // Monthly profit share
      for (let i = 1; i <= opportunity.termInMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const isFinalPayment = i === opportunity.termInMonths;
        
        schedule.push({
          month: i,
          dueDate: dueDate.toLocaleDateString('en-NG'),
          type: isFinalPayment ? 'FINAL_PAYMENT' : 'PROFIT_SHARE',
          description: isFinalPayment 
            ? 'Principal + Profit Share' 
            : 'Monthly Profit Share Only'
        });
      }
    }

    return schedule;
  };

  const handleApprove = async () => {
    if (!fundingAmount || parseFloat(fundingAmount) <= 0) {
      setActionError('Please enter a valid funding amount');
      return;
    }

    const fundingAmountInKobo = Math.round(parseFloat(fundingAmount) * 100);
    const requestedAmountInKobo = opportunity?.amount || 0;
    const remainingAmountInKobo = requestedAmountInKobo - (opportunity?.amountFunded || 0);

    if (fundingAmountInKobo > remainingAmountInKobo) {
      setActionError(`Funding amount cannot exceed remaining balance of ${formatAmount(remainingAmountInKobo)}`);
      return;
    }

    if (!user?.wallet || user.wallet.balance < fundingAmountInKobo) {
      setActionError('Insufficient wallet balance');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await api.patch(`/funding-requests/${requestId}/approve`, {
        fundingAmount: fundingAmountInKobo
      });
      
      // Refresh user wallet balance
      await refreshUser();
      
      alert('Investment approved successfully!');
      router.push('/dashboard/opportunities');
    } catch (err: any) {
      console.error('Error approving request:', err);
      setActionError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setActionError('Please provide a reason for declining');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await api.patch(`/funding-requests/${requestId}/decline`, {
        reason: declineReason
      });
      
      alert('Request declined successfully!');
      router.push('/dashboard/opportunities');
    } catch (err: any) {
      console.error('Error declining request:', err);
      setActionError(err.response?.data?.error || 'Failed to decline request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <p className="font-semibold">{error || 'Opportunity not found'}</p>
            <button
              onClick={() => router.push('/dashboard/opportunities')}
              className="mt-4 text-blue-600 hover:text-blue-700 flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Opportunities
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overallScore = calculateOverallScore(opportunity.sme);
  const paymentSchedule = generatePaymentSchedule();
  const walletBalance = user?.wallet?.balance || 0; // Backend sends balanceNGN as 'balance' key
  const requestedAmount = opportunity.amount;
  const amountFunded = opportunity.amountFunded || 0;
  const remainingAmount = requestedAmount - amountFunded;
  const fundingProgress = requestedAmount > 0 ? (amountFunded / requestedAmount) * 100 : 0;
  const isPartiallyFunded = opportunity.status === 'PARTIALLY_FUNDED';
  const canAffordFull = walletBalance >= remainingAmount;
  const showDeclineButton = opportunity.status === 'PENDING' && amountFunded === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/dashboard/opportunities')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back to Opportunities
        </button>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* SME Profile Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900">
                      {opportunity.sme.businessName}
                    </h1>
                  </div>
                  <p className="text-sm text-gray-500">
                    Request ID: {opportunity.id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(opportunity.createdAt).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                      {overallScore}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Overall Score</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Contact Person:</p>
                    <p className="font-medium text-gray-900">
                      {opportunity.sme.user.firstName && opportunity.sme.user.lastName
                        ? `${opportunity.sme.user.firstName} ${opportunity.sme.user.lastName}`
                        : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email:</p>
                    <p className="font-medium text-gray-900">{opportunity.sme.user.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone:</p>
                    <p className="font-medium text-gray-900">
                      {opportunity.sme.user.phone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reputation Scores */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Reputation Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Marketplace Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(opportunity.sme.marketplaceScore)}`}>
                      {opportunity.sme.marketplaceScore || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Feedback Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(opportunity.sme.feedbackScore)}`}>
                      {opportunity.sme.feedbackScore || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Platform Trust</p>
                    <p className={`text-2xl font-bold ${getScoreColor(opportunity.sme.user.platformTrustScore)}`}>
                      {opportunity.sme.user.platformTrustScore || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Financial Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(opportunity.sme.user.financialScore)}`}>
                      {opportunity.sme.user.financialScore || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Blockchain Verification Section */}
              {opportunity.sme.blockchainReputation?.verified ? (
                <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-500">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h3 className="font-bold text-gray-900 text-lg">
                      Blockchain Verified Reputation
                    </h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">
                    This SME's reputation has been permanently recorded on the Cardano blockchain. 
                    The data below is cryptographically verified and tamper-proof.
                  </p>
                  
                  {/* On-Chain Scores */}
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">On-Chain Scores:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overall:</span>
                        <span className="font-bold text-gray-900">
                          {opportunity.sme.blockchainReputation.scores?.overall}/1000
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Marketplace:</span>
                        <span className="font-semibold text-gray-900">
                          {opportunity.sme.blockchainReputation.scores?.marketplace}/300
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Feedback:</span>
                        <span className="font-semibold text-gray-900">
                          {opportunity.sme.blockchainReputation.scores?.feedback}/350
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trust:</span>
                        <span className="font-semibold text-gray-900">
                          {opportunity.sme.blockchainReputation.scores?.trust}/150
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financial:</span>
                        <span className="font-semibold text-gray-900">
                          {opportunity.sme.blockchainReputation.scores?.financial}/200
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recorded:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(opportunity.sme.blockchainReputation.timestamp!).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Links */}
                  <div className="space-y-2">
                    <a
                      href={`https://preprod.cardanoscan.io/transaction/${opportunity.sme.blockchainReputation.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-white hover:bg-gray-50 rounded border border-gray-200 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">View on Blockchain Explorer</span>
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </a>
                    <button
                      onClick={() => router.push(`/verify?tx=${opportunity.sme.blockchainReputation?.txHash}`)}
                      className="w-full flex items-center justify-between p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      <span className="text-sm font-medium">Verify Independently</span>
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Transaction: <code className="bg-gray-100 px-1 rounded">{opportunity.sme.blockchainReputation.txHash?.slice(0, 16)}...</code>
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-700">Blockchain Verification</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    This SME has not yet recorded their reputation on the blockchain. 
                    Scores shown are from the platform database only.
                  </p>
                </div>
              )}

              {/* Funding Details */}
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-4">Funding Request Details</h3>
                
                {isPartiallyFunded && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded mb-2">
                      PARTIALLY FUNDED
                    </span>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">
                          {formatAmount(amountFunded)} funded
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
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Original Request</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(opportunity.amount)}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Remaining Needed</p>
                  <p className="text-3xl font-bold text-blue-600">{formatAmount(remainingAmount)}</p>
                  {isPartiallyFunded && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formatAmount(amountFunded)} already funded by other investors
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Profit Share
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {opportunity.profitSharePercentage}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Investment Term
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {opportunity.termInMonths} months
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Repayment Schedule
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatRepaymentFrequency(opportunity.repaymentFrequency)}
                  </p>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Purpose of Funding</h3>
                <p className="text-gray-700 leading-relaxed">{opportunity.purpose}</p>
              </div>
            </div>

            {/* Payment Schedule Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Expected Payment Schedule</h2>
              <p className="text-sm text-gray-600 mb-4">
                This schedule will be created upon approval and represents expected payment dates.
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Month</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Due Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paymentSchedule.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.month}</td>
                        <td className="px-4 py-3 text-gray-700">{item.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'FINAL_PAYMENT' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Action Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Investment Action</h2>

              {/* Wallet Balance */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Your Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(walletBalance)}</p>
                {!canAffordFull && (
                  <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Insufficient for remaining amount - partial funding available
                  </p>
                )}
              </div>

              {/* Funding Status */}
              {isPartiallyFunded && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Funding Status</p>
                  <p className="text-xs text-blue-700">
                    This request has been partially funded. You can contribute any amount up to {formatAmount(remainingAmount)}.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/dashboard/opportunities/${opportunity.id}/invest`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <DollarSign className="h-5 w-5" />
                  Invest Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
