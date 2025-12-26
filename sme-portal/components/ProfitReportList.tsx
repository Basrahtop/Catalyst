"use client";
import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api'; // Path: ../ (up from components)
import { 
  Loader2, 
  AlertCircle, 
  Check, 
  Hourglass, 
  FileText, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import Link from 'next/link';

// 1. Interfaces
interface ProfitReport {
  id: string;
  month: number | null;
  year: number | null;
  status: 'PENDING' | 'PAID' | 'LATE' | 'UPCOMING';
  totalDueFromSME: number | null;
  createdAt: string;
  installmentNumber: number;
  request: {
    purpose: string;
  };
}

// 2. Helpers
const formatNaira = (amountInKobo: number | null) => {
  if (amountInKobo === null) return "N/A";
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amountInKobo / 100);
};

const getMonthName = (month: number | null) => {
  if (month === null) return "N/A";
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'long' });
};

const getStatusStyles = (status: ProfitReport['status']) => {
  switch (status) {
    case 'PAID':
      return { icon: <Check className="w-4 h-4" />, text: 'Paid', className: 'bg-green-100 text-green-800' };
    case 'LATE':
      return { icon: <AlertCircle className="w-4 h-4" />, text: 'Late', className: 'bg-red-100 text-red-800' };
    case 'PENDING':
      return { icon: <Hourglass className="w-4 h-4" />, text: 'Pending Payment', className: 'bg-yellow-100 text-yellow-800' };
    default:
      return { icon: <Hourglass className="w-4 h-4" />, text: 'Upcoming', className: 'bg-gray-100 text-gray-700' };
  }
};

// 3. Main Component
export default function ProfitReportList({ refreshKey }: { refreshKey: number }) {
  const [reports, setReports] = useState<ProfitReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- NEW: State for "View All" ---
  const [isExpanded, setIsExpanded] = useState(false);

  // 4. Fetching Logic
  useEffect(
    useCallback(() => {
      let isActive = true;
      async function fetchReports() {
        if (!isActive) return;
        setIsLoading(true);
        try {
          const response = await api.get<ProfitReport[]>('/profit-reports/my-reports');
          if (isActive) {
            // --- NEW: Smart Sorting Logic ---
            // Priority: LATE > PENDING > PAID
            const sorted = response.data.sort((a, b) => {
              const priority = { 'LATE': 0, 'PENDING': 1, 'UPCOMING': 2, 'PAID': 3 };
              const scoreA = priority[a.status] || 99;
              const scoreB = priority[b.status] || 99;
              
              if (scoreA !== scoreB) return scoreA - scoreB; // Sort by status first
              // If status is same, sort by date (newest first)
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setReports(sorted);
          }
        } catch (err) {
          if (isActive) setError('Could not load profit reports.');
          console.error(err);
        } finally {
          if (isActive) setIsLoading(false);
        }
      }
      fetchReports();
      return () => { isActive = false; };
    }, [refreshKey])
  );

  // 5. Render Logic
  const renderList = () => {
    if (error) {
      return (
        <div className="flex justify-center items-center h-32 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" /> {error}
        </div>
      );
    }

    if (!isLoading && reports.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-32 text-center p-6 bg-white rounded-2xl shadow-lg">
          <FileText className="w-12 h-12 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900">No Reports Found</h3>
          <p className="mt-1 text-sm text-gray-500">Your submitted profit reports will appear here.</p>
        </div>
      );
    }

    // --- NEW: Slicing Logic (Show 5 or All) ---
    const visibleReports = isExpanded ? reports : reports.slice(0, 5);

    return (
      <>
        <ul className="space-y-4">
          {isLoading && reports.length === 0 ? (
             <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
          ) : (
            visibleReports.map((report) => {
              const status = getStatusStyles(report.status);
              const title = report.month 
                ? `${getMonthName(report.month)} ${report.year} Report`
                : `Installment #${report.installmentNumber}`;

              return (
                <Link 
                  href={`/dashboard/reports/${report.id}`} 
                  key={report.id}
                  className="block p-4 bg-white rounded-xl shadow-lg border border-gray-100 
                             transition-all duration-200 hover:shadow-md hover:border-indigo-300"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{title}</p>
                      <p className="text-sm text-gray-500">For: {report.request.purpose}</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                      <p className="text-xl font-bold text-indigo-600">{formatNaira(report.totalDueFromSME)}</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${status.className}`}>
                        {status.icon}
                        <span className="ml-1.5">{status.text}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </ul>

        {/* --- NEW: View All Button --- */}
        {reports.length > 5 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-4 flex items-center justify-center py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            {isExpanded ? 'View Less' : `View All (${reports.length})`}
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="p-6 rounded-2xl shadow-lg bg-white text-gray-900 mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Pending & Past Invoices</h2>
      <div className="min-h-[10rem]">
        {renderList()}
      </div>
    </div>
  );
}