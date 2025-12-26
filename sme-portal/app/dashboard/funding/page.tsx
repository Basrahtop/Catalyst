"use client";
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api'; 
import { 
  Loader2, 
  AlertCircle, 
  BarChart2, 
  CheckCircle, 
  FileWarning, 
  CalendarCheck,
  TrendingUp,
  Briefcase,
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '../../../components/Modal';
import ReportProfitForm from '../../../components/ReportProfitForm';
import ProfitReportList from '../../../components/ProfitReportList';

// --- Interfaces ---
interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  type: 'PROFIT_SHARE' | 'FINAL_PAYMENT';
  status: 'PENDING' | 'UPCOMING' | 'LATE' | 'PAID';
  totalDueFromSME: number | null;
  request: {
    id: string;
    profitSharePercentage: number;
    purpose: string;
    amount: number;
    termInMonths: number;
  };
}

interface GroupedLoan {
  requestId: string;
  purpose: string;
  amount: number;
  termInMonths: number;
  installments: PaymentInstallment[];
  isCompleted: boolean; // Helper to sort them
}

// --- Helpers ---
const formatNaira = (amount: number | null) => {
  if (amount === null) return "N/A";
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount / 100);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// --- SUB-COMPONENT: The Loan Card ---
const LoanCard = ({ loan, onReportClick }: { loan: GroupedLoan, onReportClick: (inst: PaymentInstallment) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const nextDue = loan.installments.find(inst => inst.status !== 'PAID');
  const paidCount = loan.installments.filter(i => i.status === 'PAID').length;
  const progress = (paidCount / loan.installments.length) * 100;
  const isCompleted = loan.isCompleted;

  return (
    <div className={`rounded-2xl shadow-lg border overflow-hidden transition-all hover:shadow-xl ${isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100'}`}>
      {/* Header */}
      <div className={`p-5 border-b ${isCompleted ? 'bg-gray-100 border-gray-200' : 'bg-indigo-50 border-indigo-100'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className={`font-bold text-lg flex items-center ${isCompleted ? 'text-gray-600' : 'text-indigo-900'}`}>
              <Briefcase className={`w-5 h-5 mr-2 ${isCompleted ? 'text-gray-400' : 'text-indigo-600'}`} />
              {loan.purpose}
            </h3>
            <p className={`text-xs mt-1 font-medium ${isCompleted ? 'text-gray-500' : 'text-indigo-600'}`}>
              Capital: {formatNaira(loan.amount)}
            </p>
          </div>
          <div className="text-right">
             {isCompleted ? (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                 <CheckCircle className="w-3 h-3 mr-1"/> Completed
               </span>
             ) : (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                 {paidCount} of {loan.installments.length} Paid
               </span>
             )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-600'}`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Next Action (Only for Active Loans) */}
      {!isCompleted && nextDue && (
        <div className="p-5 bg-white">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Next Payment Due
          </p>
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {nextDue.installmentNumber}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {nextDue.type === 'FINAL_PAYMENT' ? 'Final Repayment' : `Month ${nextDue.installmentNumber}`}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  Due: <span className="text-red-500">{formatDate(nextDue.dueDate)}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onReportClick(nextDue)}
              className="py-2 px-4 rounded-lg text-sm font-semibold text-white
                         bg-gradient-to-r from-indigo-600 to-blue-600 
                         hover:from-indigo-700 hover:to-blue-700
                         shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {nextDue.status === 'LATE' ? 'Report (Late)' : 'Report Profit'}
            </button>
          </div>
        </div>
      )}

      {/* Accordion */}
      <div className="border-t border-gray-100">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center py-3 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {isExpanded ? 'Hide Full Schedule' : 'View Full Schedule'}
          {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>

        {isExpanded && (
          <ul className="divide-y divide-gray-100 bg-gray-50 max-h-60 overflow-y-auto">
            {loan.installments.map((inst) => (
              <li key={inst.id} className="p-3 px-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-6 text-center ${nextDue && inst.id === nextDue.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                    #{inst.installmentNumber}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatDate(inst.dueDate)}
                  </span>
                </div>
                {inst.status === 'PAID' ? (
                  <span className="text-xs font-bold text-green-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Paid</span>
                ) : nextDue && inst.id === nextDue.id ? (
                  <span className="text-xs font-bold text-indigo-600">Due Next</span>
                ) : (
                   <span className="text-xs text-gray-400">Upcoming</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: The Smart Carousel Section ---
const LoanSection = ({ 
  title, 
  loans, 
  onReportClick, 
  icon: Icon 
}: { 
  title: string, 
  loans: GroupedLoan[], 
  onReportClick: (inst: PaymentInstallment) => void,
  icon: any 
}) => {
  const [page, setPage] = useState(0);
  const loansPerPage = 2;
  
  // Reset page if loans change
  useEffect(() => setPage(0), [loans]);

  const totalPages = Math.ceil(loans.length / loansPerPage);
  const displayedLoans = loans.slice(page * loansPerPage, (page + 1) * loansPerPage);
  
  const handleNext = () => setPage(p => Math.min(p + 1, totalPages - 1));
  const handlePrev = () => setPage(p => Math.max(p - 1, 0));

  if (loans.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Icon className="w-5 h-5 mr-2 text-indigo-600" />
          {title} ({loans.length})
        </h2>
        
        {/* Carousel Controls (Only if > 2 loans) */}
        {loans.length > 2 && (
          <div className="flex space-x-2">
            <button 
              onClick={handlePrev}
              disabled={page === 0}
              className="p-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleNext}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* The Grid: items-start fixes the "stretching" bug */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {displayedLoans.map(loan => (
          <LoanCard key={loan.requestId} loan={loan} onReportClick={onReportClick} />
        ))}
      </div>
    </div>
  );
};


// --- MAIN PAGE ---
export default function FundingPage() {
  const [activeLoans, setActiveLoans] = useState<GroupedLoan[]>([]);
  const [completedLoans, setCompletedLoans] = useState<GroupedLoan[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportKey, setReportKey] = useState(0);
  const [installmentToReport, setInstallmentToReport] = useState<PaymentInstallment | null>(null);
  
  const router = useRouter();

  const fetchInstallments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<PaymentInstallment[]>('/profit-reports/my-reports');
      
      const groups: { [key: string]: GroupedLoan } = {};
      response.data.forEach(inst => {
        const reqId = inst.request.id;
        if (!groups[reqId]) {
          groups[reqId] = {
            requestId: reqId,
            purpose: inst.request.purpose,
            amount: inst.request.amount,
            termInMonths: inst.request.termInMonths || 0,
            installments: [],
            isCompleted: false
          };
        }
        groups[reqId].installments.push(inst);
      });

      // Sort installments and Determine Status
      const active: GroupedLoan[] = [];
      const completed: GroupedLoan[] = [];

      Object.values(groups).forEach(group => {
        group.installments.sort((a, b) => a.installmentNumber - b.installmentNumber);
        
        // A loan is completed if ALL installments are PAID
        const isFullyPaid = group.installments.every(inst => inst.status === 'PAID');
        group.isCompleted = isFullyPaid;

        if (isFullyPaid) {
          completed.push(group);
        } else {
          active.push(group);
        }
      });

      setActiveLoans(active);
      setCompletedLoans(completed);

    } catch (err) {
      setError('Could not load data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  const handleReportSubmitted = (newReport: any) => {
    setInstallmentToReport(null);
    setReportKey(k => k + 1);
    fetchInstallments();
    router.push(`/dashboard/reports/${newReport.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Funding</h1>
        <p className="mt-1 text-gray-600">Manage active loans and view history.</p>
      </div>

      <div className="min-h-[10rem]">
        {isLoading && activeLoans.length === 0 && completedLoans.length === 0 ? (
           <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
        ) : (
          <>
            {/* SECTION 1: Active Loans (Carousel if > 2) */}
            {activeLoans.length > 0 ? (
              <LoanSection 
                title="Active Investments" 
                loans={activeLoans} 
                onReportClick={setInstallmentToReport}
                icon={TrendingUp}
              />
            ) : (
              <div className="flex flex-col justify-center items-center h-48 text-center p-6 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-200 mb-10">
                <BarChart2 className="w-16 h-16 text-gray-300" />
                <h3 className="mt-3 text-lg font-semibold text-gray-500">No Active Loans</h3>
              </div>
            )}

            {/* SECTION 2: Completed Loans (Carousel if > 2) */}
            {completedLoans.length > 0 && (
               <LoanSection 
                 title="Completed Investments" 
                 loans={completedLoans} 
                 onReportClick={() => {}} // No action for completed
                 icon={History}
               />
            )}
          </>
        )}
      </div>

      {/* History List */}
      <div className="mt-12">
        <ProfitReportList refreshKey={reportKey} />
      </div>

      {/* Modal */}
      {installmentToReport && (
        <Modal 
          isOpen={!!installmentToReport} 
          onClose={() => setInstallmentToReport(null)} 
          title="Report Profit"
        >
          <ReportProfitForm 
            request={{ id: installmentToReport.id, profitSharePercentage: installmentToReport.request.profitSharePercentage }}
            onClose={() => setInstallmentToReport(null)}
            onSuccess={handleReportSubmitted}
          />
        </Modal>
      )}
    </div>
  );
}