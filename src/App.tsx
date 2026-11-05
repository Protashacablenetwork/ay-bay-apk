/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, 
  SheetConfig, 
  Staff, 
  SalaryPayment, 
  DashboardCardType,
  InventoryItem,
  InventoryLog,
  AppNavTab
} from './types';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { DashboardOverview } from './components/DashboardOverview';
import { CardDetailModal } from './components/CardDetailModal';
import { CardDetailPage } from './components/CardDetailPage';
import { StaffSalaryManager } from './components/StaffSalaryManager';
import { SalarySlipModal } from './components/SalarySlipModal';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { DetailModal } from './components/DetailModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AdminLoginModal } from './components/AdminLoginModal';
import { InventoryManager } from './components/InventoryManager';
import { InventoryReportPage } from './components/InventoryReportPage';
import { VisualAnalytics } from './components/VisualAnalytics';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { NewMonthModal } from './components/NewMonthModal';
import { MonthSheetManagerModal } from './components/MonthSheetManagerModal';
import { 
  getMonthBengaliName, 
  parseNumber, 
  isIncomeTransaction, 
  isExpenseTransaction,
  getTransactionMonth
} from './data/categories';
import { ArrowDownToLine, CheckCircle2, AlertCircle, ArrowLeft, Boxes, BarChart3, Sparkles, PlusCircle, FileSpreadsheet } from 'lucide-react';

export const DEFAULT_GOOGLE_SHEET_URL = '';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

  const [config, setConfig] = useState<SheetConfig>(() => {
    let localSaved: any = null;
    try {
      const raw = localStorage.getItem('isp_admin_saved_config');
      if (raw) localSaved = JSON.parse(raw);
    } catch {}

    return {
      sheetUrl: localSaved?.sheetUrl || '',
      sheetId: '',
      inventorySheetUrl: localSaved?.inventorySheetUrl || '',
      inventorySheetName: 'মালামাল_ও_ইকুইপমেন্ট_স্টক',
      monthSheetLinks: localSaved?.monthSheetLinks || [],
      inventoryMonthSheetLinks: localSaved?.inventoryMonthSheetLinks || [],
      autoSync: true,
      lastSyncTime: null,
      syncStatus: localSaved?.sheetUrl ? 'connected' : 'idle',
      syncMessage: localSaved?.sheetUrl ? 'গুগল শিট লাইভ সিঙ্ক সক্রিয় রয়েছে' : 'কোনো গুগল শিট লিংক সংযুক্ত নেই',
      companyName: localSaved?.companyName || 'স্মার্ট ব্যবস্থাপনা',
      currencySymbol: '৳'
    };
  });

  // User notification toast
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto hide notification after 3.5 seconds
  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => {
        setSyncToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  // Dark / Light Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isp_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('isp_dark_mode', String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [isDarkMode]);

  // Admin Login State for New Entry
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isp_admin_logged') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('isp_admin_logged', String(isAdminLoggedIn));
    } catch {}
  }, [isAdminLoggedIn]);

  // Current Navigation Tab
  const [activeNav, setActiveNav] = useState<AppNavTab>('dashboard');
  const [inventoryReportInitialTab, setInventoryReportInitialTab] = useState<'stock' | 'issued'>('stock');

  // Month selection for accounts & payroll (defaults to saved or current YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('isp_selected_month');
      if (saved) return saved;
    } catch {}
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // User created / managed months
  const [managedMonths, setManagedMonths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('isp_managed_months');
      if (saved) return JSON.parse(saved);
    } catch {}
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  });

  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [isMonthSheetModalOpen, setIsMonthSheetModalOpen] = useState(false);
  const [monthSheetModalTab, setMonthSheetModalTab] = useState<'transactions' | 'inventory'>('transactions');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleOpenMonthSheetManager = (tab: 'transactions' | 'inventory' = 'transactions') => {
    setMonthSheetModalTab(tab);
    setIsMonthSheetModalOpen(true);
  };

  // Available months extracted from managedMonths + transaction dates
  const availableMonths = useMemo(() => {
    const set = new Set<string>(managedMonths);
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    set.add(currentYM);

    (transactions || []).forEach(t => {
      if (t && t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });

    return Array.from(set).sort().reverse();
  }, [managedMonths, transactions]);

  const lastServerActiveMonthRef = useRef<string | null>(null);
  const hasUserSetMonthRef = useRef<boolean>(false);

  // Month change handler: Changes month locally for the current user's view
  const handleMonthChange = (newMonth: string) => {
    hasUserSetMonthRef.current = true;
    setSelectedMonth(newMonth);

    try {
      localStorage.setItem('isp_selected_month', newMonth);
    } catch {}

    const updated = Array.from(new Set([newMonth, ...managedMonths]));
    setManagedMonths(updated);
    try {
      localStorage.setItem('isp_managed_months', JSON.stringify(updated));
    } catch {}

    setSyncToast({
      message: `📅 ${getMonthBengaliName(newMonth)} মাসের তথ্য দেখানো হচ্ছে`,
      type: 'success'
    });
  };

  const handleAddNewMonthSheet = (monthKey: string, sheetUrl?: string) => {
    const updated = Array.from(new Set([monthKey, ...managedMonths]));
    setManagedMonths(updated);
    try {
      localStorage.setItem('isp_managed_months', JSON.stringify(updated));
      localStorage.setItem('isp_selected_month', monthKey);
    } catch {}
    hasUserSetMonthRef.current = true;
    setSelectedMonth(monthKey);
    lastServerActiveMonthRef.current = monthKey;

    let newLinks = config.monthSheetLinks || [];
    if (sheetUrl) {
      const newLink = {
        id: `MSL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        month: monthKey,
        sheetUrl: sheetUrl,
        title: `${getMonthBengaliName(monthKey)} মাসের হিসাব শিট`,
        createdAt: new Date().toISOString()
      };
      const existingIdx = newLinks.findIndex(l => l.month === monthKey);
      if (existingIdx !== -1) {
        newLinks[existingIdx] = newLink;
      } else {
        newLinks = [newLink, ...newLinks];
      }
    }

    handleSaveConfig({ activeMonth: monthKey, managedMonths: updated, monthSheetLinks: newLinks });
    setSyncToast({
      message: `🎉 ${getMonthBengaliName(monthKey)} মাসের নতুন শিট সফলভাবে যোগ করা হয়েছে! ড্যাশবোর্ড ০ থেকে শুরু হয়েছে${sheetUrl ? ' এবং শিট লিংক সংযুক্ত হয়েছে' : ''}।`,
      type: 'success'
    });
  };

  // Interactive Card Detail Modal
  const [activeCardDetail, setActiveCardDetail] = useState<DashboardCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Salary Slip Modal
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<SalaryPayment | null>(null);
  const [isSalarySlipOpen, setIsSalarySlipOpen] = useState(false);

  // Transaction Modals
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [initialEditInModal, setInitialEditInModal] = useState(false);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // New Transaction Form Preset
  const [formInitialType, setFormInitialType] = useState<'income' | 'expense'>('income');
  const [formInitialCategory, setFormInitialCategory] = useState<string | undefined>(undefined);

  // Monthly Report & Google Sheet Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Synchronized state reference for device back button popstate handling
  const stateRef = useRef({
    activeNav,
    isCardModalOpen,
    isSalarySlipOpen,
    isDetailModalOpen,
    isReportModalOpen,
    isSyncModalOpen,
    isNewMonthModalOpen,
    isMonthSheetModalOpen,
    isMobileDrawerOpen
  });

  useEffect(() => {
    stateRef.current = {
      activeNav,
      isCardModalOpen,
      isSalarySlipOpen,
      isDetailModalOpen,
      isReportModalOpen,
      isSyncModalOpen,
      isNewMonthModalOpen,
      isMonthSheetModalOpen,
      isMobileDrawerOpen
    };
  }, [
    activeNav, 
    isCardModalOpen, 
    isSalarySlipOpen, 
    isDetailModalOpen, 
    isReportModalOpen, 
    isSyncModalOpen, 
    isNewMonthModalOpen,
    isMonthSheetModalOpen,
    isMobileDrawerOpen
  ]);

  // Push history step when navigation or modal changes so physical back button works
  const pushHistoryStep = useCallback((stepName: string) => {
    try {
      window.history.pushState({ appStep: stepName, timestamp: Date.now() }, '');
    } catch {
      // safe fallback in iframe environments
    }
  }, []);

  // Device back button (popstate listener)
  useEffect(() => {
    try {
      if (!window.history.state) {
        window.history.replaceState({ appStep: 'dashboard' }, '');
      }
    } catch {
      // ignore
    }

    const handlePopState = () => {
      const s = stateRef.current;
      // Close open modals & drawer in LIFO order
      if (s.isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
        return;
      }
      if (s.isMonthSheetModalOpen) {
        setIsMonthSheetModalOpen(false);
        return;
      }
      if (s.isNewMonthModalOpen) {
        setIsNewMonthModalOpen(false);
        return;
      }
      if (s.isSalarySlipOpen) {
        setIsSalarySlipOpen(false);
        setSelectedSalarySlip(null);
        return;
      }
      if (s.isDetailModalOpen) {
        setIsDetailModalOpen(false);
        setSelectedTransaction(null);
        return;
      }
      if (s.isCardModalOpen) {
        setIsCardModalOpen(false);
        setActiveCardDetail(null);
        return;
      }
      if (s.isReportModalOpen) {
        setIsReportModalOpen(false);
        return;
      }
      if (s.isSyncModalOpen) {
        setIsSyncModalOpen(false);
        return;
      }
      // If on a sub-page, return to dashboard
      if (s.activeNav !== 'dashboard') {
        setActiveNav('dashboard');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation changer with history push
  const handleNavChange = useCallback((newNav: AppNavTab) => {
    if (newNav === 'new_entry' && !isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন এন্ট্রি করার জন্য প্রথমে এডমিন লগইন করুন', type: 'error' });
      return;
    }
    if (newNav !== activeNav) {
      if (newNav !== 'dashboard') {
        pushHistoryStep(`nav-${newNav}`);
      }
      setActiveNav(newNav);
      if (newNav !== 'card_detail') {
        setActiveCardDetail(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeNav, isAdminLoggedIn, pushHistoryStep]);

  // Global manual Go Back function
  const handleGoBack = useCallback(() => {
    const s = stateRef.current;
    if (s.isMobileDrawerOpen) {
      setIsMobileDrawerOpen(false);
      return;
    }
    if (s.isMonthSheetModalOpen) {
      setIsMonthSheetModalOpen(false);
      return;
    }
    if (s.isNewMonthModalOpen) {
      setIsNewMonthModalOpen(false);
      return;
    }
    if (s.isSalarySlipOpen) {
      setIsSalarySlipOpen(false);
      setSelectedSalarySlip(null);
      return;
    }
    if (s.isDetailModalOpen) {
      setIsDetailModalOpen(false);
      setSelectedTransaction(null);
      return;
    }
    if (s.isCardModalOpen) {
      setIsCardModalOpen(false);
      setActiveCardDetail(null);
      return;
    }
    if (s.isReportModalOpen) {
      setIsReportModalOpen(false);
      return;
    }
    if (s.isSyncModalOpen) {
      setIsSyncModalOpen(false);
      return;
    }
    if (s.activeNav !== 'dashboard') {
      setActiveNav('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }, []);

  // Fetch data silently without full-screen loading spinner
  const fetchDataSilent = useCallback(async () => {
    try {
      const [txRes, cfgRes, staffRes, salRes, invRes, logsRes] = await Promise.all([
        fetch('/api/transactions?t=' + Date.now()),
        fetch('/api/config?t=' + Date.now()),
        fetch('/api/staff?t=' + Date.now()),
        fetch('/api/salaries?t=' + Date.now()),
        fetch('/api/inventory?t=' + Date.now()),
        fetch('/api/inventory/logs?t=' + Date.now())
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData)) {
          setTransactions(txData);
          try { localStorage.setItem('isp_cache_txns', JSON.stringify(txData)); } catch {}
        }
      }

      if (cfgRes.ok) {
        let cfgData = await cfgRes.json();

        // Dual-direction synchronization with browser persistent storage:
        let localSaved: any = null;
        try {
          const raw = localStorage.getItem('isp_admin_saved_config');
          if (raw) localSaved = JSON.parse(raw);
        } catch {}

        // If server sheetUrl is empty but localStorage has admin's saved sheetUrl:
        if ((!cfgData.sheetUrl || cfgData.sheetUrl.trim() === '') && localSaved && localSaved.sheetUrl && localSaved.sheetUrl.trim().startsWith('http')) {
          try {
            const restoreRes = await fetch('/api/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sheetUrl: localSaved.sheetUrl,
                monthSheetLinks: localSaved.monthSheetLinks || cfgData.monthSheetLinks || [],
                inventorySheetUrl: localSaved.inventorySheetUrl || cfgData.inventorySheetUrl || '',
                inventoryMonthSheetLinks: localSaved.inventoryMonthSheetLinks || cfgData.inventoryMonthSheetLinks || [],
                companyName: localSaved.companyName || cfgData.companyName
              })
            });
            if (restoreRes.ok) {
              cfgData = await restoreRes.json();
              fetch('/api/sync/pull', { method: 'POST' }).then(r => r.json()).then(d => {
                if (d && Array.isArray(d.transactions)) {
                  setTransactions(d.transactions);
                }
              }).catch(() => {});
            }
          } catch (e) {
            console.warn('Auto-restore sheet config notice:', e);
          }
        } else if (cfgData.sheetUrl && cfgData.sheetUrl.trim().startsWith('http')) {
          try {
            localStorage.setItem('isp_admin_saved_config', JSON.stringify({
              sheetUrl: cfgData.sheetUrl,
              monthSheetLinks: cfgData.monthSheetLinks || [],
              inventorySheetUrl: cfgData.inventorySheetUrl || '',
              inventoryMonthSheetLinks: cfgData.inventoryMonthSheetLinks || [],
              companyName: cfgData.companyName
            }));
          } catch {}
        }

        setConfig(prev => ({
          ...prev,
          ...cfgData,
          sheetUrl: cfgData.sheetUrl || ''
        }));

        // Synchronize activeMonth across sessions & devices without reverting user's choice
        if (cfgData.activeMonth) {
          if (lastServerActiveMonthRef.current === null) {
            lastServerActiveMonthRef.current = cfgData.activeMonth;
            const savedLocalMonth = localStorage.getItem('isp_selected_month');
            if (!savedLocalMonth) {
              setSelectedMonth(cfgData.activeMonth);
            }
          } else if (cfgData.activeMonth !== lastServerActiveMonthRef.current) {
            lastServerActiveMonthRef.current = cfgData.activeMonth;
            setSelectedMonth(cfgData.activeMonth);
            try {
              localStorage.setItem('isp_selected_month', cfgData.activeMonth);
            } catch {}
          }
        }

        if (Array.isArray(cfgData.managedMonths) && cfgData.managedMonths.length > 0) {
          setManagedMonths(prev => Array.from(new Set([...cfgData.managedMonths, ...prev])));
        }
      }

      if (staffRes.ok) {
        const stfData = await staffRes.json();
        if (Array.isArray(stfData)) {
          setStaffList(stfData);
          try { localStorage.setItem('isp_cache_staff', JSON.stringify(stfData)); } catch {}
        }
      }

      if (salRes.ok) {
        const salData = await salRes.json();
        if (Array.isArray(salData)) {
          setSalaries(salData);
          try { localStorage.setItem('isp_cache_salaries', JSON.stringify(salData)); } catch {}
        }
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        if (Array.isArray(invData)) {
          setInventoryItems(invData);
          try { localStorage.setItem('isp_cache_inventory', JSON.stringify(invData)); } catch {}
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData)) {
          setInventoryLogs(logsData);
          try { localStorage.setItem('isp_cache_logs', JSON.stringify(logsData)); } catch {}
        }
      }


    } catch (err) {
      console.warn('Silent sync poll notice:', err);
    }
  }, []);

  // Inventory Management Handlers
  const handleAddInventoryItem = async (item: Partial<InventoryItem>) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const saved = await res.json();
        setInventoryItems(prev => {
          const idx = prev.findIndex(i => i.id === saved.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return [...prev, saved];
        });
        setSyncToast({ message: 'মালামাল সফলভাবে সংরক্ষিত হয়েছে', type: 'success' });
        
        // Auto-sync with Google Sheet if configured
        if ((config.inventorySheetUrl || config.sheetUrl) && config.autoSync !== false) {
          fetch('/api/inventory/sync-sheet', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: selectedMonth })
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Inventory save failed', err);
      setSyncToast({ message: 'মালামাল সংরক্ষণ ব্যর্থ হয়েছে', type: 'error' });
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInventoryItems(prev => prev.filter(i => i.id !== id));
        setSyncToast({ message: 'মালামাল সফলভাবে মুছে ফেলা হয়েছে', type: 'success' });
        
        // Auto-sync with Google Sheet if configured
        if ((config.inventorySheetUrl || config.sheetUrl) && config.autoSync !== false) {
          fetch('/api/inventory/sync-sheet', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: selectedMonth })
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Inventory delete failed', err);
    }
  };

  const handleDeleteInventoryLog = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInventoryLogs(prev => prev.filter(l => l.id !== id));
        // refresh items & transactions silently because stock and expenses may have been reverted
        await fetchDataSilent();
        setSyncToast({ message: 'মুভমেন্ট লগ সফলভাবে মুছে ফেলা হয়েছে ও স্টক সমন্বয় করা হয়েছে', type: 'success' });
        
        // Auto-sync with Google Sheet if configured
        if ((config.inventorySheetUrl || config.sheetUrl) && config.autoSync !== false) {
          fetch('/api/inventory/sync-sheet', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: selectedMonth })
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Delete log failed', err);
      setSyncToast({ message: 'লগ মুছতে ব্যর্থ হয়েছে', type: 'error' });
    }
  };

  const handleLogMovement = async (logData: {
    itemId: string;
    type: 'in' | 'out' | 'return' | 'damaged';
    quantity: number;
    date: string;
    recipientOrSource: string;
    costPerUnit?: number;
    addToExpense?: boolean;
    expenseCategory?: string;
    paymentMethod?: string;
    note?: string;
  }) => {
    try {
      const res = await fetch('/api/inventory/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (res.ok) {
        const result = await res.json();
        setInventoryLogs(prev => [...prev, result.log]);
        setInventoryItems(prev => {
          const idx = prev.findIndex(i => i.id === result.item.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = result.item;
            return updated;
          }
          return prev;
        });

        // If expense was created, refresh transactions immediately
        if (result.linkedTxnId) {
          const txRes = await fetch('/api/transactions');
          if (txRes.ok) {
            const txData = await txRes.json();
            setTransactions(txData);
          }
          setSyncToast({ message: 'স্টক ইন সম্পন্ন ও লেনদেন খতিয়ানে ব্যয় যুক্ত হয়েছে!', type: 'success' });
        } else {
          setSyncToast({ message: 'স্টক রেকর্ড সফলভাবে সংরক্ষিত হয়েছে', type: 'success' });
        }
        
        // Auto-sync with Google Sheet if configured
        if ((config.inventorySheetUrl || config.sheetUrl) && config.autoSync !== false) {
          fetch('/api/inventory/sync-sheet', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: selectedMonth })
          }).catch(() => {});
        }
      }

    } catch (err) {
      console.error('Movement log error', err);
      setSyncToast({ message: 'স্টক মুভমেন্ট রেকর্ড করতে সমস্যা হয়েছে', type: 'error' });
    }
  };

  // Fetch initial data: transactions, config, staff, salaries
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load local database FIRST so app UI populates instantly on mobile!
      await fetchDataSilent();

      // Then pull fresh data from Google Sheet if available
      try {
        const pullRes = await fetch('/api/sync/pull', { method: 'POST' });
        const data = await pullRes.json();
        if (data && data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          const activeTxnMonths = Array.from(new Set(data.transactions.map((t: any) => getTransactionMonth(t.date)).filter(Boolean)));
          if (activeTxnMonths.length > 0) {
            setSelectedMonth(prev => {
              const hasCurrentTxns = data.transactions.some((t: any) => getTransactionMonth(t.date) === prev);
              if (!hasCurrentTxns) {
                const bestMonth = (config.activeMonth && activeTxnMonths.includes(config.activeMonth)) ? config.activeMonth : (activeTxnMonths[0] as string);
                if (bestMonth) {
                  try { localStorage.setItem('isp_selected_month', bestMonth); } catch {}
                  return bestMonth;
                }
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // ignore background sync notice
      }
    } catch (err) {
      console.warn('Initial load notice:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDataSilent, config.activeMonth]);

  useEffect(() => {
    fetchData();

    // Auto-sync polling every 3 seconds to capture any direct edits in Google Sheets
    const pollTimer = setInterval(() => {
      fetchDataSilent();
    }, 3000);

    // Instant sync when user switches tabs or refocuses window
    const handleFocus = () => {
      fetch('/api/sync/pull', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          }
        })
        .catch(() => {})
        .finally(() => {
          fetchDataSilent();
        });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleFocus();
    });

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, fetchDataSilent]);

  // Filter transactions by selected month for month-specific metrics safely
  const monthTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => {
      if (!t || typeof t.date !== 'string') return false;
      return getTransactionMonth(t.date) === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Compute live dashboard metrics for selected month
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    monthTransactions.forEach((t) => {
      if (!t) return;
      const amt = parseNumber(t.amount);
      if (isIncomeTransaction(t)) {
        totalIncome += amt;
        incomeCount++;
      } else {
        totalExpense += amt;
        expenseCount++;
      }
    });

    const netProfit = totalIncome - totalExpense;

    // Staff paid salaries for this month
    const monthSal = (salaries || []).filter(s => s && s.month === selectedMonth && s.paymentStatus === 'paid');
    const paidSalaries = monthSal.reduce((acc, s) => acc + (Number(s?.netSalary) || 0), 0);

    // Bandwidth & Operations expenses
    const bandwidthCategories = [
      'ব্যান্ডউইথ/আপস্ট্রিম বিল',
      'বিদ্যুৎ বিল',
      'অফিস ভাড়া',
      'অপটিক্যাল ফাইবার ও কেবল',
      'ONU/OLT/Router ক্রয়',
      'স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ',
      'কেবল মেরামত ও রক্ষণাবেক্ষণ'
    ];

    const totalBandwidthOps = monthTransactions
      .filter(t => {
        if (!t || !isExpenseTransaction(t)) return false;
        const cat = String(t.category || '');
        return (
          bandwidthCategories.includes(cat) ||
          cat.includes('ব্যান্ডউইথ') ||
          cat.includes('বিদ্যুৎ') ||
          cat.includes('কেবল') ||
          cat.includes('ফাইবার')
        );
      })
      .reduce((acc, t) => acc + parseNumber(t.amount), 0);

    const activeStaffCount = (staffList || []).filter(s => s && s.status === 'active').length;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      paidSalaries,
      totalBandwidthOps,
      incomeCount,
      expenseCount,
      staffCount: activeStaffCount
    };
  }, [monthTransactions, salaries, staffList, selectedMonth]);

  // Interactive Card Click Handler (Opens Full Page Card Detail View)
  const handleCardClick = (type: DashboardCardType) => {
    setActiveCardDetail(type);
    handleNavChange('card_detail');
    pushHistoryStep(`card-${type}`);
  };

  // Open New Transaction Form from anywhere
  const handleOpenNewTransaction = (type?: 'income' | 'expense', category?: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন এন্ট্রি করার জন্য প্রথমে এডমিন লগইন করুন', type: 'error' });
      return;
    }
    setFormInitialType(type || 'income');
    setFormInitialCategory(category);
    handleNavChange('new_entry');
  };

  // Open Salary Slip Modal
  const handleViewSalarySlip = (sal: SalaryPayment) => {
    setSelectedSalarySlip(sal);
    setIsSalarySlipOpen(true);
    pushHistoryStep('salary-slip');
  };

  // Open Report Modal / Page
  const handleOpenReportModal = () => {
    handleNavChange('report');
  };

  // Open Google Sheet Sync Modal
  const handleOpenSyncModal = () => {
    setIsSyncModalOpen(true);
    pushHistoryStep('sync-modal');
  };

  // Add new transaction
  const handleAddTransaction = async (data: {
    type: 'income' | 'expense';
    description: string;
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    note?: string;
  }) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন লেনদেন সংযোজন করতে প্রথমে এডমিন লগইন করুন', type: 'error' });
      return false;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        setTransactions(prev => [result.transaction, ...prev]);
        setSyncToast({ message: '✅ নতুন লেনদেনটি সফলভাবে অন্তর্ভুক্ত হয়েছে!', type: 'success' });
        handleNavChange('dashboard');
        return true;
      }
      setSyncToast({ message: '❌ লেনদেন যোগ করতে সমস্যা হয়েছে', type: 'error' });
      return false;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setSyncToast({ message: '❌ ব্যর্থ হয়েছে! আবার চেষ্টা করুন', type: 'error' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing transaction
  const handleUpdateTransaction = async (id: string, updatedData: Partial<Transaction>) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'লেনদেন এডিট করার জন্য এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        const result = await res.json();
        setTransactions(prev =>
          prev.map(t => (t.id === id ? result.transaction : t))
        );
        setSyncToast({ message: '✅ লেনদেনের তথ্য সফলভাবে আপডেট হয়েছে!', type: 'success' });
        return true;
      }
      setSyncToast({ message: '❌ আপডেট করা সম্ভব হয়নি', type: 'error' });
      return false;
    } catch (err) {
      console.error('Error updating transaction:', err);
      setSyncToast({ message: '❌ এডিটে ত্রুটি হয়েছে', type: 'error' });
      return false;
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'লেনদেন ডিলিট করার জন্য এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(prev => {
          const updated = prev.filter(t => t.id !== id);
          try { localStorage.setItem('isp_cache_txns', JSON.stringify(updated)); } catch {}
          return updated;
        });
        if (selectedTransaction?.id === id) {
          setIsDetailModalOpen(false);
          setSelectedTransaction(null);
        }
        setSyncToast({ message: '🗑️ লেনদেনটি সফলভাবে মুছে ফেলা হয়েছে!', type: 'success' });
        return true;
      }
      setSyncToast({ message: '❌ মুছে ফেলা সম্ভব হয়নি', type: 'error' });
      return false;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setSyncToast({ message: '❌ ডিলিট করার সময় ত্রুটি ঘটেছে', type: 'error' });
      return false;
    }
  };

  // STAFF MANAGEMENT HANDLERS
  const handleAddStaff = async (data: Omit<Staff, 'id' | 'createdAt'>) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন স্টাফ যোগ করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const newStaff = await res.json();
        setStaffList(prev => [...prev, newStaff]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding staff:', err);
      return false;
    }
  };

  const handleUpdateStaff = async (id: string, data: Partial<Staff>) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'স্টাফ তথ্য পরিবর্তন করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setStaffList(prev => prev.map(s => (s.id === id ? updated : s)));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating staff:', err);
      return false;
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'স্টাফ ডিলিট করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting staff:', err);
      return false;
    }
  };

  // SALARY DISBURSAL HANDLER
  const handleDisburseSalary = async (data: {
    staffId: string;
    month: string;
    baseSalary: number;
    bonusOrAllowance: number;
    deductionOrAdvance: number;
    paymentStatus: 'paid' | 'pending';
    paymentDate?: string;
    paymentMethod?: string;
    voucherNumber?: string;
    note?: string;
  }) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'বেতন প্রদান করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const record = await res.json();
        // Update salaries in state
        setSalaries(prev => {
          const idx = prev.findIndex(s => s.staffId === data.staffId && s.month === data.month);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = record;
            return copy;
          }
          return [record, ...prev];
        });

        // Re-fetch transactions because paying salary automatically adds or updates an Expense transaction!
        const txRes = await fetch('/api/transactions');
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData);
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('Error disbursing salary:', err);
      return false;
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'বেতন রেকর্ড ডিলিট করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/salaries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSalaries(prev => prev.filter(s => s.id !== id));
        // refresh transactions
        const txRes = await fetch('/api/transactions');
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting salary record:', err);
      return false;
    }
  };

  // Save Config
  const handleSaveConfig = async (newConfig: Partial<SheetConfig>) => {
    try {
      try {
        const raw = localStorage.getItem('isp_admin_saved_config');
        const currentLocal = raw ? JSON.parse(raw) : {};
        const merged = { ...currentLocal, ...newConfig };
        localStorage.setItem('isp_admin_saved_config', JSON.stringify(merged));
      } catch (e) {
        console.warn('Error saving to localStorage:', e);
      }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (res.ok) {
        const saved = await res.json();
        setConfig(saved);
        if (newConfig.sheetUrl && newConfig.sheetUrl.startsWith('http')) {
          fetch('/api/sync/pull', { method: 'POST' }).then(r => r.json()).then(d => {
            if (d && Array.isArray(d.transactions)) {
              setTransactions(d.transactions);
            }
          }).catch(() => {});
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving config:', err);
      return false;
    }
  };

  // Force Push to Google Sheet
  const handleForcePush = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/push', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        setConfig(prev => ({
          ...prev,
          syncStatus: 'connected',
          lastSyncTime: new Date().toISOString(),
          syncMessage: 'গুগল শিটে সমস্ত ডাটা সফলভাবে সংরক্ষিত'
        }));
        setTransactions(prev => prev.map(t => ({ ...t, syncedToSheet: true })));
        return { success: true, message: 'গুগল শিটে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!' };
      } else {
        return { success: false, message: data.error || data.message || 'সিঙ্ক ব্যর্থ হয়েছে' };
      }
    } catch (err: any) {
      return { success: false, message: `সংযোগ ত্রুটি: ${err.message}` };
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when user returns to window tab ("spreadsheets লিখলে এখানে দেখাবে")
  useEffect(() => {
    const handleFocus = () => {
      if (config.sheetUrl && config.autoSync) {
        fetch('/api/sync/pull', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.transactions)) {
              setTransactions(data.transactions);
              setConfig(prev => ({
                ...prev,
                syncStatus: 'connected',
                lastSyncTime: new Date().toISOString()
              }));
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [config.sheetUrl, config.autoSync]);

  // Force Pull from Google Sheet or Local Database
  const handleForcePull = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/pull', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        if (data.staff && Array.isArray(data.staff)) setStaffList(data.staff);
        setConfig(prev => ({
          ...prev,
          syncStatus: 'connected',
          lastSyncTime: new Date().toISOString(),
          syncMessage: `ডেটা সিঙ্ক হয়েছে (${data.count} টি রেকর্ড)`
        }));
        setSyncToast({
          message: `সফলভাবে ডেটা রিফ্রেশ ও আপডেট সম্পন্ন হয়েছে (${data.count} টি রেকর্ড)!`,
          type: 'success'
        });
        setTimeout(() => setSyncToast(null), 4000);
        return { success: true, message: `সফলভাবে ${data.count} টি রেকর্ড রিফ্রেশ হয়েছে!` };
      } else {
        const txRes = await fetch('/api/transactions?t=' + Date.now());
        if (txRes.ok) {
          const txList = await txRes.json();
          setTransactions(txList);
          setSyncToast({
            message: `সফলভাবে ডেটা রিফ্রেশ ও আপডেট সম্পন্ন হয়েছে (${txList.length} টি রেকর্ড)!`,
            type: 'success'
          });
          setTimeout(() => setSyncToast(null), 4000);
          return { success: true, message: 'রিফ্রেশ সম্পন্ন হয়েছে' };
        }
      }
    } catch (err: any) {
      console.error('Force pull error', err);
      const txRes = await fetch('/api/transactions?t=' + Date.now()).catch(() => null);
      if (txRes && txRes.ok) {
        const txList = await txRes.json();
        setTransactions(txList);
      }
      setSyncToast({
        message: 'সফলভাবে স্থানীয় ডেটা রিফ্রেশ সম্পন্ন হয়েছে!',
        type: 'success'
      });
      setTimeout(() => setSyncToast(null), 4000);
      return { success: true, message: 'রিফ্রেশ সম্পন্ন হয়েছে' };
    } finally {
      setIsSyncing(false);
    }
    return { success: true, message: 'রিফ্রেশ সম্পন্ন হয়েছে' };
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open('/api/export/csv', '_blank');
  };

  return (
    <main className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#f0f4fa] text-slate-900'} py-4 sm:py-5 px-3 sm:px-6 max-w-6xl mx-auto font-sans pb-24 sm:pb-8 transition-colors`}>
      {/* Offline Status Indicator for PWA */}
      <OfflineIndicator />

      {/* Top Toast Notification */}
      {syncToast && (
        <div 
          onClick={() => setSyncToast(null)}
          className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-4 duration-300 cursor-pointer"
          title="ক্লিক করে হাইড করুন"
        >
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
            syncToast.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-700' 
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header with Branding & Navigation Tabs */}
      <Header
        config={config}
        activeNav={activeNav}
        onNavChange={handleNavChange}
        onOpenSyncModal={handleOpenSyncModal}
        onOpenReportModal={handleOpenReportModal}
        onExportCsv={handleExportCsv}
        isSyncing={isSyncing}
        onQuickSync={handleForcePush}
        onPullFromSheet={handleForcePull}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onAdminLogout={() => {
          setIsAdminLoggedIn(false);
          setSyncToast({ message: 'এডমিন লগআউট সফল হয়েছে', type: 'success' });
        }}
        onOpenNewMonthModal={() => setIsNewMonthModalOpen(true)}
        onOpenMonthSheetManager={() => setIsMonthSheetModalOpen(true)}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={() => {
          setIsAdminLoggedIn(true);
          setSyncToast({ message: 'এডমিন লগইন সফল হয়েছে! এখন নতুন এন্ট্রি করতে পারবেন।', type: 'success' });
          handleNavChange('new_entry');
        }}
      />

      {/* VIEW 1: DASHBOARD VIEW (NO TRANSACTION LIST AT BOTTOM!) */}
      {activeNav === 'dashboard' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          {/* Google Sheets Live Status Banner (Desktop/Tablet only - hidden on mobile as requested) */}
          {config.sheetUrl && (
            <div className="hidden md:flex bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 border border-emerald-300/80 dark:border-emerald-800/80 rounded-2xl p-3 sm:px-4 flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  <strong className="text-emerald-950 dark:text-emerald-300 font-bold">গুগল স্প্রেডশিট সংযুক্ত:</strong> আপনি সরাসরি গুগল শিটে কোনো লেনদেন লিখলেও এখানে তা সাথে সাথে লোড হবে।
                </span>
              </div>
              <button
                onClick={handleForcePull}
                disabled={isSyncing}
                title="গুগল শিট থেকে নতুন ডাটা আনুন"
                className="shrink-0 px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <ArrowDownToLine className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>শিট থেকে রিফ্রেশ</span>
              </button>
            </div>
          )}

          {/* 5 Interactive Colorful KPI Cards (2 per line on mobile: grid-cols-2 lg:grid-cols-4) */}
          <StatsCards
            totalIncome={stats.totalIncome}
            totalExpense={stats.totalExpense}
            netProfit={stats.netProfit}
            paidSalaries={stats.paidSalaries}
            totalBandwidthOps={stats.totalBandwidthOps}
            incomeCount={stats.incomeCount}
            expenseCount={stats.expenseCount}
            staffCount={stats.staffCount}
            onCardClick={handleCardClick}
            onNavigateToLedger={() => handleNavChange('transactions')}
            currencySymbol={config.currencySymbol}
          />

          {/* 
            ANIMATED ENTRY FORM TRIGGER ON DASHBOARD:
            "নতুন লেনদেন এন্ট্রি ফরম দেখাবে না লেখা এনিমেশন হবে চাপ দিলে ফর্ম আসবে , ডেটা হারাবে না"
          */}
          <TransactionForm
            onAddTransaction={handleAddTransaction}
            isSubmitting={isSubmitting}
            selectedMonth={selectedMonth}
            initialType={formInitialType}
            initialCategory={formInitialCategory}
            isOpenInitially={false}
            isAdminLoggedIn={isAdminLoggedIn}
            onRequireLogin={() => setIsAdminLoginModalOpen(true)}
          />

          {/* ISP Revenue/Expense Stream Analysis & Quick Actions (NO TRANSACTION LIST!) */}
          <DashboardOverview
            transactions={transactions}
            salaries={salaries}
            staffList={staffList}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            onOpenCardDetail={handleCardClick}
            onOpenNewTransaction={handleOpenNewTransaction}
            onNavigateToStaff={() => handleNavChange('staff')}
            onNavigateToLedger={() => handleNavChange('transactions')}
            config={config}
            onOpenNewMonthModal={() => setIsNewMonthModalOpen(true)}
            onOpenSyncModal={handleOpenSyncModal}
            availableMonths={availableMonths}
            isAdminLoggedIn={isAdminLoggedIn}
          />

          {/* Dedicated Internet & Cable Network Business Shortcuts & PWA Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* 1. Inventory & Equipment Hub Card */}
            <div 
              onClick={() => handleNavChange('inventory')}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      ক্যাবল ও মালামাল স্টক (Inventory)
                    </h3>
                    {inventoryItems.some(i => i.currentStock <= i.minStockAlert) && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {inventoryItems.length} টি আইটেম • ড্রপ ক্যাবল, ONU, রাউটার ও স্প্লিটার ট্র্যাকিং
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 shrink-0">
                স্টক দেখুন →
              </span>
            </div>

            {/* 2. Visual Analytics Hub Card */}
            <div 
              onClick={() => handleNavChange('analytics')}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-cyan-300 dark:hover:border-cyan-700 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    চার্ট ও গ্রাফিক্যাল রিপোর্ট (Analytics)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    মাসিক আয়-ব্যয় তুলনা, লাভ-মার্জিন ও ব্যান্ডউইথ খরচের অনুপাত
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 shrink-0">
                চার্ট দেখুন →
              </span>
            </div>
          </div>

          {/* PWA In-App Install Banner */}
          <PWAInstallButton variant="banner" />
        </div>
      )}

      {/* VIEW 2: STAFF & SALARY MANAGEMENT (পে-রোল ও স্টাফ বেতন হিসাব) */}
      {activeNav === 'staff' && (
        <StaffSalaryManager
          staffList={staffList}
          salaries={salaries}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onAddStaff={handleAddStaff}
          onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={handleDeleteStaff}
          onDisburseSalary={handleDisburseSalary}
          onDeleteSalary={handleDeleteSalary}
          onViewSalarySlip={handleViewSalarySlip}
          config={config}
          onBackToDashboard={() => handleNavChange('dashboard')}
          isAdminLoggedIn={isAdminLoggedIn}
          onRequireLogin={() => setIsAdminLoginModalOpen(true)}
        />
      )}

      {/* VIEW 3: NEW TRANSACTION ENTRY */}
      {activeNav === 'new_entry' && (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
          <TransactionForm
            onAddTransaction={handleAddTransaction}
            isSubmitting={isSubmitting}
            initialType={formInitialType}
            initialCategory={formInitialCategory}
            isOpenInitially={true}
            isAdminLoggedIn={isAdminLoggedIn}
            onRequireLogin={() => setIsAdminLoginModalOpen(true)}
          />
        </div>
      )}

      {/* VIEW 4: COMPLETE TRANSACTION LEDGER (পৃথক লেনদেন খতিয়ান) */}
      {activeNav === 'transactions' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                কোম্পানির পূর্ণাঙ্গ লেনদেন খতিয়ান (Transaction Ledger)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                সর্বমোট {transactions.length} টি আয় ও ব্যয়ের বিস্তারিত রেকর্ড ও অনুসন্ধান
              </p>
            </div>
            <button
              onClick={() => handleOpenNewTransaction()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <span>+ নতুন এন্ট্রি</span>
            </button>
          </div>

          <TransactionList
            transactions={transactions}
            activeTypeFilter={activeTypeFilter}
            onTypeFilterChange={setActiveTypeFilter}
            onSelectTransaction={(txn) => {
              setSelectedTransaction(txn);
              setInitialEditInModal(false);
              setIsDetailModalOpen(true);
              pushHistoryStep('txn-detail');
            }}
            onEditTransaction={(txn) => {
              if (!isAdminLoggedIn) {
                setIsAdminLoginModalOpen(true);
                return;
              }
              setSelectedTransaction(txn);
              setInitialEditInModal(true);
              setIsDetailModalOpen(true);
              pushHistoryStep('txn-edit');
            }}
            onDeleteTransaction={handleDeleteTransaction}
            currencySymbol={config.currencySymbol}
            isAdminLoggedIn={isAdminLoggedIn}
          />
        </div>
      )}

      {/* VIEW 5: FULL PAGE CARD DETAIL */}
      {activeNav === 'card_detail' && (
        <CardDetailPage
          type={activeCardDetail}
          transactions={transactions}
          salaries={salaries}
          staffList={staffList}
          config={config}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onOpenNewTransaction={handleOpenNewTransaction}
          onNavigateToStaff={() => handleNavChange('staff')}
          onNavigateToLedger={(filterType) => {
            if (filterType) {
              setActiveTypeFilter(filterType);
            }
            handleNavChange('transactions');
          }}
          onSelectTransaction={(txn) => {
            setSelectedTransaction(txn);
            setInitialEditInModal(false);
            setIsDetailModalOpen(true);
            pushHistoryStep('txn-detail');
          }}
          onDeleteTransaction={handleDeleteTransaction}
          onViewSalarySlip={handleViewSalarySlip}
          isAdminLoggedIn={isAdminLoggedIn}
        />
      )}

      {/* VIEW: INVENTORY & EQUIPMENT TRACKING (ক্যাবল ও নেটওয়ার্ক মালামাল স্টক) */}
      {activeNav === 'inventory' && (
        <div className="animate-in fade-in duration-200">
          <InventoryManager
            items={inventoryItems}
            logs={inventoryLogs}
            onAddItem={handleAddInventoryItem}
            onDeleteItem={handleDeleteInventoryItem}
            onDeleteLog={handleDeleteInventoryLog}
            onLogMovement={handleLogMovement}
            currencySymbol={config.currencySymbol}
            onRefresh={fetchDataSilent}
            isAdminLoggedIn={isAdminLoggedIn}
            onRequireLogin={() => setIsAdminLoginModalOpen(true)}
            inventorySheetUrl={config.inventorySheetUrl}
            inventoryMonthSheetLinks={config.inventoryMonthSheetLinks || []}
            onOpenSheetConfig={() => setIsSyncModalOpen(true)}
            onOpenMonthSheetManager={handleOpenMonthSheetManager}
            config={config}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            availableMonths={availableMonths}
            onOpenReportPage={(tab) => {
              setInventoryReportInitialTab(tab);
              handleNavChange('inventory_report');
            }}
            onSyncStockSheet={async () => {

              try {
                const res = await fetch('/api/inventory/sync-sheet', { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ month: selectedMonth })
                });
                return await res.json();
              } catch (err: any) {
                return { success: false, message: `সিঙ্ক ত্রুটি: ${err.message}` };
              }
            }}
          />
        </div>
      )}

      {/* VIEW: FULL PAGE INVENTORY REPORT */}
      {activeNav === 'inventory_report' && (
        <div className="animate-in fade-in duration-200">
          <InventoryReportPage
            items={inventoryItems}
            logs={inventoryLogs}
            config={config}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            currencySymbol={config.currencySymbol}
            availableMonths={availableMonths}
            initialTab={inventoryReportInitialTab}
            onBack={() => handleNavChange('inventory')}
          />
        </div>
      )}


      {/* VIEW: VISUAL ANALYTICS & PROFIT-LOSS CHARTS (চার্ট ও গ্রাফিক্যাল রিপোর্ট) */}
      {activeNav === 'analytics' && (
        <div className="animate-in fade-in duration-200">
          <VisualAnalytics
            transactions={transactions}
            currencySymbol={config.currencySymbol}
            onOpenCardDetail={handleCardClick}
          />
        </div>
      )}

      {/* VIEW 6: REPORT PAGE VIEW */}
      {activeNav === 'report' && (
        <div className="animate-in fade-in duration-200">
          <MonthlyReportModal
            isOpen={true}
            onClose={() => handleNavChange('dashboard')}
            transactions={transactions}
            config={config}
            currencySymbol={config.currencySymbol}
            isFullPage={true}
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>
      )}

      {/* Bottom Information Tip */}
      <footer className="text-center py-6 text-xs text-slate-500 no-print">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-200/70 border border-slate-300/40 text-slate-600 font-medium">
          💡 ড্যাশবোর্ডের যেকোনো রঙিন কার্ডে ক্লিক করে নির্দিষ্ট তথ্য ও লেনদেন দেখুন | ডিভাইসের ব্যাক বাটন কাজ করবে
        </span>
      </footer>

      {/* Modern Mobile Bottom Navigation Bar with Side Drawer Menu */}
      <MobileBottomNav
        activeNav={activeNav === 'card_detail' ? 'dashboard' : activeNav}
        onNavChange={handleNavChange}
        onOpenReportModal={handleOpenReportModal}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onOpenNewMonthModal={() => setIsNewMonthModalOpen(true)}
        onOpenMonthSheetManager={() => setIsMonthSheetModalOpen(true)}
        availableMonths={availableMonths}
        stats={stats}
        config={config}
        onOpenSyncModal={handleOpenSyncModal}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onAdminLogout={() => {
          setIsAdminLoggedIn(false);
          setSyncToast({ message: 'এডমিন লগআউট সফল হয়েছে', type: 'success' });
        }}
        isDrawerOpen={isMobileDrawerOpen}
        onToggleDrawer={() => {
          if (!isMobileDrawerOpen) pushHistoryStep('mobile_drawer');
          setIsMobileDrawerOpen(!isMobileDrawerOpen);
        }}
        onCloseDrawer={() => setIsMobileDrawerOpen(false)}
      />

      {/* MODAL 1: CARD DETAIL MODAL (Opens when clicking any Dashboard Card!) */}
      <CardDetailModal
        type={activeCardDetail}
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setActiveCardDetail(null);
        }}
        transactions={transactions}
        salaries={salaries}
        staffList={staffList}
        config={config}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onOpenNewTransaction={handleOpenNewTransaction}
        onNavigateToStaff={() => handleNavChange('staff')}
        onNavigateToLedger={(filterType) => {
          if (filterType) {
            setActiveTypeFilter(filterType);
          }
          setIsCardModalOpen(false);
          setActiveCardDetail(null);
          handleNavChange('transactions');
        }}
        onSelectTransaction={(txn) => {
          setSelectedTransaction(txn);
          setInitialEditInModal(false);
          setIsDetailModalOpen(true);
          pushHistoryStep('txn-detail');
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onViewSalarySlip={handleViewSalarySlip}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* MODAL 2: PRINTABLE SALARY SLIP / VOUCHER MODAL */}
      <SalarySlipModal
        salary={selectedSalarySlip}
        isOpen={isSalarySlipOpen}
        onClose={() => {
          setIsSalarySlipOpen(false);
          setSelectedSalarySlip(null);
        }}
        config={config}
      />

      {/* MODAL 3: TRANSACTION DETAIL & EDIT MODAL */}
      <DetailModal
        transaction={selectedTransaction}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        currencySymbol={config.currencySymbol}
        initialEditMode={initialEditInModal}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* MODAL 4: MONTHLY REPORT & PRINTABLE STATEMENT MODAL */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={transactions}
        config={config}
        currencySymbol={config.currencySymbol}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
      />

      {/* MODAL 5: GOOGLE SHEETS SYNC MODAL */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onForcePush={handleForcePush}
        onForcePull={handleForcePull}
        isSyncing={isSyncing}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenMonthSheetManager={handleOpenMonthSheetManager}
        onOpenNewMonthModal={() => setIsNewMonthModalOpen(true)}
      />

      {/* MODAL 6: NEW MONTH SHEET MODAL (Admin Only for Zero Start Dashboard) */}
      <NewMonthModal
        isOpen={isNewMonthModalOpen}
        onClose={() => setIsNewMonthModalOpen(false)}
        onConfirmMonth={handleAddNewMonthSheet}
        currentSelectedMonth={selectedMonth}
        existingMonths={availableMonths}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* MODAL 7: MONTH SHEET MANAGER MODAL (Admin Add/Edit/Delete Month Sheet Links) */}
      <MonthSheetManagerModal
        isOpen={isMonthSheetModalOpen}
        onClose={() => setIsMonthSheetModalOpen(false)}
        initialTab={monthSheetModalTab}
        monthSheetLinks={config.monthSheetLinks || []}
        inventoryMonthSheetLinks={config.inventoryMonthSheetLinks || []}
        onSaveLinks={async (links) => {
          const monthsFromLinks = links.map(l => l.month).filter(Boolean);
          const updatedManaged = Array.from(new Set([...managedMonths, ...monthsFromLinks]));
          setManagedMonths(updatedManaged);
          try {
            localStorage.setItem('isp_managed_months', JSON.stringify(updatedManaged));
          } catch {}
          const ok = await handleSaveConfig({ 
            monthSheetLinks: links,
            managedMonths: updatedManaged
          });
          return ok;
        }}
        onSaveInventoryLinks={async (links) => {
          const monthsFromLinks = links.map(l => l.month).filter(Boolean);
          const updatedManaged = Array.from(new Set([...managedMonths, ...monthsFromLinks]));
          setManagedMonths(updatedManaged);
          try {
            localStorage.setItem('isp_managed_months', JSON.stringify(updatedManaged));
          } catch {}
          const ok = await handleSaveConfig({ 
            inventoryMonthSheetLinks: links,
            managedMonths: updatedManaged
          });
          return ok;
        }}
        selectedMonth={selectedMonth}
        onSelectMonth={handleMonthChange}
        isAdminLoggedIn={isAdminLoggedIn}
        onRequireLogin={() => setIsAdminLoginModalOpen(true)}
      />
    </main>
  );
}
