"use client";
import React, { useState, useEffect } from 'react';
import api from '../lib/api'; 
import { 
  ShieldCheck, 
  ShoppingCart, 
  Star, 
  Landmark,
  Loader2 
} from 'lucide-react';

// (TypeScript Interfaces are unchanged)
interface Scores {
  platformTrustScore: number;
  financialScore: number;
  marketplaceScore: number;
  feedbackScore: number;
}

// (getReputationData function is unchanged)
const getReputationData = (scores: Scores) => {
  const total = scores.platformTrustScore + 
                scores.financialScore + 
                scores.marketplaceScore + 
                scores.feedbackScore;
  
  let tier = 'Bronze';
  let tierColor = 'text-yellow-600'; 
  if (total > 850) {
    tier = 'Platinum';
    tierColor = 'text-indigo-600';
  } else if (total > 700) {
    tier = 'Gold';
    tierColor = 'text-yellow-400';
  } else if (total > 500) {
    tier = 'Silver';
    tierColor = 'text-gray-400';
  }
  
  return { total, tier, tierColor };
};

export default function ReputationWidget() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // (useEffect hook is unchanged)
  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await api.get('/users/me');
        const user = response.data;

        const newScores: Scores = {
          platformTrustScore: user.platformTrustScore || 0,
          financialScore: user.financialScore || 0,
          marketplaceScore: user.sme?.marketplaceScore || 0,
          feedbackScore: user.sme?.feedbackScore || 0,
        };
        setScores(newScores);
        
      } catch (err) {
        setError('Could not load score');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchScores();
  }, []); 

  // (renderContent logic is unchanged)
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      );
    }
    if (error) {
      return <p className="text-red-600 text-lg">{error}</p>;
    }
    if (scores) {
      const { total, tier, tierColor } = getReputationData(scores);
      
      return (
        <div>
          {/* --- 1. FONT SIZE FIX --- */}
          <div className="text-center my-4">
            <h3 className={`text-lg font-semibold ${tierColor}`}>{tier} Tier</h3>
            {/* Changed from text-6xl to text-5xl */}
            <p className="text-5xl font-bold text-gray-900">{total}</p>
            <p className="text-sm text-gray-500">/ 1000</p>
          </div>

          <hr className="my-4" />

          {/* --- 2. 2x2 GRID FIX --- */}
          <h4 className="text-sm font-medium text-gray-500 mb-3">SCORE BREAKDOWN</h4>
          {/* Changed from <ul> to a 2x2 grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            
            {/* Item 1 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center text-sm text-gray-700">
                <ShieldCheck className="w-4 h-4 text-green-500 mr-2" />
                Trust
              </span>
              {/* --- 3. "Faint Grey Circle" FIX --- */}
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 rounded-full px-2 py-0.5">
                {scores.platformTrustScore}
              </span>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center text-sm text-gray-700">
                <ShoppingCart className="w-4 h-4 text-blue-500 mr-2" />
                Market
              </span>
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 rounded-full px-2 py-0.5">
                {scores.marketplaceScore}
              </span>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center text-sm text-gray-700">
                <Star className="w-4 h-4 text-yellow-500 mr-2" />
                Feedback
              </span>
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 rounded-full px-2 py-0.5">
                {scores.feedbackScore}
              </span>
            </div>

            {/* Item 4 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center text-sm text-gray-700">
                <Landmark className="w-4 h-4 text-indigo-500 mr-2" />
                Financial
              </span>
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 rounded-full px-2 py-0.5">
                {scores.financialScore}
              </span>
            </div>

          </div>
        </div>
      );
    }
    return null;
  };

  return (
    // 7. --- HEIGHT FIX ---
    // Removed 'h-full' to stop it from stretching the grid
    <div className="p-6 rounded-2xl shadow-lg bg-white text-gray-900">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">My Reputation</h2>
      </div>
      {renderContent()}
    </div>
  );
}