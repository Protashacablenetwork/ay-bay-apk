import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Boxes,
  Coins,
  Copy,
  Check,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { MonthSheetLink } from '../types';
import { getMonthBengaliName } from '../data/categories';

interface MonthSheetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'transactions' | 'inventory';
  monthSheetLinks?: MonthSheetLink[];
  inventoryMonthSheetLinks?: MonthSheetLink[];
  onSaveLinks: (links: MonthSheetLink[]) => Promise<boolean>;
  onSaveInventoryLinks?: (links: MonthSheetLink[]) => Promise<boolean>;
  selectedMonth: string;
  onSelectMonth?: (month: string) => void;
  isAdminLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

export const MonthSheetManagerModal: React.FC<MonthSheetManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'transactions',
  monthSheetLinks = [],
  inventoryMonthSheetLinks = [],
  onSaveLinks,
  onSaveInventoryLinks,
  selectedMonth,
  onSelectMonth,
  isAdminLoggedIn = false,
  onRequireLogin
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'inventory'>(initialTab);
  const [txnLinks, setTxnLinks] = useState<MonthSheetLink[]>(monthSheetLinks);
  const [invLinks, setInvLinks] = useState<MonthSheetLink[]>(inventoryMonthSheetLinks);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const now = new Date();
  const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [formMonth, setFormMonth] = useState<string>(defaultYM);
  const [formSheetUrl, setFormSheetUrl] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync initial tab when modal opens with robust localStorage fallback & auto-recovery
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      
      // 1. Fetch transactions links with localStorage backup & sync
      fetch('/api/config/month-sheet-links')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setTxnLinks(data);
            try {
              localStorage.setItem('isp_month_sheet_links', JSON.stringify(data));
            } catch {}
          } else {
            // Restore from localStorage if server is empty
            try {
              const local = localStorage.getItem('isp_month_sheet_links');
              if (local) {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setTxnLinks(parsed);
                  fetch('/api/config/month-sheet-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ links: parsed })
                  }).catch(() => {});
                }
              }
            } catch {}
          }
        })
        .catch(() => {
          try {
            const local = localStorage.getItem('isp_month_sheet_links');
            if (local) setTxnLinks(JSON.parse(local));
          } catch {}
        });

      // 2. Fetch inventory links with localStorage backup & sync
      fetch('/api/config/inventory-month-sheet-links')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setInvLinks(data);
            try {
              localStorage.setItem('isp_inventory_month_sheet_links', JSON.stringify(data));
            } catch {}
          } else {
            // Restore from localStorage if server is empty
            try {
              const local = localStorage.getItem('isp_inventory_month_sheet_links');
              if (local) {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setInvLinks(parsed);
                  fetch('/api/config/inventory-month-sheet-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ links: parsed })
                  }).catch(() => {});
                }
              }
            } catch {}
          }
        })
        .catch(() => {
          try {
            const local = localStorage.getItem('isp_inventory_month_sheet_links');
            if (local) setInvLinks(JSON.parse(local));
          } catch {}
        });
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (Array.isArray(monthSheetLinks) && monthSheetLinks.length > 0) {
      setTxnLinks(monthSheetLinks);
      try {
        localStorage.setItem('isp_month_sheet_links', JSON.stringify(monthSheetLinks));
      } catch {}
    }
  }, [monthSheetLinks]);

  useEffect(() => {
    if (Array.isArray(inventoryMonthSheetLinks) && inventoryMonthSheetLinks.length > 0) {
      setInvLinks(inventoryMonthSheetLinks);
      try {
        localStorage.setItem('isp_inventory_month_sheet_links', JSON.stringify(inventoryMonthSheetLinks));
      } catch {}
    }
  }, [inventoryMonthSheetLinks]);

  if (!isOpen) return null;

  const currentLinks = activeTab === 'transactions' ? txnLinks : invLinks;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleStartEdit = (link: MonthSheetLink) => {
    if (!isAdminLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      showFeedback('error', '🔒 শিট এডিট করতে প্রথমে এডমিন লগইন করুন');
      return;
    }
    setEditingId(link.id);
    setFormMonth(link.month);
    setFormSheetUrl(link.sheetUrl);
    setFormTitle(link.title || '');
    setFormNote(link.note || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormMonth(defaultYM);
    setFormSheetUrl('');
    setFormTitle('');
    setFormNote('');
  };

  const handleTabSwitch = (tab: 'transactions' | 'inventory') => {
    setActiveTab(tab);
    handleCancelEdit();
  };

  const handleCopyLink = (id: string, url: string) => {
    if (!isAdminLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      showFeedback('error', '🔒 শিট যোগ বা পরিবর্তন করতে প্রথমে এডমিন লগইন করুন');
      return;
    }

    let cleanedUrl = formSheetUrl.trim();
    if (!formMonth || !cleanedUrl) {
      showFeedback('error', 'অনুগ্রহ করে হিসাবের মাস ও গুগল শিট লিংক সঠিকভাবে দিন');
      return;
    }

    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      cleanedUrl = 'https://' + cleanedUrl;
    }

    setIsSubmitting(true);
    const isTxn = activeTab === 'transactions';
    const listToUpdate = isTxn ? [...txnLinks] : [...invLinks];

    let updatedList: MonthSheetLink[];
    const defaultTitle = isTxn 
      ? `${getMonthBengaliName(formMonth)} মাসের হিসাব শিট` 
      : `${getMonthBengaliName(formMonth)} মালামাল ও স্টক শিট`;

    if (editingId) {
      updatedList = listToUpdate.map(l => 
        l.id === editingId 
          ? {
              ...l,
              month: formMonth,
              sheetUrl: cleanedUrl,
              title: formTitle.trim() || defaultTitle,
              note: formNote.trim()
            }
          : l
      );
    } else {
      const newLink: MonthSheetLink = {
        id: `MSL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        month: formMonth,
        sheetUrl: cleanedUrl,
        title: formTitle.trim() || defaultTitle,
        note: formNote.trim(),
        createdAt: new Date().toISOString()
      };
      const existingIdx = listToUpdate.findIndex(l => l.month === formMonth);
      if (existingIdx !== -1) {
        updatedList = [...listToUpdate];
        updatedList[existingIdx] = newLink;
      } else {
        updatedList = [newLink, ...listToUpdate];
      }
    }

    try {
      if (isTxn) {
        await fetch('/api/config/month-sheet-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: updatedList })
        });
        if (onSaveLinks) {
          await onSaveLinks(updatedList);
        }
        setTxnLinks(updatedList);
      } else {
        await fetch('/api/config/inventory-month-sheet-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: updatedList })
        });
        if (onSaveInventoryLinks) {
          await onSaveInventoryLinks(updatedList);
        }
        setInvLinks(updatedList);
      }

      handleCancelEdit();
      showFeedback(
        'success', 
        editingId 
          ? `✅ ${isTxn ? 'আয়-ব্যয়' : 'মালামাল স্টক'} শিট লিংক সফলভাবে আপডেট করা হয়েছে!` 
          : `✅ ${getMonthBengaliName(formMonth)} মাসের ${isTxn ? 'আয়-ব্যয়' : 'মালামাল স্টক'} শিট লিংক সফলভাবে সংরক্ষিত হয়েছে!`
      );
    } catch (err: any) {
      console.error('Save error:', err);
      showFeedback('error', `সংরক্ষণ করা যায়নি: ${err.message || 'পুনরায় চেষ্টা করুন'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, monthName: string) => {
    if (!isAdminLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      showFeedback('error', '🔒 শিট ডিলিট করতে প্রথমে এডমিন লগইন করুন');
      return;
    }

    const isTxn = activeTab === 'transactions';
    const typeLabel = isTxn ? 'আয়-ব্যয়' : 'মালামাল ও স্টক';

    if (!window.confirm(`আপনি কি সত্যিই ${monthName} মাসের ${typeLabel} শিট লিংকটি মুছে ফেলতে চান?`)) {
      return;
    }

    const isCurrent = isTxn ? txnLinks : invLinks;
    const updated = isCurrent.filter(l => l.id !== id);

    try {
      if (isTxn) {
        await fetch('/api/config/month-sheet-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: updated })
        });
        if (onSaveLinks) await onSaveLinks(updated);
        setTxnLinks(updated);
      } else {
        await fetch('/api/config/inventory-month-sheet-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: updated })
        });
        if (onSaveInventoryLinks) await onSaveInventoryLinks(updated);
        setInvLinks(updated);
      }

      if (editingId === id) handleCancelEdit();
      showFeedback('success', `${monthName} মাসের ${typeLabel} শিট লিংক মুছে ফেলা হয়েছে`);
    } catch (err) {
      showFeedback('error', 'মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const isTxnTab = activeTab === 'transactions';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto max-h-[92vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl ${isTxnTab ? 'bg-indigo-600' : 'bg-emerald-600'} text-white flex items-center justify-center shadow-md transition-colors`}>
              {isTxnTab ? <Coins className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                মাসের শিট লিংক ব্যবস্থাপনা
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                আয়-ব্যয় এবং মালামাল স্টকের জন্য প্রতি মাসের আলাদা আলাদা গুগল শিট লিংক যোগ করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Income-Expense vs Inventory Stock */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => handleTabSwitch('transactions')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              isTxnTab
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>মূল আয়-ব্যয় শিট ({txnLinks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('inventory')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              !isTxnTab
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>মালামাল ও স্টক শিট ({invLinks.length})</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border leading-relaxed ${
          isTxnTab 
            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200' 
            : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
        }`}>
          {isTxnTab ? (
            <>
              <Coins className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>মূল আয়-ব্যয়ের জন্য মাসের শিট:</strong> নির্দিষ্ট মাসের গুগল শিট লিংক যোগ করলে ঐ মাসের সকল আয়, ব্যয় ও বিল কালেকশনের ডাটা সরাসরি সেই নির্দিষ্ট শিটেই সিঙ্ক হবে। যে মাসের লিংক দেওয়া থাকবে না, সেটি মূল কেন্দ্রীয় শিটে যাবে।
              </div>
            </>
          ) : (
            <>
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>মালামাল ও স্টক এর জন্য মাসের শিট:</strong> এখানে প্রতি মাসের জন্য আলাদা মালামাল/স্টক গুগল স্প্রেডশিট লিংক যোগ করতে পারবেন। ঐ নির্দিষ্ট মাসের সকল মালামাল এন্ট্রি, স্টক ইন/আউট ও লগসমূহ সরাসরি সেই মাসের স্টক শিটেই জমা হবে।
              </div>
            </>
          )}
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body Content (Protected for Admin) */}
        {!isAdminLoggedIn ? (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                এডমিন অনুমোদন আবশ্যক (Admin Access Required)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                মাসের গুগল শিট যোগ, এডিট, ডিলিট ও কনফিগারেশন দেখার অনুমতি শুধুমাত্র অনুমোদিত এডমিনের জন্য সংরক্ষিত।
              </p>
            </div>
            <div className="pt-3 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireLogin?.();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>পাসওয়ার্ড দিয়ে এডমিন লগইন করুন</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Form: Add or Edit Month Sheet Link */}
            <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${isTxnTab ? 'text-indigo-500' : 'text-emerald-500'}`} />
                <span>
                  {editingId 
                    ? `${isTxnTab ? 'আয়-ব্যয়' : 'মালামাল স্টক'} শিট লিংক পরিবর্তন করুন` 
                    : `+ নতুন মাসের ${isTxnTab ? 'আয়-ব্যয়' : 'মালামাল স্টক'} শিট লিংক যোগ করুন`}
                </span>
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer font-bold"
                >
                  বাতিল
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  হিসাবের মাস:
                </label>
                <input
                  type="month"
                  value={formMonth}
                  onChange={e => setFormMonth(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  শিটের শিরোনাম / বিবরণ:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={isTxnTab ? `${getMonthBengaliName(formMonth)} হিসাব স্প্রেডশিট` : `${getMonthBengaliName(formMonth)} মালামাল ও স্টক শিট`}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                গুগল স্প্রেডশিট বা Apps Script Web App লিংক:
              </label>
              <input
                type="text"
                inputMode="url"
                value={formSheetUrl}
                onChange={e => setFormSheetUrl(e.target.value)}
                required
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl ${
                  isTxnTab 
                    ? 'bg-indigo-600 hover:bg-indigo-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2`}
              >
                <Plus className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>
                  {isSubmitting 
                    ? 'সংরক্ষণ হচ্ছে...' 
                    : editingId 
                      ? 'পরিবর্তন সংরক্ষণ করুন' 
                      : `${isTxnTab ? 'আয়-ব্যয়' : 'মালামাল স্টক'} শিট লিংক সেভ করুন`}
                </span>
              </button>
            </div>
          </form>
          <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{isTxnTab ? '💰 মূল আয়-ব্যয় শিট লিংকসমূহ' : '📦 মালামাল ও স্টক শিট লিংকসমূহ'}</span>
              <span className="text-indigo-600 dark:text-indigo-400">({currentLinks.length} টি)</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              বর্তমান ড্যাশবোর্ড মাস: <strong className="text-indigo-600 dark:text-indigo-400">{getMonthBengaliName(selectedMonth)}</strong>
            </span>
          </div>

          {currentLinks.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                এখনো কোনো মাসের আলাদা {isTxnTab ? 'আয়-ব্যয়' : 'মালামাল স্টক'} শিট লিংক যুক্ত করা হয়নি।
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isTxnTab 
                  ? 'ডিফল্টভাবে কেন্দ্রীয় মূল গুগল স্প্রেডশিট লিঙ্কটি সকল মাসের জন্য কাজ করছে।' 
                  : 'ডিফল্টভাবে কেন্দ্রীয় স্টক গুগল স্প্রেডশিট লিঙ্কটি সকল মাসের মালামালের জন্য কাজ করছে।'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {currentLinks.map(link => {
                const isCurrentActive = selectedMonth === link.month;
                const isCopied = copiedId === link.id;

                return (
                  <div
                    key={link.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentActive
                        ? isTxnTab 
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                          : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl ${isTxnTab ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900 dark:text-white">
                            {getMonthBengaliName(link.month)}
                          </span>
                          {isCurrentActive && (
                            <span className={`px-2 py-0.5 rounded-md ${isTxnTab ? 'bg-indigo-600' : 'bg-emerald-600'} text-white text-[9px] font-bold`}>
                              সক্রিয় মাস
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {link.title || `${getMonthBengaliName(link.month)} শিট`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                          {isAdminLoggedIn ? link.sheetUrl : '••••••••••••••••••••••••••••••••••••••••'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Copy Link (Admin Only) */}
                      {isAdminLoggedIn && (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link.id, link.sheetUrl)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="লিংক কপি করুন"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Switch Dashboard to this Month */}
                      {onSelectMonth && !isCurrentActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMonth(link.month);
                            showFeedback('success', `${getMonthBengaliName(link.month)} মাসের ড্যাশবোর্ডে পরিবর্তন করা হয়েছে`);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-indigo-900/60 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="এই মাসের ড্যাশবোর্ড দেখুন"
                        >
                          <span>মাস দেখুন</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Open Link in Browser (Admin Only) */}
                      {isAdminLoggedIn && (
                        <a
                          href={link.sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="গুগল শিট ব্রাউজারে খুলুন"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Actions: Edit & Delete (Admin Only) */}
                      {isAdminLoggedIn && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(link)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="এডিট করুন"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(link.id, getMonthBengaliName(link.month))}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>এডমিন যেকোনো মাসের লিংক যোগ/এডিট/ডিলিট করতে পারবেন।</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition"
          >
            সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
