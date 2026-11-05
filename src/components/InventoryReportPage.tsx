import React, { useState, useMemo } from 'react';
import { InventoryItem, InventoryLog, SheetConfig } from '../types';
import { formatCurrency, getMonthBengaliName } from '../data/categories';
import { 
  Printer, 
  Calendar, 
  Boxes, 
  ArrowUpRight, 
  FileSpreadsheet,
  Layers,
  ArrowLeft
} from 'lucide-react';

interface InventoryReportPageProps {
  onBack: () => void;
  items: InventoryItem[];
  logs: InventoryLog[];
  config: SheetConfig;
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
  currencySymbol?: string;
  availableMonths?: string[];
  initialTab?: 'stock' | 'issued';
}

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

export const InventoryReportPage: React.FC<InventoryReportPageProps> = ({
  onBack,
  items = [],
  logs = [],
  config,
  selectedMonth,
  onMonthChange,
  currencySymbol = '৳',
  availableMonths = [],
  initialTab = 'stock'
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'issued'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filtered issued logs for the selected month
  const monthIssuedLogs = useMemo(() => {
    return logs.filter(l => l && l.type === 'out' && typeof l.date === 'string' && l.date.startsWith(selectedMonth));
  }, [logs, selectedMonth]);

  // Current Stock Summaries
  const totalStockQuantity = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.currentStock) || 0), 0);
  }, [items]);

  const totalStockValue = useMemo(() => {
    return items.reduce((acc, curr) => acc + ((Number(curr.currentStock) || 0) * (Number(curr.unitCost) || 0)), 0);
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter(i => i.currentStock <= i.minStockAlert).length;
  }, [items]);

  // Stock breakdown by category
  const categoryStockBreakdown = useMemo(() => {
    const map: Record<string, { count: number; qty: number; value: number }> = {};
    items.forEach(i => {
      const cat = i.category || 'other';
      if (!map[cat]) map[cat] = { count: 0, qty: 0, value: 0 };
      map[cat].count += 1;
      map[cat].qty += Number(i.currentStock) || 0;
      map[cat].value += (Number(i.currentStock) || 0) * (Number(i.unitCost) || 0);
    });
    return map;
  }, [items]);

  // Issued Goods Summaries for current month
  const totalIssuedQty = useMemo(() => {
    return monthIssuedLogs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [monthIssuedLogs]);

  const totalIssuedValue = useMemo(() => {
    return monthIssuedLogs.reduce((acc, curr) => acc + (Number(curr.totalCost) || ((Number(curr.quantity) || 0) * (Number(curr.costPerUnit) || 0))), 0);
  }, [monthIssuedLogs]);

  // Issued Goods breakdown by recipient/lineman
  const recipientIssuedBreakdown = useMemo(() => {
    const map: Record<string, { count: number; qty: number; value: number }> = {};
    monthIssuedLogs.forEach(l => {
      const rec = l.recipientOrSource || 'সাধারণ বিতরণ';
      if (!map[rec]) map[rec] = { count: 0, qty: 0, value: 0 };
      map[rec].count += 1;
      map[rec].qty += Number(l.quantity) || 0;
      map[rec].value += Number(l.totalCost) || ((Number(l.quantity) || 0) * (Number(l.costPerUnit) || 0));
    });
    return map;
  }, [monthIssuedLogs]);

  const handlePrint = () => {
    window.print();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'onu': return 'ONU (অপটিক্যাল ইউনিট)';
      case 'router': return 'WiFi রাউটার';
      case 'cable': return 'ফাইবার ও ড্রপ ক্যাবল';
      case 'splitter': return 'পিএলসি স্প্লিটার';
      case 'accessories': return 'প্যাচকর্ড / কানেক্টর';
      case 'stb': return 'সেট-টপ বক্স (STB)';
      default: return 'অন্যান্য মালামাল';
    }
  };

  return (
    <div className="animate-in fade-in duration-200 space-y-5 pb-12 print:pb-0">
      
      {/* Top Header & Back Button - Screen Only */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>স্টকে ফিরে যান</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                মালামাল স্টক ও বিতরণ আর্থিক রিপোর্ট
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                মজুদ মালামালের বর্তমান আর্থিক মূল্য এবং মাসিক বিতরণের বিস্তারিত স্টেটমেন্ট
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>রিপোর্ট প্রিন্ট / PDF সংরক্ষণ</span>
        </button>
      </div>

      {/* Tabs & Month Selector Bar - Screen Only */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>১. বর্তমান মজুদ মালামাল ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('issued')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'issued'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>২. মাসিক বিতরণকৃত মালামাল ({monthIssuedLogs.length})</span>
          </button>
        </div>

        {activeTab === 'issued' && onMonthChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">বিতরণের মাস:</span>
            <select
              value={selectedMonth}
              onChange={e => onMonthChange(e.target.value)}
              className="px-3.5 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {getMonthBengaliName(m)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* FULL PAGE REPORT CONTAINER */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        
        {/* Printable Official Header */}
        <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black">
            {config.companyName || 'স্মার্ট ব্যবস্থাপনা'}
          </h1>
          <h2 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300 print:text-slate-800 mt-1">
            {activeTab === 'stock' 
              ? 'মজুদ মালামাল ও স্টকের আর্থিক মূল্যায়ন রিপোর্ট' 
              : `${getMonthBengaliName(selectedMonth)} মাসের বিতরণকৃত মালামালের বিবরণী ও খরচের রিপোর্ট`}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mt-1">
            প্রস্তুতের তারিখ: {new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* TAB 1: CURRENT INVENTORY STOCK STATEMENT */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 print:text-slate-700 block">মোট আইটেমের ধরন</span>
                <span className="text-xl font-black">{items.length} টি</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 print:text-slate-700 block">মোট মজুদ পরিমাণ</span>
                <span className="text-xl font-black">{totalStockQuantity.toLocaleString('bn-BD')} একক</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 print:text-slate-700 block">মোট স্টক আর্থিক মূল্যায়ণ</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 print:text-black">
                  {formatCurrency(totalStockValue, currencySymbol)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 print:text-slate-700 block">কম স্টক সতর্কতা</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 print:text-black">{lowStockCount} টি</span>
              </div>
            </div>

            {/* Main Itemized Inventory Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span>মজুদ মালামালের বিস্তারিত তালিকা</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 print:border-slate-400">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 print:bg-slate-200 print:text-black font-bold">
                    <tr>
                      <th className="p-3 border-b">ক্রম</th>
                      <th className="p-3 border-b">মালামালের নাম</th>
                      <th className="p-3 border-b">ক্যাটাগরি</th>
                      <th className="p-3 border-b text-center">বর্তমান মজুদ</th>
                      <th className="p-3 border-b text-right">ইউনিট ক্রয়মূল্য</th>
                      <th className="p-3 border-b text-right">মোট মজুদ মূল্য</th>
                      <th className="p-3 border-b text-center">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                    {[...items].sort((a, b) => {
                      const tA = new Date((a as any).createdAt || a.updatedAt || a.id || 0).getTime() || 0;
                      const tB = new Date((b as any).createdAt || b.updatedAt || b.id || 0).getTime() || 0;
                      return tA - tB;
                    }).map((item, index) => {
                      const isLow = item.currentStock <= item.minStockAlert;
                      const itemVal = item.currentStock * item.unitCost;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 text-slate-500 font-bold">{index + 1}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">
                            {item.name}
                            {item.supplier && <span className="block text-[11px] text-slate-400">সাপ্লায়ার: {item.supplier}</span>}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{getCategoryLabel(item.category)}</td>
                          <td className="p-3 text-center font-black text-slate-900 dark:text-white print:text-black">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.unitCost, currencySymbol)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                            {formatCurrency(itemVal, currencySymbol)}
                          </td>
                          <td className="p-3 text-center">
                            {isLow ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                                কম মজুদ ⚠️
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                পর্যাপ্ত ✓
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-black text-slate-900 dark:text-white print:bg-slate-200 print:text-black">
                    <tr>
                      <td colSpan={3} className="p-3 text-right">সর্বমোট:</td>
                      <td className="p-3 text-center">{totalStockQuantity} একক</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-300 print:text-black text-base">
                        {formatCurrency(totalStockValue, currencySymbol)}
                      </td>
                      <td className="p-3 text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>ক্যাটাগরি ভিত্তিক মোট স্টক সামারি</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.keys(categoryStockBreakdown).map(cat => {
                  const data = categoryStockBreakdown[cat];
                  return (
                    <div key={cat} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center print:border-slate-300 print:bg-slate-50">
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 print:text-black block">
                          {getCategoryLabel(cat)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {data.count} প্রকার • মোট {data.qty} একক
                        </span>
                      </div>
                      <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 print:text-black">
                        {formatCurrency(data.value, currencySymbol)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: MONTHLY ISSUED / DISTRIBUTED EQUIPMENT STATEMENT */}
        {activeTab === 'issued' && (
          <div className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-950 dark:text-rose-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 print:text-slate-700 block">মোট বিতরণ সংখ্যা (লগ)</span>
                <span className="text-xl font-black">{monthIssuedLogs.length} বার</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 print:text-slate-700 block">মোট বিতরণকৃত পরিমাণ</span>
                <span className="text-xl font-black">{totalIssuedQty.toLocaleString('bn-BD')} একক</span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200 print:border-slate-300 print:bg-slate-50">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 print:text-slate-700 block">বিতরণকৃত মালামালের আর্থিক মূল্য</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400 print:text-black">
                  {formatCurrency(totalIssuedValue, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Itemized Issued Logs Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>{getMonthBengaliName(selectedMonth)} মাসে বিতরণকৃত মালামালের বিবরণী</span>
              </h3>

              {monthIssuedLogs.length === 0 ? (
                <div className="text-center p-10 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    এই মাসে কোনো মালামাল বিতরণ করা হয়নি।
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 print:border-slate-400">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 print:bg-slate-200 print:text-black font-bold">
                      <tr>
                        <th className="p-3 border-b">তারিখ</th>
                        <th className="p-3 border-b">মালামালের নাম</th>
                        <th className="p-3 border-b text-center">পরিমাণ</th>
                        <th className="p-3 border-b text-right">ইউনিট মূল্য</th>
                        <th className="p-3 border-b text-right">মোট আর্থিক মূল্য</th>
                        <th className="p-3 border-b">প্রাপক / লাইনম্যান</th>
                        <th className="p-3 border-b">নোট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {[...monthIssuedLogs].sort((a, b) => {
                        const dA = new Date(a.date).getTime() || 0;
                        const dB = new Date(b.date).getTime() || 0;
                        if (dA !== dB) return dA - dB;
                        const cA = new Date(a.createdAt || 0).getTime() || 0;
                        const cB = new Date(b.createdAt || 0).getTime() || 0;
                        return cA - cB;
                      }).map((log) => {
                        const val = log.totalCost || ((Number(log.quantity) || 0) * (Number(log.costPerUnit) || 0));
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatCleanDate(log.date)}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">{log.itemName}</td>
                            <td className="p-3 text-center font-black text-rose-600 dark:text-rose-400 print:text-black">
                              {log.quantity}
                            </td>
                            <td className="p-3 text-right font-medium">{formatCurrency(log.costPerUnit || 0, currencySymbol)}</td>
                            <td className="p-3 text-right font-bold text-slate-900 dark:text-white print:text-black">
                              {formatCurrency(val, currencySymbol)}
                            </td>
                            <td className="p-3 font-bold text-indigo-700 dark:text-indigo-300 print:text-black">
                              {log.recipientOrSource || 'সাধারণ বিতরণ'}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">{log.note || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-black text-slate-900 dark:text-white print:bg-slate-200 print:text-black">
                      <tr>
                        <td colSpan={2} className="p-3 text-right">সর্বমোট:</td>
                        <td className="p-3 text-center text-rose-600 print:text-black">{totalIssuedQty} একক</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right text-rose-700 dark:text-rose-400 print:text-black text-base">
                          {formatCurrency(totalIssuedValue, currencySymbol)}
                        </td>
                        <td colSpan={2} className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Recipient Breakdown */}
            {Object.keys(recipientIssuedBreakdown).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>প্রাপক / লাইনম্যান ভিত্তিক বিতরণের সামারি</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.keys(recipientIssuedBreakdown).map(rec => {
                    const data = recipientIssuedBreakdown[rec];
                    return (
                      <div key={rec} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center print:border-slate-300 print:bg-slate-50">
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 print:text-black block">
                            {rec}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {data.count} বার বিতরণ • মোট {data.qty} একক
                          </span>
                        </div>
                        <span className="font-black text-sm text-rose-600 dark:text-rose-400 print:text-black">
                          {formatCurrency(data.value, currencySymbol)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Printable Official Signatures */}
        <div className="pt-16 mt-10 border-t-2 border-slate-300 flex justify-between items-end text-xs sm:text-sm font-bold text-slate-800 print:flex">
          <div className="text-center w-48">
            <div className="border-b border-slate-400 pb-2 mb-1"></div>
            <span>প্রস্তুতকারীর স্বাক্ষর</span>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-400 pb-2 mb-1"></div>
            <span>অনুমোদনকারীর স্বাক্ষর (এডমিন)</span>
          </div>
        </div>

      </div>

    </div>
  );
};
