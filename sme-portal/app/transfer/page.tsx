"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// --- 1. FIX: All paths are 100% correct (up 2 levels) ---
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
// --- END OF FIX ---
import { Loader2, ArrowLeft, Send } from 'lucide-react';

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
        Transfer Funds
      </h1>
    </div>
  );
}

// This is our main page component
export default function TransferPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // --- Form State ---
  const [amount, setAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [note, setNote] = useState('');
  
  // --- UI State ---
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- "Security Guard" ---
  useEffect(() => {
    if (!isAuthLoading && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, token, router]);

  // --- 2. THIS IS THE "WIRED UP" HANDLE-SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const data = {
        amount: parseFloat(amount) * 100, // Convert Naira to Kobo
        recipientEmail: recipientEmail,
        note: note,
      };

      // --- We are now calling our REAL "Grade A" API ---
      const response = await api.post('/wallet/transfer', data); 
      
      setSuccess(response.data.message || 'Transfer successful! Redirecting...');
      
      // On success, wait 2 seconds and send them back
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      // --- This is "smart" error handling ---
      // It will show "Insufficient funds." from our backend
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
      setIsSubmitting(false); // Stop loading on error
    }
  };
  // --- END OF FIX ---

  // --- Loading State (while auth is checking) ---
  if (isAuthLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // --- The Main Form (Vibrant & Aesthetic) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <PageHeader />
        
        <form 
          onSubmit={handleSubmit} 
          className="p-8 bg-white rounded-2xl shadow-xl space-y-6"
        >
          {/* Section 1: Who & How Much? */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Send Money</h2>
            <p className="text-sm text-gray-500">
              Instantly send funds to any other user on the Catalyst platform.
            </p>
            
            <div className="mt-4">
              <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">
                Recipient's Email
              </label>
              <div className="mt-1">
                <input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g., agent-tunde@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (in Naira ₦)
              </label>
              <div className="mt-1">
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 5000"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                Note (Optional)
              </label>
              <div className="mt-1">
                <input
                  id="note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., 'For the Aso-Oke order'"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Submit */}
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
                'Send ₦' + (amount || 0)
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}