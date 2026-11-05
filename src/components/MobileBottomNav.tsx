import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  ReceiptText, 
  BarChart3,
  Boxes,
  MoreHorizontal,
  FileText,
  X,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileSpreadsheet,
  Moon,
  Sun,
  ShieldCheck,
  History,
  Link,
  ChevronRight,
  Network,
  ExternalLink
} from 'lucide-react';
import { AppNavTab, SheetConfig } from '../types';
import { formatCurrency, getMonthBengaliName } from '../data/categories';

interface MobileBottomNavProps {
  activeNav: AppNavTab;
  onNavChange: (nav: AppNavTab) => void;
  onOpenReportModal: () => void;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onOpenNewMonthModal?: () => void;
  onOpenMonthSheetManager?: () => void;
  availableMonths?: string[];
  stats?: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
  };
  config?: SheetConfig;
  onOpenSyncModal?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isAdminLoggedIn?: boolean;
  onOpenAdminLogin?: () => void;
  onAdminLogout?: () => void;
  // Controlled drawer state for device back button handling
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
  onCloseDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onNavChange,
  onOpenReportModal,
  selectedMonth = new Date().toISOString().substring(0, 7),
  onMonthChange,
  onOpenNewMonthModal,
  onOpenMonthSheetManager,
  availableMonths = [],
  stats = { totalIncome: 0, totalExpense: 0, netProfit: 0 },
  config,
  onOpenSyncModal,
  isDarkMode = false,
  onToggleDarkMode,
  isAdminLoggedIn = false,
  onOpenAdminLogin,
  onAdminLogout,
  isDrawerOpen,
  onToggleDrawer,
  onCloseDrawer
}) => {
  // Local fallback if drawer state is not provided from parent
  const [internalDrawer, setInternalDrawer] = useState(false);
  const showDrawer = isDrawerOpen !== undefined ? isDrawerOpen : internalDrawer;

  const handleCloseDrawer = () => {
    if (onCloseDrawer) {
      onCloseDrawer();
    } else {
      setInternalDrawer(false);
    }
  };

  const handleTriggerDrawerToggle = () => {
    if (onToggleDrawer) {
      onToggleDrawer();
    } else {
      setInternalDrawer(!internalDrawer);
    }
  };

  const handleNav = (nav: AppNavTab) => {
    onNavChange(nav);
    handleCloseDrawer();
  };

  const currencySymbol = config?.currencySymbol || '৳';
  const isConnected = !!config?.sheetUrl && config?.syncStatus === 'connected';

  const now = new Date();
  const currentCalendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedMonth === currentCalendarMonth;

  return (
    <>
      {/* Smooth Side Drawer Menu when "আরও" (More) is clicked */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={handleCloseDrawer}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          />

          {/* Side Drawer Panel (Smooth slide-in from the Right side) */}
          <aside 
            role="dialog"
            aria-modal="true"
            aria-label="মোবাইল ড্রয়ার মেনু"
            onClick={e => e.stopPropagation()}
            className="fixed inset-y-0 right-0 z-50 w-[310px] max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
          >
            {/* Drawer Top Header with App Header Branding & Cross (X) Close Button */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200/50 shrink-0">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight leading-tight">
                    <span className="text-emerald-600 dark:text-emerald-400">আয়</span>
                    <span className="text-slate-900 dark:text-white">-</span>
                    <span className="text-rose-600 dark:text-rose-400">ব্যয়</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:!text-white font-medium tracking-wide">
                    স্মার্ট ব্যবস্থাপনা
                  </p>
                </div>
              </div>
              
              {/* Prominent Cross (X) button at the top */}
              <button 
                type="button"
                onClick={handleCloseDrawer}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label="ড্রয়ার বন্ধ করুন"
                title="ড্রয়ার বন্ধ করুন"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Drawer Body Content */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* 1. তথ্য সারসংক্ষেপ কার্ড (Selected Month Quick Summary) */}
              <div className="bg-slate-100 dark:bg-zinc-800/90 rounded-2xl p-3.5 border border-slate-200 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{getMonthBengaliName(selectedMonth)}</span>
                    {isCurrentMonth ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        চলতি মাস
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                        ইতিহাস
                      </span>
                    )}
                  </div>

                  {/* Google Sheet Sync Indicator */}
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isConnected ? 'শিট সংযুক্ত ✓' : 'শিট সংযোগ'}</span>
                  </div>
                </div>

                {/* 3 Metric Mini Cards */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-600 font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>মোট আয়</span>
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5 truncate">
                      {formatCurrency(stats.totalIncome, currencySymbol)}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-rose-600 font-bold">
                      <TrendingDown className="w-3 h-3" />
                      <span>মোট ব্যয়</span>
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5 truncate">
                      {formatCurrency(stats.totalExpense, currencySymbol)}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-600 font-bold">
                      <Wallet className="w-3 h-3" />
                      <span>ব্যালেন্স</span>
                    </div>
                    <p className={`text-xs font-black mt-0.5 truncate ${stats.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(stats.netProfit, currencySymbol)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. মাসের শিট ও ইতিহাস পরিবর্তন সেকশন (Month Switcher & Admin-Only New Sheet Add) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-500" />
                    <span>হিসাবের মাস {isAdminLoggedIn ? '(সবার ড্যাশবোর্ড)' : ''}</span>
                  </span>

                  {/* ONLY ADMIN CAN SEE AND ADD NEW MONTH SHEET! */}
                  {isAdminLoggedIn && onOpenNewMonthModal && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseDrawer();
                        onOpenNewMonthModal();
                      }}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="নতুন মাসের শিট যোগ করুন (শুধুমাত্র এডমিন)"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>নতুন মাসের শিট যোগ</span>
                    </button>
                  )}
                </div>

                {/* Month Selection: Available for all users to select and view accounts */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={e => onMonthChange && onMonthChange(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {getMonthBengaliName(m)} {m === currentCalendarMonth ? '(চলতি মাস)' : '(ইতিহাস)'}
                      </option>
                    ))}
                  </select>
                  
                  {!isCurrentMonth && onMonthChange && (
                    <button
                      type="button"
                      onClick={() => onMonthChange(currentCalendarMonth)}
                      className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shrink-0 transition"
                      title="চলতি মাসে ফিরে যান"
                    >
                      চলতি মাস
                    </button>
                  )}
                </div>

                {/* Admin-only Month Sheet Links Manager launcher */}
                {isAdminLoggedIn && onOpenMonthSheetManager && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseDrawer();
                      onOpenMonthSheetManager();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-emerald-600" />
                      <span>সব মাসের শিট লিংক তৈরি ও এডিট (এডমিন)</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-500" />
                  </button>
                )}
              </div>

              {/* 3. প্রধান মেনু অপশনসমূহ (Feature Navigation Grid) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  অ্যাপ্লিকেশন পেজ ও ফিচার
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {/* স্টাফ ও বেতন */}
                  <button
                    onClick={() => handleNav('staff')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                      activeNav === 'staff'
                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="leading-tight">স্টাফ ও বেতন</p>
                      <p className="text-[9px] text-slate-400 font-normal">পেরোল হিসাব</p>
                    </div>
                  </button>

                  {/* লেনদেন খতিয়ান */}
                  <button
                    onClick={() => handleNav('transactions')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                      activeNav === 'transactions'
                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="leading-tight">লেনদেন খতিয়ান</p>
                      <p className="text-[9px] text-slate-400 font-normal">আয়-ব্যয় বিবরণী</p>
                    </div>
                  </button>

                  {/* মালামাল ও সরঞ্জাম স্টক */}
                  <button
                    onClick={() => handleNav('inventory')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                      activeNav === 'inventory'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="leading-tight">মালামাল স্টক</p>
                      <p className="text-[9px] text-slate-400 font-normal">ONU ও তার ট্র্যাকিং</p>
                    </div>
                  </button>

                  {/* চার্ট ও অ্যানালিটিক্স */}
                  <button
                    onClick={() => handleNav('analytics')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                      activeNav === 'analytics'
                        ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="leading-tight">চার্ট ও গ্রাফ</p>
                      <p className="text-[9px] text-slate-400 font-normal">লাভ-ক্ষতি এনালাইসিস</p>
                    </div>
                  </button>

                  {/* মাসিক রিপোর্ট ও প্রিন্ট */}
                  <button
                    onClick={() => {
                      handleCloseDrawer();
                      onOpenReportModal();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold transition text-left bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="leading-tight">মাসিক রিপোর্ট</p>
                      <p className="text-[9px] text-slate-400 font-normal">স্টেটমেন্ট প্রিন্ট</p>
                    </div>
                  </button>

                  {/* গুগল শিট সিঙ্ক সেটিংস (শুধুমাত্র এডমিন) */}
                  <button
                    onClick={() => {
                      handleCloseDrawer();
                      if (!isAdminLoggedIn) {
                        if (onOpenAdminLogin) onOpenAdminLogin();
                      } else {
                        if (onOpenSyncModal) onOpenSyncModal();
                      }
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold transition text-left bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="leading-tight">গুগল শিট সিঙ্ক</p>
                      <p className="text-[9px] text-slate-400 font-normal">লাইভ ব্যাকআপ</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. সিস্টেম অপশন: থিম ও এডমিন লগইন (Drawer Footer) */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-white/95 dark:bg-slate-900/95 sticky bottom-0">
              {/* Dark / Light Mode Toggle */}
              {onToggleDarkMode && (
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  <span>{isDarkMode ? 'লাইট মোড' : 'ডার্ক মোড'}</span>
                </button>
              )}

              {/* Admin Login / Logout button */}
              {isAdminLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onAdminLogout) onAdminLogout();
                    handleCloseDrawer();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>এডমিন লগআউট</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseDrawer();
                    if (onOpenAdminLogin) onOpenAdminLogin();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>এডমিন লগইন</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav 
        aria-label="মোবাইল বটম নেভিগেশন"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] no-print"
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleNav('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
              activeNav === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeNav === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[10px] mt-0.5">হোম</span>
          </button>

          {/* 2. Inventory */}
          <button
            onClick={() => handleNav('inventory')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
              activeNav === 'inventory'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Boxes className={`w-5 h-5 ${activeNav === 'inventory' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[10px] mt-0.5">স্টক</span>
          </button>

          {/* 3. New Entry (Floating Center Action) - Admin Only */}
          {isAdminLoggedIn && (
            <button
              onClick={() => handleNav('new_entry')}
              className="flex flex-col items-center justify-center min-w-[52px] min-h-[44px] -mt-4 group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-active:scale-95 transition-transform">
                <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">এন্ট্রি</span>
            </button>
          )}

          {/* 4. Analytics / Charts */}
          <button
            onClick={() => handleNav('analytics')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
              activeNav === 'analytics'
                ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeNav === 'analytics' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[10px] mt-0.5">চার্ট</span>
          </button>

          {/* 5. More Menu Side Drawer Trigger */}
          <button
            onClick={handleTriggerDrawerToggle}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
              showDrawer || activeNav === 'staff' || activeNav === 'transactions' || activeNav === 'report'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
            aria-label="আরও মেনু অপশনসমূহ খুলুন"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">আরও</span>
          </button>
        </div>
      </nav>
    </>
  );
};
