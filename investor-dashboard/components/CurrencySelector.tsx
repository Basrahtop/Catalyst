'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

export type Currency = 'NGN' | 'ADA' | 'USDM';

interface Balance {
  ngn: number;
  ada: number;
  usdm: number;
}

interface ExchangeRate {
  ADA: number;
  USDM: number;
}

interface CurrencySelectorProps {
  amount: string; // Amount in selected currency
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onAmountChange: (amount: string) => void;
  label?: string;
  showBalance?: boolean;
  showExchangeRate?: boolean;
}

export default function CurrencySelector({
  amount,
  selectedCurrency,
  onCurrencyChange,
  onAmountChange,
  label = 'Investment Amount',
  showBalance = true,
  showExchangeRate = true,
}: CurrencySelectorProps) {
  const { walletAddress, isConnected } = useWallet();
  const [balance, setBalance] = useState<Balance>({ ngn: 0, ada: 0, usdm: 0 });
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate>({ ADA: 0, USDM: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch balance and exchange rates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch balance
        const balanceRes = await fetch('/api/wallet/balance', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!balanceRes.ok) throw new Error('Failed to fetch balance');
        const balanceData = await balanceRes.json();
        setBalance(balanceData);

        // Fetch exchange rates
        const ratesRes = await fetch('/api/exchange-rates');
        if (!ratesRes.ok) throw new Error('Failed to fetch exchange rates');
        const ratesData = await ratesRes.json();
        setExchangeRates({
          ADA: ratesData.ADA,
          USDM: ratesData.USDM,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConnected]);

  // Calculate NGN equivalent
  const calculateNGNEquivalent = () => {
    if (!amount || isNaN(Number(amount))) return '0.00';

    const amountNum = parseFloat(amount);
    if (selectedCurrency === 'NGN') {
      return amountNum.toFixed(2);
    } else if (selectedCurrency === 'ADA') {
      return (amountNum * exchangeRates.ADA).toFixed(2);
    } else if (selectedCurrency === 'USDM') {
      return (amountNum * exchangeRates.USDM).toFixed(2);
    }
    return '0.00';
  };

  // Get currency symbol
  const getCurrencySymbol = (curr: Currency) => {
    switch (curr) {
      case 'NGN':
        return '₦';
      case 'ADA':
        return '₳';
      case 'USDM':
        return '$';
    }
  };

  // Get balance for currency
  const getBalance = (curr: Currency) => {
    switch (curr) {
      case 'NGN':
        return (balance.ngn / 100).toFixed(2); // Convert from kobo
      case 'ADA':
        return (balance.ada / 1000000).toFixed(6); // Convert from lovelace
      case 'USDM':
        return (balance.usdm / 1000000).toFixed(6); // Convert from microUSDM
    }
  };

  // Check if amount exceeds balance
  const exceedsBalance = () => {
    if (!amount || isNaN(Number(amount))) return false;
    const amountNum = parseFloat(amount);
    const currentBalance = parseFloat(getBalance(selectedCurrency));
    return amountNum > currentBalance;
  };

  // Require wallet for ADA/USDM
  const requiresWallet = selectedCurrency !== 'NGN';
  const walletNotConnected = requiresWallet && !isConnected;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Currency Tabs */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
        {(['NGN', 'ADA', 'USDM'] as Currency[]).map((curr) => (
          <button
            key={curr}
            type="button"
            onClick={() => onCurrencyChange(curr)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedCurrency === curr
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={loading}
          >
            {getCurrencySymbol(curr)} {curr}
          </button>
        ))}
      </div>

      {/* Amount Input */}
      <div className="relative">
        <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <span className="pl-4 pr-2 text-gray-500 text-lg">
            {getCurrencySymbol(selectedCurrency)}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="flex-1 py-3 pr-4 focus:outline-none rounded-r-lg"
            placeholder="0.00"
            step={selectedCurrency === 'NGN' ? '100' : '0.000001'}
            min="0"
            disabled={loading || walletNotConnected}
          />
        </div>

        {/* Validation Messages */}
        {exceedsBalance() && (
          <p className="mt-1 text-sm text-red-600">
            Insufficient balance
          </p>
        )}

        {walletNotConnected && (
          <p className="mt-1 text-sm text-orange-600">
            Please connect your Cardano wallet to invest with {selectedCurrency}
          </p>
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Balance Display */}
      {showBalance && !loading && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Available Balance:</span>
            <span className="font-medium text-gray-900">
              {getCurrencySymbol(selectedCurrency)} {getBalance(selectedCurrency)} {selectedCurrency}
            </span>
          </div>

          {/* Show blockchain badge for ADA/USDM */}
          {requiresWallet && isConnected && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Connected Wallet</span>
              <span className="flex items-center space-x-1">
                <svg
                  className="w-3 h-3 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-mono text-xs">
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Exchange Rate Display */}
      {showExchangeRate && selectedCurrency !== 'NGN' && !loading && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Rate:</span>
            <span className="font-medium text-gray-900">
              1 {selectedCurrency} = ₦{exchangeRates[selectedCurrency].toLocaleString()}
            </span>
          </div>
          {amount && parseFloat(amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Equivalent:</span>
              <span className="font-bold text-blue-600">
                ₦{Number(calculateNGNEquivalent()).toLocaleString()} NGN
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
