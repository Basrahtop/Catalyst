"use client";
import React from 'react';

// --- FIX: All imports are now correct (no typos) ---
import WalletWidget from '../../components/WalletWidget';
import ReputationWidget from '../../components/ReputationWidget';
import FundingStatusWidget from '../../components/FundingStatusWidget';
import FundingHistoryList from '../../components/FundingHistoryList';

// This component is now "dumb" and just shows content.
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Home Dashboard
      </h1>
      
      {/* This is our 3-widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReputationWidget />
        <WalletWidget />
        
      </div>

      <div className="mt-6">
        <FundingStatusWidget />
      </div>

      {/* This is the list that goes *below* the widgets */}
      <div className="mt-6">
        <FundingHistoryList />
      </div>
    </div>
  );
}