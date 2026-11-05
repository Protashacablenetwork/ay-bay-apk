import React, { useMemo, useState } from 'react';
import { Transaction, SalaryPayment, Staff, SheetConfig } from '../types';
import { 
  formatCurrency, 
  getMonthBengaliName, 
  parseNumber, 
  isIncomeTransaction, 
  isExpenseTransaction,
  getTransactionMonth
} from '../data/categories';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wifi,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  History,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';

interface DashboardOverviewProps {
  transactions: Transaction[];
  salaries: SalaryPayment[];
  staffList: Staff[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenCardDetail: (type: 'income' | 'expense' | 'staff_salary' | 'bandwidth_ops' | 'net_profit') => void;
  onOpenNewTransaction: (type?: 'income' | 'expense', category?: string) => void;
  onNavigateToStaff: () => void;
  onNavigateToLedger: () => void;
  config: SheetConfig;
  onOpenNewMonthModal?: () => void;
  onOpenSyncModal?: () => void;
  availableMonths?: string[];
  isAdminLoggedIn?: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  transactions,
  salaries,
  staffList,
  selectedMonth,
  onMonthChange,
  onOpenCardDetail,
  onOpenNewTransaction,
  onNavigateToStaff,
  onNavigateToLedger,
  config,
  onOpenNewMonthModal,
  onOpenSyncModal,
  availableMonths = [],
  isAdminLoggedIn = false
}) => {
  const [backupModal, setBackupModal] = useState<{
    isOpen: boolean;
    loading: boolean;
    success?: boolean;
    title?: string;
    message?: string;
  } | null>(null);
  // Filter transactions for this month safely
  const monthTxns = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => {
      if (!t || typeof t.date !== 'string') return false;
      return getTransactionMonth(t.date) === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Income Category Breakdown
  const incomeCategoryData = useMemo(() => {
    const incomes = monthTxns.filter(t => isIncomeTransaction(t));
    const total = incomes.reduce((acc, t) => acc + parseNumber(t.amount), 0);
    const map: Record<string, number> = {};
    incomes.forEach(t => {
      if (t) {
        const cat = String(t.category || 'অন্যান্য');
        map[cat] = (map[cat] || 0) + parseNumber(t.amount);
      }
    });
    return {
      total,
      items: Object.entries(map)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
    };
  }, [monthTxns]);

  // Expense Category Breakdown (All company expenses included)
  const expenseCategoryData = useMemo(() => {
    const expenses = monthTxns.filter(t => isExpenseTransaction(t));
    const total = expenses.reduce((acc, t) => acc + parseNumber(t.amount), 0);
    const map: Record<string, number> = {};
    expenses.forEach(t => {
      if (t) {
        const cat = String(t.category || 'অন্যান্য');
        map[cat] = (map[cat] || 0) + parseNumber(t.amount);
      }
    });
    return {
      total,
      items: Object.entries(map)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
    };
  }, [monthTxns]);

  // Month staff salary data
  const monthSalaries = useMemo(() => {
    if (!Array.isArray(salaries)) return [];
    return salaries.filter(s => s && s.month === selectedMonth);
  }, [salaries, selectedMonth]);

  const activeStaff = (staffList || []).filter(s => s && s.status === 'active');
  const paidCount = monthSalaries.filter(s => s && s.paymentStatus === 'paid').length;
  const pendingCount = Math.max(0, activeStaff.length - paidCount);

  const now = new Date();
  const currentCalendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedMonth === currentCalendarMonth;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar: Month Selector & Admin Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">হিসাবের মাস:</span>
            {availableMonths.length > 0 ? (
              <select
                value={selectedMonth}
                onChange={e => onMonthChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {getMonthBengaliName(m)} {m === currentCalendarMonth ? '(চলতি মাস)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={e => onMonthChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            )}
          </div>
        </div>

        {/* Admin & History Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!isCurrentMonth && (
            <button
              onClick={() => onMonthChange(currentCalendarMonth)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 shrink-0 cursor-pointer"
              title="চলতি মাসের ড্যাশবোর্ডে ফিরে যান"
            >
              <span>চলতি মাস</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isAdminLoggedIn && onOpenNewMonthModal && (
            <>
              <button
                onClick={async () => {
                  setBackupModal({
                    isOpen: true,
                    loading: true,
                    title: 'গুগল শিটে ব্যাকআপ নেওয়ার কাজ চলছে...'
                  });
                  try {
                    const response = await fetch('/api/backup-data', { method: 'POST' });
                    const data = await response.json();
                    if (response.ok && data.success) {
                      setBackupModal({
                        isOpen: true,
                        loading: false,
                        success: true,
                        title: 'ব্যাকআপ সফলভাবে সম্পন্ন হয়েছে! 🎉',
                        message: data.message || 'আপনার সমস্ত হিসাব ও ডেটা গুগল শিটে সুরক্ষিতভাবে জমা হয়েছে।'
                      });
                    } else {
                      setBackupModal({
                        isOpen: true,
                        loading: false,
                        success: false,
                        title: 'ব্যাকআপ তথ্য',
                        message: data.message || 'স্থানীয় ডেটাবেসে সকল হিসাব সুরক্ষিত আছে। ক্লাউড ব্যাকআপের জন্য শিট লিংক যুক্ত আছে কিনা চেক করুন।'
                      });
                    }
                  } catch (err) {
                    setBackupModal({
                      isOpen: true,
                      loading: false,
                      success: false,
                      title: 'ব্যাকআপ সম্পন্ন হয়নি',
                      message: 'আপনার অ্যাপের সকল হিসাব স্থানীয় ডেটাবেসে সম্পূর্ণ নিরাপদ রয়েছে। ইন্টারনেট বা সংযোগ সমস্যা চেক করুন।'
                    });
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                title="গুগল শিটে ব্যাকআপ নিন (এডমিন)"
              >
                <History className="w-3.5 h-3.5" />
                <span>ব্যাকআপ নিন</span>
              </button>
              <button
                onClick={onOpenNewMonthModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                title="নতুন মাসের হিসাব চক্র শুরু করুন (শুধুমাত্র এডমিন)"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>নতুন মাসের শিট যোগ</span>
              </button>
            </>
          )}
        </div>
      </div>


      {/* Two Column Grid: Income vs Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Card: Income Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  আয়ের প্রধান খাতসমূহ (ISP Revenue)
                </h3>
              </div>
              <button
                onClick={() => onOpenCardDetail('income')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>সব দেখুন</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {incomeCategoryData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  চলতি মাসে এখনো কোনো আয় এন্ট্রি করা হয়নি
                </div>
              ) : (
                incomeCategoryData.items.slice(0, 5).map(item => (
                  <div key={item.category} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                        {item.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(item.amount, config.currencySymbol)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>মোট আয়ের {item.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">চলতি মাসের মোট আয়:</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
              {formatCurrency(incomeCategoryData.total, config.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Right Card: Expense Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  ব্যয় ও অপারেশন খাতসমূহ (ISP Expenses)
                </h3>
              </div>
              <button
                onClick={() => onOpenCardDetail('expense')}
                className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>সব দেখুন</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {expenseCategoryData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  চলতি মাসে এখনো কোনো ব্যয় এন্ট্রি করা হয়নি
                </div>
              ) : (
                expenseCategoryData.items.slice(0, 5).map(item => (
                  <div key={item.category} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                        {item.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(item.amount, config.currencySymbol)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>মোট ব্যয়ের {item.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">চলতি মাসের মোট ব্যয়:</span>
            <span className="font-black text-rose-700 dark:text-rose-400 text-sm">
              {formatCurrency(expenseCategoryData.total, config.currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Staff Payroll Highlight & Recent Transactions List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Staff Payroll Status Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>স্টাফ বেতন অবস্থা</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-200 text-[10px] font-semibold">
                {getMonthBengaliName(selectedMonth)}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">মোট সক্রিয় স্টাফ:</span>
                <span className="font-bold text-white">{activeStaff.length} জন</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>বেতন পরিশোধিত:</span>
                <span className="font-bold">{paidCount} জন</span>
              </div>
              <div className="flex items-center justify-between text-xs text-amber-300">
                <span>বেতন বকেয়া:</span>
                <span className="font-bold">{pendingCount > 0 ? `${pendingCount} জন` : 'সব পরিশোধিত'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToStaff}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>বেতন হিসাব ও পে-রোলে যান</span>
          </button>
        </div>

        {/* Recent Transactions List (2 columns wide) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <History className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  সাম্প্রতিক লেনদেনসমূহ ({monthTxns.length} টি)
                </h3>
              </div>
              <button
                onClick={onNavigateToLedger}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>সব লেনদেন খতিয়ান</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {monthTxns.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  এই মাসে এখনো কোনো লেনদেন পাওয়া যায়নি। "+ এন্ট্রি ফরম খুলুন" বাটনে ক্লিক করে নতুন লেনদেন যোগ করুন।
                </div>
              ) : (
                monthTxns.slice(0, 10).map((t) => {
                  const isInc = isIncomeTransaction(t);
                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-lg shrink-0 ${isInc ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'}`}>
                          {isInc ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.description || t.category}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{t.date} • {t.category} • {t.paymentMethod || 'নগদ'}</p>
                        </div>
                      </div>
                      <span className={`font-black shrink-0 ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isInc ? '+' : '-'}{formatCurrency(parseNumber(t.amount), config.currencySymbol)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {monthTxns.length > 10 && (
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={onNavigateToLedger}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                আরও {monthTxns.length - 10} টি লেনদেন দেখুন →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BEAUTIFUL BACKUP POPUP MODAL */}
      {backupModal && backupModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setBackupModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {backupModal.loading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {backupModal.title || 'গুগল শিটে ব্যাকআপ নেওয়া হচ্ছে...'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    দয়া করে অপেক্ষা করুন, আপনার লেনদেন ও ডেটা ক্লাউড শিটে ব্যাকআপ নেওয়া হচ্ছে।
                  </p>
                </div>
              </div>
            ) : backupModal.success ? (
              <div className="py-4 flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {backupModal.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {backupModal.message}
                  </p>
                </div>
                <div className="pt-3 w-full">
                  <button
                    onClick={() => setBackupModal(null)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                  >
                    ঠিক আছে
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <AlertCircle className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {backupModal.title || 'ব্যাকআপ নোটিশ'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {backupModal.message}
                  </p>
                </div>
                <div className="pt-3 flex items-center gap-2 w-full">
                  {onOpenSyncModal && (
                    <button
                      onClick={() => {
                        setBackupModal(null);
                        onOpenSyncModal();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                    >
                      শিট সংযোগ করুন
                    </button>
                  )}
                  <button
                    onClick={() => setBackupModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
