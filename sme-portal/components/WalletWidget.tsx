"use client";
import React, { useState, useEffect } from 'react';
// --- THIS IS THE FIX ---
// We now use the reliable path alias
import api from '@/lib/api'; 
import { Wallet, Plus, Send, Download } from 'lucide-react';
import Link from 'next/link';

// A helper function to format Kobo to Naira
const formatNaira = (amountInKobo: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100); // Convert kobo to Naira
};

export default function WalletWidget() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await api.get('/wallet/balance');
        setBalance(response.data.balance);
      } catch (err) {
        setError('Could not load balance');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, []); 

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-gray-200 text-lg">Loading...</p>;
    }
    if (error) {
      return <p className="text-red-300 text-lg">{error}</p>;
    }
    if (balance !== null) {
      return (
        <p className="text-4xl font-bold text-white">
          {formatNaira(balance)}
        </p>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl shadow-lg 
                    bg-gradient-to-br from-indigo-600 to-blue-600 
                    text-white flex flex-col h-full">
      
      {/* Top Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-indigo-100">My Wallet</h2>
        <Wallet className="w-8 h-8 text-indigo-300" />
      </div>
      
      {/* Balance Section */}
      <div className="flex-grow">
        {renderContent()}
      </div>
      
      {/* This is our new 3-button action bar */}
      <div className="mt-6 flex space-x-3">
        
        {/* Button 1: Add Funds */}
        <Link 
          href="/add-funds"
          className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg
                     bg-transparent border border-white border-opacity-50 
                     text-white font-semibold
                     hover:bg-white hover:text-indigo-600 
                     transition-all duration-300 ease-in-out
                     hover:shadow-lg hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Funds
        </Link>
        
        <Link 
          href="/transfer"
          className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg
                     bg-transparent border border-white border-opacity-50 
                     text-white font-semibold
                     hover:bg-white hover:text-indigo-600 
                     transition-all duration-300 ease-in-out
                     hover:shadow-lg hover:scale-105"
        >
          <Send className="w-4 h-4 mr-2" />
          Transfer
        </Link>
        
        {/* Button 3: Withdraw (Now a link) */}
        <Link 
          href="/withdraw"
          className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg
                     bg-transparent border border-white border-opacity-50 
                     text-white font-semibold
                     hover:bg-white hover:text-indigo-600 
                     transition-all duration-300 ease-in-out
                     hover:shadow-lg hover:scale-105"
        >
          <Download className="w-4 h-4 mr-2" />
          Withdraw
        </Link>
        
      </div>
    </div>
  );
}