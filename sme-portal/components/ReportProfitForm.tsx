"use client";
import React, { useState } from 'react';
import api from '../lib/api'; // Path: ../ (up from components)
import { Loader2, BarChart2 } from 'lucide-react';

// --- 1. THIS IS THE "RED LINE" FIX ---
// This "shape" now *exactly* matches what the 'FundingPage' is sending it
interface RequestProp {
  id: string; // This is the installmentId
  profitSharePercentage: number;
}
// --- END OF FIX ---

// 2. Define the props this form needs
interface ReportProfitFormProps {
  request: RequestProp; // Use the correct interface
  onClose: () => void;
  onSuccess: (request: any) => void;
}

// Get current month/year for the form's default value
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export default function ReportProfitForm({ request, onClose, onSuccess }: ReportProfitFormProps) {
  // 3. Form State
  const [reportedProfit, setReportedProfit] = useState('');
  const [month, setMonth] = useState(currentMonth.toString());
  const [year, setYear] = useState(currentYear.toString());
  
  // 4. UI State
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 5. Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = {
        installmentId: request.id, // <-- This is now correct
        month: parseInt(month),
        year: parseInt(year),
        reportedProfit: parseFloat(reportedProfit) * 100, // Convert Naira to Kobo
      };

      // 6. Call our REAL "Revenue Engine" API
      const response = await api.post('/profit-reports', data);
      
      // 7. Success!
      setIsSubmitting(false);
      onSuccess(response.data.installment); // Send the *updated* installment back
      onClose();   // Close the modal
      
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* "Vibrant" Info Box */}
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-center">
          <BarChart2 className="w-6 h-6 text-indigo-600" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-indigo-800">
              Your Profit Share Terms
            </h3>
            <p className="text-sm text-indigo-700">
              You are reporting profit for your <strong>{request.profitSharePercentage}%</strong> share investment.
            </p>
          </div>
        </div>
      </div>

      {/* Reported Profit */}
      <div>
        <label htmlFor="profit" className="block text-sm font-medium text-gray-700">
          Total Profit for this Period (in Naira ₦)
        </label>
        <div className="mt-1">
          <input
            id="profit"
            type="number"
            value={reportedProfit}
            onChange={(e) => setReportedProfit(e.target.value)}
            placeholder="e.g., 100000"
            required
          />
        </div>
      </div>

      {/* Month & Year (in a grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="month" className="block text-sm font-medium text-gray-700">
            For the Month
          </label>
          <div className="mt-1">
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            For the Year
          </label>
          <div className="mt-1">
            <input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2025"
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center font-medium">{error}</p>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700
                     hover:bg-gray-50 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-36 flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                     bg-gradient-to-r from-indigo-600 to-blue-600 
                     hover:from-indigo-700 hover:to-blue-700
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                     transition-all duration-300
                     disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Submit Report'
          )}
        </button>
      </div>
    </form>
  );
}