import React from 'react';
import { DashboardCardType } from '../types';
import { formatCurrency } from '../data/categories';
import { ArrowUpRight, ArrowDownRight, Wallet, Users, Wifi, ChevronRight, ReceiptText } from 'lucide-react';

interface StatsCardsProps {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  paidSalaries: number;
  totalBandwidthOps: number;
  incomeCount: number;
  expenseCount: number;
  staffCount: number;
  onCardClick: (type: DashboardCardType) => void;
  onNavigateToLedger?: () => void;
  currencySymbol?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalIncome,
  totalExpense,
  netProfit,
  paidSalaries,
  totalBandwidthOps,
  incomeCount,
  expenseCount,
  staffCount,
  onCardClick,
  onNavigateToLedger,
  currencySymbol = '৳'
}) => {
  const totalCount = incomeCount + expenseCount;

  return (
    <section className="stats-dashboard grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 no-print">
      {/* 1. Total Income Card */}
      <div
        id="card-stat-income"
        onClick={() => onCardClick('income')}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white cursor-pointer transition-all duration-200 active:scale-97 select-none shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          boxShadow: '0 6px 18px rgba(16, 185, 129, 0.2)'
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-emerald-100 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            <span className="truncate">মোট আয়</span>
          </span>
          <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-black mt-2 tracking-tight truncate">
          {formatCurrency(totalIncome, currencySymbol)}
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-100 mt-2 pt-1.5 border-t border-white/20">
          <span>{incomeCount} টি এন্ট্রি</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            দেখান <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 2. Total Expense Card */}
      <div
        id="card-stat-expense"
        onClick={() => onCardClick('expense')}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white cursor-pointer transition-all duration-200 active:scale-97 select-none shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)',
          boxShadow: '0 6px 18px rgba(239, 68, 68, 0.2)'
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-rose-100 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse"></span>
            <span className="truncate">মোট ব্যয়</span>
          </span>
          <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-black mt-2 tracking-tight truncate">
          {formatCurrency(totalExpense, currencySymbol)}
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-rose-100 mt-2 pt-1.5 border-t border-white/20">
          <span>{expenseCount} টি খাত</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            দেখান <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 3. Net Profit Card */}
      <div
        id="card-stat-profit"
        onClick={() => onCardClick('net_profit')}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white cursor-pointer transition-all duration-200 active:scale-97 select-none shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          boxShadow: '0 6px 18px rgba(124, 58, 237, 0.2)'
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-purple-100 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300"></span>
            <span className="truncate">নিট ব্যালেন্স</span>
          </span>
          <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-black mt-2 tracking-tight truncate">
          {formatCurrency(netProfit, currencySymbol)}
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-purple-100 mt-2 pt-1.5 border-t border-white/20">
          <span>{netProfit >= 0 ? 'উদ্বৃত্ত তহবিল' : 'ঘাটতি'}</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            স্টেটমেন্ট <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 4. Staff Salary Card */}
      <div
        id="card-stat-staff-salary"
        onClick={() => onCardClick('staff_salary')}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white cursor-pointer transition-all duration-200 active:scale-97 select-none shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          boxShadow: '0 6px 18px rgba(37, 99, 235, 0.2)'
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-blue-100 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
            <span className="truncate">স্টাফ বেতন</span>
          </span>
          <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
            <Users className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-black mt-2 tracking-tight truncate">
          {formatCurrency(paidSalaries, currencySymbol)}
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-blue-100 mt-2 pt-1.5 border-t border-white/20">
          <span>{staffCount} জন স্টাফ</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            হিসাব <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 5. Bandwidth & Operations Card */}
      <div
        id="card-stat-bandwidth"
        onClick={() => onCardClick('bandwidth_ops')}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white cursor-pointer transition-all duration-200 active:scale-97 select-none shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
          boxShadow: '0 6px 18px rgba(6, 182, 212, 0.2)'
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-cyan-100 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300"></span>
            <span className="truncate">ব্যান্ডউইথ/অপস</span>
          </span>
          <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
            <Wifi className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-black mt-2 tracking-tight truncate">
          {formatCurrency(totalBandwidthOps, currencySymbol)}
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-cyan-100 mt-2 pt-1.5 border-t border-white/20">
          <span>আপস্ট্রিম ও ফাইবার</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            দেখান <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 6. Total Transactions Record Card */}
      <div
        id="card-stat-all-records"
        onClick={() => {
          if (onNavigateToLedger) {
            onNavigateToLedger();
          } else {
            onCardClick('net_profit');
          }
        }}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white cursor-pointer transition-all duration-200 active:scale-97 select-none shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          boxShadow: '0 6px 18px rgba(79, 70, 229, 0.2)'
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-indigo-100 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
            <span className="truncate">মোট এন্ট্রি</span>
          </span>
          <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
            <ReceiptText className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-base sm:text-xl md:text-2xl font-black mt-2 tracking-tight truncate">
          {totalCount} টি
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-indigo-100 mt-2 pt-1.5 border-t border-white/20">
          <span>সর্বমোট রেকর্ড</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            খতিয়ান <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </section>
  );
};
