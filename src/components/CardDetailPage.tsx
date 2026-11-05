import React, { useState, useMemo } from 'react';
import { Transaction, SalaryPayment, Staff, SheetConfig, DashboardCardType } from '../types';
import { formatCurrency, getMonthBengaliName, isIncomeTransaction, isExpenseTransaction, parseNumber, getTransactionMonth } from '../data/categories';
import { ConfirmModal } from './ConfirmModal';
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Wifi,
  Wallet,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Trash2,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface CardDetailPageProps {
  type: DashboardCardType | null;
  transactions?: Transaction[];
  salaries?: SalaryPayment[];
  staffList?: Staff[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onSelectTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => Promise<boolean> | void;
  onNavigateToStaff?: () => void;
  onNavigateToLedger?: (filter?: 'all' | 'income' | 'expense') => void;
  onViewSalarySlip?: (salary: SalaryPayment) => void;
  onOpenNewTransaction?: (type?: 'income' | 'expense', category?: string) => void;
  config?: SheetConfig;
  isAdminLoggedIn?: boolean;
}

export const CardDetailPage: React.FC<CardDetailPageProps> = ({
  type,
  transactions = [],
  salaries = [],
  staffList = [],
  selectedMonth = '',
  onMonthChange,
  onSelectTransaction,
  onDeleteTransaction,
  onNavigateToStaff,
  onNavigateToLedger,
  onViewSalarySlip,
  onOpenNewTransaction,
  config,
  isAdminLoggedIn = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'month' | 'all'>('month');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const currencySymbol = config?.currencySymbol || '৳';

  // Base list of transactions based on timeFilter
  const baseTxns = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    if (timeFilter === 'all') {
      return transactions.filter(t => Boolean(t));
    }
    return transactions.filter(t => {
      if (!t || typeof t.date !== 'string') return false;
      return getTransactionMonth(t.date) === selectedMonth;
    });
  }, [transactions, selectedMonth, timeFilter]);

  // Income transactions
  const incomeTxns = useMemo(() => {
    return baseTxns.filter(t => isIncomeTransaction(t));
  }, [baseTxns]);

  // Expense transactions
  const expenseTxns = useMemo(() => {
    return baseTxns.filter(t => isExpenseTransaction(t));
  }, [baseTxns]);

  const totalIncome = useMemo(() => {
    return incomeTxns.reduce((acc, t) => acc + parseNumber(t?.amount), 0);
  }, [incomeTxns]);

  const totalExpense = useMemo(() => {
    return expenseTxns.reduce((acc, t) => acc + parseNumber(t?.amount), 0);
  }, [expenseTxns]);

  // Bandwidth & Ops Specific Categories
  const bandwidthOpsCategories = [
    'ব্যান্ডউইথ/আপস্ট্রিম বিল',
    'বিদ্যুৎ বিল',
    'অফিস ভাড়া',
    'অপটিক্যাল ফাইবার ও কেবল',
    'ONU/OLT/Router ক্রয়',
    'স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ',
    'কেবল মেরামত ও রক্ষণাবেক্ষণ',
    'আপস্ট্রিম ব্যান্ডউইথ বিল (IIG/ITC/NTTN)',
    'ফাইবার অপটিক কেবল ও স্প্লিটার সামগ্রী',
    'রাউটার, ওএলটি (OLT) ও সুইচ যন্ত্রপাতি',
    'সার্ভার রুম ও পপ (POP) বিদ্যুৎ বিল',
    'সংযোগ মেরামত ও লাইন স্প্লাইসিং খরচ'
  ];

  const bandwidthOpsTxns = useMemo(() => {
    return baseTxns.filter(t => {
      if (!t || t.type !== 'expense') return false;
      const cat = String(t.category || '');
      return (
        bandwidthOpsCategories.includes(cat) ||
        cat.includes('ব্যান্ডউইথ') ||
        cat.includes('কেবল') ||
        cat.includes('ফাইবার') ||
        cat.includes('বিদ্যুৎ') ||
        cat.includes('ONU')
      );
    });
  }, [baseTxns]);

  const totalBandwidthOps = useMemo(() => {
    return bandwidthOpsTxns.reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);
  }, [bandwidthOpsTxns]);

  // Staff Salary Specific Data
  const monthSalaries = useMemo(() => {
    if (!Array.isArray(salaries)) return [];
    if (timeFilter === 'all') return salaries.filter(s => Boolean(s));
    return salaries.filter(s => s && String(s.month || '') === selectedMonth);
  }, [salaries, selectedMonth, timeFilter]);

  const paidSalariesTotal = useMemo(() => {
    return monthSalaries
      .filter(s => s && s.paymentStatus === 'paid')
      .reduce((acc, s) => acc + (Number(s?.netSalary) || 0), 0);
  }, [monthSalaries]);

  const pendingSalariesTotal = useMemo(() => {
    return monthSalaries
      .filter(s => s && s.paymentStatus === 'pending')
      .reduce((acc, s) => acc + (Number(s?.netSalary) || 0), 0);
  }, [monthSalaries]);

  // Category breakdown calculation helper
  const getCategoryBreakdown = (list: Transaction[], total: number) => {
    const map: Record<string, number> = {};
    (list || []).forEach(t => {
      if (t) {
        const cat = String(t.category || 'অন্যান্য');
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      }
    });
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Memoize activeTxnList and categoryList based on type
  const { title, subtitle, mainAmount, headerBg, badgeColor, icon, activeTxnList, categoryList, targetLedgerFilter } = useMemo(() => {
    let t = 'হিসাব ও আর্থিক বিবরণী';
    let sub = timeFilter === 'month' ? `${getMonthBengaliName(selectedMonth || '')} মাসের নির্দিষ্ট খতিয়ান` : 'কোম্পানির সর্বমোট লেনদেন খতিয়ান';
    let amt = 0;
    let bg = 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white';
    let badge = 'bg-indigo-500/20 text-indigo-100 border border-indigo-300/30';
    let ic = <Wallet className="w-6 h-6 text-white" />;
    let list: Transaction[] = [];
    let cats: { category: string; amount: number; percentage: number }[] = [];
    let filter: 'all' | 'income' | 'expense' = 'all';

    if (type === 'income') {
      t = 'ইন্টারনেট বিল ও মোট আয় বিবরণী';
      sub = timeFilter === 'month' ? `${getMonthBengaliName(selectedMonth)} মাসের রাজস্ব ও আয়ের নির্দিষ্ট খতিয়ান` : 'সর্বমোট গ্রাহক বিল ও আয়ের খতিয়ান';
      amt = totalIncome;
      bg = 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white';
      badge = 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/30';
      ic = <ArrowUpRight className="w-6 h-6 text-white" />;
      list = incomeTxns;
      cats = getCategoryBreakdown(incomeTxns, totalIncome);
      filter = 'income';
    } else if (type === 'expense') {
      t = 'কোম্পানি ব্যয় ও খরচ বিবরণী';
      sub = timeFilter === 'month' ? `${getMonthBengaliName(selectedMonth)} মাসের আপস্ট্রিম, বেতন ও ব্যয়ের খতিয়ান` : 'সর্বমোট অপারেশন ও কোম্পানি ব্যয়ের খতিয়ান';
      amt = totalExpense;
      bg = 'bg-gradient-to-r from-rose-600 to-red-700 text-white';
      badge = 'bg-rose-500/20 text-rose-100 border border-rose-300/30';
      ic = <ArrowDownRight className="w-6 h-6 text-white" />;
      list = expenseTxns;
      cats = getCategoryBreakdown(expenseTxns, totalExpense);
      filter = 'expense';
    } else if (type === 'staff_salary') {
      t = 'স্টাফ বেতন ও পে-রোল হিসাব সারাংশ';
      sub = timeFilter === 'month' ? `${getMonthBengaliName(selectedMonth)} মাসের কর্মচারীদের বেতন ও পারিশ্রমিক তথ্য` : 'সকল মাসের স্টাফ পে-রোল ও বেতন সারাংশ';
      amt = paidSalariesTotal;
      bg = 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white';
      badge = 'bg-blue-500/20 text-blue-100 border border-blue-300/30';
      ic = <Users className="w-6 h-6 text-white" />;
    } else if (type === 'bandwidth_ops') {
      t = 'আপস্ট্রিম ব্যান্ডউইথ ও নেটওয়ার্ক অপারেশন খরচ';
      sub = timeFilter === 'month' ? `${getMonthBengaliName(selectedMonth)} মাসের IIG ব্যান্ডউইথ, ফাইবার ও বিদ্যুৎ খরচ` : 'সর্বমোট নেটওয়ার্ক অবকাঠামো ও আপস্ট্রিম বিল';
      amt = totalBandwidthOps;
      bg = 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white';
      badge = 'bg-cyan-500/20 text-cyan-100 border border-cyan-300/30';
      ic = <Wifi className="w-6 h-6 text-white" />;
      list = bandwidthOpsTxns;
      cats = getCategoryBreakdown(bandwidthOpsTxns, totalBandwidthOps);
      filter = 'expense';
    } else if (type === 'net_profit') {
      const net = totalIncome - totalExpense;
      t = 'চলতি নিট লাভ ও নগদ ব্যালেন্স স্টেটমেন্ট';
      sub = timeFilter === 'month' ? `${getMonthBengaliName(selectedMonth)} মাসের আয় বনাম ব্যয়ের নিট উদ্বৃত্ত` : 'সর্বমোট আয় বনাম মোট ব্যয়ের নিট ব্যালেন্স';
      amt = net;
      bg = 'bg-gradient-to-r from-purple-600 to-violet-800 text-white';
      badge = 'bg-purple-500/20 text-purple-100 border border-purple-300/30';
      ic = <Wallet className="w-6 h-6 text-white" />;
      list = baseTxns;
      cats = getCategoryBreakdown(baseTxns, totalIncome + totalExpense);
      filter = 'all';
    }

    return {
      title: t,
      subtitle: sub,
      mainAmount: amt,
      headerBg: bg,
      badgeColor: badge,
      icon: ic,
      activeTxnList: list,
      categoryList: cats,
      targetLedgerFilter: filter
    };
  }, [
    type,
    selectedMonth,
    timeFilter,
    totalIncome,
    totalExpense,
    paidSalariesTotal,
    totalBandwidthOps,
    incomeTxns,
    expenseTxns,
    bandwidthOpsTxns,
    baseTxns
  ]);

  // Filtered transactions for display inside full page safely (Chronologically sorted: earliest 1st, later below)
  const displayedTxns = useMemo(() => {
    if (!Array.isArray(activeTxnList)) return [];
    const filtered = activeTxnList.filter(t => {
      if (!t) return false;
      const desc = String(t.description || '').toLowerCase();
      const cat = String(t.category || '').toLowerCase();
      const note = String(t.note || '').toLowerCase();
      const q = String(searchQuery || '').toLowerCase().trim();

      const matchesSearch = !q || desc.includes(q) || cat.includes(q) || note.includes(q);
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    // Chronological order: Oldest/earliest transaction 1st, later transactions below
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateA !== dateB) return dateA - dateB;
      const timeA = new Date(a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.createdAt || 0).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }, [activeTxnList, searchQuery, categoryFilter]);

  // Calculate cumulative running balance for each transaction entry in sequence
  const txnsWithRunningBalance = useMemo(() => {
    let currentBalance = 0;
    return displayedTxns.map((txn, index) => {
      const amt = parseNumber(txn.amount);
      if (txn.type === 'income') {
        currentBalance += amt;
      } else {
        currentBalance -= amt;
      }
      return {
        txn,
        serialNo: index + 1,
        runningBalance: currentBalance
      };
    });
  }, [displayedTxns]);

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteTransaction) return;
    setDeleteTargetId(id);
  };

  const handleOpenInLedger = () => {
    if (onNavigateToLedger) {
      onNavigateToLedger(targetLedgerFilter);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Compact Clean Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              {/* Time Scope Toggle Buttons */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTimeFilter('month')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'month' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  চলতি মাস
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  সব রেকর্ড
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle} • <span className="font-bold text-slate-900 dark:text-slate-200">মোট পরিমাণ: {formatCurrency(mainAmount, currencySymbol)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenInLedger}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 border border-slate-200/80 dark:border-slate-700"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>পূর্ণাঙ্গ খতিয়ানে দেখুন</span>
        </button>
      </div>

      {/* Staff Salary Specific View if staff_salary */}
      {type === 'staff_salary' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {getMonthBengaliName(selectedMonth)} মাসের স্টাফ বেতন ও পে-রোল বিবরণী
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                পরিশোধিত মোট: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(paidSalariesTotal, currencySymbol)}</strong> | বকেয়া: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(pendingSalariesTotal, currencySymbol)}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToStaff}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>স্টাফ বেতন ম্যানেজমেন্টে যান</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(staffList || []).map(staff => {
              const salaryRec = monthSalaries.find(s => s && s.staffId === staff.id);
              const isPaid = salaryRec?.paymentStatus === 'paid';
              return (
                <div key={staff.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{staff.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isPaid ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}`}>
                        {isPaid ? 'পরিশোধিত ✓' : 'বকেয়া'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{staff.designation} • {staff.phone}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">মূল বেতন: {formatCurrency(staff.baseSalary, currencySymbol)}</span>
                    {salaryRec && onViewSalarySlip && (
                      <button
                        onClick={() => onViewSalarySlip(salaryRec)}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>স্লিপ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Standard Transactions View without Category Breakdown */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>লেনদেন তালিকা ({displayedTxns.length} টি)</span>
            </h3>

            {/* Search & Category Filter & New Entry */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAdminLoggedIn && onOpenNewTransaction && (
                <button
                  type="button"
                  onClick={() => onOpenNewTransaction(type === 'income' ? 'income' : 'expense')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  + নতুন এন্ট্রি
                </button>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="খুঁজুন..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 w-36 sm:w-44"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">সকল ক্যাটাগরি</option>
                {categoryList.map(c => (
                  <option key={c.category} value={c.category} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c.category}</option>
                ))}
              </select>
            </div>
          </div>

            {/* Transactions List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {txnsWithRunningBalance.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
                  <p>কোনো লেনদেন পাওয়া যায়নি।</p>
                  {timeFilter === 'month' && (
                    <button
                      type="button"
                      onClick={() => setTimeFilter('all')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition cursor-pointer"
                    >
                      সব সময়ের রেকর্ড দেখুন
                    </button>
                  )}
                </div>
              ) : (
                txnsWithRunningBalance.map(({ txn, serialNo, runningBalance }) => {
                  const isIncome = txn.type === 'income';
                  return (
                    <div
                      key={txn.id || serialNo}
                      onClick={() => onSelectTransaction && onSelectTransaction(txn)}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Serial Number Badge */}
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[11px] flex items-center justify-center shrink-0">
                          {serialNo.toLocaleString('bn-BD')}
                        </span>

                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}`}>
                          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {txn.description || txn.category}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {txn.category} • {txn.date} {txn.note ? `• ${txn.note}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <span className={`text-xs sm:text-sm font-black block ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(txn.amount, currencySymbol)}
                          </span>
                          <span className={`text-[10px] font-bold block ${runningBalance >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            ব্যালেন্স: {formatCurrency(runningBalance, currencySymbol)}
                          </span>
                        </div>
                        {isAdminLoggedIn && onDeleteTransaction && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(txn.id, e)}
                            disabled={deletingId === txn.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="এন্ট্রি ডিলিট নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিতভাবে এই লেনদেনটি স্থায়ীভাবে মুছে ফেলতে চান?"
        confirmText="হ্যাঁ, ডিলিট করুন"
        cancelText="বাতিল"
        type="danger"
        onConfirm={async () => {
          if (deleteTargetId && onDeleteTransaction) {
            const id = deleteTargetId;
            setDeleteTargetId(null);
            setDeletingId(id);
            try {
              await onDeleteTransaction(id);
            } catch (err) {
              console.error('Delete error:', err);
            } finally {
              setDeletingId(null);
            }
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
