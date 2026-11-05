import React, { useState, useMemo } from 'react';
import { Transaction, SalaryPayment, Staff, SheetConfig, DashboardCardType } from '../types';
import { formatCurrency, getMonthBengaliName, isIncomeTransaction, isExpenseTransaction, parseNumber, getTransactionMonth } from '../data/categories';
import {
  X,
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
  ArrowLeft,
  ChevronRight,
  FileText,
  Trash2,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface CardDetailModalProps {
  type: DashboardCardType | null;
  isOpen: boolean;
  onClose: () => void;
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

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  type,
  isOpen,
  onClose,
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

  // Filtered transactions for display inside modal safely (Chronologically sorted: earliest 1st, later below)
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
    setDeletingId(id);
    try {
      await onDeleteTransaction(id);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenInLedger = () => {
    onClose();
    if (onNavigateToLedger) {
      onNavigateToLedger(targetLedgerFilter);
    }
  };

  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Compact Clean Modal Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  {/* Time Scope Toggle Buttons */}
                  <div className="inline-flex rounded-lg bg-slate-200 dark:bg-slate-700 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTimeFilter('month')}
                      className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                        timeFilter === 'month' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      চলতি মাস
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                        timeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      সব রেকর্ড
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  মোট: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(mainAmount, currencySymbol)}</strong>
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenInLedger}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="পূর্ণাঙ্গ খতিয়ান পেজে খুলুন"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">খতিয়ানে দেখুন</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="bg-slate-100 dark:bg-slate-800/60 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
            <span>মোট ভিউ: {displayedTxns.length} টি এন্ট্রি</span>
            {timeFilter === 'month' && displayedTxns.length === 0 && (
              <span className="text-amber-700 dark:text-amber-400 text-[11px]">(চলতি মাসে কোনো ডাটা না থাকলে "সব রেকর্ড" চাপুন)</span>
            )}
          </span>
          <button
            type="button"
            onClick={handleOpenInLedger}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>পূর্ণাঙ্গ লেনদেন খতিয়ান পেজ খুলুন</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* SECTION 2: Staff Salary Detailed Payroll View */}
          {type === 'staff_salary' && (
            <div className="space-y-4">
              {/* Payroll Summary Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="text-emerald-700 block text-[11px] font-medium">পরিশোধিত বেতন:</span>
                  <div className="text-lg font-black mt-1">
                    {formatCurrency(paidSalariesTotal, currencySymbol)}
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    {monthSalaries.filter(s => s && s.paymentStatus === 'paid').length} জন কর্মীর বেতন দেওয়া হয়েছে
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="text-amber-700 block text-[11px] font-medium">বকেয়া বেতন:</span>
                  <div className="text-lg font-black mt-1">
                    {formatCurrency(pendingSalariesTotal, currencySymbol)}
                  </div>
                  <span className="text-[10px] text-amber-600 mt-0.5 block">
                    {monthSalaries.filter(s => s && s.paymentStatus === 'pending').length} জন কর্মীর বেতন বকেয়া রয়েছে
                  </span>
                </div>
              </div>

              {/* Action: Go to Staff Manager */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-600">
                  কর্মীদের বিস্তারিত প্রোফাইল বা বেতন প্রদান করতে পে-রোলে যান:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToStaff) onNavigateToStaff();
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>স্টাফ পে-রোল খুলুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Monthly Staff Payment List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {monthSalaries.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    চলতি মাসে কোনো কর্মীর বেতন শিট তৈরি করা হয়নি।
                  </div>
                ) : (
                  monthSalaries.map((sal, idx) => {
                    if (!sal) return null;
                    const bonus = Number(sal.bonusOrAllowance) || 0;
                    const deduction = Number(sal.deductionOrAdvance) || 0;
                    const keyId = sal.id ? String(sal.id) : `sal-${idx}`;
                    return (
                      <div
                        key={keyId}
                        className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{sal.staffName || 'কর্মী'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {sal.staffDesignation || 'স্টাফ'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>মূল বেতন: {formatCurrency(sal.baseSalary, currencySymbol)}</span>
                            {bonus > 0 && (
                              <span className="text-emerald-600 font-medium">
                                + বোনাস: {formatCurrency(bonus, currencySymbol)}
                              </span>
                            )}
                            {deduction > 0 && (
                              <span className="text-rose-600 font-medium">
                                - কর্তন: {formatCurrency(deduction, currencySymbol)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-black text-slate-900 text-sm">
                              {formatCurrency(sal.netSalary, currencySymbol)}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sal.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sal.paymentStatus === 'paid' ? '✓ পরিশোধিত' : '⏳ বকেয়া'}
                            </span>
                          </div>
                          {sal.paymentStatus === 'paid' && onViewSalarySlip && (
                            <button
                              type="button"
                              onClick={() => onViewSalarySlip(sal)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors cursor-pointer"
                              title="বেতন স্লিপ দেখুন"
                            >
                              <FileText className="w-4 h-4" />
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

          {/* SECTION 3: Detailed Transactions List (For Income, Expense, Bandwidth, Net Profit) */}
          {type !== 'staff_salary' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    নির্দিষ্ট লেনদেন তালিকা ({displayedTxns.length} টি)
                  </h4>
                  {categoryFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer"
                    >
                      (ফিল্টার মুছুন)
                    </button>
                  )}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="বিবরণ বা খাতে সার্চ করুন..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Transactions Table / List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {txnsWithRunningBalance.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <p>কোনো লেনদেন পাওয়া যায়নি।</p>
                    {timeFilter === 'month' && (
                      <button
                        type="button"
                        onClick={() => setTimeFilter('all')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition cursor-pointer"
                      >
                        সব সময়ের রেকর্ড দেখুন
                      </button>
                    )}
                  </div>
                ) : (
                  txnsWithRunningBalance.map(({ txn, serialNo, runningBalance }) => {
                    const keyId = txn.id ? String(txn.id) : `txn-${serialNo}`;
                    const isIncome = txn.type === 'income';
                    return (
                      <div
                        key={keyId}
                        onClick={() => {
                          if (onSelectTransaction) onSelectTransaction(txn);
                        }}
                        className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Serial Number Badge */}
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-[11px] flex items-center justify-center shrink-0">
                            {serialNo.toLocaleString('bn-BD')}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {txn.description || 'লেনদেন'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                                {txn.category || 'সাধারণ'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span>{txn.date || ''}</span>
                              <span>•</span>
                              <span>{txn.paymentMethod || 'নগদ'}</span>
                              {txn.note && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px]">{txn.note}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <div
                              className={`font-bold text-sm ${
                                isIncome ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(txn.amount, currencySymbol)}
                            </div>
                            <span className={`text-[10px] font-bold block ${runningBalance >= 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                              ব্যালেন্স: {formatCurrency(runningBalance, currencySymbol)}
                            </span>
                          </div>
                          {isAdminLoggedIn && onDeleteTransaction && (
                            <button
                              type="button"
                              disabled={deletingId === txn.id}
                              onClick={e => handleDeleteItem(txn.id, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer disabled:opacity-30"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>

        {/* Modal Footer with Quick Back & Ledger Navigation Buttons */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenInLedger}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>কোম্পানির পূর্ণাঙ্গ লেনদেন খতিয়ান খুলুন</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>বন্ধ করুন ও ফিরে যান</span>
          </button>
        </div>
      </div>
    </div>
  );
};

