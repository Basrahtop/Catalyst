"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// --- THIS IS THE FIX ---
// We must go up two levels from 'app/withdraw'
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
// --- END OF FIX ---
import { Loader2, ArrowLeft, Banknote } from 'lucide-react';

// (This is our standard Page Header component)
function PageHeader() {
  const router = useRouter();
  return (
    <div className="flex items-center mb-6">
      <button 
        onClick={() => router.back()}
        className="p-2 rounded-full hover:bg-gray-200 transition-all"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <h1 className="ml-4 text-3xl font-bold text-gray-900">
        Withdraw Funds
      </h1>
    </div>
  );
}

// This is our main page component
export default function WithdrawPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // --- 1. Form State ---
  const [amount, setAmount] = useState('');
  
  // --- 2. UI State ---
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 3. "Security Guard" ---
  useEffect(() => {
    if (!isAuthLoading && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, token, router]);

  // --- 4. Handle Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const data = {
        amount: parseFloat(amount) * 100, // Convert Naira to Kobo
        // In V2, we'd add: bankCode, accountNumber
      };

      // --- We'll build this API endpoint next ---
      // await api.post('/wallet/withdraw', data); 
      
      // --- For now, we'll use a simulation ---
      console.log("Simulating withdrawal:", data);
      await new Promise(res => setTimeout(res, 1500)); // Fake network delay
      // --- End of simulation ---

      setSuccess('Withdrawal successful! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
      setIsSubmitting(false);
    }
  };

  // --- 5. Loading State (while auth is checking) ---
  if (isAuthLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // --- 6. The Main Form (Vibrant & Aesthetic) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <PageHeader />
        
        <form 
          onSubmit={handleSubmit} 
          className="p-8 bg-white rounded-2xl shadow-xl space-y-6"
        >
          {/* Section 1: Bank Info (Simulated) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Withdraw to Bank</h2>
            <p className="text-sm text-gray-500 mb-4">
              Funds will be sent to your verified bank account.
            </p>
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-600">Verified Bank Account</p>
              <p className="text-lg font-semibold text-gray-900">GTBank - 0123456789</p>
            </div>
          </div>
          
          {/* Section 2: How much? */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount to Withdraw (in Naira ₦)
            </label>
            <div className="mt-1 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <Banknote className="w-5 h-5 text-gray-400" />
              </div>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 20000"
                required
                className="pl-10" // Add padding for the icon
              />
            </div>
          </div>

          {/* Section 3: Submit */}
          {error && (
            <p className="text-sm text-red-600 text-center font-medium">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 text-center font-medium">{success}</p>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700
                         hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || success !== ''}
              className="w-48 flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                         bg-gradient-to-r from-green-500 to-emerald-600 
                         hover:from-green-600 hover:to-emerald-700
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                         transition-all duration-300 ease-in-out
                         hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]
                         disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Withdraw ₦' + (amount || 0)
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}