"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { Loader2, AlertCircle, ArrowLeft, Check, Hourglass, Shield, CheckCircle2 } from 'lucide-react';

// 1. Define the "shape" of our Full Profit Report
interface PaymentInstallment {
  id: string;
  month: number | null;
  year: number | null;
  installmentNumber: number;
  type: 'PROFIT_SHARE' | 'FINAL_PAYMENT'; // We need this to check for final payment
  status: 'PENDING' | 'UPCOMING' | 'LATE' | 'PAID';
  reportedProfit: number | null;
  lenderGrossShare: number | null;
  smeGrossShare: number | null;
  platformFeeFromLender: number | null;
  platformFeeFromSME: number | null;
  agentCommission: number | null;
  totalDueFromSME: number | null;
  totalDueToLender: number | null;
  totalDueToAgent: number | null;
  platformTotalRevenue: number | null;
  platformNetRevenue: number | null;
  riskWalletContribution: number | null;
  platformFinalProfit: number | null;
  createdAt: string;
  request: {
    purpose: string;
    profitSharePercentage: number;
    amount: number; // We need this for the Capital Repayment amount
  };
}

const formatNaira = (amountInKobo: number | null | undefined) => {
  if (amountInKobo === null || amountInKobo === undefined) {
    return "N/A";
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amountInKobo / 100);
};

const getMonthName = (month: number | null) => {
  if (month === null) return "N/A";
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'long' });
};

export default function ReportDetailPage() {
  const [installment, setInstallment] = useState<PaymentInstallment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false); 
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const params = useParams();
  const router = useRouter();
  const { token, isLoading: isAuthLoading } = useAuth();
  
  const installmentId = params.id as string;

  const fetchInstallment = useCallback(async () => {
    if (!installmentId) return;
    setIsLoading(true);
    try {
      const response = await api.get<PaymentInstallment>(`/profit-reports/${installmentId}`);
      setInstallment(response.data);
    } catch (err) {
      setError('Could not load this installment report.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [installmentId]);

  useEffect(() => {
    if (!isAuthLoading && token) {
      fetchInstallment();
    }
  }, [installmentId, isAuthLoading, token, fetchInstallment]);

  const handlePayInvoice = async () => {
    if (!installment) return;
    setIsPaying(true);
    setError('');
    setPaymentSuccess(false);

    try {
      await api.post(`/payments/report/${installment.id}`);
      setPaymentSuccess(true);
      await fetchInstallment(); 
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error && !installment) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-3 text-red-600">{error}</span>
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Funding
        </button>
      </div>
    );
  }

  if (!installment) {
    return (
      <div className="flex justify-center items-center py-20">
        <p className="text-xl text-gray-500">Invoice not found.</p>
      </div>
    );
  }

  const isPending = installment.status === 'PENDING';
  // Calculate SME's net BEFORE capital repayment is deducted (to show pure profit share)
  const smeNetProfitShare = (installment.smeGrossShare || 0) - (installment.platformFeeFromSME || 0) - (installment.agentCommission || 0);
  
  return (
    <div className="max-w-3xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Funding
      </button>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {installment.month ? `${getMonthName(installment.month)} ${installment.year} Report` : `Installment #${installment.installmentNumber}`}
              </h1>
              <p className="text-sm text-gray-500">
                For: {installment.request.purpose}
              </p>
            </div>
            {isPending ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                <Hourglass className="w-4 h-4 mr-1.5" />
                Pending Payment
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                <Check className="w-4 h-4 mr-1.5" />
                Paid
              </span>
            )}
          </div>
          
          <hr className="my-6" />
          
          {paymentSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-green-800">Payment Successful!</h3>
                <p className="text-sm text-green-700">Your profit share has been distributed. Thank you!</p>
              </div>
            </div>
          )}

          {/* --- The "4-Way Split" Breakdown --- */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Payment Breakdown</h2>
            
            {installment.reportedProfit !== null ? (
              <>
                {/* Total Profit */}
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Total Profit Reported:</p>
                  <p className="text-lg font-medium text-gray-900">{formatNaira(installment.reportedProfit)}</p>
                </div>
                
                <hr className="my-2 border-dashed" />

                {/* Your (SME) Payout Calculation */}
                <div>
                  <p className="font-semibold text-gray-800">Your (SME) Payout:</p>
                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600">Your Gross Share:</p>
                      <p className="text-gray-900">{formatNaira(installment.smeGrossShare)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600">Platform Fee (20% of your share):</p>
                      <p className="text-gray-900 text-red-600">-{formatNaira(installment.platformFeeFromSME)}</p>
                    </div>
                    {(installment.agentCommission || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-gray-600">Agent Commission (5% of your share):</p>
                        <p className="text-gray-900 text-red-600">-{formatNaira(installment.agentCommission)}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                      <p className="font-semibold text-gray-900">Your Net Profit Share:</p>
                      <p className="font-semibold text-green-600">{formatNaira(smeNetProfitShare)}</p>
                    </div>
                  </div>
                </div>

                {/* Lender's Payout Calculation */}
                <div>
                  <p className="font-semibold text-gray-800">Lender's Payout:</p>
                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600">Lender's Gross Share ({installment.request.profitSharePercentage}%):</p>
                      <p className="text-gray-900">{formatNaira(installment.lenderGrossShare)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600">Platform Fee (10% of their share):</p>
                      <p className="text-gray-900 text-red-600">-{formatNaira(installment.platformFeeFromLender)}</p>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                      <p className="font-semibold text-gray-900">Lender's Net Payout (What they receive):</p>
                      <p className="font-semibold text-green-600">{formatNaira(installment.totalDueToLender)}</p>
                    </div>
                  </div>
                </div>
                
                {/* --- NEW: Capital Repayment Line Item --- */}
                {/* Only shows if this is a FINAL_PAYMENT */}
                {installment.type === 'FINAL_PAYMENT' && (
                  <>
                    <hr className="my-4 border-dashed" />
                    <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="font-semibold text-yellow-900">Original Capital Repayment:</p>
                      <p className="font-bold text-yellow-900">{formatNaira(installment.request.amount)}</p>
                    </div>
                  </>
                )}
                {/* --- END OF NEW LINE ITEM --- */}
                
                <hr className="my-4" />

                {/* Your Total Due (The "Invoice") */}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-lg font-bold text-gray-900">Total Due From You:</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatNaira(installment.totalDueFromSME)}</p>
                </div>
              </>
            ) : (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">You have not reported your profit for this period yet.</p>
                <p className="text-sm text-gray-500">Please submit your report to see the payment breakdown.</p>
              </div>
            )}
            
            {isPending && installment.reportedProfit !== null && (
              <button
                onClick={handlePayInvoice}
                disabled={isPaying}
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white 
                           bg-gradient-to-r from-green-500 to-emerald-600 
                           hover:from-green-600 hover:to-emerald-700
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                           transition-all duration-300 ease-in-out
                           hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]
                           disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPaying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Pay ${formatNaira(installment.totalDueFromSME)} Now`
                )}
              </button>
            )}
            
            {error && !paymentSuccess && (
              <p className="text-sm text-red-600 text-center font-medium">{error}</p>
            )}

            {/* --- NEW: Clarified Risk Wallet Message --- */}
            {installment.status === 'PAID' && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
                <Shield className="w-5 h-5 mr-3 flex-shrink-0" />
                <p>
                  A <strong>{formatNaira(installment.riskWalletContribution)}</strong> (10% of <strong>Platform</strong> revenue) was successfully
                  contributed to the Platform Risk Wallet for community protection.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}