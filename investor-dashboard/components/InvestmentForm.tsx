'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CurrencySelector, { Currency } from '@/components/CurrencySelector';
import { useWallet } from '@/context/WalletContext';
import api from '@/lib/api';
import { cardanoTransactionService } from '@/lib/cardano-transaction.service';

interface FundingRequest {
  id: string;
  amount: number;
  amountFunded: number;
  termInMonths: number;
  repaymentFrequency: string;
  acceptedCurrencies: Currency[];
  sme: {
    businessName: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface InvestmentFormProps {
  fundingRequest: FundingRequest;
}

export default function InvestmentForm({ fundingRequest }: InvestmentFormProps) {
  const router = useRouter();
  const { isConnected } = useWallet();
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<{ ADA: number; USDM: number }>({ ADA: 0, USDM: 0 });

  const remainingAmount = fundingRequest.amount - fundingRequest.amountFunded;
  const fundingProgress = (fundingRequest.amountFunded / fundingRequest.amount) * 100;

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const ratesRes = await api.get('/exchange-rates');
        setExchangeRates({
          ADA: ratesRes.data.ADA / 100,  // Convert kobo to Naira
          USDM: ratesRes.data.USDM / 100, // Convert kobo to Naira
        });
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
      }
    };
    fetchRates();
  }, []);

  // Auto-fill with remaining amount when component loads
  useEffect(() => {
    if (remainingAmount > 0 && !amount) {
      if (currency === 'NGN') {
        setAmount((remainingAmount / 100).toFixed(2));
      } else if (exchangeRates[currency] > 0) {
        const remainingNGN = remainingAmount / 100;
        const equivalentAmount = remainingNGN / exchangeRates[currency];
        setAmount(equivalentAmount.toFixed(currency === 'ADA' ? 6 : 2));
      }
    }
  }, [remainingAmount, currency, exchangeRates, amount]);

  // Auto-calculate equivalent amount when currency changes
  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    
    // Auto-fill with remaining amount equivalent if switching from NGN
    if (newCurrency !== 'NGN' && exchangeRates[newCurrency] > 0) {
      const remainingNGN = remainingAmount / 100; // Convert from kobo to Naira
      const equivalentAmount = remainingNGN / exchangeRates[newCurrency];
      setAmount(equivalentAmount.toFixed(newCurrency === 'ADA' ? 6 : 2));
    } else if (newCurrency === 'NGN') {
      // Auto-fill with remaining NGN amount
      setAmount((remainingAmount / 100).toFixed(2));
    }
  };

  const handleInvest = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      // Validate minimum investment (₦1 or equivalent)
      const minAmount = currency === 'NGN' ? 1 : 0.01;
      if (parseFloat(amount) < minAmount) {
        setError(`Minimum investment is ${currency === 'NGN' ? '₦1.00' : `${minAmount} ${currency}`}`);
        return;
      }

      // Check if wallet is required but not connected
      if (currency !== 'NGN' && !isConnected) {
        setError('Please connect your Cardano wallet first');
        return;
      }

      // Convert amount to smallest unit
      const amountInSmallestUnit = currency === 'NGN'
        ? Math.floor(parseFloat(amount) * 100) // Convert to kobo
        : Math.floor(parseFloat(amount) * 1000000); // Convert to lovelace/microUSDM

      // Handle NGN investment (direct backend call)
      if (currency === 'NGN') {
        const response = await api.patch(`/funding-requests/${fundingRequest.id}/approve`, {
          fundingAmount: amountInSmallestUnit,
          currency,
        });

        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/portfolio');
        }, 2000);
        return;
      }

      // Handle ADA/USDM investment (two-step process with wallet signing)
      
      // Step 1: Prepare transaction parameters
      const prepareResponse = await api.post('/cardano-investment/prepare', {
        fundingRequestId: fundingRequest.id,
        amount: amountInSmallestUnit.toString(),
        currency,
      });

      const txParams = prepareResponse.data;

      // Step 2: Get wallet API from browser
      const cardanoWindow = window as any;
      let walletApi;
      
      if (cardanoWindow.cardano?.nami) {
        walletApi = await cardanoWindow.cardano.nami.enable();
      } else if (cardanoWindow.cardano?.eternl) {
        walletApi = await cardanoWindow.cardano.eternl.enable();
      } else if (cardanoWindow.cardano?.flint) {
        walletApi = await cardanoWindow.cardano.flint.enable();
      } else {
        throw new Error('No Cardano wallet found. Please install Nami, Eternl, or Flint.');
      }

      // Step 3: Build and sign transaction using user's wallet
      setError('Please sign the transaction in your wallet...');
      const txHash = await cardanoTransactionService.lockFundsInEscrow(walletApi, txParams);

      // Step 4: Confirm investment on backend
      setError('Confirming transaction...');
      await api.post('/cardano-investment/confirm', {
        fundingRequestId: fundingRequest.id,
        amount: amountInSmallestUnit.toString(),
        currency,
        txHash,
        exchangeRate: txParams.exchangeRate,
        amountInNGN: txParams.amountInNGN,
      });

      setSuccess(true);
      setError(null);
      setTimeout(() => {
        router.push('/dashboard/portfolio');
      }, 2000);

    } catch (err: any) {
      console.error('Investment error:', err);
      setError(err.response?.data?.error || err.message || 'Investment failed');
    } finally {
      setLoading(false);
    }
  };

  // Check if currency is accepted
  const currencyAccepted = fundingRequest.acceptedCurrencies.includes(currency);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        <svg
          className="w-5 h-5 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Opportunity
      </button>

      {/* Funding Request Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Invest in {fundingRequest.sme.businessName}
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">SME Owner:</span>
            <span className="font-semibold text-gray-900">
              {fundingRequest.sme.user.firstName} {fundingRequest.sme.user.lastName}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Funding Goal:</span>
            <span className="font-semibold text-gray-900">₦{(fundingRequest.amount / 100).toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Amount Funded:</span>
            <span className="font-medium text-green-600">
              ₦{(fundingRequest.amountFunded / 100).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-gray-900 font-semibold">Available to Invest:</span>
            <span className="font-bold text-blue-700 text-lg">
              ₦{(remainingAmount / 100).toLocaleString()}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700 font-medium">
              <span>Progress</span>
              <span>{fundingProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${fundingProgress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Term:</span>
            <span className="font-semibold text-gray-900">{fundingRequest.termInMonths} months</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Repayment:</span>
            <span className="font-semibold text-gray-900">{fundingRequest.repaymentFrequency}</span>
          </div>

          {/* Accepted Currencies */}
          <div className="flex justify-between items-start">
            <span className="text-gray-700 font-medium">Accepted Currencies:</span>
            <div className="flex gap-2">
              {fundingRequest.acceptedCurrencies.map((curr) => (
                <span
                  key={curr}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {curr}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Make Your Investment</h3>

        <CurrencySelector
          amount={amount}
          selectedCurrency={currency}
          onCurrencyChange={handleCurrencyChange}
          onAmountChange={setAmount}
          label="Investment Amount"
          showBalance={true}
          showExchangeRate={true}
        />

        {/* Currency Not Accepted Warning */}
        {!currencyAccepted && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-orange-500 mt-0.5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-orange-700">
                This funding request does not accept {currency}. Please choose from:{' '}
                {fundingRequest.acceptedCurrencies.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Investment successful! Redirecting to your investments...
            </p>
          </div>
        )}

        {/* Invest Button */}
        <button
          onClick={handleInvest}
          disabled={loading || !currencyAccepted || success}
          className={`mt-6 w-full py-4 rounded-lg font-semibold text-white transition-colors ${
            loading || !currencyAccepted || success
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : success ? 'Investment Successful!' : 'Invest Now'}
        </button>

        {/* Security Notice for Blockchain */}
        {currency !== 'NGN' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mt-0.5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Blockchain Security</p>
                <p>
                  Your {currency} investment will be locked in a smart contract escrow. Funds will
                  be released to the SME only when the funding goal is met and approved by our
                  oracle.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
