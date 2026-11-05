import React, { useState, useMemo } from 'react';
import { Transaction, MonthlyStats, DashboardCardType } from '../types';
import { isIncomeTransaction, isExpenseTransaction, parseNumber } from '../data/categories';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  Zap, 
  Radio, 
  Users, 
  Layers, 
  Printer, 
  DollarSign, 
  Wallet,
  Scale
} from 'lucide-react';

interface VisualAnalyticsProps {
  transactions: Transaction[];
  currencySymbol?: string;
  onOpenCardDetail?: (type: DashboardCardType) => void;
}

export const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({
  transactions,
  currencySymbol = '৳',
  onOpenCardDetail,
}) => {
  const [timeRange, setTimeRange] = useState<'6months' | '12months' | 'all'>('6months');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // empty means aggregate or latest

  // Compute monthly data aggregated from transactions
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number; count: number }> = {};

    transactions.forEach(t => {
      if (!t.date) return;
      const monthKey = t.date.slice(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, income: 0, expense: 0, count: 0 };
      }
      const amt = parseNumber(t.amount);
      if (isIncomeTransaction(t)) {
        map[monthKey].income += amt;
      } else {
        map[monthKey].expense += amt;
      }
      map[monthKey].count += 1;
    });

    // Sort chronologically
    const sorted = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    return sorted;
  }, [transactions]);

  // Sliced monthly data based on timeRange
  const displayedMonths = useMemo(() => {
    if (monthlyData.length === 0) return [];
    if (timeRange === '6months') {
      return monthlyData.slice(-6);
    }
    if (timeRange === '12months') {
      return monthlyData.slice(-12);
    }
    return monthlyData;
  }, [monthlyData, timeRange]);

  // Current active month to show breakdown for
  const activeMonthKey = selectedMonth || (monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].month : new Date().toISOString().slice(0, 7));

  // Transactions in the active month
  const activeMonthTxns = useMemo(() => {
    return transactions.filter(t => t.date && t.date.startsWith(activeMonthKey));
  }, [transactions, activeMonthKey]);

  // Active month totals
  const activeMonthIncome = useMemo(() => {
    return activeMonthTxns.filter(t => isIncomeTransaction(t)).reduce((acc, curr) => acc + parseNumber(curr.amount), 0);
  }, [activeMonthTxns]);

  const activeMonthExpense = useMemo(() => {
    return activeMonthTxns.filter(t => isExpenseTransaction(t)).reduce((acc, curr) => acc + parseNumber(curr.amount), 0);
  }, [activeMonthTxns]);

  const activeMonthProfit = activeMonthIncome - activeMonthExpense;
  const activeMonthMargin = activeMonthIncome > 0 ? ((activeMonthProfit / activeMonthIncome) * 100) : 0;

  // Bandwidth cost in active month (critical ISP metric)
  const bandwidthCost = useMemo(() => {
    return activeMonthTxns
      .filter(t => isExpenseTransaction(t) && (String(t.category || '').includes('ব্যান্ডউইথ') || String(t.category || '').includes('আপস্ট্রিম') || String(t.category || '').includes('Bandwidth')))
      .reduce((acc, curr) => acc + parseNumber(curr.amount), 0);
  }, [activeMonthTxns]);

  const bandwidthRatio = activeMonthIncome > 0 ? ((bandwidthCost / activeMonthIncome) * 100) : 0;

  // Expense categories breakdown
  const expenseCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeMonthTxns.filter(t => isExpenseTransaction(t)).forEach(t => {
      const cat = t.category || 'অন্যান্য';
      map[cat] = (map[cat] || 0) + parseNumber(t.amount);
    });

    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeMonthTxns]);

  // Income categories breakdown
  const incomeCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeMonthTxns.filter(t => isIncomeTransaction(t)).forEach(t => {
      const cat = t.category || 'অন্যান্য';
      map[cat] = (map[cat] || 0) + parseNumber(t.amount);
    });

    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeMonthTxns]);

  // Max value for bar chart scaling
  const maxBarValue = useMemo(() => {
    let max = 1000;
    displayedMonths.forEach(m => {
      if (m.income > max) max = m.income;
      if (m.expense > max) max = m.expense;
    });
    return max * 1.15; // 15% head room
  }, [displayedMonths]);

  // Format month name to Bengali
  const formatMonthBengali = (ym: string) => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    const bengaliMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const mIdx = parseInt(month, 10) - 1;
    const bMonth = bengaliMonths[mIdx] || month;
    return `${bMonth} '${year.slice(2)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              ভিজ্যুয়াল অ্যানালিটিক্স ও লাভ-লোকসান চার্ট
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ইন্টারনেট ও ক্যাবল নেটওয়ার্কের আয়, ব্যয়, মার্জিন ও ব্যয়ের বিশ্লেষণ
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold">
            <button
              onClick={() => setTimeRange('6months')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                timeRange === '6months'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ৬ মাস
            </button>
            <button
              onClick={() => setTimeRange('12months')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                timeRange === '12months'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ১ বছর
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              সব সময়
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition no-print cursor-pointer"
            title="রিপোর্ট প্রিন্ট করুন"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards for the Active Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Active Month Income */}
        <div 
          onClick={() => onOpenCardDetail && onOpenCardDetail('income')}
          className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {formatMonthBengali(activeMonthKey)} আয়
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {currencySymbol} {activeMonthIncome.toLocaleString('bn-BD')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">বিল কালেকশন ও অন্যান্য</p>
        </div>

        {/* Card 2: Active Month Expense */}
        <div 
          onClick={() => onOpenCardDetail && onOpenCardDetail('expense')}
          className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {formatMonthBengali(activeMonthKey)} মোট ব্যয়
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {currencySymbol} {activeMonthExpense.toLocaleString('bn-BD')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">ব্যান্ডউইথ, বেতন ও অপারেশন</p>
        </div>

        {/* Card 3: Net Profit / Loss */}
        <div 
          onClick={() => onOpenCardDetail && onOpenCardDetail('net_profit')}
          className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              নিট লাভ / প্রফিট
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeMonthProfit >= 0 
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' 
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black mt-2 ${
            activeMonthProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {currencySymbol} {activeMonthProfit.toLocaleString('bn-BD')}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
              activeMonthProfit >= 0 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
            }`}>
              {activeMonthMargin.toFixed(1)}% মার্জিন
            </span>
            <span className="text-[11px] text-slate-400">
              {activeMonthProfit >= 0 ? 'মুনাফাজনক' : 'ঘাটতি'}
            </span>
          </div>
        </div>

        {/* Card 4: Bandwidth Cost Ratio (Key ISP Metric) */}
        <div 
          onClick={() => onOpenCardDetail && onOpenCardDetail('bandwidth_ops')}
          className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-cyan-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ব্যান্ডউইথ অনুপাত
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-cyan-700 dark:text-cyan-400 mt-2">
            {bandwidthRatio.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            আয়ের অনুপাতে আপস্ট্রিম খরচ ({currencySymbol}{bandwidthCost.toLocaleString('bn-BD')})
          </p>
        </div>
      </div>

      {/* Main Chart Section: Monthly Income vs Expense Comparison */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>মাসিক আয় বনাম ব্যয় তুলনামূলক বার চার্ট</span>
            </h3>
            <p className="text-xs text-slate-400">
              মাসে ক্লিক করে বিস্তারিত ক্যাটাগরি বিশ্লেষণ দেখতে পারেন
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">আয় (Income)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300">ব্যয় (Expense)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-300">নিট লাভ (Net)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        {displayedMonths.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            চার্ট দেখানোর জন্য পর্যাপ্ত লেনদেন ডাটা নেই
          </div>
        ) : (
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end h-64 sm:h-72 border-b border-slate-200 dark:border-slate-700 pb-2">
              {displayedMonths.map((m) => {
                const incomeHeightPct = Math.min(100, Math.max(8, (m.income / maxBarValue) * 100));
                const expenseHeightPct = Math.min(100, Math.max(8, (m.expense / maxBarValue) * 100));
                const netProfit = m.income - m.expense;
                const isSelected = m.month === activeMonthKey;

                return (
                  <div
                    key={m.month}
                    onClick={() => setSelectedMonth(m.month)}
                    className={`flex flex-col items-center justify-end h-full p-2 rounded-2xl transition cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-500' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Value Badge Hover */}
                    <div className="text-[10px] font-bold text-center mb-2">
                      <span className={`px-1.5 py-0.5 rounded-md ${
                        netProfit >= 0 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {netProfit >= 0 ? '+' : ''}{currencySymbol}{Math.round(netProfit / 1000)}k
                      </span>
                    </div>

                    {/* Bars Container */}
                    <div className="flex items-end gap-1.5 w-full justify-center h-44 sm:h-52">
                      {/* Income Bar */}
                      <div className="w-5 sm:w-7 flex flex-col items-center justify-end h-full">
                        <div
                          style={{ height: `${incomeHeightPct}%` }}
                          className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm transition-all duration-500 hover:brightness-110 relative group"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20 whitespace-nowrap px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold shadow-lg">
                            আয়: {currencySymbol}{m.income.toLocaleString('bn-BD')}
                          </div>
                        </div>
                      </div>

                      {/* Expense Bar */}
                      <div className="w-5 sm:w-7 flex flex-col items-center justify-end h-full">
                        <div
                          style={{ height: `${expenseHeightPct}%` }}
                          className="w-full rounded-t-xl bg-gradient-to-t from-rose-600 to-rose-400 shadow-sm transition-all duration-500 hover:brightness-110 relative group"
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20 whitespace-nowrap px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold shadow-lg">
                            ব্যয়: {currencySymbol}{m.expense.toLocaleString('bn-BD')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Month Label */}
                    <p className={`text-xs font-bold mt-2 text-center ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {formatMonthBengali(m.month)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Two Columns: Expense Breakdown vs Income Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Expense Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-rose-500" />
                <span>ব্যয়ের খাতওয়ারী বিশ্লেষণ ({formatMonthBengali(activeMonthKey)})</span>
              </h4>
              <p className="text-xs text-slate-400">কোন খাতে সবচেয়ে বেশি খরচ হচ্ছে</p>
            </div>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
              {currencySymbol} {activeMonthExpense.toLocaleString('bn-BD')}
            </span>
          </div>

          {expenseCategoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">এই মাসে কোনো খরচের রেকর্ড নেই</p>
          ) : (
            <div className="space-y-3">
              {expenseCategoryBreakdown.map((item, idx) => {
                const colors = [
                  'bg-rose-500', 'bg-indigo-500', 'bg-amber-500', 
                  'bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-slate-500'
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {currencySymbol}{item.amount.toLocaleString('bn-BD')}
                        </span>
                        <span className="w-12 text-right text-slate-800 dark:text-slate-200">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Income Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-500" />
                <span>আয়ের উৎস বিশ্লেষণ ({formatMonthBengali(activeMonthKey)})</span>
              </h4>
              <p className="text-xs text-slate-400">ইন্টারনেট, ডিস ও সংযোগ বিল</p>
            </div>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {currencySymbol} {activeMonthIncome.toLocaleString('bn-BD')}
            </span>
          </div>

          {incomeCategoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">এই মাসে কোনো আয়ের রেকর্ড নেই</p>
          ) : (
            <div className="space-y-3">
              {incomeCategoryBreakdown.map((item, idx) => {
                const colors = [
                  'bg-emerald-500', 'bg-teal-500', 'bg-blue-500', 
                  'bg-indigo-500', 'bg-violet-500', 'bg-amber-500', 'bg-slate-500'
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {currencySymbol}{item.amount.toLocaleString('bn-BD')}
                        </span>
                        <span className="w-12 text-right text-slate-800 dark:text-slate-200">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
