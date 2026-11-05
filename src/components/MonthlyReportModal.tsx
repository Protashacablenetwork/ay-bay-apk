import React, { useState, useMemo } from 'react';
import { Transaction, SheetConfig } from '../types';
import { formatCurrency, getMonthBengaliName, isIncomeTransaction, isExpenseTransaction, parseNumber, getTransactionMonth } from '../data/categories';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  AlertCircle,
  BarChart,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  config: SheetConfig;
  currencySymbol?: string;
  isFullPage?: boolean;
  availableMonths?: string[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  config,
  currencySymbol = '৳',
  isFullPage = false,
  availableMonths: propAvailableMonths = [],
  selectedMonth: initialSelectedMonth,
  onMonthChange,
}) => {
  // Available months extracted from props, config (managedMonths, monthSheetLinks, activeMonth) + transaction dates
  const availableMonths = useMemo(() => {
    const set = new Set<string>(propAvailableMonths);
    const currentYM = new Date().toISOString().substring(0, 7);
    set.add(currentYM);

    if (config?.activeMonth) set.add(config.activeMonth);

    if (config?.managedMonths && Array.isArray(config.managedMonths)) {
      config.managedMonths.forEach(m => {
        if (m) set.add(m);
      });
    }

    if (config?.monthSheetLinks && Array.isArray(config.monthSheetLinks)) {
      config.monthSheetLinks.forEach(l => {
        if (l?.month) set.add(l.month);
      });
    }

    (transactions || []).forEach((t) => {
      if (t && t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });

    return Array.from(set).sort().reverse();
  }, [propAvailableMonths, config, transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => initialSelectedMonth || config?.activeMonth || availableMonths[0] || new Date().toISOString().substring(0, 7)
  );

  // Sync selectedMonth when modal opens or initialSelectedMonth/activeMonth changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMonth(initialSelectedMonth || config?.activeMonth || availableMonths[0] || new Date().toISOString().substring(0, 7));
    }
  }, [isOpen, initialSelectedMonth, config?.activeMonth]);

  // Month specific transactions (chronologically sorted: earliest 1st, later transactions below)
  const monthTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const filtered = transactions.filter((t) => t && typeof t.date === 'string' && getTransactionMonth(t.date) === selectedMonth);
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateA !== dateB) return dateA - dateB;
      const timeA = new Date(a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.createdAt || 0).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }, [transactions, selectedMonth]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    monthTransactions.forEach((t) => {
      if (!t) return;
      const amt = parseNumber(t.amount);
      const cat = String(t.category || 'অন্যান্য');
      if (isIncomeTransaction(t)) {
        totalIncome += amt;
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
      } else {
        totalExpense += amt;
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;

    // Sort categories
    const sortedExpenseCats = Object.entries(expenseByCategory)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExpense > 0 ? (amt / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedIncomeCats = Object.entries(incomeByCategory)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalIncome > 0 ? (amt / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate,
      topExpense: sortedExpenseCats[0] || null,
      sortedExpenseCats,
      sortedIncomeCats,
      count: monthTransactions.length
    };
  }, [monthTransactions]);

  if (!isOpen && !isFullPage) return null;

  // Print as PDF
  const handlePrint = () => {
    window.print();
  };

  // Export CSV for this month
  const handleExportMonthCsv = () => {
    let csv = '\uFEFFআইডি,তারিখ,ধরন,বিবরণ,বিভাগ,পরিমাণ,পেমেন্ট মাধ্যম,নোট\r\n';
    monthTransactions.forEach((t) => {
      const row = [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.type === 'income' ? 'আয়' : 'ব্যয়'}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-statement-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = getMonthBengaliName(selectedMonth);

  const content = (
    <div
      id="monthlyReportContainer"
      onClick={(e) => e.stopPropagation()}
      className={`bg-white dark:bg-slate-900 w-full ${
        isFullPage
          ? 'rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs'
          : 'max-w-4xl mx-auto rounded-[32px] p-5 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto'
      } overflow-y-auto print-page text-slate-900 dark:text-slate-100`}
    >
      {/* Modal Top Bar (Hidden on print) */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 no-print">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <BarChart className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
              মাসিক আর্থিক রিপোর্ট ও স্টেটমেন্ট
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              কোম্পানির ব্যালেন্স শিট, আয়-ব্যয় সারসংক্ষেপ ও পিডিএফ ডাউনলোড
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector & Action Controls (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-100 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">মাস নির্বাচন:</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMonth(val);
                if (onMonthChange) onMonthChange(val);
              }}
              className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {getMonthBengaliName(m)} {m === config?.activeMonth ? '(সক্রিয় মাস)' : '(ইতিহাস)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>পিডিএফ ডাউনলোড / প্রিন্ট</span>
            </button>
            <button
              onClick={handleExportMonthCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>এক্সেল / CSV</span>
            </button>
          </div>
        </div>

        {/* ================= Printable Report Body ================= */}
        <div className="pt-4 space-y-6">
          {/* Official Printable Header */}
          <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print:text-slate-900 tracking-tight text-center">
              {config.companyName || 'প্রত্যাশা ক্যাবল নেটওয়ার্ক'}
            </div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 print:text-slate-700 text-center mt-1">
              ডিজিটাল ডিস ও ইন্টারনেট সার্ভিস প্রোভাইডার
            </div>
            <div className="flex justify-between items-center mt-4 border-t border-b border-slate-300 py-2">
              <div className="text-sm font-bold text-slate-900">
                মাস : {monthLabel}
              </div>
              <div className="text-lg font-bold text-slate-900">
                দৈনিক আয় - ব্যয় হিসাব
              </div>
              <div className="text-sm font-bold text-slate-900">
                তারিখ : {monthTransactions.length > 0 ? `${monthTransactions[0].date.split('-')[2]}-${monthTransactions[monthTransactions.length-1].date.split('-')[2]}/${monthTransactions[0].date.split('-')[1]}/${monthTransactions[0].date.split('-')[0]}` : ''}
              </div>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              📑 বিস্তারিত লেনদেন তালিকা
            </h4>
            {monthTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                এই মাসে কোনো লেনদেন পাওয়া যায়নি
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center">
                      <th className="py-2 px-1 border-r border-slate-300">ক্রমিক</th>
                      <th className="py-2 px-1 border-r border-slate-300">তারিখ</th>
                      <th className="py-2 px-1 border-r border-slate-300">বিবরণ</th>
                      <th className="py-2 px-1 border-r border-slate-300">রেফারেন্স</th>
                      <th className="py-2 px-1 border-r border-slate-300">আয়</th>
                      <th className="py-2 px-1 border-r border-slate-300">ব্যয়</th>
                      <th className="py-2 px-1">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-900">
                    {monthTransactions.map((t, index) => (
                      <tr key={t.id} className="border-b border-slate-300">
                        <td className="py-2 px-1 border-r border-slate-300 text-center">{index + 1}</td>
                        <td className="py-2 px-1 border-r border-slate-300 whitespace-nowrap text-center">{t.date.split('-')[2]}/{t.date.split('-')[1]}/{t.date.split('-')[0].slice(-2)}</td>
                        <td className="py-2 px-1 border-r border-slate-300">{t.description}</td>
                        <td className="py-2 px-1 border-r border-slate-300">{t.note || '-'}</td>
                        <td className="py-2 px-1 border-r border-slate-300 text-center">{isIncomeTransaction(t) ? t.amount : ''}</td>
                        <td className="py-2 px-1 border-r border-slate-300 text-center">{isExpenseTransaction(t) ? t.amount : ''}</td>
                        <td className="py-2 px-1 text-center">{isIncomeTransaction(t) ? 'আয়' : 'পরিশোধ'}</td>
                      </tr>
                    ))}
                    {/* Summary Row */}
                    <tr className="font-bold">
                      <td colSpan={4} className="py-2 px-1 border-r border-slate-300 text-right">মোট : </td>
                      <td className="py-2 px-1 border-r border-slate-300 text-center">{stats.totalIncome}</td>
                      <td className="py-2 px-1 border-r border-slate-300 text-center">{stats.totalExpense}</td>
                      <td className="py-2 px-1 text-center">টাকা</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end mt-4">
            <div className="w-64 border-t border-slate-300 pt-2">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 mb-1">
                <span>টোটাল মাসিক আয় - ব্যয়</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-1">
                <span>টোটাল আয় -</span>
                <span className="border border-slate-300 px-2 py-0.5 text-right w-20">{stats.totalIncome}</span>
                <span>টাকা</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-1">
                <span>টোটাল ব্যয় -</span>
                <span className="border border-slate-300 px-2 py-0.5 text-right w-20">{stats.totalExpense}</span>
                <span>টাকা</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t border-slate-300 pt-1 mt-1">
                <span>মোট =</span>
                <span className="w-20 text-right">{stats.totalIncome - stats.totalExpense}</span>
                <span>টাকা</span>
              </div>
            </div>
          </div>

          {/* Printable Signature & Verification Footer */}
          <div className="pt-8 pb-4 flex justify-between items-end border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p className="font-medium text-slate-600 dark:text-slate-400">কম্পিউটার জেনারেটেড রিপোর্ট</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 dark:border-slate-600 pb-1 mb-1"></div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">কর্তৃপক্ষের স্বাক্ষর</p>
            </div>
          </div>
        </div>
      </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div
      id="monthlyReportModal"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      {content}
    </div>
  );
};
