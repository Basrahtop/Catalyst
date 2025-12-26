"use client";
import { useWallet } from '@/context/WalletContext';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface WalletVerificationBadgeProps {
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function WalletVerificationBadge({ 
  showDetails = true,
  size = 'medium' 
}: WalletVerificationBadgeProps) {
  const { isConnected, isVerified, reputationId } = useWallet();

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-3'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  if (!isConnected) {
    return (
      <div className={`flex items-center gap-2 ${sizeClasses[size]} bg-gray-100 text-gray-600 rounded-lg border border-gray-300`}>
        <Shield className={`${iconSizes[size]} text-gray-400`} />
        <span className="font-medium">Wallet Not Connected</span>
        {showDetails && (
          <Link href="/dashboard/wallet" className="text-indigo-600 hover:text-indigo-800 ml-2">
            Connect Now
          </Link>
        )}
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className={`flex items-center gap-2 ${sizeClasses[size]} bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-300`}>
        <AlertTriangle className={`${iconSizes[size]} text-yellow-600`} />
        <div className="flex flex-col">
          <span className="font-medium">Wallet Not Verified</span>
          {showDetails && (
            <Link href="/dashboard/wallet" className="text-yellow-700 hover:text-yellow-900 text-xs underline">
              Verify to activate blockchain reputation
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]} bg-green-50 text-green-800 rounded-lg border border-green-300`}>
      <Shield className={`${iconSizes[size]} text-green-600`} />
      <div className="flex flex-col">
        <span className="font-medium">✅ Blockchain Verified</span>
        {showDetails && reputationId && (
          <div className="flex items-center gap-1 text-xs text-green-700 mt-1">
            <span className="font-mono">{reputationId.slice(0, 16)}...</span>
            <a
              href={`https://preprod.cardanoscan.io/`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-900"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
