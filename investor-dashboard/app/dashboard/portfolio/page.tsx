'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  ChevronLeft, 
  TrendingUp, 
  Clock, 
  Building2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  Filter
} from 'lucide-react';

interface Investment {
  id: string;
  amount: number;
  amountInNGN: number;
  currency: 'NGN' | 'ADA' | 'USDM';
  exchangeRateToNGN: number | null;
  createdAt: string;
  fundingRequest: {
    id: string;
    amount: number;
    amountFunded: number;
    purpose: string;
    profitSharePercentage: number;
    termInMonths: number;
    status: string;
    createdAt: string;
    sme: {
      businessName: string;
    };
  };
}

interface InstallmentShare {
  id: string;
  investmentAmount: number;
  sharePercentage: number;
  expectedShare: number | null;
  paidAmount: number | null;
  paidAt: string | null;
  installment: {
    id: string;
    month: number;
    year: number;
    status: string;
    type: string;
    totalDueFromSME: number | null;
    reportedProfit: number | null;
  };
}

export default function PortfolioPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [installmentShares, setInstallmentShares] = useState<InstallmentShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchInvestments();
    }
  }, [user, authLoading, router]);

  const fetchInvestments = async () => {
    try {
      const response = await api.get('/funding-requests/my-investments');
      setInvestments(response.data.investments);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallmentDetails = async (investmentId: string, requestId: string) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/funding-requests/investments/${investmentId}/installments?requestId=${requestId}`);
      setInstallmentShares(response.data.installmentShares || []);
    } catch (error) {
      console.error('Error fetching installment details:', error);
      setInstallmentShares([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetails = (investment: Investment) => {
    setSelectedInvestment(investment);
    fetchInstallmentDetails(investment.id, investment.fundingRequest.id);
  };

  const formatAmount = (amountInKobo: number) => {
    return `₦${(amountInKobo / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCurrencyBadge = (currency: string) => {
    const badges = {
      NGN: { label: 'Naira', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      ADA: { label: 'Cardano', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      USDM: { label: 'USDM', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    };
    return badges[currency as keyof typeof badges] || badges.NGN;
  };

  const formatInvestmentAmount = (investment: Investment) => {
    if (investment.currency === 'NGN') {
      return {
        primary: formatAmount(investment.amountInNGN),
        secondary: null,
      };
    } else if (investment.currency === 'ADA') {
      const adaAmount = Number(investment.amount) / 1_000_000; // lovelace to ADA
      return {
        primary: `${adaAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ADA`,
        secondary: formatAmount(investment.amountInNGN),
      };
    } else if (investment.currency === 'USDM') {
      const usdmAmount = Number(investment.amount) / 1_000_000; // microUSDM to USDM
      return {
        primary: `${usdmAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDM`,
        secondary: formatAmount(investment.amountInNGN),
      };
    }
    return { primary: formatAmount(investment.amountInNGN), secondary: null };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PARTIALLY_FUNDED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-purple-100 text-purple-800',
      DECLINED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getInstallmentStatusIcon = (status: string) => {
    if (status === 'PAID') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'PENDING') return <Clock className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  const calculateROI = (investment: Investment) => {
    // Calculate total profit received for this investment
    const totalProfitReceived = installmentShares
      .filter(share => share.paidAmount !== null)
      .reduce((sum, share) => sum + (share.expectedShare || 0), 0);
    
    if (totalProfitReceived === 0) return 0;
    return ((totalProfitReceived / investment.amount) * 100).toFixed(2);
  };

  const filteredInvestments = investments.filter(inv => {
    if (filter === 'all') return true;
    if (filter === 'active') return inv.fundingRequest.status === 'APPROVED' || inv.fundingRequest.status === 'PARTIALLY_FUNDED';
    if (filter === 'completed') return inv.fundingRequest.status === 'COMPLETED';
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back to Dashboard
        </button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investment Portfolio</h1>
            <p className="text-gray-600 mt-1">Track all your investments and returns</p>
          </div>
          <button
            onClick={fetchInvestments}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({investments.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'active'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Active ({investments.filter(i => i.fundingRequest.status === 'APPROVED' || i.fundingRequest.status === 'PARTIALLY_FUNDED').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'completed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed ({investments.filter(i => i.fundingRequest.status === 'COMPLETED').length})
          </button>
        </div>

        {/* Investments Grid */}
        {filteredInvestments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Investments Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't made any investments yet. Start by browsing available opportunities."
                : `No ${filter} investments found.`}
            </p>
            <button
              onClick={() => router.push('/dashboard/opportunities')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Browse Opportunities
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Investments List */}
            <div className="space-y-4">
              {filteredInvestments.map((investment) => {
                const isSelected = selectedInvestment?.id === investment.id;
                return (
                  <div
                    key={investment.id}
                    className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer border-2 ${
                      isSelected ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => handleViewDetails(investment)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-bold text-gray-900">
                            {investment.fundingRequest.sme.businessName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600">
                            {new Date(investment.createdAt).toLocaleDateString('en-NG')}
                          </p>
                          {(() => {
                            const badge = getCurrencyBadge(investment.currency);
                            return (
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      {getStatusBadge(investment.fundingRequest.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Your Investment</p>
                        {(() => {
                          const amounts = formatInvestmentAmount(investment);
                          return (
                            <div>
                              <p className="text-lg font-bold text-blue-600">{amounts.primary}</p>
                              {amounts.secondary && (
                                <p className="text-xs font-semibold text-gray-700 mt-0.5">
                                  ≈ {amounts.secondary}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Profit Share</p>
                        <p className="text-lg font-bold text-green-600">
                          {investment.fundingRequest.profitSharePercentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Term</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {investment.fundingRequest.termInMonths} months
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Total Request</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatAmount(investment.fundingRequest.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">Purpose</p>
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {investment.fundingRequest.purpose}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Details Panel */}
            <div className="lg:sticky lg:top-6 h-fit">
              {!selectedInvestment ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Investment</h3>
                  <p className="text-gray-600">
                    Click on any investment to view detailed payment history and returns
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
                  
                  {detailLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  ) : installmentShares.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No payment schedule available yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Payment schedule will be created once the investment is fully funded
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Your Share</p>
                          <p className="text-lg font-bold text-blue-600">
                            {installmentShares[0]?.sharePercentage.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Profit Received</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatAmount(
                              installmentShares
                                .filter(s => s.paidAmount !== null)
                                .reduce((sum, s) => sum + (s.expectedShare || 0), 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Payments Received</p>
                          <p className="text-lg font-bold text-gray-900">
                            {installmentShares.filter(s => s.installment.status === 'PAID').length} / {installmentShares.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">ROI</p>
                          <p className="text-lg font-bold text-purple-600">
                            {calculateROI(selectedInvestment)}%
                          </p>
                        </div>
                      </div>

                      {/* Installments List */}
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {installmentShares.map((share, index) => (
                          <div
                            key={share.id}
                            className={`p-4 rounded-lg border-2 ${
                              share.installment.status === 'PAID'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getInstallmentStatusIcon(share.installment.status)}
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    Month {share.installment.month} ({share.installment.year})
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {share.installment.type === 'FINAL_PAYMENT' ? 'Final Payment' : 'Profit Share'}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                share.installment.status === 'PAID'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {share.installment.status}
                              </span>
                            </div>

                            {share.installment.status === 'PAID' && (
                              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                {share.installment.reportedProfit !== null && (
                                  <div>
                                    <p className="text-xs text-gray-600">SME Reported Profit</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatAmount(share.installment.reportedProfit)}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-600">Your Profit Share</p>
                                  <p className="text-sm font-bold text-green-600">
                                    {formatAmount(share.expectedShare || 0)}
                                  </p>
                                </div>
                                {share.installment.type === 'FINAL_PAYMENT' && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-gray-600">Total Received (Profit + Capital)</p>
                                    <p className="text-sm font-bold text-blue-600">
                                      {formatAmount(share.paidAmount || 0)}
                                    </p>
                                  </div>
                                )}
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-600">Paid On</p>
                                  <p className="text-sm text-gray-900">
                                    {share.paidAt ? new Date(share.paidAt).toLocaleString('en-NG') : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
