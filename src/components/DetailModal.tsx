import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  PAYMENT_METHODS, 
  formatCurrency 
} from '../data/categories';
import { X, Trash2, Edit3, Check, CloudCheck, Calendar, Tag, CreditCard, ArrowLeft } from 'lucide-react';

interface DetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updatedData: Partial<Transaction>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  currencySymbol?: string;
  initialEditMode?: boolean;
  isAdminLoggedIn?: boolean;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  currencySymbol = '৳',
  initialEditMode = false,
  isAdminLoggedIn = false
}) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      const isPredefined = (transaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(transaction.category);
      if (isPredefined) {
        setCategory(transaction.category);
        setCustomCategory('');
      } else {
        // Custom category
        setCategory(transaction.type === 'income' ? 'অন্যান্য আয়' : 'অন্যান্য খরচ');
        setCustomCategory(transaction.category);
      }
      setDate(transaction.date);
      setPaymentMethod(transaction.paymentMethod || PAYMENT_METHODS[0]);
      setNote(transaction.note || '');
      setIsEditing(initialEditMode);
    }
  }, [transaction, initialEditMode]);

  if (!isOpen || !transaction) return null;

  const isIncome = type === 'income';
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSaveEdit = async () => {
    if (!description.trim()) {
      alert('বিবরণ লিখুন');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('সঠিক পরিমাণ দিন (০ এর বেশি)');
      return;
    }

    setIsSaving(true);
    let finalCat = category;
    if (category === 'অন্যান্য আয়' || category === 'অন্যান্য খরচ' || category.startsWith('অন্যান্য')) {
      finalCat = customCategory.trim() || category;
    }

    const ok = await onUpdate(transaction.id, {
      description: description.trim(),
      amount: numAmount,
      type,
      category: finalCat,
      date,
      paymentMethod,
      note: note.trim()
    });
    setIsSaving(false);
    if (ok) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  return (
    <div
      id="detailModalCenter"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        id="modalInnerContent"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{isEditing ? '✏️ লেনদেন এডিট' : '📄 লেনদেনের বিস্তারিত'}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isEditing ? (
          /* ================= EDIT MODE ================= */
          <div className="mt-4 space-y-3">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory(INCOME_CATEGORIES[0]);
                }}
                className={`py-1.5 text-xs font-bold rounded-full transition cursor-pointer ${
                  type === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                আয় (ইনকাম)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory(EXPENSE_CATEGORIES[0]);
                }}
                className={`py-1.5 text-xs font-bold rounded-full transition cursor-pointer ${
                  type === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ব্যয় (খরচ)
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">বিবরণ</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">তারিখ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">বিভাগ / খাত</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (!e.target.value.startsWith('অন্যান্য')) {
                      setCustomCategory('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {c}
                    </option>
                  ))}
                </select>
                {(category === 'অন্যান্য আয়' || category === 'অন্যান্য খরচ' || category.startsWith('অন্যান্য')) && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="খাতের নির্দিষ্ট নাম লিখুন"
                    className="w-full mt-1.5 px-3 py-1.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    required
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">নোট / রেফারেন্স</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="অতিরিক্ত মন্তব্য"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </div>
        ) : (
          /* ================= VIEW MODE ================= */
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 dark:text-slate-400 text-xs">বিবরণ</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-right max-w-[220px]">
                  {transaction.description}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-xs">পরিমাণ</span>
                <span
                  className={`text-lg font-extrabold ${
                    transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {transaction.type === 'income' ? '➕ ' : '➖ '}
                  {formatCurrency(transaction.amount, currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-xs">ধরন</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    transaction.type === 'income'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {transaction.type === 'income' ? 'আয়' : 'ব্যয়'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-xs">বিভাগ</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{transaction.category}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-xs">তারিখ</span>
                <span className="text-slate-700 dark:text-slate-200 font-medium">{transaction.date}</span>
              </div>

              {transaction.paymentMethod && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">পেমেন্ট মাধ্যম</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{transaction.paymentMethod}</span>
                </div>
              )}

              {transaction.note && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">নোট</span>
                  <span className="text-slate-700 dark:text-slate-200 text-xs text-right italic max-w-[200px]">
                    "{transaction.note}"
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700 text-xs">
                <span className="text-slate-400 dark:text-slate-500">ট্র্যাকিং আইডি</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{transaction.id}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-slate-500">গুগল শিট অবস্থা</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CloudCheck className="w-3.5 h-3.5" />
                  {transaction.syncedToSheet ? 'সিঙ্কড' : 'লোকাল ক্লাউড'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>এডিট</span>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ডিলিট</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-center text-xs font-semibold text-amber-800 dark:text-amber-300">
                🔒 লেনদেন এডিট বা ডিলিট করার জন্য এডমিন লগইন প্রয়োজন।
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="এন্ট্রি ডিলিট নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত "${transaction?.description || ''}" লেনদেনটি স্থায়ীভাবে মুছে ফেলতে চান?`}
        confirmText="হ্যাঁ, ডিলিট করুন"
        cancelText="বাতিল"
        type="danger"
        onConfirm={async () => {
          if (transaction) {
            setShowDeleteConfirm(false);
            await onDelete(transaction.id);
            onClose();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
