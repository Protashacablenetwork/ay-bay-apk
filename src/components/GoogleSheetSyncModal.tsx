import React, { useState } from 'react';
import { SheetConfig } from '../types';
import { 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  Code,
  Boxes,
  Calendar,
  ShieldCheck,
  PlusCircle,
  Plus,
  Lock
} from 'lucide-react';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onSaveConfig: (updated: Partial<SheetConfig>) => Promise<boolean>;
  onForcePush: () => Promise<{ success: boolean; message: string }>;
  onForcePull: () => Promise<{ success: boolean; message: string }>;
  isSyncing: boolean;
  isAdminLoggedIn?: boolean;
  onRequireLogin?: () => void;
  onOpenMonthSheetManager?: (tab?: 'transactions' | 'inventory') => void;
  onOpenNewMonthModal?: () => void;
}

export const DEFAULT_SCRIPT_URL = '';

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onForcePush,
  onForcePull,
  isSyncing,
  isAdminLoggedIn = false,
  onRequireLogin,
  onOpenMonthSheetManager,
  onOpenNewMonthModal,
}) => {
  const [sheetUrl, setSheetUrl] = useState(config.sheetUrl || '');
  const [inventorySheetUrl, setInventorySheetUrl] = useState(config.inventorySheetUrl || '');
  const [companyName, setCompanyName] = useState(config.companyName || 'স্মার্ট ব্যবস্থাপনা');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isInventorySyncing, setIsInventorySyncing] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [isSavingMain, setIsSavingMain] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: ''
  });
  const [activeScriptTab, setActiveScriptTab] = useState<'accounts' | 'inventory'>('accounts');

  // Populate form fields only when modal opens so background config syncs don't wipe out user typing!
  React.useEffect(() => {
    if (isOpen) {
      setSheetUrl(config.sheetUrl || '');
      setInventorySheetUrl(config.inventorySheetUrl || '');
      setCompanyName(config.companyName || 'স্মার্ট ব্যবস্থাপনা');
      if (config.autoSync !== undefined) {
        setAutoSync(config.autoSync);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Apps Script template code
  const googleAppsScriptCode = `/**
 * আয়-ব্যয় হিসাব (Income-Expense Tracker) - Google Apps Script Backend Web App
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this code and click Deploy > New Deployment > Web App (Who has access: Anyone)
 */

function ensureCorrectHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["আইডি", "তারিখ", "ধরন", "বিবরণ", "বিভাগ", "আয়", "ব্যয়", "পেমেন্ট মাধ্যম", "নোট", "সিঙ্ক সময়"]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.getRange(1, 6).setBackground("#d1fae5").setFontColor("#065f46"); // Green for Income
    sheet.getRange(1, 7).setBackground("#ffe4e6").setFontColor("#9f1239"); // Red for Expense
    return;
  }

  // Check existing row 1 header
  var headerRow = sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn())).getValues()[0];
  var colFHeader = String(headerRow[5] || '').trim();

  // If header is "পরিমাণ" (old 9-column format), migrate automatically!
  if (colFHeader === "পরিমাণ" || headerRow.length < 10) {
    var lastRow = sheet.getLastRow();
    var allData = sheet.getRange(1, 1, lastRow, Math.max(9, sheet.getLastColumn())).getValues();
    
    sheet.clearContents();
    sheet.appendRow(["আইডি", "তারিখ", "ধরন", "বিবরণ", "বিভাগ", "আয়", "ব্যয়", "পেমেন্ট মাধ্যম", "নোট", "সিঙ্ক সময়"]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.getRange(1, 6).setBackground("#d1fae5").setFontColor("#065f46");
    sheet.getRange(1, 7).setBackground("#ffe4e6").setFontColor("#9f1239");

    for (var i = 1; i < allData.length; i++) {
      var r = allData[i];
      if (!r || r.length < 3) continue;
      var rawType = String(r[2] || '').trim().toLowerCase();
      var isInc = (rawType === 'আয়' || rawType === 'আয়' || rawType === 'income');
      var amt = parseFloat(String(r[5] || '0').replace(/[,৳\s]/g, '')) || 0;
      
      sheet.appendRow([
        r[0] || '',
        r[1] || '',
        isInc ? 'আয়' : 'ব্যয়',
        r[3] || '',
        r[4] || '',
        isInc ? amt : 0,
        !isInc ? amt : 0,
        r[6] || 'নগদ',
        r[7] || '',
        r[8] || new Date().toLocaleString()
      ]);
    }
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ensureCorrectHeaders(sheet);
    
    var data = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var action = data.action || 'add';

    if (action === 'get_all') {
      return doGet(e);
    }

    if (action === 'delete' && (data.id || data.transaction)) {
      var targetId = data.id ? String(data.id) : '';
      var targetDesc = data.transaction ? String(data.transaction.description || '') : '';
      var rows = sheet.getDataRange().getValues();
      var deleted = false;
      for (var i = rows.length - 1; i >= 1; i--) {
        var rowId = String(rows[i][0] || '');
        var rowDesc = String(rows[i][3] || '');
        if ((targetId && rowId === targetId) || (targetDesc && rowDesc === targetDesc)) {
          sheet.deleteRow(i + 1);
          deleted = true;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "এন্ট্রি ডিলিট হয়েছে", deleted: deleted }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'update' && data.transaction) {
      var t = data.transaction;
      var targetId = String(t.id || '');
      var rows = sheet.getDataRange().getValues();
      var updated = false;
      var isInc = (t.type === 'income');
      var incAmt = isInc ? (Number(t.amount) || 0) : 0;
      var expAmt = !isInc ? (Number(t.amount) || 0) : 0;

      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === targetId) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            t.id || 'TXN-' + new Date().getTime(),
            t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
            isInc ? 'আয়' : 'ব্যয়',
            t.description || '',
            t.category || 'অন্যান্য',
            incAmt,
            expAmt,
            t.paymentMethod || 'নগদ',
            t.note || '',
            new Date().toLocaleString()
          ]]);
          updated = true;
          break;
        }
      }
      if (!updated) {
        sheet.appendRow([
          t.id || 'TXN-' + new Date().getTime(),
          t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
          isInc ? 'আয়' : 'ব্যয়',
          t.description || '',
          t.category || 'অন্যান্য',
          incAmt,
          expAmt,
          t.paymentMethod || 'নগদ',
          t.note || '',
          new Date().toLocaleString()
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "এন্ট্রি আপডেট হয়েছে" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'add' && data.transaction) {
      var t = data.transaction;
      var isInc = (t.type === 'income');
      var incAmt = isInc ? (Number(t.amount) || 0) : 0;
      var expAmt = !isInc ? (Number(t.amount) || 0) : 0;

      sheet.appendRow([
        t.id || 'TXN-' + new Date().getTime(),
        t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        isInc ? 'আয়' : 'ব্যয়',
        t.description || '',
        t.category || 'অন্যান্য',
        incAmt,
        expAmt,
        t.paymentMethod || 'নগদ',
        t.note || '',
        new Date().toLocaleString()
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "এন্ট্রি যোগ হয়েছে" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'bulk_sync') {
      var list = data.transactions || [];
      sheet.clearContents();
      sheet.appendRow(["আইডি", "তারিখ", "ধরন", "বিবরণ", "বিভাগ", "আয়", "ব্যয়", "পেমেন্ট মাধ্যম", "নোট", "সিঙ্ক সময়"]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f1f5f9");
      sheet.getRange(1, 6).setBackground("#d1fae5").setFontColor("#065f46"); // Green for Income
      sheet.getRange(1, 7).setBackground("#ffe4e6").setFontColor("#9f1239"); // Red for Expense
      
      list.forEach(function(t) {
        var isInc = (t.type === 'income');
        sheet.appendRow([
          t.id || 'TXN-' + new Date().getTime(),
          t.date || '',
          isInc ? 'আয়' : 'ব্যয়',
          t.description || '',
          t.category || 'অন্যান্য',
          isInc ? (Number(t.amount) || 0) : 0,
          !isInc ? (Number(t.amount) || 0) : 0,
          t.paymentMethod || 'নগদ',
          t.note || '',
          new Date().toLocaleString()
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: list.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureCorrectHeaders(sheet);
  var rows = sheet.getDataRange().getValues();
  var transactions = [];
  
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length < 3) continue;

    // Check if row has some content
    var hasContent = false;
    for (var c = 0; c < r.length; c++) {
      if (r[c] !== "" && r[c] !== null && r[c] !== undefined) {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;

    var id = r[0] ? String(r[0]) : ('TXN-ROW-' + i + '-' + new Date().getTime());
    var rawDate = r[1];
    var dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (rawDate) {
      dateStr = String(rawDate);
    } else {
      dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    }

    var rawType = String(r[2] || '').trim().toLowerCase();
    var desc = String(r[3] || 'শিট লেনদেন').trim();
    var cat = String(r[4] || 'অন্যান্য').trim();
    
    var incAmt = parseFloat(String(r[5] || '0').replace(/[,৳\\s]/g, '')) || 0;
    var expAmt = parseFloat(String(r[6] || '0').replace(/[,৳\\s]/g, '')) || 0;
    
    var type = 'income';
    var amount = 0;
    var pMethod = 'নগদ';
    var note = '';

    if (r.length >= 10 && (incAmt > 0 || expAmt > 0)) {
      if (incAmt > 0) {
        type = 'income';
        amount = incAmt;
      } else {
        type = 'expense';
        amount = expAmt;
      }
      pMethod = String(r[7] || 'নগদ').trim();
      note = String(r[8] || '').trim();
    } else {
      type = (rawType === 'আয়' || rawType === 'আয়' || rawType === 'income') ? 'income' : 'expense';
      amount = incAmt;
      pMethod = String(r[6] || 'নগদ').trim();
      note = String(r[7] || '').trim();
    }

    if (amount > 0 || desc) {
      transactions.push({
        id: id,
        date: dateStr,
        type: type,
        description: desc,
        category: cat,
        amount: amount,
        paymentMethod: pMethod,
        note: note,
        syncedToSheet: true
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ 
    status: "success", 
    count: transactions.length, 
    transactions: transactions 
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  // Apps Script template for separate Inventory & Equipment Stock Sheet
  const inventoryAppsScriptCode = `/**
 * মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিট (Inventory & Equipment Stock)
 * Google Apps Script Backend Web App
 *
 * নির্দেশিকা (Instructions):
 * ১. আপনার গুগল ড্রাইভে একটি নতুন Google Spreadsheet খুলুন (নাম দিন: মালামাল ও ইকুইপমেন্ট স্টক)
 * ২. Extensions > Apps Script এ যান
 * ৩. আগের কোড মুছে দিয়ে এই কোডটি পেস্ট করুন এবং Save করুন
 * ৪. উপরে ডানপাশে Deploy > New deployment সিলেক্ট করুন
 * ৫. Select type (গিয়ার আইকন) > Web app নির্বাচন করুন
 * ৬. Description: "Inventory Web App"
 * ৭. Execute as: Me (আপনার ইমেইল)
 * ৮. Who has access: Anyone (যেকোনো ব্যক্তি) নির্বাচন করে Deploy চাপুন
 * ৯. প্রাপ্ত Web App URL টি কপি করে অ্যাপের "২. মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিট লিংক" বক্সে পেস্ট করুন
 */

function ensureInventorySheets(ss) {
  // ১. স্টক সারাংশ শিট
  var stockSheet = ss.getSheetByName("স্টক_মালামাল");
  if (!stockSheet) {
    stockSheet = ss.insertSheet("স্টক_মালামাল");
  }
  if (stockSheet.getLastRow() === 0) {
    stockSheet.appendRow([
      "আইডি", 
      "মালামালের নাম", 
      "ক্যাটাগরি", 
      "ইউনিট", 
      "বর্তমান স্টক", 
      "সতর্কবার্তা মাত্রা", 
      "ইউনিট মূল্য (৳)", 
      "মোট স্টক মূল্য (৳)", 
      "সরবরাহকারী", 
      "অবস্থান / গোডাউন", 
      "নোট", 
      "সর্বশেষ আপডেট"
    ]);
    stockSheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#065f46").setFontColor("#ffffff");
    stockSheet.setFrozenRows(1);
  }

  // ২. হিস্ট্রি লগ শিট
  var logSheet = ss.getSheetByName("স্টক_হিসাব_লগ");
  if (!logSheet) {
    logSheet = ss.insertSheet("স্টক_হিসাব_লগ");
  }
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow([
      "লগ আইডি", 
      "তারিখ", 
      "আইটেমের নাম", 
      "ধরন", 
      "পরিমাণ", 
      "ইউনিট মূল্য (৳)", 
      "মোট খরচ (৳)", 
      "গ্রহীতা / উৎস", 
      "খরচে যুক্ত?", 
      "নোট", 
      "রেকর্ড সময়"
    ]);
    logSheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1e3a8a").setFontColor("#ffffff");
    logSheet.setFrozenRows(1);
  }

  return { stockSheet: stockSheet, logSheet: logSheet };
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ensureInventorySheets(ss);
    var stockSheet = sheets.stockSheet;
    var logSheet = sheets.logSheet;

    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var items = data.items || [];
    var logs = data.logs || [];

    // ১. স্টক মালামাল আপডেট (Rewrite with fresh data)
    if (Array.isArray(items) && items.length > 0) {
      var lastRow = stockSheet.getLastRow();
      if (lastRow > 1) {
        stockSheet.getRange(2, 1, lastRow - 1, stockSheet.getLastColumn()).clearContent();
      }

      var stockRows = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var cStock = Number(it.currentStock) || 0;
        var uCost = Number(it.unitCost) || 0;
        var totalVal = cStock * uCost;

        stockRows.push([
          it.id || ('INV-' + (i + 1)),
          it.name || '',
          translateCategory(it.category),
          it.unit || 'পিস',
          cStock,
          Number(it.minStockAlert) || 0,
          uCost,
          totalVal,
          it.supplier || '',
          it.location || '',
          it.notes || '',
          it.updatedAt ? new Date(it.updatedAt).toLocaleString() : new Date().toLocaleString()
        ]);
      }

      if (stockRows.length > 0) {
        stockSheet.getRange(2, 1, stockRows.length, stockRows[0].length).setValues(stockRows);
      }
    }

    // ২. হিস্ট্রি লগ আপডেট
    if (Array.isArray(logs) && logs.length > 0) {
      var logLastRow = logSheet.getLastRow();
      if (logLastRow > 1) {
        logSheet.getRange(2, 1, logLastRow - 1, logSheet.getLastColumn()).clearContent();
      }

      var logRows = [];
      for (var j = 0; j < logs.length; j++) {
        var lg = logs[j];
        logRows.push([
          lg.id || ('LOG-' + (j + 1)),
          lg.date || '',
          lg.itemName || '',
          translateLogType(lg.type),
          Number(lg.quantity) || 0,
          Number(lg.costPerUnit) || 0,
          Number(lg.totalCost) || 0,
          lg.recipientOrSource || '',
          lg.addedToExpense ? 'হ্যাঁ' : 'না',
          lg.note || '',
          lg.createdAt ? new Date(lg.createdAt).toLocaleString() : new Date().toLocaleString()
        ]);
      }

      if (logRows.length > 0) {
        logSheet.getRange(2, 1, logRows.length, logRows[0].length).setValues(logRows);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "মালামাল স্টক ও হিস্ট্রি সফলভাবে সিঙ্ক হয়েছে",
      itemCount: items.length,
      logCount: logs.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ensureInventorySheets(ss);
    var stockSheet = sheets.stockSheet;

    var stockData = stockSheet.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < stockData.length; i++) {
      var r = stockData[i];
      if (!r || !r[0]) continue;
      items.push({
        id: String(r[0]),
        name: String(r[1] || ''),
        category: String(r[2] || ''),
        unit: String(r[3] || 'পিস'),
        currentStock: Number(r[4]) || 0,
        minStockAlert: Number(r[5]) || 0,
        unitCost: Number(r[6]) || 0,
        supplier: String(r[8] || ''),
        location: String(r[9] || ''),
        notes: String(r[10] || '')
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      totalItems: items.length,
      items: items
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function translateCategory(cat) {
  var map = {
    'onu': 'ONU / গিগাবিট ডিভাইস',
    'router': 'রাউটার (Wi-Fi Router)',
    'cable': 'ফাইবার অপটিক ও ড্রপ ক্যাবল',
    'splitter': 'স্প্লিটার ও পিএলসি',
    'accessories': 'কানেক্টর ও আনুষাঙ্গিক',
    'stb': 'টিভি বক্স / STB',
    'other': 'অন্যান্য মালামাল'
  };
  return map[cat] || cat || 'সাধারণ';
}

function translateLogType(t) {
  var map = {
    'in': 'ক্রয় / নতুন আগমন (+)',
    'out': 'বিতরণ / গ্রাহক সংযোগ (-)',
    'return': 'ফেরত আগমন (+)',
    'damaged': 'নষ্ট / ড্যামেজ (-)'
  };
  return map[t] || t || 'অন্যান্য';
}`;

  const copyScriptToClipboard = () => {
    const textToCopy = activeScriptTab === 'accounts' ? googleAppsScriptCode : inventoryAppsScriptCode;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAll(true);
    setSyncStatusMsg({ type: '', text: '' });
    try {
      const ok = await onSaveConfig({
        sheetUrl: sheetUrl.trim(),
        inventorySheetUrl: inventorySheetUrl.trim(),
        companyName: companyName.trim(),
        autoSync
      });

      if (ok) {
        setSyncStatusMsg({ type: 'success', text: '✅ সকল শিট লিংক ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
        setTimeout(() => setSyncStatusMsg({ type: '', text: '' }), 4000);
      } else {
        setSyncStatusMsg({ type: 'error', text: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে, দয়া করে পুনরায় চেষ্টা করুন।' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: `ত্রুটি: ${err.message}` });
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveInventoryUrlOnly = async () => {
    const cleaned = inventorySheetUrl.trim();
    if (!cleaned) {
      setSyncStatusMsg({ type: 'error', text: 'অনুগ্রহ করে মালামাল স্টক শিট লিংকটি দিন' });
      return;
    }
    setIsSavingInventory(true);
    setSyncStatusMsg({ type: '', text: '' });
    try {
      const ok = await onSaveConfig({
        inventorySheetUrl: cleaned
      });
      if (ok) {
        setSyncStatusMsg({ type: 'success', text: '✅ মালামাল ও ইকুইপমেন্ট স্টক শিট লিংক সফলভাবে সংরক্ষিত হয়েছে!' });
        setTimeout(() => setSyncStatusMsg({ type: '', text: '' }), 4000);
      } else {
        setSyncStatusMsg({ type: 'error', text: 'স্টক লিংক সংরক্ষণ করতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: `ত্রুটি: ${err.message}` });
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleSaveMainSheetUrlOnly = async () => {
    const cleaned = sheetUrl.trim();
    if (!cleaned) {
      setSyncStatusMsg({ type: 'error', text: 'অনুগ্রহ করে মূল আয়-ব্যয় শিট লিংকটি দিন' });
      return;
    }
    setIsSavingMain(true);
    setSyncStatusMsg({ type: '', text: '' });
    try {
      const ok = await onSaveConfig({
        sheetUrl: cleaned
      });
      if (ok) {
        setSyncStatusMsg({ type: 'success', text: '✅ মূল আয়-ব্যয় শিট লিংক সফলভাবে সংরক্ষিত হয়েছে!' });
        setTimeout(() => setSyncStatusMsg({ type: '', text: '' }), 4000);
      } else {
        setSyncStatusMsg({ type: 'error', text: 'মূল শিট লিংক সংরক্ষণ করতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: `ত্রুটি: ${err.message}` });
    } finally {
      setIsSavingMain(false);
    }
  };

  const handleSyncInventory = async () => {
    setIsInventorySyncing(true);
    setSyncStatusMsg({ type: '', text: '' });
    try {
      const cleaned = inventorySheetUrl.trim();
      // Ensure the URL is saved to server config first!
      if (cleaned) {
        await onSaveConfig({ inventorySheetUrl: cleaned });
      }
      const res = await fetch('/api/inventory/sync-sheet', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: cleaned })
      });
      const data = await res.json();
      setSyncStatusMsg({
        type: data.success ? 'success' : 'error',
        text: data.message || 'মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিটে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে'
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `স্টক শিট সিঙ্ক ত্রুটি: ${err.message}`
      });
    } finally {
      setIsInventorySyncing(false);
    }
  };

  const handleTriggerPush = async () => {
    setSyncStatusMsg({ type: '', text: '' });
    const res = await onForcePush();
    setSyncStatusMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  const handleTriggerPull = async () => {
    setSyncStatusMsg({ type: '', text: '' });
    const res = await onForcePull();
    setSyncStatusMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  return (
    <div
      id="sheetSyncModalOverlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="sheetSyncModalContent"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                গুগল শিট লাইভ সিঙ্ক সেন্টার (আয়-ব্যয় হিসাব)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                আপনার ১টি মূল গুগল স্প্রেডশিটে রিয়েল-টাইম আয় ও ব্যয়ের লাইভ খতিয়ান
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Quick Action Banner: Add New Month Sheet directly */}
        {!isAdminLoggedIn ? (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                এডমিন অনুমোদন আবশ্যক (Admin Access Required)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                গুগল শিট যোগ, এডিট, ডিলিট, লাইভ সিঙ্ক পরিচালনা ও ব্যাকএন্ড স্ক্রিপ্ট কোড দেখার অনুমতি শুধুমাত্র অনুমোদিত এডমিনের জন্য সংরক্ষিত।
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
            {isAdminLoggedIn && onOpenNewMonthModal && (
              <div className="mt-4 p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 rounded-2xl border border-emerald-300/80 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span>পিসিতে নতুন মাসের গুগল শিট যোগ করবেন?</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px]">এডমিন</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      নতুন মাসের জন্য আলাদা হিসাব চক্র ও নিজস্ব গুগল শিট লিংক সংযুক্ত করুন
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewMonthModal();
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ নতুন শিট যোগ</span>
                </button>
              </div>
            )}

        {/* Informational Card regarding 1 Google Sheet for Income-Expense */}
        <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
          <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">আয়-ব্যয় কেন্দ্রীয় স্প্রেডশিট:</span> আপনার এই ১টি গুগল শিট মূলত প্রতিষ্ঠান বা নেটওয়ার্ক ব্যবসার যাবতীয় <strong>আয় এবং ব্যয় হিসাব</strong> রাখার জন্য সংরক্ষিত। মালামাল ও সরঞ্জাম কেনার খরচও স্বয়ংক্রিয়ভাবে এই গুগল শিটের ‘ব্যয়’ কলামে যুক্ত হয়। মালামাল স্টক তালিকা ডিলিট করলেও শিটের আয়-ব্যয়ের হিসাব অক্ষুণ্ন থাকে।
          </div>
        </div>

        {/* Status Banner */}
        {syncStatusMsg.text && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {syncStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{syncStatusMsg.text}</span>
          </div>
        )}

        {/* Form Settings */}
        <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
          {/* 1. Main Sheet URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ১. মূল আয়-ব্যয় গুগল শিট লিংক (Accounts Webhook / Sheet):
              </label>
              {sheetUrl ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  <Check className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  শিট লিঙ্ক সংযুক্ত
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                  কোনো লিঙ্ক সংযুক্ত নেই
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveMainSheetUrlOnly}
                disabled={isSavingMain}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                title="শুধুমাত্র মূল আয়-ব্যয় শিটের এই লিংকটি সংরক্ষণ করুন"
              >
                <Check className={`w-3.5 h-3.5 ${isSavingMain ? 'animate-spin' : ''}`} />
                <span>{isSavingMain ? 'সংরক্ষণ হচ্ছে...' : 'লিংক সেভ করুন'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>মূল আয়-ব্যয় লেনদেন ও বিল কালেকশনের কেন্দ্রীয় শিট। <em>(আপনি চাইলে নিচের ৩নং সেকশন থেকে প্রতিটি মাসের জন্য আলাদা শিট লিংকও ব্যবহার করতে পারেন)</em></span>
            </p>
          </div>

          {/* 2. Dedicated Inventory & Equipment Stock Sheet URL */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-600 text-white">
                  <Boxes className="w-4 h-4" />
                </span>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                  ২. মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিট লিংক:
                </label>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {config.inventorySheetUrl ? (
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>লিংক সক্রিয়</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                    লিংক দেওয়া হয়নি
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                inputMode="url"
                value={inventorySheetUrl}
                onChange={(e) => setInventorySheetUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveInventoryUrlOnly}
                disabled={isSavingInventory}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                title="শুধুমাত্র স্টক শিটের এই লিংকটি সংরক্ষণ করুন"
              >
                <Check className={`w-3.5 h-3.5 ${isSavingInventory ? 'animate-spin' : ''}`} />
                <span>{isSavingInventory ? 'সংরক্ষণ হচ্ছে...' : 'লিংক সেভ করুন'}</span>
              </button>
            </div>

            {/* If user pasted a spreadsheet URL instead of web app URL, show helpful guidance */}
            {inventorySheetUrl && inventorySheetUrl.includes('docs.google.com/spreadsheets') && (
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  পরামর্শ: এটি সরাসরি স্প্রেডশিট লিঙ্ক। অ্যাপ থেকে লাইভ স্বয়ংক্রিয় সিঙ্কের জন্য স্প্রেডশিটের <strong>Extensions &gt; Apps Script</strong> থেকে Deploy করা Web App URL ব্যবহার করুন (নিচে কোড ও গাইড দেওয়া আছে)।
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span>মালামাল, ONU, রাউটার ও তারের স্টক এই আলাদা স্প্রেডশিটে রিয়েল-টাইম সিঙ্ক হবে।</span>
              {inventorySheetUrl && (
                <button
                  type="button"
                  onClick={handleSyncInventory}
                  disabled={isInventorySyncing}
                  className="px-3 py-1 bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition self-end sm:self-center shrink-0 cursor-pointer disabled:opacity-50"
                  title="লিংক সেভ করে শিটে টেস্ট সিঙ্ক পাঠান"
                >
                  <RefreshCw className={`w-3 h-3 ${isInventorySyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isInventorySyncing ? 'সিঙ্ক হচ্ছে...' : 'স্টক শিটে টেস্ট সিঙ্ক'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Month Sheet Links Manager launcher button */}
          {(onOpenMonthSheetManager || onOpenNewMonthModal) && (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-600 text-white">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    ৩. মূল আয়-ব্যয়ের জন্য প্রতি মাসের আলাদা শিট লিংকসমূহ (Month Sheet Links):
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {(config.monthSheetLinks && config.monthSheetLinks.length > 0) ? (
                    <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-indigo-600" />
                      <span>{config.monthSheetLinks.length} টি মাসের আলাদা লিংক সক্রিয়</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      কেন্দ্রীয় শিট সকল মাসের জন্য প্রযোজ্য
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>হ্যাঁ!</strong> আপনি মূল আয়-ব্যয়ের জন্য প্রতি মাসের আলাদা আলাদা গুগল শিট লিংক যোগ করতে পারবেন। যে মাসের আলাদা শিট লিংক কনফিগার থাকবে, সেই মাসের যাবতীয় আয় ও ব্যয়ের তথ্য স্বয়ংক্রিয়ভাবে সরাসরি সেই নির্দিষ্ট শিটেই জমা হবে।
              </p>

              <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                {onOpenNewMonthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNewMonthModal();
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ নতুন মাস শুরু</span>
                  </button>
                )}
                {onOpenMonthSheetManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMonthSheetManager('transactions');
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>মাসের আয়-ব্যয় শিট তালিকা ও লিংক</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. Inventory Month Sheet Links launcher */}
          {onOpenMonthSheetManager && (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-600 text-white">
                    <Boxes className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    ৪. মালামাল ও ইকুইপমেন্ট স্টকের প্রতি মাসের আলাদা শিট লিংকসমূহ:
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {(config.inventoryMonthSheetLinks && config.inventoryMonthSheetLinks.length > 0) ? (
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{config.inventoryMonthSheetLinks.length} টি মাসের আলাদা স্টক লিংক সক্রিয়</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      কেন্দ্রীয় স্টক শিট কার্যকর
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                মালামাল, ONU, রাউটার ও তারের স্টক প্রতি মাসের জন্য আলাদা আলাদা গুগল স্প্রেডশিটে সংরক্ষণ করতে চান? এখানে প্রতি মাসের জন্য নির্দিষ্ট স্টক গুগল শিট লিংক যোগ ও ব্যবস্থাপনা করতে পারবেন।
              </p>

              <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMonthSheetManager('inventory');
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>মালামাল ও স্টক মাসের শিট ব্যবস্থাপনা</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                প্রতিষ্ঠানের নাম:
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="স্মার্ট বিজনেস সল্যুশনস"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  স্বয়ংক্রিয় লাইভ সিঙ্ক
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  প্রতিটি এন্ট্রির সাথে সাথে শিটে যোগ
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSavingAll}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Check className={`w-4 h-4 ${isSavingAll ? 'animate-spin' : ''}`} />
              <span>{isSavingAll ? 'সেটিংস সংরক্ষিত হচ্ছে...' : 'সকল সেটিংস সংরক্ষণ করুন'}</span>
            </button>

            {sheetUrl && (
              <>
                <button
                  type="button"
                  onClick={handleTriggerPush}
                  disabled={isSyncing}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  title="বর্তমান সব লেনদেন শিটে পাঠান"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                  <span>শিটে পাঠান (Push)</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPull}
                  disabled={isSyncing}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  title="শিটের ডাটা অ্যাপে আনুন"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>শিট থেকে আনুন (Pull)</span>
                </button>
              </>
            )}
          </div>
        </form>

        {/* 1-Minute Google Apps Script Guide with Tab Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>গুগল শিট কানেক্ট করার Apps Script কোড:</span>
            </h4>

            {/* Script Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveScriptTab('accounts')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeScriptTab === 'accounts'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ১. মূল আয়-ব্যয় শিট
              </button>
              <button
                type="button"
                onClick={() => setActiveScriptTab('inventory')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeScriptTab === 'inventory'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Boxes className="w-3 h-3" />
                <span>২. মালামাল ও স্টক শিট</span>
              </button>
            </div>

            <button
              onClick={copyScriptToClipboard}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer self-end sm:self-center shrink-0 ${
                activeScriptTab === 'inventory'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{activeScriptTab === 'accounts' ? 'মূল শিটের কোড কপি করুন' : 'স্টক শিটের কোড কপি করুন'}</span>
                </>
              )}
            </button>
          </div>

          {activeScriptTab === 'accounts' ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-3 leading-relaxed">
              <p><strong>ধাপ ১:</strong> গুগল ড্রাইভে ১টি নতুন <strong>Google Sheet</strong> খুলুন (নাম দিন: আয়-ব্যয় কেন্দ্রীয় হিসাব)।</p>
              <p><strong>ধাপ ২:</strong> শিটের মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ যান এবং আগের কোড মুছে দিয়ে উপরের <strong>"মূল শিটের কোড কপি করুন"</strong> বাটনের কোডটি পেস্ট করুন।</p>
              <p><strong>ধাপ ৩:</strong> উপরে ডানপাশে <strong>Deploy &gt; New deployment</strong> এ ক্লিক করুন &gt; গিয়ার আইকন থেকে <em>Web app</em> নির্বাচন করুন &gt; <em>Who has access: <strong>Anyone</strong></em> দিয়ে <strong>Deploy</strong> চাপুন।</p>
              <p><strong>ধাপ ৪:</strong> পাওয়া Web App URL টি উপরের ১নং বক্সে দিয়ে <strong>"সেটিংস সংরক্ষণ"</strong> করুন।</p>
            </div>
          ) : (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5 mb-3 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                <Boxes className="w-4 h-4" />
                <span>মালামাল ও ইকুইপমেন্ট স্টকের জন্য আলাদা শিট তৈরির নিয়ম:</span>
              </div>
              <p><strong>ধাপ ১:</strong> গুগল ড্রাইভে মালামালের জন্য আলাদা একটি <strong>Google Sheet</strong> তৈরি করুন (নাম দিতে পারেন: <em>ISP মালামাল ও স্টক</em>)।</p>
              <p><strong>ধাপ ২:</strong> শিটের ওপরের মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ যান। আগের কোড মুছে দিয়ে উপরের <strong>"স্টক শিটের কোড কপি করুন"</strong> বাটনের কোডটি পেস্ট করে Save (💾) করুন।</p>
              <p><strong>ধাপ ৩:</strong> <strong>Deploy &gt; New deployment</strong> এ চাপুন &gt; গিয়ার আইকন থেকে <em>Web app</em> সিলেক্ট করুন &gt; Description দিন <em>Inventory Web App</em> &gt; <em>Who has access: <strong>Anyone</strong></em> নির্বাচন করে <strong>Deploy</strong> এ চাপুন।</p>
              <p><strong>ধাপ ৪:</strong> পাওয়া Web App URL টি উপরের ২নং <strong>"মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিট লিংক"</strong> বক্সে পেস্ট করে <strong>"সেটিংস সংরক্ষণ"</strong> করুন।</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                ✨ এই স্ক্রিপ্টটি আপনার শিটে স্বয়ংক্রিয়ভাবে ২টি ট্যাব তৈরি করবে: <strong>'স্টক_মালামাল'</strong> (বর্তমান স্টক সারাংশ) এবং <strong>'স্টক_হিসাব_লগ'</strong> (মালামাল ইন-আউটের পূর্ণ হিস্ট্রি)।
              </p>
            </div>
          )}

          {/* Script preview snippet */}
          <div className="relative">
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-40">
              {activeScriptTab === 'accounts' ? googleAppsScriptCode : inventoryAppsScriptCode}
            </pre>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
