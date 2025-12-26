"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Loader2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  Wallet,
  Briefcase,
  RefreshCw
} from 'lucide-react';

// --- 1. Interfaces ---
interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'PROFIT_SHARE' | 'AGENT_FEE' | 'PLATFORM_FEE' | 'ORDER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  notes: string | null;
  createdAt: string;
  senderId: string;
  recipientId: string;
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

// --- 2. Helpers ---
const formatNaira = (amountInKobo: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TransactionsPage() {
  const { user } = useAuth(); // We need the user ID to check Credit vs Debit
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // --- 3. Fetch Data ---
  useEffect(() => {
    async function fetchTransactions() {
      setIsLoading(true);
      try {
        const response = await api.get<Transaction[]>('/wallet/transactions');
        setTransactions(response.data);
      } catch (err) {
        setError('Could not load transactions.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  // --- 4. Smart Icon Logic ---
  const getTransactionIcon = (type: Transaction['type'], isCredit: boolean) => {
    if (type === 'DEPOSIT') return <Wallet className="w-5 h-5 text-green-600" />;
    if (type === 'WITHDRAWAL') return <Wallet className="w-5 h-5 text-red-600" />;
    if (type === 'PROFIT_SHARE') return <Briefcase className="w-5 h-5 text-indigo-600" />;
    
    // Default arrows
    if (isCredit) return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
    return <ArrowUpRight className="w-5 h-5 text-red-600" />;
  };

  // --- 5. Render Logic ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-64 text-red-500">
          <AlertCircle className="w-6 h-6 mr-2" /> {error}
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-64 text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <History className="w-16 h-16 text-gray-300" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900">No Transactions Yet</h3>
          <p className="mt-1 text-gray-500">Your financial history will appear here.</p>
        </div>
      );
    }

    // --- THE VIBRANT LIST ---
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <ul className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            // Critical Logic: Is this money IN or money OUT?
            const isCredit = tx.recipientId === user?.id;
            const isDebit = !isCredit;

            // Get the "Other Person's" name
            const otherParty = isCredit ? tx.sender : tx.recipient;
            const otherPartyName = otherParty?.sme?.businessName || 
                                   (otherParty?.firstName ? `${otherParty.firstName} ${otherParty.lastName}` : 'System');

            return (
              <li key={tx.id} className="p-5 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  
                  {/* Left: Icon & Info */}
                  <div className="flex items-center space-x-4">
                    {/* Icon Badge */}
                    <div className={`p-3 rounded-full ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
                      {getTransactionIcon(tx.type, isCredit)}
                    </div>
                    
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {tx.notes || tx.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isCredit ? 'From: ' : 'To: '} {otherPartyName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount */}
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}{formatNaira(tx.amount)}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                      {tx.type.replace('_', ' ')}
                    </span>
                  </div>

                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="mt-1 text-gray-600">Track your deposits, payments, and transfers.</p>
      </div>
      {renderContent()}
    </div>
  );
}