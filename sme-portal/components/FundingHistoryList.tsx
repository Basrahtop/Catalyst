"use client";
import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Loader2, AlertCircle, Check, X, Hourglass, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface FundingRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'COMPLETED';
  amount: number;
  purpose: string;
  createdAt: string; 
  declineReason: string | null;
}

const formatNaira = (amountInKobo: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100);
};

const getStatusStyles = (status: FundingRequest['status']) => {
  switch (status) {
    case 'COMPLETED':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        text: 'Completed',
        className: 'bg-green-100 text-green-800'
      };
    case 'APPROVED':
      return {
        icon: <Check className="w-4 h-4" />,
        text: 'Active / Ongoing', // Mapped APPROVED to "Ongoing"
        className: 'bg-blue-100 text-blue-800'
      };
    case 'DECLINED':
      return {
        icon: <X className="w-4 h-4" />,
        text: 'Declined',
        className: 'bg-red-100 text-red-800'
      };
    default: // PENDING
      return {
        icon: <Hourglass className="w-4 h-4" />,
        text: 'Pending',
        className: 'bg-yellow-100 text-yellow-800'
      };
  }
};

export default function FundingHistoryList() {
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(
    useCallback(() => {
      let isActive = true;
      async function fetchRequests() {
        if (!isActive) return;
        setIsLoading(true);
        try {
          const response = await api.get<FundingRequest[]>('/funding-requests/my-requests');
          if (isActive) {
            setRequests(response.data);
          }
        } catch (err) {
          if (isActive) setError('Could not load history');
          console.error(err);
        } finally {
          if (isActive) setIsLoading(false);
        }
      }
      fetchRequests();
      return () => { isActive = false; };
    }, [])
  );

  const renderList = () => {
    if (error) {
      return (
        <div className="flex justify-center items-center h-32">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <span className="ml-2 text-red-500">{error}</span>
        </div>
      );
    }

    if (!isLoading && requests.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-32 text-center p-6 bg-white rounded-2xl shadow-lg">
          <FileText className="w-12 h-12 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900">No Funding History</h3>
          <p className="mt-1 text-sm text-gray-500">Your past applications will appear here.</p>
        </div>
      );
    }

    return (
      <ul className="space-y-4">
        {requests.map((req) => {
          const status = getStatusStyles(req.status);
          const requestDate = new Date(req.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          return (
            // --- THIS IS THE FIX: WRAPPED IN LINK ---
            <Link 
              href="/dashboard/funding" 
              key={req.id}
              className="block hover:bg-gray-50 transition-colors duration-200"
            >
              <li className="p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{req.purpose}</p>
                    <p className="text-sm text-gray-500">
                      Requested on: {requestDate}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                    <p className="text-xl font-bold text-indigo-600">{formatNaira(req.amount)}</p>
                    <span 
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${status.className}`}
                    >
                      {status.icon}
                      <span className="ml-1.5">{status.text}</span>
                    </span>
                  </div>
                </div>
                
                {req.status === 'DECLINED' && req.declineReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">Reason for Decline:</p>
                    <p className="text-sm text-red-700 italic">"{req.declineReason}"</p>
                  </div>
                )}
              </li>
            </Link>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="p-6 rounded-2xl shadow-lg bg-white text-gray-900 mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Application History</h2>
      <div className="min-h-[10rem]">
        {isLoading && requests.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          renderList()
        )}
      </div>
    </div>
  );
}