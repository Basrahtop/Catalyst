"use client";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface InvestmentStats {
  totalInvestedHistorical: number;
  currentlyInvested: number;
  activeInvestments: number;
  completedInvestments: number;
  actualProfitReceived: number;
  capitalReturned: number;
  totalInvestments: number;
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<InvestmentStats>({
    totalInvestedHistorical: 0,
    currentlyInvested: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    actualProfitReceived: 0,
    capitalReturned: 0,
    totalInvestments: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/funding-requests/my-investments');
      setStats(response.data.stats);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching investment stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshUser(), // Refresh wallet balance and user data
      fetchStats()   // Refresh investment stats
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      
      // Set up periodic refresh every 30 seconds
      const intervalId = setInterval(() => {
        fetchStats();
        refreshUser(); // Also refresh wallet balance
      }, 30000); // 30 seconds

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const walletBalance = user.wallet?.balance || 0;

  const formatAmount = (amountInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amountInKobo / 100);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Dashboard
              </h2>
              {lastRefreshTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastRefreshTime.toLocaleTimeString('en-NG')}
                </p>
              )}
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <Loader2 className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
          <p className="text-gray-600 mb-8">
            Auto-refreshes every 30 seconds. Your data is always up to date.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-indigo-50 rounded-xl border-2 border-indigo-200">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Wallet Balance
              </h3>
              <p className="text-3xl font-bold text-indigo-600">{formatAmount(walletBalance)}</p>
              <p className="text-sm text-indigo-700 mt-2">Available for investment</p>
            </div>

            <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Active Investments
              </h3>
              {statsLoading ? (
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-green-600">{stats.activeInvestments}</p>
                  <p className="text-sm text-green-700 mt-2">
                    {formatAmount(stats.currentlyInvested)} currently invested
                  </p>
                </>
              )}
            </div>

            <div className="p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Profit Received
              </h3>
              {statsLoading ? (
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-purple-600">{formatAmount(stats.actualProfitReceived)}</p>
                  <p className="text-sm text-purple-700 mt-2">Total profit paid out</p>
                </>
              )}
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Completed Investments
              </h3>
              {statsLoading ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-blue-600">{stats.completedInvestments}</p>
                  <p className="text-sm text-blue-700 mt-2">
                    Successfully completed deals
                  </p>
                </>
              )}
            </div>

            <div className="p-6 bg-orange-50 rounded-xl border-2 border-orange-200">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                Capital Returned
              </h3>
              {statsLoading ? (
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-orange-600">{formatAmount(stats.capitalReturned)}</p>
                  <p className="text-sm text-orange-700 mt-2">Principal from completed deals</p>
                </>
              )}
            </div>

            <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lifetime Total Invested
              </h3>
              {statsLoading ? (
                <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900">{formatAmount(stats.totalInvestedHistorical)}</p>
                  <p className="text-sm text-gray-700 mt-2">All-time investment total</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/opportunities')}
              className="p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex flex-col items-start"
            >
              <h3 className="text-xl font-bold mb-2">View Opportunities</h3>
              <p className="text-blue-100">Browse pending funding requests from SMEs</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/wallet')}
              className="p-6 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors flex flex-col items-start"
            >
              <h3 className="text-xl font-bold mb-2">Manage Wallet</h3>
              <p className="text-green-100">Add funds, transfer, or withdraw</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/portfolio')}
              className="p-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors flex flex-col items-start"
            >
              <h3 className="text-xl font-bold mb-2">My Portfolio</h3>
              <p className="text-purple-100">Track your investments and returns</p>
            </button>
          </div>
        </div>
      </main>
  );
}
