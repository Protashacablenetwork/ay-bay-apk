import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency } from '../data/categories';
import { ConfirmModal } from './ConfirmModal';
import { 
  Search, 
  Calendar, 
  Tag, 
  ArrowUpRight, 
  ArrowDownRight, 
  CloudCheck, 
  Cloud,
  ChevronRight,
  Filter,
  Trash2,
  Edit2
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  activeTypeFilter: 'all' | 'income' | 'expense';
  onTypeFilterChange: (type: 'all' | 'income' | 'expense') => void;
  onSelectTransaction: (txn: Transaction) => void;
  onEditTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currencySymbol?: string;
  isAdminLoggedIn?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  activeTypeFilter,
  onTypeFilterChange,
  onSelectTransaction,
  onEditTransaction,
  onDeleteTransaction,
  currencySymbol = '৳',
  isAdminLoggedIn = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [deleteConfirmTxn, setDeleteConfirmTxn] = useState<Transaction | null>(null);

  // Filter transactions based on type, search, and date safely
  const filteredList = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const currentYearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    return transactions.filter((t) => {
      if (!t) return false;
      const tDate = String(t.date || '');

      // Type filter
      if (activeTypeFilter !== 'all' && t.type !== activeTypeFilter) {
        return false;
      }

      // Date range filter
      if (dateFilter === 'today' && tDate !== today) {
        return false;
      }
      if (dateFilter === 'week' && tDate < startOfWeek) {
        return false;
      }
      if (dateFilter === 'month' && !tDate.startsWith(currentYearMonth)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = String(searchQuery).toLowerCase().trim();
        const matchDesc = String(t.description || '').toLowerCase().includes(q);
        const matchCat = String(t.category || '').toLowerCase().includes(q);
        const matchNote = String(t.note || '').toLowerCase().includes(q);
        const matchAmount = String(t.amount || '').includes(q);
        if (!matchDesc && !matchCat && !matchNote && !matchAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, activeTypeFilter, dateFilter, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 no-print">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>📋 লেনদেন তালিকা</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredList.length} টি
            </span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
            বিস্তারিত দেখতে যেকোনো লেনদেনে ক্লিক করুন
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            সব সময়
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            আজ
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap cursor-pointer ${
              dateFilter === 'week'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            এই সপ্তাহ
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            চলতি মাস
          </button>
        </div>
      </div>

      {/* Search & Type Segment Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="বিবরণ, খাত বা নোট দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() => onTypeFilterChange('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTypeFilter === 'all'
                ? 'bg-slate-800 dark:bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            সব ({transactions.length})
          </button>
          <button
            onClick={() => onTypeFilterChange('income')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTypeFilter === 'income'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            আয়
          </button>
          <button
            onClick={() => onTypeFilterChange('expense')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTypeFilter === 'expense'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
          >
            ব্যয়
          </button>
        </div>
      </div>

      {/* Transaction Items */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">
              কোনো লেনদেন পাওয়া যায়নি
            </p>
            <p className="text-slate-400 dark:text-slate-400 text-xs mt-1">
              উপরের ফর্মটি ব্যবহার করে নতুন আয় বা ব্যয়ের লেনদেন যোগ করুন
            </p>
          </div>
        ) : (
          [...filteredList].reverse().map((entry) => {
            const isIncome = entry.type === 'income';
            return (
              <div
                key={entry.id}
                onClick={() => onSelectTransaction(entry)}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 rounded-2xl transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99] gap-2.5"
              >
                {/* Main Content Area */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isIncome
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Category & Date badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        isIncome 
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50' 
                          : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/50'
                      }`}>
                        {entry.category}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">{entry.date}</span>
                      {entry.paymentMethod && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{entry.paymentMethod}</span>
                        </>
                      )}
                    </div>

                    {/* Description - NO TRUNCATION! Wrap naturally so full text is visible on mobile */}
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                      {entry.description}
                    </div>

                    {entry.note && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic break-words">
                        নোট: {entry.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount, Sync Status & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                  <div className="text-left sm:text-right">
                    <div
                      className={`text-sm sm:text-base font-extrabold ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '➕ ' : '➖ '}
                      {formatCurrency(entry.amount, currencySymbol)}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-start sm:justify-end gap-1 mt-0.5">
                      {entry.syncedToSheet ? (
                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium" title="গুগল শিটে সিঙ্কড">
                          <CloudCheck className="w-3 h-3 mr-0.5" /> শিট সিঙ্কড
                        </span>
                      ) : (
                        <span className="text-slate-400">লোকাল</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 pl-1">
                    {isAdminLoggedIn && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(entry);
                          }}
                          title="এডিট করুন"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmTxn(entry);
                          }}
                          title="ডিলিট করুন"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmTxn}
        title="এন্ট্রি মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত "${deleteConfirmTxn?.description || ''}" লেনদেনটি স্থায়ীভাবে মুছে ফেলতে চান?`}
        confirmText="হ্যাঁ, ডিলিট করুন"
        cancelText="বাতিল"
        type="danger"
        onConfirm={() => {
          if (deleteConfirmTxn) {
            onDeleteTransaction(deleteConfirmTxn.id);
            setDeleteConfirmTxn(null);
          }
        }}
        onCancel={() => setDeleteConfirmTxn(null)}
      />
    </div>
  );
};
