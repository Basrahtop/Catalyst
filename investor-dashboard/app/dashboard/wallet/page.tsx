'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  ChevronLeft, 
  Plus, 
  Send, 
  Download,
  Wallet,
  TrendingUp,
  TrendingDown,
  Loader2
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  notes: string | null;
  createdAt: string;
  sender: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    sme: { businessName: string } | null;
  };
  recipient: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    sme: { businessName: string } | null;
  };
}

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchTransactions();
  }, [user, router]);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/wallet/transactions');
      setTransactions(response.data);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amountInKobo: number) => {
    return `₦${(amountInKobo / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await api.post('/wallet/deposit', {
        amount: Math.round(parseFloat(depositAmount) * 100)
      });

      await refreshUser();
      await fetchTransactions();
      setSuccessMessage('Funds deposited successfully!');
      setShowDepositModal(false);
      setDepositAmount('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Deposit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!recipientEmail) {
      setError('Please enter recipient email');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await api.post('/wallet/transfer', {
        recipientEmail,
        amount: Math.round(parseFloat(transferAmount) * 100),
        note: transferNote
      });

      await refreshUser();
      await fetchTransactions();
      setSuccessMessage('Transfer successful!');
      setShowTransferModal(false);
      setTransferAmount('');
      setRecipientEmail('');
      setTransferNote('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!bankName || !accountNumber) {
      setError('Please provide bank details');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await api.post('/wallet/withdraw', {
        amount: Math.round(parseFloat(withdrawAmount) * 100),
        bankName,
        bankAccountNumber: accountNumber
      });

      await refreshUser();
      await fetchTransactions();
      setSuccessMessage('Withdrawal request submitted!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Withdrawal failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getTransactionName = (transaction: Transaction, isOutgoing: boolean) => {
    const party = isOutgoing ? transaction.recipient : transaction.sender;
    
    if (party.sme) {
      return party.sme.businessName;
    }
    if (party.firstName && party.lastName) {
      return `${party.firstName} ${party.lastName}`;
    }
    return party.email;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  const walletBalance = user?.wallet?.balance || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back to Dashboard
        </button>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
            <button
              onClick={() => setSuccessMessage('')}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-8 w-8" />
            <h1 className="text-2xl font-bold">My Wallet</h1>
          </div>
          <p className="text-blue-100 text-sm mb-2">Available Balance</p>
          <p className="text-5xl font-bold mb-6">{formatAmount(walletBalance)}</p>
          
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setShowDepositModal(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-lg flex flex-col items-center gap-2 transition-all"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Add Funds</span>
            </button>
            
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-lg flex flex-col items-center gap-2 transition-all"
            >
              <Send className="h-6 w-6" />
              <span className="text-sm font-medium">Transfer</span>
            </button>
            
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-lg flex flex-col items-center gap-2 transition-all"
            >
              <Download className="h-6 w-6" />
              <span className="text-sm font-medium">Withdraw</span>
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
          
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const isOutgoing = transaction.sender.email === user?.email;
                const icon = isOutgoing ? TrendingDown : TrendingUp;
                const IconComponent = icon;
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        isOutgoing ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <IconComponent className={`h-6 w-6 ${
                          isOutgoing ? 'text-red-600' : 'text-green-600'
                        }`} />
                      </div>
                      
                      <div>
                        <p className="font-semibold text-gray-900">
                          {transaction.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {isOutgoing ? 'To: ' : 'From: '}
                          {getTransactionName(transaction, isOutgoing)}
                        </p>
                        {transaction.notes && (
                          <p className="text-xs text-gray-500 mt-1">{transaction.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(transaction.createdAt).toLocaleString('en-NG')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        isOutgoing ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {isOutgoing ? '-' : '+'}{formatAmount(transaction.amount)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        transaction.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Funds</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₦)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setError('');
                  setDepositAmount('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Add Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Transfer Funds</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₦)
              </label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Payment for..."
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setError('');
                  setTransferAmount('');
                  setRecipientEmail('');
                  setTransferNote('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Withdraw Funds</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₦)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., GTBank"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0123456789"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setError('');
                  setWithdrawAmount('');
                  setBankName('');
                  setAccountNumber('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
