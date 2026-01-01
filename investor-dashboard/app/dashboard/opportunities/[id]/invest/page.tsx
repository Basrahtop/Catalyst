'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import InvestmentForm from '@/components/InvestmentForm';
import api from '@/lib/api';

interface FundingRequest {
  id: string;
  amount: number;
  amountFunded: number;
  termInMonths: number;
  repaymentFrequency: string;
  acceptedCurrencies: ('NGN' | 'ADA' | 'USDM')[];
  sme: {
    businessName: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function InvestPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [fundingRequest, setFundingRequest] = useState<FundingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchFundingRequest = async () => {
      try {
        const response = await api.get('/funding-requests');
        const requests = response.data;
        const found = requests.find((r: FundingRequest) => r.id === params.id);
        
        if (!found) {
          setError('Funding request not found');
        } else {
          setFundingRequest(found);
        }
      } catch (err: any) {
        console.error('Error fetching funding request:', err);
        setError(err.response?.data?.error || 'Failed to load funding request');
      } finally {
        setLoading(false);
      }
    };

    fetchFundingRequest();
  }, [user, router, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !fundingRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold mb-2">Error</p>
            <p>{error || 'Funding request not found'}</p>
            <button
              onClick={() => router.push('/dashboard/opportunities')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Opportunities
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <InvestmentForm fundingRequest={fundingRequest} />
    </div>
  );
}
