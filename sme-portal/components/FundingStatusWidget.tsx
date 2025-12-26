"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '../lib/api'; 
import { Hourglass, CheckCircle, Loader2, AlertCircle, CreditCard } from 'lucide-react';

interface FundingRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'COMPLETED';
}

export default function FundingStatusWidget() {
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // --- We use 'useEffect' (NOT useFocusEffect) ---
  useEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchRequests() {
        if (!isActive) return;
        setIsLoading(true);
        try {
          const response = await api.get<FundingRequest[]>('/funding-requests/my-requests');
          const requests = response.data;

          if (isActive) {
            const pending = requests.filter(r => r.status === 'PENDING').length;
            const active = requests.filter(r => r.status === 'APPROVED').length;
            setPendingCount(pending);
            setActiveCount(active);
          }
        } catch (err) {
          if (isActive) setError('Could not load data');
          console.error(err);
        } finally {
          if (isActive) setIsLoading(false);
        }
      }

      fetchRequests();
      
      return () => {
        isActive = false;
      };
    }, [])
  );
  
  return (
    <div className="p-6 rounded-2xl shadow-lg bg-white text-gray-900 h-full">
      <div className="grid grid-cols-3 gap-4 items-center">

        {/* --- COLUMN 1: "Get Fast Funding" Button (Unchanged) --- */}
        <Link 
          href="/request-form"
          className="flex flex-col items-center justify-center p-4 h-24 rounded-lg
                     bg-gradient-to-r from-indigo-600 to-blue-600 
                     text-white font-semibold
                     hover:from-indigo-700 hover:to-blue-700
                     transition-all duration-300 ease-in-out
                     hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]"
        >
          <CreditCard className="w-7 h-7" />
          <span className="mt-2 text-sm font-medium">Get Fast Funding</span>
        </Link>

        {/* --- COLUMN 2: "Pending" Stat (REFACTORED FOR NO-FLICKER) --- */}
        <div className="text-center h-24 flex flex-col justify-center items-center">
          <Hourglass className="w-7 h-7 text-yellow-500" />
          
          {/* --- THIS IS THE FIX --- */}
{/* This block is now static. It will show 0, then update to the real number. */}
<div className="h-8 mt-2 flex items-center justify-center">
  {error ? (
    <AlertCircle className="w-6 h-6 text-red-500" title={error} />
  ) : (
    <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
  )}
</div>
          
          {/* 3. Text is now *static* */}
          <p className="text-sm font-medium text-gray-500">Pending</p>
        </div>
        
        {/* --- COLUMN 3: "Active" Stat (REFACTORED FOR NO-FLICKER) --- */}
        <div className="text-center h-24 flex flex-col justify-center items-center">
          {/* 1. Icon is now *static* */}
          <CheckCircle className="w-7 h-7 text-green-500" />
          
          <div className="h-8 mt-2 flex items-center justify-center">
  {error ? (
    <AlertCircle className="w-6 h-6 text-red-500" title={error} />
  ) : (
    <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
  )}
</div>
          
          {/* 3. Text is now *static* */}
          <p className="text-sm font-medium text-gray-500">Active</p>
        </div>
      </div>
    </div>
  );
}