"use client";
import { useState, useEffect } from 'react';
import { Shield, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface BlockchainVerificationBadgeProps {
  smeId: string;
  businessName?: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface ReputationData {
  verified: boolean;
  reputationId: string | null;
  overallScore: number | null;
  timestamp: string | null;
  onChain: boolean;
  txHash: string | null;
}

export default function BlockchainVerificationBadge({
  smeId,
  businessName,
  showDetails = false,
  size = 'medium',
  className = ''
}: BlockchainVerificationBadgeProps) {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchReputation();
  }, [smeId]);

  const fetchReputation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/cardano/reputation/${smeId}`);
      
      if (response.data.history && response.data.history.length > 0) {
        const latest = response.data.history[0];
        setReputation({
          verified: latest.verified || false,
          reputationId: latest.reputationId || null,
          overallScore: latest.overallScore || null,
          timestamp: latest.timestamp || null,
          onChain: latest.onChain || false,
          txHash: latest.txHash || null
        });
      } else {
        setReputation({
          verified: false,
          reputationId: null,
          overallScore: null,
          timestamp: null,
          onChain: false,
          txHash: null
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch reputation:', err);
      setError(err.response?.data?.error || 'Failed to fetch reputation data');
      setReputation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const openExplorer = () => {
    if (!reputation?.txHash) return;
    window.open(`https://preprod.cardanoscan.io/transaction/${reputation.txHash}`, '_blank');
  };

  const sizeClasses = {
    small: {
      badge: 'text-xs px-2 py-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    medium: {
      badge: 'text-sm px-3 py-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    large: {
      badge: 'text-base px-4 py-2',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-2 ${classes.badge} bg-gray-100 text-gray-500 rounded-full ${className}`}>
        <Loader2 className={`${classes.icon} animate-spin`} />
        <span className={classes.text}>Checking...</span>
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className="relative inline-block">
        <div 
          className={`inline-flex items-center gap-2 ${classes.badge} bg-gray-100 text-gray-500 rounded-full cursor-help ${className}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <AlertCircle className={classes.icon} />
          <span className={classes.text}>Unverified</span>
        </div>
        {showTooltip && (
          <div className="absolute z-50 w-64 p-3 mt-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg -left-24">
            <p className="font-semibold mb-1">No Blockchain Verification</p>
            <p className="text-gray-300">{error || 'This business has not verified their reputation on the Cardano blockchain yet.'}</p>
          </div>
        )}
      </div>
    );
  }

  if (!reputation.onChain || !reputation.verified) {
    return (
      <div className="relative inline-block">
        <div 
          className={`inline-flex items-center gap-2 ${classes.badge} bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full cursor-help ${className}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <AlertCircle className={classes.icon} />
          <span className={classes.text}>Not Verified</span>
        </div>
        {showTooltip && (
          <div className="absolute z-50 w-64 p-3 mt-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg -left-24">
            <p className="font-semibold mb-1">⚠️ Not Blockchain Verified</p>
            <p className="text-gray-300">
              This business's reputation is tracked but has not been cryptographically verified on the Cardano blockchain.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Verified and on-chain
  return (
    <div className={`${showDetails ? 'block' : 'inline-block'} ${className}`}>
      <div className="relative inline-block">
        <button
          onClick={openExplorer}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`inline-flex items-center gap-2 ${classes.badge} bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100 transition-colors cursor-pointer`}
        >
          <Shield className={`${classes.icon} fill-green-700`} />
          <span className={classes.text}>Blockchain Verified</span>
          <ExternalLink className={`${classes.icon}`} />
        </button>

        {showTooltip && (
          <div className="absolute z-50 w-80 p-4 mt-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl -left-32">
            <div className="flex items-start gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-400 mb-1">✓ Cryptographically Verified</p>
                <p className="text-gray-300 leading-relaxed">
                  This business's reputation score has been independently verified and recorded on the Cardano blockchain. 
                  The data cannot be altered or manipulated.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
              {businessName && (
                <p className="text-gray-400">
                  <span className="font-medium">Business:</span> {businessName}
                </p>
              )}
              {reputation.overallScore !== null && (
                <p className="text-gray-400">
                  <span className="font-medium">Score:</span> {reputation.overallScore}/1000
                </p>
              )}
              {reputation.timestamp && (
                <p className="text-gray-400">
                  <span className="font-medium">Verified:</span> {new Date(reputation.timestamp).toLocaleDateString()}
                </p>
              )}
              <p className="text-green-400 font-medium mt-2">
                Click to view on Cardano Explorer →
              </p>
            </div>
          </div>
        )}
      </div>

      {showDetails && reputation.overallScore !== null && (
        <div className="mt-2 text-xs text-gray-600">
          <p>Reputation Score: <span className="font-semibold text-gray-900">{reputation.overallScore}/1000</span></p>
          {reputation.timestamp && (
            <p className="text-gray-500">
              Last Updated: {new Date(reputation.timestamp).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
