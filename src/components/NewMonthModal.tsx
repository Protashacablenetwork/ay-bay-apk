import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  History, 
  ShieldCheck,
  Sparkles,
  Link,
  ArrowRight,
  Lock
} from 'lucide-react';
import { getMonthBengaliName } from '../data/categories';

interface NewMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmMonth: (monthKey: string, sheetUrl?: string) => void;
  currentSelectedMonth: string;
  existingMonths: string[];
  isAdminLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

export const NewMonthModal: React.FC<NewMonthModalProps> = ({
  isOpen,
  onClose,
  onConfirmMonth,
  currentSelectedMonth,
  existingMonths,
  isAdminLoggedIn = false,
  onRequireLogin
}) => {
  // Suggest next month
  const getDefaultTargetMonth = () => {
    try {
      const [year, month] = currentSelectedMonth.split('-').map(Number);
      const nextDate = new Date(year, month, 1); // next month (month is 0-indexed in JS Date)
      const nextY = nextDate.getFullYear();
      const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
      return `${nextY}-${nextM}`;
    } catch {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  };

  const [targetMonth, setTargetMonth] = useState<string>(getDefaultTargetMonth);
  const [sheetUrl, setSheetUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminLoggedIn) {
      onRequireLogin?.();
      return;
    }
    if (!targetMonth) return;
    let url = sheetUrl.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    onConfirmMonth(targetMonth, url || undefined);
    setSheetUrl('');
    onClose();
  };

  const now = new Date();
  const currentCalendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  নতুন মাসের শিট যোগ করুন
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  🛡️ এডমিন
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                নতুন হিসাব চক্র শুরু ও গুগল শিট লিংক সংযোগ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content: Locked for non-admin, Form for admin */}
        {!isAdminLoggedIn ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                এডমিন অনুমোদন প্রয়োজন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                নতুন মাসের শিট যোগ করা বা আলাদা গুগল শিট লিংক যুক্ত করার সুবিধা শুধুমাত্র অনুমোদিত এডমিনের জন্য সংরক্ষিত।
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireLogin?.();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>এডমিন লগইন করুন</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                যে মাসের শিট শুরু করতে চান (বছর ও মাস নির্বাচন করুন):
              </label>
              <div className="relative">
                <input
                  type="month"
                  value={targetMonth}
                  onChange={e => setTargetMonth(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>নির্বাচিত মাস: <strong>{getMonthBengaliName(targetMonth)}</strong></span>
              </p>
            </div>

            {/* Google Sheet URL Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-500" />
                <span>এই মাসের গুগল শিট লিংক (ওয়েব অ্যাপ ইউআরএল):</span>
              </label>
              <input
                type="text"
                inputMode="url"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec (ঐচ্ছিক)"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                এই মাসের জন্য আলাদা গুগল শিট বা ওয়েব অ্যাপ ইউআরএল দিতে পারেন।
              </p>
            </div>

            {/* Quick Month Suggestion Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400">দ্রুত বাছুন:</span>
              {targetMonth !== currentCalendarMonth && (
                <button
                  type="button"
                  onClick={() => setTargetMonth(currentCalendarMonth)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition"
                >
                  চলতি মাস ({getMonthBengaliName(currentCalendarMonth)})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const [y, m] = (targetMonth || currentSelectedMonth).split('-').map(Number);
                  const nextDate = new Date(y, m, 1);
                  setTargetMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition border border-emerald-200/60 dark:border-emerald-800/60"
              >
                + পরবর্তী মাস
              </button>
            </div>

            {/* Security & Feature Guarantees */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">ড্যাশবোর্ড ০ থেকে ফ্রেশ শুরু হবে:</strong>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    নতুন মাসে আপনার লেনদেন ও আয়-ব্যয় ০ থাকবে যতক্ষণ না আপনি নতুন এন্ট্রি দেন।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">কোনো পূর্বের তথ্য মুছবে না:</strong>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    বিগত সকল মাসের তথ্য ও হিসাব সুরক্ষিত থাকবে এবং ইতিহাস হিসেবে যেকোনো সময় দেখা যাবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>শিট শুরু করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
