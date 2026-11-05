import React, { useState } from 'react';
import { 
  InventoryItem, 
  InventoryLog, 
  InventoryCategory, 
  InventoryUnit,
  SheetConfig
} from '../types';
import { 
  Package, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RotateCcw, 
  AlertTriangle, 
  Search, 
  Filter, 
  Layers, 
  History, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Wrench,
  Boxes,
  TrendingDown,
  Printer,
  X,
  FileSpreadsheet,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Calendar,
  Download,
  ShieldCheck
} from 'lucide-react';

interface InventoryManagerProps {
  items: InventoryItem[];
  logs: InventoryLog[];
  onAddItem: (item: Partial<InventoryItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onDeleteLog?: (id: string) => Promise<void>;
  onLogMovement: (logData: {
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
  }) => Promise<void>;
  currencySymbol?: string;
  onRefresh?: () => void;
  isAdminLoggedIn?: boolean;
  onRequireLogin?: () => void;
  inventorySheetUrl?: string;
  inventoryMonthSheetLinks?: import('../types').MonthSheetLink[];
  onOpenSheetConfig?: () => void;
  onOpenMonthSheetManager?: (tab?: 'transactions' | 'inventory') => void;
  onSyncStockSheet?: () => Promise<{ success: boolean; message: string }>;
  config?: SheetConfig;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  availableMonths?: string[];
  onOpenReportPage: (initialTab: 'stock' | 'issued') => void;
}

const CATEGORY_MAP: Record<InventoryCategory, { label: string; icon: string; color: string }> = {
  onu: { label: 'ONU (অপটিক্যাল ইউনিট)', icon: '📡', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  router: { label: 'WiFi রাউটার', icon: '📶', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  cable: { label: 'ফাইবার ও ড্রপ ক্যাবল', icon: '🧵', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  splitter: { label: 'পিএলসি স্প্লিটার', icon: '🔀', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  accessories: { label: 'প্যাচকর্ড / কানেক্টর / ক্ল্যাম্প', icon: '🔧', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  stb: { label: 'সেট-টপ বক্স (Dish STB)', icon: '📺', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  other: { label: 'অন্যান্য মালামাল', icon: '📦', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

function formatCleanDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (str.includes('GMT') || str.includes('Standard Time') || str.length > 20) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {}
  }
  return str.split('T')[0].split(' ')[0];
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  items,
  logs,
  onAddItem,
  onDeleteItem,
  onDeleteLog,
  onLogMovement,
  currencySymbol = '৳',
  onRefresh,
  isAdminLoggedIn = true,
  onRequireLogin,
  inventorySheetUrl,
  inventoryMonthSheetLinks = [],
  onOpenSheetConfig,
  onOpenMonthSheetManager,
  onSyncStockSheet,
  config = { companyName: 'স্মার্ট ব্যবস্থাপনা', currencySymbol: '৳', sheetUrl: '', autoSync: true, lastSyncTime: null, syncStatus: 'idle' },
  selectedMonth = new Date().toISOString().substring(0, 7),
  onMonthChange,
  availableMonths = [],
  onOpenReportPage
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isStockSyncing, setIsStockSyncing] = useState(false);
  const [stockSyncToast, setStockSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);


  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Movement modal state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'return' | 'damaged'>('in');
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null);

  // Quick Add Item inside Movement modal state
  const [showQuickAddItem, setShowQuickAddItem] = useState(false);
  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemCategory, setQuickItemCategory] = useState<InventoryCategory>('onu');
  const [quickItemUnit, setQuickItemUnit] = useState<InventoryUnit>('পিস');
  const [quickItemStock, setQuickItemStock] = useState<string | number>('');
  const [quickItemMinStock, setQuickItemMinStock] = useState<string | number>('5');
  const [quickItemCost, setQuickItemCost] = useState<string | number>('');
  const [quickItemSupplier, setQuickItemSupplier] = useState('');
  const [quickItemLocation, setQuickItemLocation] = useState('');

  // Form states for full item modal
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<InventoryCategory>('onu');
  const [itemUnit, setItemUnit] = useState<InventoryUnit>('পিস');
  const [itemStock, setItemStock] = useState<string | number>('');
  const [itemMinStock, setItemMinStock] = useState<string | number>('5');
  const [itemCost, setItemCost] = useState<string | number>('');
  const [itemSupplier, setItemSupplier] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Form states for movement modal
  const [moveQty, setMoveQty] = useState<string | number>('1');
  const [moveDate, setMoveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [moveRecipient, setMoveRecipient] = useState('');
  const [moveCost, setMoveCost] = useState<string | number>('0');

  const [moveAddToExpense, setMoveAddToExpense] = useState(true);
  const [moveExpenseCategory, setMoveExpenseCategory] = useState('ONU/OLT/Router ক্রয়');
  const [customMoveExpenseCategory, setCustomMoveExpenseCategory] = useState('');
  const [movePaymentMethod, setMovePaymentMethod] = useState('নগদ (Cash)');
  const [moveNote, setMoveNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Summary calculations
  const totalItemTypes = items.length;
  const lowStockCount = items.filter(i => i.currentStock <= i.minStockAlert).length;
  const totalInventoryValue = items.reduce((acc, curr) => acc + (curr.currentStock * curr.unitCost), 0);
  
  // This month's issued items
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthOutQty = logs
    .filter(l => l.type === 'out' && l.date.startsWith(currentMonthPrefix))
    .reduce((acc, curr) => acc + curr.quantity, 0);

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLow = filterLowStock ? item.currentStock <= item.minStockAlert : true;
    return matchesSearch && matchesCat && matchesLow;
  });

  // Check auth helper
  const ensureAdmin = (): boolean => {
    if (isAdminLoggedIn === false) {
      if (onRequireLogin) onRequireLogin();
      return false;
    }
    return true;
  };

  // Open Create / Edit item
  const openItemModal = (item?: InventoryItem) => {
    if (!ensureAdmin()) return;

    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemUnit(item.unit);
      setItemStock(item.currentStock);
      setItemMinStock(item.minStockAlert);
      setItemCost(item.unitCost);
      setItemSupplier(item.supplier || '');
      setItemLocation(item.location || '');
      setItemNotes(item.notes || '');
    } else {
      setEditingItem(null);
      setItemName('');
      setItemCategory('onu');
      setItemUnit('পিস');
      setItemStock('');
      setItemMinStock('5');
      setItemCost('');
      setItemSupplier('');
      setItemLocation('');
      setItemNotes('');
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureAdmin()) return;
    if (!itemName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddItem({
        id: editingItem?.id,
        name: itemName.trim(),
        category: itemCategory,
        unit: itemUnit,
        currentStock: Number(itemStock),
        minStockAlert: Number(itemMinStock),
        unitCost: Number(itemCost),
        supplier: itemSupplier.trim() || undefined,
        location: itemLocation.trim() || undefined,
        notes: itemNotes.trim() || undefined,
      });
      setShowItemModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Movement Modal
  const openMovementModal = (type: 'in' | 'out' | 'return' | 'damaged', item?: InventoryItem) => {
    if (!ensureAdmin()) return;

    setMovementType(type);
    const target = item || items[0] || null;
    setSelectedItemForMovement(target);
    setMoveQty('1');
    setMoveDate(new Date().toISOString().split('T')[0]);
    setMoveRecipient('');
    setMoveCost(target && target.unitCost ? target.unitCost : '');

    setMoveAddToExpense(type === 'in');
    setShowQuickAddItem(false);
    setCustomMoveExpenseCategory('');
    
    if (target?.category === 'cable') {
      setMoveExpenseCategory('অপটিক্যাল ফাইবার ও কেবল');
    } else if (target?.category === 'onu' || target?.category === 'router') {
      setMoveExpenseCategory('ONU/OLT/Router ক্রয়');
    } else {
      setMoveExpenseCategory('স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ');
    }

    setMovePaymentMethod('নগদ (Cash)');
    setMoveNote('');
    setShowMovementModal(true);
  };

  // Quick save new item directly from inside Movement Modal
  const handleQuickSaveItem = async () => {
    if (!ensureAdmin()) return;
    if (!quickItemName.trim()) return;

    setIsSubmitting(true);
    try {
      const newItemData: Partial<InventoryItem> = {
        name: quickItemName.trim(),
        category: quickItemCategory,
        unit: quickItemUnit,
        currentStock: Number(quickItemStock) || 0,
        minStockAlert: Number(quickItemMinStock) || 5,
        unitCost: Number(quickItemCost) || 0,
        supplier: quickItemSupplier.trim() || undefined,
        location: quickItemLocation.trim() || undefined,
      };
      await onAddItem(newItemData);

      // Create local item object to immediately select it
      const createdItem: InventoryItem = {
        id: `INV-${Date.now()}`,
        name: quickItemName.trim(),
        category: quickItemCategory,
        unit: quickItemUnit,
        currentStock: Number(quickItemStock) || 0,
        minStockAlert: Number(quickItemMinStock) || 5,
        unitCost: Number(quickItemCost) || 0,
        supplier: quickItemSupplier.trim() || undefined,
        location: quickItemLocation.trim() || undefined,
        updatedAt: new Date().toISOString()
      };

      setSelectedItemForMovement(createdItem);
      setMoveCost(Number(quickItemCost) || 0);

      if (createdItem.category === 'cable') {
        setMoveExpenseCategory('অপটিক্যাল ফাইবার ও কেবল');
      } else if (createdItem.category === 'onu' || createdItem.category === 'router') {
        setMoveExpenseCategory('ONU/OLT/Router ক্রয়');
      } else {
        setMoveExpenseCategory('স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ');
      }

      // Reset quick fields
      setQuickItemName('');
      setQuickItemStock('');
      setQuickItemCost('');
      setQuickItemSupplier('');
      setQuickItemLocation('');
      setShowQuickAddItem(false);

    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureAdmin()) return;
    const numericQty = Number(moveQty) || 0;
    if (!selectedItemForMovement || numericQty <= 0) return;

    setIsSubmitting(true);
    try {
      const finalExpenseCategory = (movementType === 'in' && moveAddToExpense)
        ? (moveExpenseCategory === 'অন্যান্য' ? (customMoveExpenseCategory.trim() || 'অন্যান্য ব্যয়') : moveExpenseCategory)
        : undefined;

      await onLogMovement({
        itemId: selectedItemForMovement.id,
        type: movementType,
        quantity: numericQty,
        date: moveDate,
        recipientOrSource: moveRecipient.trim(),
        costPerUnit: Number(moveCost) || 0,
        addToExpense: movementType === 'in' ? moveAddToExpense : false,
        expenseCategory: finalExpenseCategory,
        paymentMethod: movePaymentMethod,
        note: moveNote.trim(),
      });
      setShowMovementModal(false);

    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom delete confirmation modals state
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [logToDelete, setLogToDelete] = useState<InventoryLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestDeleteItem = (item: InventoryItem) => {
    if (!ensureAdmin()) return;
    setItemToDelete(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
      if (showItemModal && editingItem?.id === itemToDelete.id) {
        setShowItemModal(false);
      }
    } catch (err) {
      console.error('Delete item error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const requestDeleteLog = (log: InventoryLog) => {
    if (!ensureAdmin()) return;
    setLogToDelete(log);
  };

  const handleConfirmDeleteLog = async () => {
    if (!logToDelete || !onDeleteLog) return;
    setIsDeleting(true);
    try {
      await onDeleteLog(logToDelete.id);
      setLogToDelete(null);
    } catch (err) {
      console.error('Delete log error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessModal, setBackupSuccessModal] = useState<{
    isOpen: boolean;
    itemCount: number;
    logCount: number;
    totalValue: number;
    timestamp: string;
    sheetSyncStatus?: string;
    sheetSaved?: boolean;
    targetSheetUrl?: string;
  } | null>(null);

  const handleBackupData = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/inventory/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: config?.activeMonth || new Date().toISOString().substring(0, 7)
        })
      });
      const data = await res.json();
      
      if (data.success) {
        const now = new Date();
        // Open beautiful Google Sheet backup success dialog
        setBackupSuccessModal({
          isOpen: true,
          itemCount: data.itemCount ?? items.length,
          logCount: data.logCount ?? logs.length,
          totalValue: data.totalValue ?? items.reduce((sum, it) => sum + (it.currentStock * it.unitCost), 0),
          timestamp: now.toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }),
          sheetSyncStatus: data.sheetSyncStatus,
          sheetSaved: data.sheetSaved,
          targetSheetUrl: data.targetSheetUrl
        });
      } else {
        alert(data.message || 'গুগল শিটে ব্যাকআপ করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      console.error('Backup error:', err);
      alert('গুগল শিটে ব্যাকআপ ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-8">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  মালামাল ও ইকুইপমেন্ট স্টক (Inventory)
                </h2>
                {isAdminLoggedIn && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    এডমিন কন্ট্রোল সক্রিয়
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ক্যাবল, ONU, রাউটার, স্প্লিটার ও নেটওয়ার্ক সরঞ্জামের সঠিক হিসাব, ক্রয় ও বিতরণ
              </p>
              
              {/* Separate Stock Sheet Integration Banner */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                  inventorySheetUrl
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                }`}>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {inventorySheetUrl 
                      ? 'মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিটে সংরক্ষিত হচ্ছে ✓' 
                      : 'মালামাল স্টক আলাদা শিট লিংক কনফিগার করুন'}
                  </span>
                </div>

                {/* Admin Stock Sheet Configuration / Sync Trigger */}
                {isAdminLoggedIn && (
                  <div className="flex items-center gap-1.5">
                    {(inventorySheetUrl || config?.sheetUrl) && onSyncStockSheet && (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsStockSyncing(true);
                          const res = await onSyncStockSheet();
                          setStockSyncToast({ message: res.message, type: res.success ? 'success' : 'error' });
                          setTimeout(() => setStockSyncToast(null), 3500);
                          setIsStockSyncing(false);
                        }}
                        disabled={isStockSyncing}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="স্টক শিটে ডাটা সিঙ্ক করুন"
                      >
                        <RefreshCw className={`w-3 h-3 ${isStockSyncing ? 'animate-spin' : ''}`} />
                        <span>স্টক শিট সিঙ্ক</span>
                      </button>
                    )}

                    {onOpenMonthSheetManager && (
                      <button
                        type="button"
                        onClick={() => onOpenMonthSheetManager('inventory')}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1"
                        title="প্রতি মাসের আলাদা আলাদা স্টক শিট লিংক ব্যবস্থাপনা"
                      >
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        <span>মাসের স্টক শিটসমূহ ({inventoryMonthSheetLinks.length})</span>
                      </button>
                    )}

                    {onOpenSheetConfig && (
                      <button
                        type="button"
                        onClick={onOpenSheetConfig}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="এডমিন স্টক শিট লিংক যোগ / পরিবর্তন করতে পারবেন"
                      >
                        {inventorySheetUrl ? 'কেন্দ্রীয় শিট লিংক' : '+ স্টক শিট লিংক'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {stockSyncToast && (
                <div className={`mt-2 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  stockSyncToast.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{stockSyncToast.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBackupData}
            disabled={isBackingUp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            title="গুগল শিটে মালামাল ও ইকুইপমেন্ট স্টকের সম্পূর্ণ ডাটা ব্যাকআপ সেভ করুন"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isBackingUp ? 'শিটে ব্যাকআপ হচ্ছে...' : 'গুগল শিট ব্যাকআপ'}</span>
          </button>

          <button
            onClick={() => openItemModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন আইটেম যোগ</span>
          </button>

          <button
            onClick={() => openMovementModal('in')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>স্টক ইন (ক্রয়)</span>
          </button>

          <button
            onClick={() => openMovementModal('out')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>মালামাল বিতরণ</span>
          </button>
        </div>
      </div>


      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Item Types */}
        <div 
          onClick={() => onOpenReportPage('stock')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition active:scale-95"
          title="ক্লিক করে সম্পূর্ণ পেজে মজুদ তালিকার আর্থিক রিপোর্ট দেখুন"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">মোট আইটেম ধরন</span>
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalItemTypes} <span className="text-xs font-normal text-slate-400">প্রকার</span>
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 flex items-center gap-1">
            <span>পূর্ণাঙ্গ পেজে দেখুন ➔</span>
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => {
            setActiveTab('inventory');
            setFilterLowStock(true);
          }}
          className={`p-3.5 sm:p-4 rounded-3xl border shadow-xs transition cursor-pointer hover:scale-[1.01] active:scale-95 ${
            lowStockCount > 0 
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' 
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
          title="ক্লিক করে কম স্টকযুক্ত মালামাল ফিল্টার করুন"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">কম স্টক সতর্কতা</span>
            <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
            {lowStockCount} <span className="text-xs font-normal text-amber-600">আইটেম</span>
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-bold mt-0.5">
            {lowStockCount > 0 ? '⚠️ ফিল্টার করতে ক্লিক করুন' : 'সব মালামাল পর্যাপ্ত আছে'}
          </p>
        </div>

        {/* Total Inventory Value */}
        <div 
          onClick={() => onOpenReportPage('stock')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition active:scale-95"
          title="ক্লিক করে সম্পূর্ণ পেজে মজুদ মালামালের আর্থিক মূল্যায়ণ স্টেটমেন্ট দেখুন"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">মজুদ মালামালের মূল্য</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {currencySymbol} {totalInventoryValue.toLocaleString('bn-BD')}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
            <span>পূর্ণাঙ্গ পেজে দেখুন ➔</span>
          </p>
        </div>

        {/* Issued This Month */}
        <div 
          onClick={() => onOpenReportPage('issued')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-400 dark:hover:border-rose-600 transition active:scale-95"
          title="ক্লিক করে সম্পূর্ণ পেজে চলতি মাসের বিতরণকৃত মালামালের আর্থিক স্টেটমেন্ট দেখুন"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">চলতি মাসে বিতরণ</span>
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {thisMonthOutQty} <span className="text-xs font-normal text-slate-400">ইউনিট</span>
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1">
            <span>পূর্ণাঙ্গ পেজে দেখুন ➔</span>
          </p>
        </div>
      </div>


      {/* Tabs: Items List vs Movement History with Separate Report Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>মালামালের তালিকা ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>স্টক মুভমেন্ট ও বিতরণ হিস্ট্রি ({logs.length})</span>
          </button>
        </div>

        {/* Tab-Specific Separate Report Button */}
        <div>
          {activeTab === 'inventory' ? (
            <button
              type="button"
              onClick={() => onOpenReportPage('stock')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
              title="মজুদ মালামালের তালিকা মূল্য সহ আর্থিক রিপোর্ট ও স্টেটমেন্ট (PDF/প্রিন্ট)"
            >
              <Printer className="w-4 h-4" />
              <span>📦 মজুদ মালামালের আর্থিক রিপোর্ট ও স্টেটমেন্ট (PDF/প্রিন্ট)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenReportPage('issued')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
              title="চলতি মাসে বিতরণকৃত মালামালের তালিকা মূল্য সহ আর্থিক রিপোর্ট ও স্টেটমেন্ট (PDF/প্রিন্ট)"
            >
              <Printer className="w-4 h-4" />
              <span>📤 বিতরণকৃত মালামালের আর্থিক রিপোর্ট ও স্টেটমেন্ট (PDF/প্রিন্ট)</span>
            </button>
          )}
        </div>
      </div>



      {/* TAB 1: INVENTORY ITEMS LIST */}
      {activeTab === 'inventory' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="মালামালের নাম, সাপ্লায়ার অথবা লোকেশন দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Low stock filter button */}
              <button
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  filterLowStock
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>কম স্টক {lowStockCount > 0 ? `(${lowStockCount})` : ''}</span>
              </button>
            </div>

            {/* Category horizontal pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                সকল ক্যাটাগরি
              </button>
              {(Object.keys(CATEGORY_MAP) as InventoryCategory[]).map((cat) => {
                const count = items.filter(i => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{CATEGORY_MAP[cat].icon}</span>
                    <span>{CATEGORY_MAP[cat].label}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">কোন মালামাল পাওয়া যায়নি</p>
                <p className="text-xs text-slate-400 mt-1">খোঁজার ফিল্টার পরিবর্তন করুন অথবা নতুন মালামাল যোগ করুন</p>
                <button
                  onClick={() => openItemModal()}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন মালামাল এন্ট্রি</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">মালামালের নাম ও বিবরণ</th>
                      <th className="px-4 py-3">ক্যাটাগরি</th>
                      <th className="px-4 py-3 text-center">বর্তমান স্টক</th>
                      <th className="px-4 py-3 text-right">ইউনিট মূল্য</th>
                      <th className="px-4 py-3 text-right">মোট মান</th>
                      <th className="px-4 py-3">লোকেশন / তাক</th>
                      <th className="px-4 py-3 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {[...filteredItems].sort((a, b) => {
                      const tA = new Date((a as any).createdAt || a.updatedAt || a.id || 0).getTime() || 0;
                      const tB = new Date((b as any).createdAt || b.updatedAt || b.id || 0).getTime() || 0;
                      return tA - tB;
                    }).map((item) => {
                      const isLow = item.currentStock <= item.minStockAlert;
                      const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            isLow ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{catInfo.icon}</span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {item.name}
                                </p>
                                {item.supplier && (
                                  <p className="text-[11px] text-slate-400">
                                    সাপ্লায়ার: {item.supplier}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-semibold ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`text-base font-black ${
                                item.currentStock === 0 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : isLow 
                                  ? 'text-amber-600 dark:text-amber-400' 
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {item.currentStock}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{item.unit}</span>
                              {isLow && (
                                <span 
                                  title={`স্টক শেষ পর্যায়ে (সতর্কতা লেভেল: ${item.minStockAlert})`}
                                  className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {currencySymbol} {item.unitCost.toLocaleString('bn-BD')}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {currencySymbol} {(item.currentStock * item.unitCost).toLocaleString('bn-BD')}
                          </td>

                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                            {item.location || '—'}
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Quick Stock In */}
                              <button
                                onClick={() => openMovementModal('in', item)}
                                title="দ্রুত স্টক ইন (ক্রয়)"
                                className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick Stock Out */}
                              <button
                                onClick={() => openMovementModal('out', item)}
                                title="গ্রাহক বা টেকনিশিয়ানকে দিন"
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Item (Change info / adjust stock balance) */}
                              <button
                                onClick={() => openItemModal(item)}
                                title="মালামালের তথ্য ও স্টক পরিবর্তন করুন"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Item */}
                              <button
                                onClick={() => requestDeleteItem(item)}
                                title="আইটেম বাদ দিন / মুছুন"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* History / Movement Log Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">স্টক মুভমেন্ট ও বিতরণ লগ</h3>
              <p className="text-xs text-slate-400">প্রতিটি ক্রয়, বিতরণ, গ্রাহক ফেরত এবং ড্যামেজের রেকর্ড</p>
            </div>
            <button
              onClick={() => openMovementModal('in')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>মুভমেন্ট রেকর্ড</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">এখনো কোনো স্টক হিস্ট্রি নেই</p>
              <p className="text-xs mt-1">মালামাল ক্রয় বা বিতরণের সময় স্বয়ংক্রিয়ভাবে এখানে লগ সংরক্ষিত হবে</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">তারিখ</th>
                    <th className="px-4 py-3">ধরন</th>
                    <th className="px-4 py-3">মালামাল</th>
                    <th className="px-4 py-3 text-center">পরিমাণ</th>
                    <th className="px-4 py-3">প্রাপক / উৎস (গ্রাহক বা টেকনিশিয়ান)</th>
                    <th className="px-4 py-3 text-right">মূল্য (৳)</th>
                    <th className="px-4 py-3">নোট</th>
                    <th className="px-4 py-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {[...logs].sort((a, b) => {
                    const dA = new Date(a.date).getTime() || 0;
                    const dB = new Date(b.date).getTime() || 0;
                    if (dA !== dB) return dA - dB;
                    const cA = new Date(a.createdAt || 0).getTime() || 0;
                    const cB = new Date(b.createdAt || 0).getTime() || 0;
                    return cA - cB;
                  }).map((log) => {
                    let typeBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[11px]">
                        <ArrowDownLeft className="w-3 h-3" /> স্টক ইন (ক্রয়)
                      </span>
                    );
                    if (log.type === 'out') {
                      typeBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[11px]">
                          <ArrowUpRight className="w-3 h-3" /> বিতরণ (আউট)
                        </span>
                      );
                    } else if (log.type === 'return') {
                      typeBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[11px]">
                          <RotateCcw className="w-3 h-3" /> গ্রাহক ফেরত
                        </span>
                      );
                    } else if (log.type === 'damaged') {
                      typeBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[11px]">
                          <Wrench className="w-3 h-3" /> নষ্ট / ক্ষতি
                        </span>
                      );
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                          {formatCleanDate(log.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {typeBadge}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {log.itemName}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-slate-800 dark:text-slate-200">
                          {log.quantity}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {log.recipientOrSource || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {log.totalCost && log.totalCost > 0 ? (
                            <div>
                              <span>{currencySymbol} {log.totalCost.toLocaleString('bn-BD')}</span>
                              {log.addedToExpense && (
                                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                                  ✓ ব্যয় খতিয়ানে যুক্ত
                                </span>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {log.note || '—'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => requestDeleteLog(log)}
                            title="লগ ডিলিট ও স্টক ব্যালেন্স সমন্বয়"
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Add / Edit Item (Mobile & PC Optimized Modal) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Boxes className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {editingItem ? 'মালামালের তথ্য ও স্টক পরিবর্তন করুন' : 'নতুন নেটওয়ার্ক মালামাল যোগ করুন'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingItem ? 'তথ্য আপডেট করুন অথবা প্রয়োজনে বর্তমান স্টক ব্যালেন্স সংশোধন করুন' : 'নেটওয়ার্ক মালামালের বিবরণ ও প্রাথমিক স্টক সেট করুন'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form scrollable body */}
            <form onSubmit={handleSaveItem} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    মালামালের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: XPON Dual Band ONU, 2-Core ড্রপ ফাইবার ক্যাবল..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ক্যাটাগরি
                    </label>
                    <select
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value as InventoryCategory)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {(Object.keys(CATEGORY_MAP) as InventoryCategory[]).map(cat => (
                        <option key={cat} value={cat}>
                          {CATEGORY_MAP[cat].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      একক (Unit)
                    </label>
                    <select
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value as InventoryUnit)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="পিস">পিস (Pieces)</option>
                      <option value="মিটার">মিটার (Meter)</option>
                      <option value="কয়েল">কয়েল (Coil/Drum)</option>
                      <option value="বক্স">বক্স (Box)</option>
                      <option value="রোল">রোল (Roll)</option>
                      <option value="সেট">সেট (Set)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      বর্তমান স্টক
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={itemStock}
                      onChange={(e) => setItemStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      কম স্টক সতর্কতা লেভেল
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="5"
                      value={itemMinStock}
                      onChange={(e) => setItemMinStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ইউনিট ক্রয়মূল্য (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />

                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      সাপ্লায়ার / দোকান
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: স্টার নেটওয়ার্ক"
                      value={itemSupplier}
                      onChange={(e) => setItemSupplier(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      রাখার স্থান (তাক/র‌্যাক)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: তাক-২, বক্স-এ"
                      value={itemLocation}
                      onChange={(e) => setItemLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    নোট / রিমার্কস
                  </label>
                  <textarea
                    rows={2}
                    placeholder="অন্যান্য প্রয়োজনীয় তথ্য..."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 backdrop-blur-xs shrink-0 flex items-center justify-between gap-2.5">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => requestDeleteItem(editingItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>আইটেম মুছুন</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingItem ? 'আপডেট সম্পন্ন করুন' : 'যোগ করুন'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Movement Modal (Stock In / Stock Out / Return / Damaged) */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {movementType === 'in' ? (
                  <span className="p-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                    <ArrowDownLeft className="w-5 h-5" />
                  </span>
                ) : movementType === 'out' ? (
                  <span className="p-2 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                    <ArrowUpRight className="w-5 h-5" />
                  </span>
                ) : movementType === 'return' ? (
                  <span className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                    <RotateCcw className="w-5 h-5" />
                  </span>
                ) : (
                  <span className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600">
                    <Wrench className="w-5 h-5" />
                  </span>
                )}
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    {movementType === 'in' 
                      ? 'নতুন মালামাল স্টক ইন (ক্রয়)' 
                      : movementType === 'out' 
                      ? 'মালামাল বিতরণ / স্টক আউট' 
                      : movementType === 'return' 
                      ? 'গ্রাহক বা টেকনিশিয়ান হতে মালামাল ফেরত' 
                      : 'নষ্ট বা ড্যামেজ হিসেবে এন্ট্রি'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {movementType === 'in' 
                      ? 'নতুন কেনা মালামাল স্টকে যুক্ত করুন ও চাইলে এক ক্লিকে ব্যয়ে যোগ করুন'
                      : movementType === 'out' 
                      ? 'গ্রাহকের সংযোগ বা টেকনিশিয়ানকে মালামাল প্রদানের হিসাব'
                      : movementType === 'return'
                      ? 'কানেকশন বিচ্ছিন্ন বা ত্রুটিপূর্ণ রাউটার/ONU ফেরত'
                      : 'নষ্ট বা ক্ষতিগ্রস্ত মালামাল স্টক থেকে বাদ দিন'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMovementModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form scrollable body */}
            <form onSubmit={handleSaveMovement} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                {/* Movement Type Segmented Switcher */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('in');
                      setMoveAddToExpense(true);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                      movementType === 'in'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    স্টক ইন
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('out');
                      setMoveAddToExpense(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                      movementType === 'out'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    বিতরণ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('return');
                      setMoveAddToExpense(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                      movementType === 'return'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ফেরত
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('damaged');
                      setMoveAddToExpense(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                      movementType === 'damaged'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    নষ্ট
                  </button>
                </div>

                {/* Item selection with Quick Add button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      মালামাল নির্বাচন করুন *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddItem(prev => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showQuickAddItem ? 'ফর্ম বন্ধ' : '+ নতুন মালামাল তৈরি করুন'}</span>
                    </button>
                  </div>

                  <select
                    required
                    value={selectedItemForMovement?.id || ''}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setShowQuickAddItem(true);
                        return;
                      }
                      const found = items.find(i => i.id === e.target.value);
                      setSelectedItemForMovement(found || null);
                      if (found) {
                        setMoveCost(found.unitCost);
                        if (found.category === 'cable') {
                          setMoveExpenseCategory('অপটিক্যাল ফাইবার ও কেবল');
                        } else if (found.category === 'onu' || found.category === 'router') {
                          setMoveExpenseCategory('ONU/OLT/Router ক্রয়');
                        } else {
                          setMoveExpenseCategory('স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ');
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {items.length === 0 ? (
                      <option value="">-- কোনো মালামাল নেই, নতুন যোগ করুন --</option>
                    ) : (
                      <option value="" disabled>-- মালামাল নির্বাচন করুন --</option>
                    )}
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} — বর্তমান মজুদ: {item.currentStock} {item.unit} ({currencySymbol}{item.unitCost})
                      </option>
                    ))}
                    <option value="__NEW__" className="font-bold text-indigo-600 dark:text-indigo-400">
                      ➕ নতুন মালামাল তৈরি করুন...
                    </option>
                  </select>

                  {/* Inline Quick Add Item Card */}
                  {showQuickAddItem && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          এডমিন: নতুন মালামাল দ্রুত লিস্টে যোগ করুন
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowQuickAddItem(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                          মালামালের নাম *
                        </label>
                        <input
                          type="text"
                          placeholder="যেমন: 4-Port GPON ONU / ২-কোর ড্রপ ক্যাবল..."
                          value={quickItemName}
                          onChange={(e) => setQuickItemName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            ক্যাটাগরি
                          </label>
                          <select
                            value={quickItemCategory}
                            onChange={(e) => setQuickItemCategory(e.target.value as InventoryCategory)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white outline-none"
                          >
                            {(Object.keys(CATEGORY_MAP) as InventoryCategory[]).map(cat => (
                              <option key={cat} value={cat}>{CATEGORY_MAP[cat].label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            একক (Unit)
                          </label>
                          <select
                            value={quickItemUnit}
                            onChange={(e) => setQuickItemUnit(e.target.value as InventoryUnit)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white outline-none"
                          >
                            <option value="পিস">পিস (Pieces)</option>
                            <option value="মিটার">মিটার (Meter)</option>
                            <option value="কয়েল">কয়েল (Coil/Drum)</option>
                            <option value="বক্স">বক্স (Box)</option>
                            <option value="রোল">রোল (Roll)</option>
                            <option value="সেট">সেট (Set)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            ইউনিট ক্রয়মূল্য (৳)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={quickItemCost}
                            onChange={(e) => setQuickItemCost(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            প্রারম্ভিক স্টক (ঐচ্ছিক)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={quickItemStock}
                            onChange={(e) => setQuickItemStock(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
                          />

                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            সাপ্লায়ার / দোকান
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: স্টার নেটওয়ার্ক"
                            value={quickItemSupplier}
                            onChange={(e) => setQuickItemSupplier(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            রাখার স্থান / তাক
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: তাক-১, বক্স-বি"
                            value={quickItemLocation}
                            onChange={(e) => setQuickItemLocation(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
                        <button
                          type="button"
                          onClick={() => setShowQuickAddItem(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          বাতিল
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickSaveItem}
                          disabled={!quickItemName.trim() || isSubmitting}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 active:scale-95"
                        >
                          সংরক্ষণ ও নির্বাচন করুন
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity and Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      পরিমাণ ({selectedItemForMovement?.unit || 'একক'}) *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      placeholder="পরিমাণ টাইপ করুন"
                      value={moveQty}
                      onChange={(e) => setMoveQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    {movementType === 'out' && selectedItemForMovement && (Number(moveQty) || 0) > selectedItemForMovement.currentStock && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">
                        ⚠️ বর্তমান স্টক ({selectedItemForMovement.currentStock} {selectedItemForMovement.unit}) থেকে বেশি দেওয়া হচ্ছে!
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      তারিখ
                    </label>
                    <input
                      type="date"
                      required
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Recipient / Source field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {movementType === 'in' 
                      ? 'সরবরাহকারী / দোকান (Supplier)' 
                      : movementType === 'out' 
                      ? 'প্রাপক: গ্রাহকের নাম / লাইনম্যান টেকনিশিয়ান' 
                      : movementType === 'return'
                      ? 'কার নিকট হতে ফেরত (গ্রাহক বা টেকনিশিয়ান)'
                      : 'নষ্ট হওয়ার কারণ / বিবরণ'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      movementType === 'in' 
                        ? 'যেমন: অপটিক্যাল টেক, ঢাকা' 
                        : movementType === 'out'
                        ? 'যেমন: গ্রাহক: জাহিদ হাসান (লাইন-৪) অথবা লাইনম্যান: কালাম'
                        : movementType === 'return'
                        ? 'যেমন: লাইন কাটা গ্রাহক: রফিক আহমেদ'
                        : 'যেমন: বজ্রপাতে পোর্ট পুড়ে গেছে'
                    }
                    value={moveRecipient}
                    onChange={(e) => setMoveRecipient(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Cost and Expense Linking for Stock In */}
                {movementType === 'in' && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                          ইউনিট মূল্য (৳)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={moveCost}
                          onChange={(e) => setMoveCost(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-sm font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                          মোট ক্রয়মূল্য
                        </label>
                        <div className="px-3 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-sm font-black text-indigo-950 dark:text-indigo-200">
                          {currencySymbol} {((Number(moveCost) || 0) * (Number(moveQty) || 0)).toLocaleString('bn-BD')}
                        </div>
                      </div>
                    </div>


                    <label className="flex items-start gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={moveAddToExpense}
                        onChange={(e) => setMoveAddToExpense(e.target.checked)}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <div className="text-xs text-indigo-950 dark:text-indigo-200">
                        <span className="font-bold">সরাসরি কোম্পানির ব্যয় (Expense) ও আয়-ব্যয় গুগল শিটে যুক্ত করুন</span>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                          আলাদা করে এন্ট্রি দিতে হবে না, স্বয়ংক্রিয়ভাবে লেনদেন খতিয়ানে এবং আপনার আয়-ব্যয় গুগল শিটে ব্যয় হিসেবে যুক্ত হবে
                        </p>
                      </div>
                    </label>

                    {moveAddToExpense && (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                              ব্যয় ক্যাটাগরি
                            </label>
                            <select
                              value={moveExpenseCategory}
                              onChange={(e) => setMoveExpenseCategory(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                            >
                              <option value="ONU/OLT/Router ক্রয়">ONU/OLT/Router ক্রয়</option>
                              <option value="অপটিক্যাল ফাইবার ও কেবল">অপটিক্যাল ফাইবার ও কেবল</option>
                              <option value="স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ">স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য</option>
                              <option value="সার্ভার ও নেটওয়ার্ক রক্ষণাবেক্ষণ">সার্ভার ও রক্ষণাবেক্ষণ</option>
                              <option value="ব্যান্ডউইথ / আপস্ট্রিম খরচ">ব্যান্ডউইথ / আপস্ট্রিম খরচ</option>
                              <option value="অন্যান্য">অন্যান্য (কাস্টম টাইপ করুন)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                              পেমেন্ট মাধ্যম
                            </label>
                            <select
                              value={movePaymentMethod}
                              onChange={(e) => setMovePaymentMethod(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                            >
                              <option value="নগদ (Cash)">নগদ (Cash)</option>
                              <option value="বিকাশ (bKash)">বিকাশ (bKash)</option>
                              <option value="নগদ (Nagad)">নগদ (Nagad)</option>
                              <option value="ব্যাংক (Bank)">ব্যাংক (Bank)</option>
                              <option value="বকেয়া (Due)">বকেয়া (Due)</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom expense category input field when 'অন্যান্য' is chosen */}
                        {moveExpenseCategory === 'অন্যান্য' && (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 animate-in fade-in slide-in-from-top-1 duration-150">
                            <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                              কাস্টম ব্যয়ের খাতের নাম লিখুন *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="যেমন: অপটিক্যাল ফিউশন স্লীভ, ড্রপ ওয়্যার ক্ল্যাম্প ইত্যাদি..."
                              value={customMoveExpenseCategory}
                              onChange={(e) => setCustomMoveExpenseCategory(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-indigo-50/50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    নোট / ম্যাক অ্যাড্রেস / সিরিয়াল নম্বর
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: MAC: E0:67:B3:... অথবা ক্যাবল ড্রাম নং বা ভাউচার"
                    value={moveNote}
                    onChange={(e) => setMoveNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 backdrop-blur-xs shrink-0 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 rounded-2xl text-white text-xs font-bold transition shadow-md active:scale-95 disabled:opacity-50 ${
                    movementType === 'in' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : movementType === 'out' 
                      ? 'bg-rose-600 hover:bg-rose-700' 
                      : movementType === 'return'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isSubmitting ? 'প্রসেসিং...' : 'কনফার্ম করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => !isDeleting && setItemToDelete(null)}
        >
          <div 
            className="relative w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl border border-rose-100 dark:border-rose-950/60 text-slate-900 dark:text-white p-5 sm:p-6 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !isDeleting && setItemToDelete(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Red Alert Icon */}
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3.5 border border-rose-200/60 dark:border-rose-900/60 shadow-xs">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white">
              মালামাল তালিকা থেকে মুছে ফেলবেন?
            </h3>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-1">
              এই পদক্ষেপটি মালামাল ও তার বর্তমান মজুদ স্টক রেকর্ড সফটওয়্যার থেকে স্থায়ীভাবে মুছে ফেলবে।
            </p>

            {/* Item Details Box */}
            <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">
                  {CATEGORY_MAP[itemToDelete.category]?.icon || '📦'}
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                    {itemToDelete.name}
                  </h4>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-lg text-[10px] font-semibold ${
                    CATEGORY_MAP[itemToDelete.category]?.color || 'bg-slate-100 text-slate-700'
                  }`}>
                    {CATEGORY_MAP[itemToDelete.category]?.label || 'অন্যান্য'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">বর্তমান স্টক</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {itemToDelete.currentStock} {itemToDelete.unit}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">মজুদ মূল্য</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {currencySymbol} {(itemToDelete.currentStock * itemToDelete.unitCost).toLocaleString('bn-BD')}
                  </span>
                </div>
              </div>

              {(itemToDelete.supplier || itemToDelete.location) && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  {itemToDelete.supplier && <span>সাপ্লায়ার: {itemToDelete.supplier}</span>}
                  {itemToDelete.supplier && itemToDelete.location && <span> • </span>}
                  {itemToDelete.location && <span>তাক/লোকেশন: {itemToDelete.location}</span>}
                </div>
              )}
            </div>

            {/* Google Sheet Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs mb-5">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">১টি গুগল শিট নোটিশ:</span> আপনার গুগল শিটটি সার্বিক <strong>আয়-ব্যয় হিসাব</strong> রাখার জন্য সংরক্ষিত। এই মালামাল তালিকা মুছলেও আপনার গুগল শিটের বিদ্যমান আয়-ব্যয় লেনদেন সম্পূর্ণ অক্ষত ও সুরক্ষিত থাকবে।
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>মুছে ফেলা হচ্ছে...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, মুছে ফেলুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Movement Log Confirmation Modal */}
      {logToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => !isDeleting && setLogToDelete(null)}
        >
          <div 
            className="relative w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl border border-amber-100 dark:border-amber-950/60 text-slate-900 dark:text-white p-5 sm:p-6 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !isDeleting && setLogToDelete(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Amber Alert Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3.5 border border-amber-200/60 dark:border-amber-900/60 shadow-xs">
              <RotateCcw className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white">
              স্টক মুভমেন্ট লগ মুছবেন?
            </h3>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-1">
              এই রেকর্ডটি মুছে ফেললে স্টক ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় (Rollback) হবে।
            </p>

            {/* Log Details Box */}
            <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-slate-700 dark:text-slate-300">মালামালের নাম:</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">{logToDelete.itemName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">মুভমেন্টের ধরন:</span>
                <span className="font-bold">
                  {logToDelete.type === 'in' 
                    ? 'স্টক ইন (ক্রয়)' 
                    : logToDelete.type === 'out' 
                    ? 'বিতরণ (স্টক আউট)' 
                    : logToDelete.type === 'return' 
                    ? 'গ্রাহক ফেরত' 
                    : 'নষ্ট / ক্ষতি'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">পরিমাণ:</span>
                <span className="font-bold text-slate-900 dark:text-white">{logToDelete.quantity}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">তারিখ:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{logToDelete.date}</span>
              </div>

              {logToDelete.recipientOrSource && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">প্রাপক / উৎস:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{logToDelete.recipientOrSource}</span>
                </div>
              )}

              {logToDelete.totalCost && logToDelete.totalCost > 0 ? (
                <div className="flex items-center justify-between pt-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>মোট খরচ:</span>
                  <span>{currencySymbol} {logToDelete.totalCost.toLocaleString('bn-BD')} {logToDelete.addedToExpense ? '(ব্যয় খতিয়ানভুক্ত)' : ''}</span>
                </div>
              ) : null}
            </div>

            {/* Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs mb-5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                মুছে ফেলার পর সংশ্লিষ্ট মালামালের স্টক পূর্বাবস্থায় সমন্বয় হবে। যদি এটি কোম্পানির ব্যয়ে যুক্ত হয়ে থাকে, তবে আয়-ব্যয় খতিয়ান থেকেও সেটি স্বয়ংক্রিয়ভাবে বাদ যাবে।
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLog}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-bold transition shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>মুছে ফেলা হচ্ছে...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, লগ মুছুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BEAUTIFUL BACKUP SUCCESS MODAL */}
      {backupSuccessModal && backupSuccessModal.isOpen && (
        <div 
          onClick={() => setBackupSuccessModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 sm:p-6 max-w-md sm:max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 sm:space-y-4 animate-in zoom-in-95 duration-200 relative"
          >
            <button
              type="button"
              onClick={() => setBackupSuccessModal(null)}
              className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon with glowing effect */}
            <div className="text-center pt-1">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 border border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/10">
                <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                গুগল শিটে স্টক ডাটা ব্যাকআপ সফল! 📊
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                মালামাল তালিকা ও স্টক মুভমেন্ট লগ সম্পূর্ণ নির্ভুলভাবে আপনার গুগল শিটে ব্যাকআপ সেভ হয়েছে।
              </p>
            </div>

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-[11px] sm:text-xs font-bold mb-0.5">
                  <Boxes className="w-3.5 h-3.5 shrink-0" />
                  <span>মোট মালামাল</span>
                </div>
                <p className="text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-200">
                  {backupSuccessModal.itemCount} টি আইটেম
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">স্টক_মালামাল ট্যাবে সেভ</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] sm:text-xs font-bold mb-0.5">
                  <History className="w-3.5 h-3.5 shrink-0" />
                  <span>মুভমেন্ট ও বিতরণ</span>
                </div>
                <p className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200">
                  {backupSuccessModal.logCount} টি রেকর্ড
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">স্টক_হিসাব_লগ ট্যাবে সেভ</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 col-span-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] sm:text-xs font-bold">
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span>মোট বর্তমান আর্থিক স্টক মূল্য</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg shrink-0">
                    ১০০% সুরক্ষিত ✓
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {currencySymbol} {backupSuccessModal.totalValue.toLocaleString('bn-BD')}
                </p>
              </div>
            </div>

            {/* Security checklist / details */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2 text-[11px] sm:text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">গুগল শিট ব্যাকআপ: </strong>
                  {backupSuccessModal.sheetSyncStatus || 'গুগল শিটের "স্টক_মালামাল" ও "স্টক_হিসাব_লগ" ট্যাবে ডাটা সফলভাবে সেভ হয়েছে ✓'}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">ধারাবাহিকতা: </strong>
                  ১ম এন্ট্রি উপরে এবং নতুন এন্ট্রি নিচে সঠিক ধারাবাহিকতায় ব্যাকআপ আপডেট হয়েছে।
                </span>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">ব্যাকআপ সম্পন্ন: </strong>
                  {backupSuccessModal.timestamp}
                </span>
              </div>
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={() => setBackupSuccessModal(null)}
              className="w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ধন্যবাদ, সম্পন্ন হয়েছে</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

