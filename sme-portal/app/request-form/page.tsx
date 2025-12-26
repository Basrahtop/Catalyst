"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// --- THIS IS THE FIX: Using reliable path aliases ---
import api from '@/lib/api'; 
import { useAuth } from '@/context/AuthContext';
// --- END OF FIX ---
import { Loader2, ArrowLeft } from 'lucide-react';

// This is our "vibrant" header for sub-pages
function PageHeader() {
  const router = useRouter();
  return (
    <div className="flex items-center mb-6">
      <button 
        onClick={() => router.back()} // Simple "back" button
        className="p-2 rounded-full hover:bg-gray-200 transition-all"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <h1 className="ml-4 text-3xl font-bold text-gray-900">
        New Investment Request
      </h1>
    </div>
  );
}

// This is our main page component
export default function RequestFormPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // --- 1. Form State ---
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [profitSharePercentage, setProfitSharePercentage] = useState('30'); // Default to 30%
  const [termInMonths, setTermInMonths] = useState('6'); // Default to 6 months
  const [repaymentFrequency, setRepaymentFrequency] = useState('MONTHLY_PROFIT_SHARE');
  
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
      // Convert our form data to the correct types for the API
      const data = {
        amount: parseFloat(amount) * 100, // Convert Naira to Kobo
        purpose,
        profitSharePercentage: parseFloat(profitSharePercentage),
        termInMonths: parseInt(termInMonths),
        repaymentFrequency,
      };

      // Call our real backend API
      await api.post('/funding-requests', data);
      
      setSuccess('Your request has been submitted! Redirecting to dashboard...');
      
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
      setIsSubmitting(false); // Stop loading on error
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
      <div className="max-w-3xl mx-auto">
        <PageHeader />
        
        <form 
          onSubmit={handleSubmit} 
          className="p-8 bg-white rounded-2xl shadow-xl space-y-6"
        >
          {/* Section 1: What do you need? */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Investment Details</h2>
            <p className="text-sm text-gray-500">
              Tell us what you need and how you plan to use it.
            </p>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount (in Naira ₦)
                </label>
                <div className="mt-1">
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 500000"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="termInMonths" className="block text-sm font-medium text-gray-700">
                  For how long? (Term)
                </label>
                <div className="mt-1">
                  <select
                    id="termInMonths"
                    value={termInMonths}
                    onChange={(e) => setTermInMonths(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
                Purpose of the Investment
              </label>
              <div className="mt-1">
                <input
                  id="purpose"
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., 'Buy 3 new sewing machines'"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: How will you pay? */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Profit Share Terms</h2>
            <p className="text-sm text-gray-500">
              Propose your terms. A higher share attracts investors faster.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="profitSharePercentage" className="block text-sm font-medium text-gray-700">
                  Profit Share Offer (Lender's %)
                </label>
                <div className="mt-1">
                  <select
                    id="profitSharePercentage"
                    value={profitSharePercentage}
                    onChange={(e) => setProfitSharePercentage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="10">10% (Platform Minimum)</option>
                    <option value="15">15% (Recommended)</option>
                    <option value="20">20%</option>
                    <option value="25">25%</option>
                    <option value="30">30% (High-Attraction)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="repaymentFrequency" className="block text-sm font-medium text-gray-700">
                  Payout Frequency
                </label>
                <div className="mt-1">
                  <select
                    id="repaymentFrequency"
                    value={repaymentFrequency}
                    onChange={(e) => setRepaymentFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="MONTHLY_PROFIT_SHARE">Pay profit-share monthly</option>
                    <option value="END_OF_TERM_LUMP_SUM">Pay all at end of term (e.g., Farmer)</option>
                  </select>
                </div>
              </div>
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
              type="button" // This is a "cancel" button
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
                         bg-gradient-to-r from-indigo-600 to-blue-600 
                         hover:from-indigo-700 hover:to-blue-700
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                         transition-all duration-300 ease-in-out
                         hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]
                         disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}