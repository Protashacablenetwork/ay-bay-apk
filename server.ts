import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json');
const SALARY_FILE = path.join(DATA_DIR, 'salaries.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const INVENTORY_LOGS_FILE = path.join(DATA_DIR, 'inventory_logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DELETED_IDS_FILE = path.join(DATA_DIR, 'deleted_ids.json');

function readDeletedIds(): { transactions: string[]; staff: string[]; salaries: string[]; inventory: string[]; inventoryLogs: string[] } {
  try {
    if (fs.existsSync(DELETED_IDS_FILE)) {
      const raw = fs.readFileSync(DELETED_IDS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        staff: Array.isArray(parsed.staff) ? parsed.staff : [],
        salaries: Array.isArray(parsed.salaries) ? parsed.salaries : [],
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        inventoryLogs: Array.isArray(parsed.inventoryLogs) ? parsed.inventoryLogs : []
      };
    }
  } catch (err) {
    console.error('Error reading deleted_ids.json:', err);
  }
  return { transactions: [], staff: [], salaries: [], inventory: [], inventoryLogs: [] };
}

function addDeletedId(type: 'transactions' | 'staff' | 'salaries' | 'inventory' | 'inventoryLogs', id: string) {
  const data = readDeletedIds();
  if (!data[type].includes(id)) {
    data[type].push(id);
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DELETED_IDS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing deleted_ids.json:', err);
    }
  }
}

interface InventoryItem {
  id: string;
  name: string;
  category: 'onu' | 'router' | 'cable' | 'splitter' | 'accessories' | 'stb' | 'other';
  unit: string;
  currentStock: number;
  minStockAlert: number;
  unitCost: number;
  supplier?: string;
  location?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'return' | 'damaged';
  quantity: number;
  date: string;
  recipientOrSource: string;
  costPerUnit?: number;
  totalCost?: number;
  addedToExpense?: boolean;
  transactionId?: string;
  note?: string;
  createdAt?: string;
}

interface Staff {
  id: string;
  name: string;
  designation: string;
  phone: string;
  joinDate: string;
  baseSalary: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: string;
}

interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  staffDesignation: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonusOrAllowance: number;
  deductionOrAdvance: number;
  netSalary: number;
  paymentStatus: 'paid' | 'pending';
  paymentDate?: string;
  paymentMethod?: string;
  voucherNumber?: string;
  note?: string;
  transactionId?: string;
  createdAt?: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  note?: string;
  syncedToSheet?: boolean;
  createdAt?: string;
}

interface SheetConfig {
  sheetUrl: string;
  sheetId?: string;
  inventorySheetUrl?: string;
  inventorySheetName?: string;
  monthSheetLinks?: any[];
  inventoryMonthSheetLinks?: any[];
  autoSync: boolean;
  lastSyncTime: string | null;
  syncStatus: 'idle' | 'syncing' | 'connected' | 'error';
  syncMessage?: string;
  companyName: string;
  currencySymbol: string;
  activeMonth?: string;
  managedMonths?: string[];
}

const defaultTransactions: Transaction[] = [];

// Embedded Google Sheet Apps Script Web App URL (Empty by default)
export const DEFAULT_SHEET_URL = '';

const defaultSheetConfig: SheetConfig = {
  sheetUrl: '',
  sheetId: '',
  inventorySheetUrl: '',
  inventorySheetName: 'মালামাল_ও_ইকুইপমেন্ট_স্টক',
  monthSheetLinks: [],
  inventoryMonthSheetLinks: [],
  autoSync: true,
  lastSyncTime: null,
  syncStatus: 'idle',
  syncMessage: 'কোনো গুগল শিট লিংক সংযুক্ত নেই',
  companyName: 'স্মার্ট ব্যবস্থাপনা',
  currencySymbol: '৳',
  activeMonth: new Date().toISOString().substring(0, 7),
  managedMonths: [new Date().toISOString().substring(0, 7)]
};

const PERSISTENT_TXN_BACKUP = path.join(DATA_DIR, '.persistent_transactions.json');
const PERSISTENT_STAFF_BACKUP = path.join(DATA_DIR, '.persistent_staff.json');
const PERSISTENT_SALARY_BACKUP = path.join(DATA_DIR, '.persistent_salaries.json');
const PERSISTENT_INVENTORY_BACKUP = path.join(DATA_DIR, '.persistent_inventory.json');
const PERSISTENT_LOGS_BACKUP = path.join(DATA_DIR, '.persistent_inventory_logs.json');
const PERSISTENT_CONFIG_BACKUP = path.join(DATA_DIR, '.persistent_sheet_config.json');

function readTransactions(): Transaction[] {
  try {
    const deletedSet = new Set(readDeletedIds().transactions);
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      if (fs.existsSync(PERSISTENT_TXN_BACKUP)) {
        try {
          const rawB = fs.readFileSync(PERSISTENT_TXN_BACKUP, 'utf8');
          const parsedB = JSON.parse(rawB);
          if (Array.isArray(parsedB)) {
            fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(parsedB, null, 2), 'utf8');
            return parsedB.filter(t => t && t.id && !deletedSet.has(t.id));
          }
        } catch {}
      }
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const raw = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    const list: Transaction[] = JSON.parse(raw);
    return list.filter(t => t && t.id && !deletedSet.has(t.id));
  } catch (err) {
    console.error('Error reading transactions:', err);
    return [];
  }
}

function writeTransactions(data: Transaction[]): void {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
    try {
      fs.writeFileSync(PERSISTENT_TXN_BACKUP, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  } catch (err) {
    console.error('Error writing transactions:', err);
  }
}


function readConfig(): SheetConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      if (fs.existsSync(PERSISTENT_CONFIG_BACKUP)) {
        try {
          const rawBackup = fs.readFileSync(PERSISTENT_CONFIG_BACKUP, 'utf8');
          const parsedBackup = JSON.parse(rawBackup);
          const restored = { ...defaultSheetConfig, ...parsedBackup };
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(restored, null, 2), 'utf8');
          return restored;
        } catch {}
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultSheetConfig, null, 2), 'utf8');
      return defaultSheetConfig;
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const config = { ...defaultSheetConfig, ...parsed };
    if (!config.sheetUrl) {
      config.sheetUrl = '';
      if (config.syncStatus === 'connected') {
        config.syncStatus = 'idle';
        config.syncMessage = 'কোনো গুগল শিট লিংক সংযুক্ত নেই';
      }
    }
    return config;
  } catch (err) {
    console.error('Error reading config:', err);
    return defaultSheetConfig;
  }
}

function writeConfig(cfg: SheetConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    try {
      fs.writeFileSync(PERSISTENT_CONFIG_BACKUP, JSON.stringify(cfg, null, 2), 'utf8');
    } catch {}
  } catch (err) {
    console.error('Error writing config:', err);
  }
}

const defaultStaff: Staff[] = [];
const defaultSalaries: SalaryPayment[] = [];

function readStaff(): Staff[] {
  try {
    const deletedSet = new Set(readDeletedIds().staff);
    if (!fs.existsSync(STAFF_FILE)) {
      if (fs.existsSync(PERSISTENT_STAFF_BACKUP)) {
        try {
          const rawB = fs.readFileSync(PERSISTENT_STAFF_BACKUP, 'utf8');
          const parsedB = JSON.parse(rawB);
          if (Array.isArray(parsedB)) {
            fs.writeFileSync(STAFF_FILE, JSON.stringify(parsedB, null, 2), 'utf8');
            return parsedB.filter((s: Staff) => s && s.id && !deletedSet.has(s.id));
          }
        } catch {}
      }
      fs.writeFileSync(STAFF_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STAFF_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((s: Staff) => s && s.id && !deletedSet.has(s.id));
  } catch (err) {
    console.error('Error reading staff:', err);
    return [];
  }
}

function writeStaff(data: Staff[]): void {
  try {
    fs.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2), 'utf8');
    try {
      fs.writeFileSync(PERSISTENT_STAFF_BACKUP, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  } catch (err) {
    console.error('Error writing staff:', err);
  }
}

function readSalaries(): SalaryPayment[] {
  try {
    const deletedSet = new Set(readDeletedIds().salaries);
    if (!fs.existsSync(SALARY_FILE)) {
      if (fs.existsSync(PERSISTENT_SALARY_BACKUP)) {
        try {
          const rawB = fs.readFileSync(PERSISTENT_SALARY_BACKUP, 'utf8');
          const parsedB = JSON.parse(rawB);
          if (Array.isArray(parsedB)) {
            fs.writeFileSync(SALARY_FILE, JSON.stringify(parsedB, null, 2), 'utf8');
            return parsedB.filter((s: SalaryPayment) => s && s.id && !deletedSet.has(s.id));
          }
        } catch {}
      }
      fs.writeFileSync(SALARY_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const raw = fs.readFileSync(SALARY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: SalaryPayment) => s && s.id && !deletedSet.has(s.id));
  } catch (err) {
    console.error('Error reading salaries:', err);
    return [];
  }
}

function writeSalaries(data: SalaryPayment[]): void {
  try {
    fs.writeFileSync(SALARY_FILE, JSON.stringify(data, null, 2), 'utf8');
    try {
      fs.writeFileSync(PERSISTENT_SALARY_BACKUP, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  } catch (err) {
    console.error('Error writing salaries:', err);
  }
}


const defaultInventory: InventoryItem[] = [];

function readInventory(): InventoryItem[] {
  try {
    const deletedSet = new Set(readDeletedIds().inventory);
    let list: InventoryItem[] = [];

    if (fs.existsSync(INVENTORY_FILE)) {
      try {
        const raw = fs.readFileSync(INVENTORY_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch {}
    }

    if (list.length === 0 && fs.existsSync(PERSISTENT_INVENTORY_BACKUP)) {
      try {
        const rawB = fs.readFileSync(PERSISTENT_INVENTORY_BACKUP, 'utf8');
        const parsedB = JSON.parse(rawB);
        if (Array.isArray(parsedB) && parsedB.length > 0) {
          list = parsedB;
          fs.writeFileSync(INVENTORY_FILE, JSON.stringify(list, null, 2), 'utf8');
        }
      } catch {}
    }

    return list.filter((i: InventoryItem) => i && i.id && !deletedSet.has(i.id));
  } catch (err) {
    console.error('Error reading inventory:', err);
    return [];
  }
}

function writeInventory(data: InventoryItem[]): void {
  try {
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    if (data.length > 0) {
      try {
        fs.writeFileSync(PERSISTENT_INVENTORY_BACKUP, JSON.stringify(data, null, 2), 'utf8');
      } catch {}
    }
  } catch (err) {
    console.error('Error writing inventory:', err);
  }
}

function readInventoryLogs(): InventoryLog[] {
  try {
    const deletedSet = new Set(readDeletedIds().inventoryLogs);
    let list: InventoryLog[] = [];

    if (fs.existsSync(INVENTORY_LOGS_FILE)) {
      try {
        const raw = fs.readFileSync(INVENTORY_LOGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch {}
    }

    if (list.length === 0 && fs.existsSync(PERSISTENT_LOGS_BACKUP)) {
      try {
        const rawB = fs.readFileSync(PERSISTENT_LOGS_BACKUP, 'utf8');
        const parsedB = JSON.parse(rawB);
        if (Array.isArray(parsedB) && parsedB.length > 0) {
          list = parsedB;
          fs.writeFileSync(INVENTORY_LOGS_FILE, JSON.stringify(list, null, 2), 'utf8');
        }
      } catch {}
    }

    return list.filter((l: InventoryLog) => l && l.id && !deletedSet.has(l.id));
  } catch (err) {
    console.error('Error reading inventory logs:', err);
    return [];
  }
}

function writeInventoryLogs(data: InventoryLog[]): void {
  try {
    fs.writeFileSync(INVENTORY_LOGS_FILE, JSON.stringify(data, null, 2), 'utf8');
    if (data.length > 0) {
      try {
        fs.writeFileSync(PERSISTENT_LOGS_BACKUP, JSON.stringify(data, null, 2), 'utf8');
      } catch {}
    }
  } catch (err) {
    console.error('Error writing inventory logs:', err);
  }
}



// Helper functions for parsing Bengali numbers and normalizing data from Google Sheets
function parseBengaliNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val)
    .replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString())
    .replace(/[,৳\s]/g, '')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function normalizeDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // General Date parsing using local YYYY-MM-DD format
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (dmy) {
    const p1 = parseInt(dmy[1], 10);
    const p2 = parseInt(dmy[2], 10);
    const year = dmy[3];
    const month = p2 > 12 ? String(p1).padStart(2, '0') : String(p2).padStart(2, '0');
    const day = p2 > 12 ? String(p2).padStart(2, '0') : String(p1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

function normalizeType(val: any, category: string = ''): 'income' | 'expense' {
  if (!val) {
    const cat = String(category).toLowerCase();
    if (cat.includes('আয়') || cat.includes('বিল কালেকশন') || cat.includes('income')) return 'income';
    return 'expense';
  }
  const str = String(val).trim().toLowerCase();
  if (
    str === 'আয়' || 
    str === 'আয়' || 
    str === 'income' || 
    str.includes('income') || 
    str.includes('আয়') ||
    str.includes('আয়')
  ) {
    return 'income';
  }
  return 'expense';
}

function parseCsvRows(csvText: string): any[][] {
  const rows: any[][] = [];
  const lines = csvText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

// Global function to pull all fresh transactions directly from Google Sheets
// Helper to determine destination Google Sheet URL for a transaction date/month
function getTargetSheetUrlForDate(dateStr?: string): string {
  const config = readConfig();
  if (dateStr && Array.isArray(config.monthSheetLinks) && config.monthSheetLinks.length > 0) {
    const monthKey = dateStr.length >= 7 ? dateStr.substring(0, 7) : dateStr;
    const match = config.monthSheetLinks.find((l: any) => l && l.month === monthKey && l.sheetUrl);
    if (match && typeof match.sheetUrl === 'string' && match.sheetUrl.trim().startsWith('http')) {
      return match.sheetUrl.trim();
    }
  }
  return config.sheetUrl || DEFAULT_SHEET_URL;
}

// Fetch raw data from a single Google Sheet URL (CSV or Apps Script Web App)
async function fetchFromSingleSheetUrl(targetUrl: string): Promise<{ rawTransactions: any[]; rawStaff: any[]; rawSalaries: any[]; rawItems: any[]; rawLogs: any[] }> {
  let rawTransactions: any[] = [];
  let rawStaff: any[] = [];
  let rawSalaries: any[] = [];
  let rawItems: any[] = [];
  let rawLogs: any[] = [];

  try {
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : '';
      if (sheetId) {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const resp = await fetch(csvUrl, { redirect: 'follow', signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const csvText = await resp.text();
          const rows = parseCsvRows(csvText);

          if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r || r.length < 3) continue;

              let date = normalizeDate(r[1]);
              let incomeAmt = parseBengaliNumber(r[5]);
              let expenseAmt = parseBengaliNumber(r[6]);
              let id = (r[0] && String(r[0]).trim() !== '') 
                ? String(r[0]).trim() 
                : `SHEET-ROW-${i}-${date}-${incomeAmt || expenseAmt}`;
              let rawType = r[2];
              let description = r[3] || 'গুগল শিট লেনদেন';
              let category = r[4] || 'অন্যান্য';
              let type: 'income' | 'expense' = 'income';
              let amount = 0;
              let paymentMethod = 'নগদ';
              let note = '';

              const resolvedType = normalizeType(rawType, category);

              // Check if columns 5 and 6 are dual Income/Expense columns:
              const hasDualAmountColumns = expenseAmt > 0 || (r.length >= 8 && typeof r[7] === 'string' && r[7].trim() !== '' && isNaN(Number(r[7].replace(/[,৳\s]/g, ''))));

              if (hasDualAmountColumns || expenseAmt > 0) {
                if (expenseAmt > 0) {
                  type = 'expense';
                  amount = expenseAmt;
                } else if (incomeAmt > 0) {
                  type = 'income';
                  amount = incomeAmt;
                } else {
                  type = resolvedType;
                  amount = resolvedType === 'expense' ? expenseAmt : incomeAmt;
                }
                paymentMethod = r[7] ? String(r[7]).trim() : 'নগদ';
                note = r[8] ? String(r[8]).trim() : '';
              } else {
                // Single amount column (column 5)
                type = resolvedType;
                amount = incomeAmt > 0 ? incomeAmt : expenseAmt;
                paymentMethod = r[6] ? String(r[6]).trim() : 'নগদ';
                note = r[7] ? String(r[7]).trim() : '';
              }

              if (amount > 0 || description) {
                rawTransactions.push({
                  id: String(id),
                  date,
                  type,
                  description: String(description),
                  category: String(category),
                  amount,
                  paymentMethod: String(paymentMethod),
                  note: String(note),
                  syncedToSheet: true,
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    } else {
      // Apps Script Web App
      const url = new URL(targetUrl);
      url.searchParams.set('action', 'get_all');
      url.searchParams.set('_t', Date.now().toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url.toString(), {
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Fallback to POST
        const postResp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'get_all', timestamp: new Date().toISOString() }),
          redirect: 'follow'
        });
        if (postResp.ok) {
          const data: any = await postResp.json();
          if (Array.isArray(data)) rawTransactions = data;
          else if (data && Array.isArray(data.transactions)) rawTransactions = data.transactions;
          if (data && Array.isArray(data.staff)) rawStaff = data.staff;
          if (data && Array.isArray(data.salaries)) rawSalaries = data.salaries;
          if (data && Array.isArray(data.items)) rawItems = data.items;
          if (data && Array.isArray(data.logs)) rawLogs = data.logs;
        }
      } else {
        const data: any = await response.json();
        if (Array.isArray(data)) {
          rawTransactions = data;
        } else if (data && Array.isArray(data.transactions)) {
          rawTransactions = data.transactions;
        }
        if (data && Array.isArray(data.staff)) {
          rawStaff = data.staff;
        }
        if (data && Array.isArray(data.salaries)) {
          rawSalaries = data.salaries;
        }
        if (data && Array.isArray(data.items)) {
          rawItems = data.items;
        }
        if (data && Array.isArray(data.logs)) {
          rawLogs = data.logs;
        }
      }
    }
  } catch (err: any) {
    console.warn(`Fetch notice from ${targetUrl}:`, err.message);
  }

  return { rawTransactions, rawStaff, rawSalaries, rawItems, rawLogs };
}

// Global function to pull fresh transactions directly from Google Sheets (Central + Month Sheets)
export async function pullFromGoogleSheet(): Promise<{ success: boolean; count: number; message: string }> {
  const config = readConfig();
  const urlsToPull = new Set<string>();

  if (config.sheetUrl && config.sheetUrl.startsWith('http')) {
    urlsToPull.add(config.sheetUrl.trim());
  }
  if (Array.isArray(config.monthSheetLinks)) {
    for (const ml of config.monthSheetLinks) {
      if (ml && ml.sheetUrl && typeof ml.sheetUrl === 'string' && ml.sheetUrl.trim().startsWith('http')) {
        urlsToPull.add(ml.sheetUrl.trim());
      }
    }
  }
  if (config.inventorySheetUrl && config.inventorySheetUrl.startsWith('http')) {
    urlsToPull.add(config.inventorySheetUrl.trim());
  }
  if (Array.isArray(config.inventoryMonthSheetLinks)) {
    for (const ml of config.inventoryMonthSheetLinks) {
      if (ml && ml.sheetUrl && typeof ml.sheetUrl === 'string' && ml.sheetUrl.trim().startsWith('http')) {
        urlsToPull.add(ml.sheetUrl.trim());
      }
    }
  }

  if (urlsToPull.size === 0) {
    const localTxns = readTransactions();
    return { 
      success: true, 
      count: localTxns.length, 
      message: localTxns.length > 0 ? `স্থানীয় ${localTxns.length} টি রেকর্ড রিফ্রেশ করা হয়েছে` : 'স্থানীয় ডেটা রিফ্রেশ করা হয়েছে' 
    };
  }

  try {
    let combinedTransactions: any[] = [];
    let combinedStaff: any[] = [];
    let combinedSalaries: any[] = [];
    let combinedItems: any[] = [];
    let combinedLogs: any[] = [];

    // Pull from all configured sheets concurrently
    const pullPromises = Array.from(urlsToPull).map(url => fetchFromSingleSheetUrl(url));
    const results = await Promise.allSettled(pullPromises);

    for (const res of results) {
      if (res.status === 'fulfilled') {
        if (res.value.rawTransactions?.length) {
          combinedTransactions.push(...res.value.rawTransactions);
        }
        if (res.value.rawStaff?.length) {
          combinedStaff.push(...res.value.rawStaff);
        }
        if (res.value.rawSalaries?.length) {
          combinedSalaries.push(...res.value.rawSalaries);
        }
        if (res.value.rawItems?.length) {
          combinedItems.push(...res.value.rawItems);
        }
        if (res.value.rawLogs?.length) {
          combinedLogs.push(...res.value.rawLogs);
        }
      }
    }

    const deletedIdsData = readDeletedIds();
    const deletedSet = new Set(deletedIdsData.transactions);

    if (combinedStaff.length > 0) {
      const deletedStaffSet = new Set(deletedIdsData.staff);
      writeStaff(combinedStaff.filter(s => s && s.id && !deletedStaffSet.has(s.id)));
    }
    if (combinedSalaries.length > 0) {
      const deletedSalarySet = new Set(deletedIdsData.salaries);
      writeSalaries(combinedSalaries.filter(s => s && s.id && !deletedSalarySet.has(s.id)));
    }
    if (combinedItems.length > 0) {
      const deletedInvSet = new Set(deletedIdsData.inventory);
      const currentItems = readInventory();
      const itemMap = new Map<string, InventoryItem>();
      currentItems.forEach(i => itemMap.set(i.id, i));
      combinedItems.forEach((it, idx) => {
        const id = (it.id && String(it.id).trim() !== '') 
          ? String(it.id).trim() 
          : `INV-ROW-${idx}-${String(it.name || '').trim()}`;
        if (!deletedInvSet.has(id)) {
          itemMap.set(id, {
            id,
            name: String(it.name || '').trim(),
            category: it.category || 'other',
            unit: String(it.unit || 'পিস').trim(),
            currentStock: Math.max(0, Number(it.currentStock) || 0),
            minStockAlert: Math.max(0, Number(it.minStockAlert) || 5),
            unitCost: Math.max(0, Number(it.unitCost) || 0),
            supplier: it.supplier ? String(it.supplier).trim() : undefined,
            location: it.location ? String(it.location).trim() : undefined,
            notes: it.notes ? String(it.notes).trim() : undefined,
            updatedAt: it.updatedAt || new Date().toISOString()
          });
        }
      });
      writeInventory(Array.from(itemMap.values()));
    }

    if (combinedLogs.length > 0) {
      const deletedLogsSet = new Set(deletedIdsData.inventoryLogs);
      const currentLogs = readInventoryLogs();
      const logMap = new Map<string, InventoryLog>();
      currentLogs.forEach(l => logMap.set(l.id, l));

      combinedLogs.forEach((lg, idx) => {
        const id = (lg.id && String(lg.id).trim() !== '') 
          ? String(lg.id).trim() 
          : `LOG-ROW-${idx}-${lg.date}-${lg.quantity}`;
        if (!deletedLogsSet.has(id)) {
          let typeVal: 'in' | 'out' | 'return' | 'damaged' = 'in';
          const typeStr = String(lg.type || '').toLowerCase();
          if (typeStr.includes('বিতরণ') || typeStr.includes('সংযোগ') || typeStr === 'out') {
            typeVal = 'out';
          } else if (typeStr.includes('ফেরত') || typeStr === 'return') {
            typeVal = 'return';
          } else if (typeStr.includes('নষ্ট') || typeStr.includes('ড্যামেজ') || typeStr === 'damaged') {
            typeVal = 'damaged';
          } else {
            typeVal = 'in';
          }

          logMap.set(id, {
            id,
            itemId: lg.itemId ? String(lg.itemId).trim() : '',
            itemName: String(lg.itemName || lg.name || 'মালামাল').trim(),
            type: typeVal,
            quantity: Math.max(1, Number(lg.quantity) || 1),
            date: normalizeDate(lg.date),
            recipientOrSource: lg.recipientOrSource ? String(lg.recipientOrSource).trim() : '',
            costPerUnit: Math.max(0, Number(lg.costPerUnit) || 0),
            totalCost: Math.max(0, Number(lg.totalCost) || 0),
            addedToExpense: Boolean(lg.addedToExpense === 'হ্যাঁ' || lg.addedToExpense === true),
            transactionId: lg.transactionId ? String(lg.transactionId).trim() : undefined,
            note: lg.note ? String(lg.note).trim() : '',
            createdAt: lg.createdAt || new Date().toISOString()
          });
        }
      });

      const mergedLogs = Array.from(logMap.values()).sort((a, b) => {
        const dA = new Date(a.date).getTime() || 0;
        const dB = new Date(b.date).getTime() || 0;
        if (dA !== dB) return dA - dB;
        const cA = new Date(a.createdAt || 0).getTime() || 0;
        const cB = new Date(b.createdAt || 0).getTime() || 0;
        return cA - cB;
      });

      writeInventoryLogs(mergedLogs);
    }

    if (combinedTransactions.length > 0) {
      const currentList = readTransactions().filter(t => !deletedSet.has(t.id));
      const currentMap = new Map<string, Transaction>();
      currentList.forEach(t => currentMap.set(t.id, t));

      // Standardize and merge transactions
      const normalizedIncoming: Transaction[] = combinedTransactions
        .map((t, idx) => {
          const cleanDate = normalizeDate(t.date);
          const cleanAmt = parseBengaliNumber(t.amount) || parseBengaliNumber(t.income) || parseBengaliNumber(t.expense);
          const cleanDesc = String(t.description || '').trim();
          const id = (t.id && String(t.id).trim() !== '') 
            ? String(t.id).trim() 
            : `SHEET-TXN-ROW-${idx}-${cleanDate}-${cleanAmt}-${cleanDesc.slice(0, 10)}`;
          return {
            id,
            date: cleanDate,
            type: normalizeType(t.type, t.category),
            description: String(t.description || 'শিট লেনদেন').trim(),
            category: String(t.category || 'অন্যান্য').trim(),
            amount: cleanAmt,
            paymentMethod: String(t.paymentMethod || 'নগদ').trim(),
            note: String(t.note || '').trim(),
            syncedToSheet: true,
            createdAt: t.createdAt || new Date().toISOString()
          };
        })
        .filter(item => item && item.amount > 0 && !deletedSet.has(item.id));

      normalizedIncoming.forEach(item => {
        if (!deletedSet.has(item.id)) {
          currentMap.set(item.id, item);
        }
      });

      const mergedList = Array.from(currentMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      writeTransactions(mergedList);

      const latestCfg = readConfig();
      latestCfg.lastSyncTime = new Date().toISOString();
      latestCfg.syncStatus = 'connected';
      latestCfg.syncMessage = 'গুগল শিট থেকে ডাটা সফলভাবে সিঙ্ক হয়েছে';
      writeConfig(latestCfg);

      return {
        success: true,
        count: mergedList.length,
        message: `${mergedList.length} টি লেনদেন গুগল শিটের সাথে সফলভাবে সিঙ্ক হয়েছে`
      };
    } else {
      const latestCfg = readConfig();
      latestCfg.lastSyncTime = new Date().toISOString();
      latestCfg.syncStatus = 'connected';
      latestCfg.syncMessage = 'গুগল শিট সক্রিয় রয়েছে';
      writeConfig(latestCfg);
      return { success: true, count: 0, message: 'গুগল শিট সক্রিয় রয়েছে' };
    }
  } catch (err: any) {
    console.warn('Google Sheet pull notice:', err.message);
    const latestCfg = readConfig();
    latestCfg.syncStatus = 'error';
    latestCfg.syncMessage = `সিঙ্ক নোটিস: ${err.message}`;
    writeConfig(latestCfg);
    return { success: false, count: 0, message: err.message };
  }
}

// Background Auto-Sync every 60 seconds to refresh Google Sheets data safely
setInterval(() => {
  const cfg = readConfig();
  const hasLinks = Boolean(cfg.sheetUrl || (Array.isArray(cfg.monthSheetLinks) && cfg.monthSheetLinks.length > 0));
  if (hasLinks && cfg.autoSync !== false) {
    pullFromGoogleSheet().catch(() => {});
  }
}, 60000);

// Sync with Google Apps Script Web App / Webhook (Routes to specific month sheet if configured)
async function syncToGoogleSheet(action: 'add' | 'update' | 'delete' | 'bulk_sync' | 'sync_staff' | 'sync_salary' | 'backup' | 'sync_summary', payload: any, specificDateOrMonth?: string) {
  let dateRef = specificDateOrMonth;
  if (!dateRef && payload) {
    if (payload.transaction && payload.transaction.date) {
      dateRef = payload.transaction.date;
    } else if (payload.date) {
      dateRef = payload.date;
    }
  }
  const targetUrl = getTargetSheetUrlForDate(dateRef);

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { synced: false, message: 'কোনো গুগল শিট ওয়েবহুক URL কনফিগার করা নেই' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        ...payload
      }),
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const latestCfg = readConfig();
      latestCfg.lastSyncTime = new Date().toISOString();
      latestCfg.syncStatus = 'connected';
      latestCfg.syncMessage = 'গুগল শিটে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে';
      writeConfig(latestCfg);
      return { synced: true, message: 'গুগল শিটে সফলভাবে ডাটা সিঙ্ক হয়েছে' };
    } else {
      const latestCfg = readConfig();
      latestCfg.syncStatus = 'error';
      latestCfg.syncMessage = `গুগল শিট সার্ভার রেসপন্স কোড: ${response.status}`;
      writeConfig(latestCfg);
      return { synced: false, message: `সার্ভার ত্রুটি: ${response.statusText}` };
    }
  } catch (err: any) {
    console.warn('Google Sheets sync notice:', err.message);
    const latestCfg = readConfig();
    latestCfg.syncStatus = 'error';
    latestCfg.syncMessage = `সিঙ্ক ব্যর্থ: ${err.message}`;
    writeConfig(latestCfg);
    return { synced: false, message: err.message };
  }
}

// ======================== API ROUTES ========================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/backup-data', async (req, res) => {
  const result = await syncToGoogleSheet('backup', {});
  if (result.synced) {
    res.json({ success: true, message: 'ব্যাকআপ সফল হয়েছে' });
  } else {
    res.status(500).json({ error: result.message });
  }
});

// Proxy endpoint for external bills & totals API (supports ais-pre, ais-dev, automated cookie session & fallbacks)
app.get('/api/external/bills', async (req, res) => {
  try {
    const rawNetType = String(req.query.netType || 'net').trim();
    const rawMonth = String(req.query.month || 'all').trim();
    const clientCookie = req.headers['x-ais-cookie'] || req.headers.cookie || '';

    // Month name translation map
    const monthMap: Record<string, string> = {
      'জানুয়ারি': 'jan', 'ফেব্রুয়ারি': 'feb', 'মার্চ': 'mar', 'এপ্রিল': 'apr',
      'মে': 'may', 'জুন': 'jun', 'জুলাই': 'jul', 'আগস্ট': 'aug',
      'সেপ্টেম্বর': 'sep', 'অক্টোবর': 'oct', 'নভেম্বর': 'nov', 'ডিসেম্বর': 'dec',
      'সকল': 'all', 'সব': 'all'
    };
    const mappedMonth = monthMap[rawMonth] || rawMonth;
    const mappedNetType = (rawNetType === 'নেট বিল' || rawNetType === 'net') ? 'net' : rawNetType;

    // Ordered list of candidate endpoints (giving priority to the user-provided ais-pre shared endpoint)
    const candidateUrls = [
      `https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/totals?month=${encodeURIComponent(mappedMonth)}`,
      `https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/totals?month=all`,
      `https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/totals?netType=${encodeURIComponent(mappedNetType)}&month=${encodeURIComponent(mappedMonth)}`,
      `https://ais-dev-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/totals?netType=net&month=nov`,
      `https://ais-dev-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/totals?netType=${encodeURIComponent(mappedNetType)}&month=${encodeURIComponent(mappedMonth)}`,
      `https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/bills?netType=net&month=all`,
      `https://ais-dev-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/bills?netType=${encodeURIComponent(mappedNetType)}&month=${encodeURIComponent(mappedMonth)}`
    ];

    let sessionCookies = clientCookie ? String(clientCookie) : '__SECURE-aistudio_auth_flow_may_set_cookies=true;';

    for (const targetUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(targetUrl, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Cookie': sessionCookies
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        // Capture any Set-Cookie from redirects
        const setCookieHeaders = response.headers.get('set-cookie');
        if (setCookieHeaders) {
          const newCookies = setCookieHeaders.split(',').map(c => c.split(';')[0].trim()).join('; ');
          sessionCookies = `${sessionCookies} ${newCookies}`;
        }

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          if (data && (data.grandTotal !== undefined || data.totalDue !== undefined || data.totalPay !== undefined || data.success)) {
            return res.json({
              success: true,
              grandTotal: Number(data.grandTotal ?? data.totalPay ?? data.summary?.totalPay) || 0,
              totalDue: Number(data.totalDue ?? data.summary?.totalDue) || 0,
              source: targetUrl,
              raw: data
            });
          }
        }
      } catch (err) {
        // try next candidate url
      }
    }

    return res.json({
      success: false,
      isCookieBlocked: true,
      message: 'বহিরাগত বিলিং সার্ভারে Google Cloud Run Cookie Check সক্রিয় রয়েছে।',
      target: candidateUrls[0]
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Proxy for the new summary endpoint
app.get('/api/external/summary', async (req, res) => {
  try {
    const clientCookie = req.headers['x-ais-cookie'] || req.headers.cookie || '';
    const authHeader = req.headers.authorization || '';
    const targetUrl = 'https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/api/external/summary';
    
    let sessionCookies = clientCookie ? String(clientCookie) : '__SECURE-aistudio_auth_flow_may_set_cookies=true;';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Cookie': sessionCookies,
        'Authorization': authHeader,
        'Referer': 'https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app/',
        'Origin': 'https://ais-pre-a37qv6u7wprcx3y5kyqn6h-220756794257.asia-east1.run.app'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    // Capture any Set-Cookie from redirects
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      const newCookies = setCookieHeaders.split(',').map(c => c.split(';')[0].trim()).join('; ');
      sessionCookies = `${sessionCookies} ${newCookies}`;
    }

    const contentType = response.headers.get('content-type') || '';
    const bodyText = await response.text();

    // If the body looks like JSON even if the header is wrong (sometimes happens with proxies)
    if (bodyText.trim().startsWith('{') && bodyText.trim().endsWith('}')) {
       try {
        const data = JSON.parse(bodyText);
        if (data.success || data.grandTotal !== undefined) {
          return res.json({
            success: true,
            data,
            source: targetUrl
          });
        }
      } catch (e) {}
    }

    if (response.ok && contentType.includes('application/json')) {
      try {
        const data = JSON.parse(bodyText);
        return res.json({
          success: true,
          data,
          source: targetUrl
        });
      } catch (e) {
        // Fall through to error handling
      }
    }

    // Detect AI Studio / Cloud Run auth wall
    const isAuthWall = bodyText.includes('Action required to load your app') || 
                       bodyText.includes('auth_flow') || 
                       response.url.includes('accounts.google.com') ||
                       response.status === 401 ||
                       response.status === 403;

    if (isAuthWall) {
      return res.json({
        success: false,
        needsAuth: true,
        message: 'বিলিং সার্ভারে প্রবেশের জন্য লগইন প্রয়োজন',
        target: targetUrl
      });
    }

    return res.status(response.status).json({
      success: false,
      message: `API returned ${response.status}`,
      target: targetUrl,
      debug: bodyText.slice(0, 100)
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Proxy endpoint to bypass CORS for generic Google Script Web Apps
app.get('/api/proxy/google-script', async (req, res) => {
  const url = req.query.url as string;
  if (!url || !url.startsWith('https://script.google.com/')) {
    return res.status(400).json({ error: 'Invalid or missing script URL' });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Script returned ${response.status}` });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all transactions
app.get('/api/transactions', (req, res) => {
  const list = readTransactions();
  res.json(list);
});

// Function to calculate and push business summary to Google Sheets
async function pushSummaryToSheet() {
  try {
    const transactions = readTransactions();
    const staff = readStaff();
    const salaries = readSalaries();
    const inventory = readInventory();
    const config = readConfig();

    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += (Number(t.amount) || 0);
      else if (t.type === 'expense') totalExpense += (Number(t.amount) || 0);
    });

    const totalSalaryPaid = salaries.reduce((sum, s) => (s.paymentStatus === 'paid' ? sum + (Number(s.netSalary) || 0) : sum), 0);
    const activeStaffCount = staff.filter(s => s.status === 'active').length;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + ((Number(item.currentStock) || 0) * (Number(item.unitCost) || 0)), 0);

    const summary = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalSalaryPaid,
      activeStaffCount,
      totalStaff: staff.length,
      totalInventoryValue,
      companyName: config.companyName,
      currency: config.currencySymbol,
      lastUpdated: new Date().toISOString()
    };

    await syncToGoogleSheet('sync_summary', { summary });
  } catch (err) {
    console.error('Error pushing summary to sheet:', err);
  }
}

// Global hook to trigger summary sync after data changes
function triggerSummarySync() {
  // Use a slight delay to ensure file writes are complete and avoid rapid multiple calls
  setTimeout(() => pushSummaryToSheet(), 2000);
}

// POST new transaction
app.post('/api/transactions', async (req, res) => {
  const { type, description, category, amount, date, paymentMethod, note } = req.body;

  if (!description || amount === undefined || amount === null || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'সঠিক বিবরণ এবং টাকার পরিমাণ দিন' });
  }

  const newTxn: Transaction = {
    id: `TXN-${Date.now()}`,
    type: type === 'expense' ? 'expense' : 'income',
    description: String(description).trim(),
    category: category ? String(category).trim() : 'অন্যান্য',
    amount: Number(amount),
    date: date || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod ? String(paymentMethod).trim() : 'নগদ',
    note: note ? String(note).trim() : '',
    syncedToSheet: false,
    createdAt: new Date().toISOString()
  };

  const list = readTransactions();
  list.unshift(newTxn);

  // Sync to Google Sheet if enabled
  const config = readConfig();
  let syncResult: any = { synced: false };
  if (config.autoSync && config.sheetUrl) {
    syncResult = await syncToGoogleSheet('add', { transaction: newTxn });
    if (syncResult.synced) {
      newTxn.syncedToSheet = true;
    }
  }

  writeTransactions(list);
  triggerSummarySync();
  res.status(201).json({ transaction: newTxn, sync: syncResult });
});

// PUT update transaction
app.put('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { type, description, category, amount, date, paymentMethod, note } = req.body;

  const list = readTransactions();
  const index = list.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'লেনদেন পাওয়া যায়নি' });
  }

  const updated: Transaction = {
    ...list[index],
    type: type || list[index].type,
    description: description !== undefined ? String(description).trim() : list[index].description,
    category: category !== undefined ? String(category).trim() : list[index].category,
    amount: amount !== undefined ? Number(amount) : list[index].amount,
    date: date || list[index].date,
    paymentMethod: paymentMethod !== undefined ? String(paymentMethod).trim() : list[index].paymentMethod,
    note: note !== undefined ? String(note).trim() : list[index].note
  };

  list[index] = updated;

  const config = readConfig();
  let syncResult: any = { synced: false };
  if (config.autoSync && config.sheetUrl) {
    syncResult = await syncToGoogleSheet('update', { transaction: updated });
    if (syncResult.synced) {
      updated.syncedToSheet = true;
    }
  }

  writeTransactions(list);
  triggerSummarySync();
  res.json({ transaction: updated, sync: syncResult });
});

// DELETE transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  let list = readTransactions();
  const target = list.find(t => t.id === id);

  if (!target) {
    return res.status(404).json({ error: 'লেনদেন পাওয়া যায়নি' });
  }

  addDeletedId('transactions', id);
  list = list.filter(t => t.id !== id);
  writeTransactions(list);
  triggerSummarySync();

  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    await syncToGoogleSheet('delete', { id });
  }

  res.json({ success: true, message: 'লেনদেন মুছে ফেলা হয়েছে' });
});

// ==================== STAFF ROUTES ====================
app.get('/api/staff', (req, res) => {
  const staff = readStaff();
  res.json(staff);
});

app.post('/api/staff', async (req, res) => {
  const { name, designation, phone, joinDate, baseSalary, status, notes } = req.body;
  if (!name || !designation || !phone) {
    return res.status(400).json({ error: 'নাম, পদবি ও মোবাইল নম্বর আবশ্যক' });
  }

  const staffList = readStaff();
  const newStaff: Staff = {
    id: `STF-${Date.now().toString().slice(-4)}`,
    name: String(name).trim(),
    designation: String(designation).trim(),
    phone: String(phone).trim(),
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    baseSalary: Number(baseSalary) || 0,
    status: status === 'inactive' ? 'inactive' : 'active',
    notes: notes ? String(notes).trim() : '',
    createdAt: new Date().toISOString()
  };

  staffList.push(newStaff);
  writeStaff(staffList);
  triggerSummarySync();

  // Sync with Google Sheet if configured
  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    syncToGoogleSheet('sync_staff', { staff: staffList }).catch(() => {});
  }

  res.status(201).json(newStaff);
});

app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const staffList = readStaff();
  const index = staffList.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'স্টাফ পাওয়া যায়নি' });
  }

  const updated: Staff = {
    ...staffList[index],
    name: req.body.name !== undefined ? String(req.body.name).trim() : staffList[index].name,
    designation: req.body.designation !== undefined ? String(req.body.designation).trim() : staffList[index].designation,
    phone: req.body.phone !== undefined ? String(req.body.phone).trim() : staffList[index].phone,
    joinDate: req.body.joinDate || staffList[index].joinDate,
    baseSalary: req.body.baseSalary !== undefined ? Number(req.body.baseSalary) : staffList[index].baseSalary,
    status: req.body.status || staffList[index].status,
    notes: req.body.notes !== undefined ? String(req.body.notes).trim() : staffList[index].notes
  };

  staffList[index] = updated;
  writeStaff(staffList);
  triggerSummarySync();

  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    syncToGoogleSheet('sync_staff', { staff: staffList }).catch(() => {});
  }

  res.json(updated);
});

app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  let staffList = readStaff();
  const target = staffList.find(s => s.id === id);
  if (!target) {
    return res.status(404).json({ error: 'স্টাফ পাওয়া যায়নি' });
  }

  addDeletedId('staff', id);
  staffList = staffList.filter(s => s.id !== id);
  writeStaff(staffList);
  triggerSummarySync();

  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    syncToGoogleSheet('sync_staff', { staff: staffList }).catch(() => {});
  }

  res.json({ success: true, message: 'স্টাফ মুছে ফেলা হয়েছে' });
});

// ==================== SALARY ROUTES ====================
app.get('/api/salaries', (req, res) => {
  const { month } = req.query;
  let salaries = readSalaries();
  if (month && typeof month === 'string') {
    salaries = salaries.filter(s => s.month === month);
  }
  res.json(salaries);
});

app.post('/api/salaries', async (req, res) => {
  const {
    staffId,
    month,
    baseSalary,
    bonusOrAllowance,
    deductionOrAdvance,
    paymentStatus,
    paymentDate,
    paymentMethod,
    voucherNumber,
    note
  } = req.body;

  if (!staffId || !month) {
    return res.status(400).json({ error: 'স্টাফ ও মাস নির্বাচন আবশ্যক' });
  }

  const staffList = readStaff();
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) {
    return res.status(404).json({ error: 'নির্বাচিত স্টাফ পাওয়া যায়নি' });
  }

  const base = Number(baseSalary) >= 0 ? Number(baseSalary) : staff.baseSalary;
  const bonus = Number(bonusOrAllowance) || 0;
  const deduction = Number(deductionOrAdvance) || 0;
  const net = Math.max(0, base + bonus - deduction);

  const salaries = readSalaries();
  const existingIndex = salaries.findIndex(s => s.staffId === staffId && s.month === month);

  const isPaid = paymentStatus === 'paid';
  const payDate = paymentDate || new Date().toISOString().split('T')[0];
  const payMethod = paymentMethod || 'নগদ';
  const voucher = voucherNumber || `VCH-SAL-${Date.now().toString().slice(-4)}`;

  let linkedTxnId = existingIndex !== -1 ? salaries[existingIndex].transactionId : undefined;

  // If marked paid, create or sync expense transaction
  if (isPaid) {
    const transactions = readTransactions();
    const txnDescription = `স্টাফ বেতন: ${staff.name} (${staff.designation})`;
    const txnNote = `${month} মাসের বেতন। মূল: ৳${base}, ভাতা/বোনাস: ৳${bonus}, কর্তন: ৳${deduction}। ভাউচার: ${voucher}`;

    if (linkedTxnId) {
      const txnIdx = transactions.findIndex(t => t.id === linkedTxnId);
      if (txnIdx !== -1) {
        transactions[txnIdx].amount = net;
        transactions[txnIdx].date = payDate;
        transactions[txnIdx].paymentMethod = payMethod;
        transactions[txnIdx].note = txnNote;
        writeTransactions(transactions);
      }
    } else {
      const newTxnId = `TXN-SAL-${Date.now()}`;
      const newTxn: Transaction = {
        id: newTxnId,
        type: 'expense',
        description: txnDescription,
        category: 'স্টাফ বেতন ও টেকনিশিয়ান ভাতা',
        amount: net,
        date: payDate,
        paymentMethod: payMethod,
        note: txnNote,
        syncedToSheet: false,
        createdAt: new Date().toISOString()
      };
      transactions.unshift(newTxn);
      writeTransactions(transactions);
      linkedTxnId = newTxnId;

      const config = readConfig();
      if (config.autoSync && config.sheetUrl) {
        syncToGoogleSheet('add', { transaction: newTxn }).catch(() => {});
      }
    }
  }

  const newSalary: SalaryPayment = {
    id: existingIndex !== -1 ? salaries[existingIndex].id : `SAL-${month.replace('-', '')}-${Date.now().toString().slice(-4)}`,
    staffId: staff.id,
    staffName: staff.name,
    staffDesignation: staff.designation,
    month,
    baseSalary: base,
    bonusOrAllowance: bonus,
    deductionOrAdvance: deduction,
    netSalary: net,
    paymentStatus: isPaid ? 'paid' : 'pending',
    paymentDate: isPaid ? payDate : undefined,
    paymentMethod: isPaid ? payMethod : undefined,
    voucherNumber: isPaid ? voucher : undefined,
    note: note ? String(note).trim() : '',
    transactionId: linkedTxnId,
    createdAt: existingIndex !== -1 ? salaries[existingIndex].createdAt : new Date().toISOString()
  };

  if (existingIndex !== -1) {
    salaries[existingIndex] = newSalary;
  } else {
    salaries.unshift(newSalary);
  }

  writeSalaries(salaries);
  triggerSummarySync();
  res.status(201).json(newSalary);
});

app.delete('/api/salaries/:id', (req, res) => {
  const { id } = req.params;
  let salaries = readSalaries();
  const target = salaries.find(s => s.id === id);
  if (!target) {
    return res.status(404).json({ error: 'বেতন রেকর্ড পাওয়া যায়নি' });
  }

  addDeletedId('salaries', id);
  if (target.transactionId) {
    addDeletedId('transactions', target.transactionId);
    let transactions = readTransactions();
    transactions = transactions.filter(t => t.id !== target.transactionId);
    writeTransactions(transactions);
  }

  salaries = salaries.filter(s => s.id !== id);
  writeSalaries(salaries);
  triggerSummarySync();
  res.json({ success: true, message: 'বেতন রেকর্ড মুছে ফেলা হয়েছে' });
});

// ==================== INVENTORY ROUTES ====================
app.get('/api/inventory', (req, res) => {
  const items = readInventory();
  const sorted = [...items].sort((a, b) => {
    const tA = new Date((a as any).createdAt || a.updatedAt || a.id || 0).getTime() || 0;
    const tB = new Date((b as any).createdAt || b.updatedAt || b.id || 0).getTime() || 0;
    return tA - tB;
  });
  res.json(sorted);
});

app.post('/api/inventory', (req, res) => {
  const { id, name, category, unit, currentStock, minStockAlert, unitCost, supplier, location, notes } = req.body;
  
  if (!name || !unit) {
    return res.status(400).json({ error: 'মালামালের নাম ও একক আবশ্যক' });
  }

  const items = readInventory();
  const existingIdx = id ? items.findIndex(i => i.id === id) : -1;

  const updatedItem: InventoryItem = {
    id: existingIdx !== -1 ? items[existingIdx].id : `INV-${Date.now().toString().slice(-6)}`,
    name: String(name).trim(),
    category: category || 'other',
    unit: unit || 'পিস',
    currentStock: currentStock !== undefined ? Math.max(0, Number(currentStock)) : (existingIdx !== -1 ? items[existingIdx].currentStock : 0),
    minStockAlert: minStockAlert !== undefined ? Math.max(0, Number(minStockAlert)) : 5,
    unitCost: unitCost !== undefined ? Math.max(0, Number(unitCost)) : 0,
    supplier: supplier ? String(supplier).trim() : undefined,
    location: location ? String(location).trim() : undefined,
    notes: notes ? String(notes).trim() : undefined,
    createdAt: existingIdx !== -1 ? ((items[existingIdx] as any).createdAt || items[existingIdx].updatedAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    items[existingIdx] = updatedItem;
  } else {
    items.push(updatedItem);
  }

  writeInventory(items);
  triggerSummarySync();
  res.status(201).json(updatedItem);
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  let items = readInventory();
  const exists = items.some(i => i.id === id);
  if (!exists) {
    return res.status(404).json({ error: 'আইটেম পাওয়া যায়নি' });
  }
  addDeletedId('inventory', id);
  items = items.filter(i => i.id !== id);
  writeInventory(items);
  triggerSummarySync();
  res.json({ success: true, message: 'মালামাল মুছে ফেলা হয়েছে' });
});

app.get('/api/inventory/logs', (req, res) => {
  const logs = readInventoryLogs();
  const sorted = [...logs].sort((a, b) => {
    const dA = new Date(a.date).getTime() || 0;
    const dB = new Date(b.date).getTime() || 0;
    if (dA !== dB) return dA - dB;
    const cA = new Date(a.createdAt || 0).getTime() || 0;
    const cB = new Date(b.createdAt || 0).getTime() || 0;
    return cA - cB;
  });
  res.json(sorted);
});

app.post('/api/inventory/logs', (req, res) => {
  const {
    itemId,
    type,
    quantity,
    date,
    recipientOrSource,
    costPerUnit,
    addToExpense,
    expenseCategory,
    paymentMethod,
    note
  } = req.body;

  if (!itemId || !type || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'সঠিক আইটেম, ধরন ও পরিমাণ দিন' });
  }

  const items = readInventory();
  const itemIdx = items.findIndex(i => i.id === itemId);
  if (itemIdx === -1) {
    return res.status(404).json({ error: 'আইটেম পাওয়া যায়নি' });
  }

  const targetItem = items[itemIdx];
  const qty = Number(quantity);
  const logDate = normalizeDate(date);
  const unitPrice = costPerUnit !== undefined ? Number(costPerUnit) : targetItem.unitCost;
  const totalCost = unitPrice * qty;

  // Adjust stock
  if (type === 'in' || type === 'return') {
    targetItem.currentStock += qty;
  } else if (type === 'out' || type === 'damaged') {
    targetItem.currentStock = Math.max(0, targetItem.currentStock - qty);
  }
  targetItem.updatedAt = new Date().toISOString();
  if (costPerUnit !== undefined && Number(costPerUnit) > 0) {
    targetItem.unitCost = Number(costPerUnit);
  }
  items[itemIdx] = targetItem;
  writeInventory(items);
  triggerSummarySync();

  let linkedTxnId: string | undefined = undefined;

  // Inventory stock accounting does not add or subtract from main dashboard transactions as requested.
  const logs = readInventoryLogs();
  const newLog: InventoryLog = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: targetItem.id,
    itemName: targetItem.name,
    type: type as any,
    quantity: qty,
    date: logDate,
    recipientOrSource: recipientOrSource ? String(recipientOrSource).trim() : '',
    costPerUnit: unitPrice,
    totalCost: totalCost,
    addedToExpense: Boolean(addToExpense && linkedTxnId),
    transactionId: linkedTxnId,
    note: note ? String(note).trim() : '',
    createdAt: new Date().toISOString()
  };

  logs.push(newLog);
  writeInventoryLogs(logs);
  triggerSummarySync();

  res.status(201).json({
    log: newLog,
    item: targetItem,
    linkedTxnId
  });
});

app.delete('/api/inventory/logs/:id', (req, res) => {
  const { id } = req.params;
  addDeletedId('inventoryLogs', id);
  let logs = readInventoryLogs();
  const target = logs.find(l => l.id === id);
  if (!target) {
    return res.status(404).json({ error: 'লগ পাওয়া যায়নি' });
  }

  // Revert stock balance
  const items = readInventory();
  const itemIdx = items.findIndex(i => i.id === target.itemId);
  if (itemIdx !== -1) {
    if (target.type === 'in' || target.type === 'return') {
      items[itemIdx].currentStock = Math.max(0, items[itemIdx].currentStock - target.quantity);
    } else if (target.type === 'out' || target.type === 'damaged') {
      items[itemIdx].currentStock += target.quantity;
    }
    items[itemIdx].updatedAt = new Date().toISOString();
    writeInventory(items);
    triggerSummarySync();
  }

  // If linked to transaction, remove transaction
  if (target.transactionId) {
    addDeletedId('transactions', target.transactionId);
    let transactions = readTransactions();
    transactions = transactions.filter(t => t.id !== target.transactionId);
    writeTransactions(transactions);
  }

  logs = logs.filter(l => l.id !== id);
  writeInventoryLogs(logs);
  triggerSummarySync();
  res.json({ success: true, message: 'লগ মুছে ফেলা হয়েছে ও স্টক সমন্বয় করা হয়েছে' });
});

// Restore persistent local backup endpoint
app.post('/api/sync/restore-local-backup', (req, res) => {
  try {
    const { transactions, staff, salaries, inventory, inventoryLogs } = req.body;
    const deletedIds = readDeletedIds();

    if (Array.isArray(transactions) && transactions.length > 0) {
      const current = readTransactions();
      const map = new Map<string, Transaction>();
      current.forEach(t => map.set(t.id, t));
      transactions.forEach((t: any) => {
        if (t && t.id && !deletedIds.transactions.includes(t.id)) {
          map.set(t.id, t);
        }
      });
      writeTransactions(Array.from(map.values()));
    }

    if (Array.isArray(staff) && staff.length > 0) {
      const current = readStaff();
      const map = new Map<string, Staff>();
      current.forEach(s => map.set(s.id, s));
      staff.forEach((s: any) => {
        if (s && s.id && !deletedIds.staff.includes(s.id)) {
          map.set(s.id, s);
        }
      });
      writeStaff(Array.from(map.values()));
    }

    if (Array.isArray(salaries) && salaries.length > 0) {
      const current = readSalaries();
      const map = new Map<string, SalaryPayment>();
      current.forEach(s => map.set(s.id, s));
      salaries.forEach((s: any) => {
        if (s && s.id && !deletedIds.salaries.includes(s.id)) {
          map.set(s.id, s);
        }
      });
      writeSalaries(Array.from(map.values()));
    }

    if (Array.isArray(inventory) && inventory.length > 0) {
      const current = readInventory();
      const map = new Map<string, InventoryItem>();
      current.forEach(i => map.set(i.id, i));
      inventory.forEach((i: any) => {
        if (i && i.id && !deletedIds.inventory.includes(i.id)) {
          map.set(i.id, i);
        }
      });
      writeInventory(Array.from(map.values()));
    }

    if (Array.isArray(inventoryLogs) && inventoryLogs.length > 0) {
      const current = readInventoryLogs();
      const map = new Map<string, InventoryLog>();
      current.forEach(l => map.set(l.id, l));
      inventoryLogs.forEach((l: any) => {
        if (l && l.id && !deletedIds.inventoryLogs.includes(l.id)) {
          map.set(l.id, l);
        }
      });
      writeInventoryLogs(Array.from(map.values()));
    }

    res.json({ success: true, message: 'স্থানীয় ব্যাকআপ রিস্টোর সম্পন্ন হয়েছে' });
  } catch (err) {
    console.error('Error restoring local backup:', err);
    res.status(500).json({ error: 'রিস্টোর করতে সমস্যা হয়েছে' });
  }
});

// GET configuration
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json(config);
});

// POST update configuration
app.post('/api/config', async (req, res) => {
  const current = readConfig();
  const newSheetUrl = req.body.sheetUrl !== undefined ? String(req.body.sheetUrl).trim() : current.sheetUrl;
  
  const updated: SheetConfig = {
    ...current,
    sheetUrl: newSheetUrl,
    sheetId: req.body.sheetId !== undefined ? String(req.body.sheetId).trim() : current.sheetId,
    inventorySheetUrl: req.body.inventorySheetUrl !== undefined ? String(req.body.inventorySheetUrl).trim() : current.inventorySheetUrl,
    inventorySheetName: req.body.inventorySheetName !== undefined ? String(req.body.inventorySheetName).trim() : (current.inventorySheetName || 'মালামাল_ও_ইকুইপমেন্ট_স্টক'),
    monthSheetLinks: Array.isArray(req.body.monthSheetLinks) ? req.body.monthSheetLinks : (current.monthSheetLinks || []),
    inventoryMonthSheetLinks: Array.isArray(req.body.inventoryMonthSheetLinks) ? req.body.inventoryMonthSheetLinks : (current.inventoryMonthSheetLinks || []),
    autoSync: req.body.autoSync !== undefined ? Boolean(req.body.autoSync) : current.autoSync,
    companyName: req.body.companyName ? String(req.body.companyName).trim() : current.companyName,
    currencySymbol: req.body.currencySymbol ? String(req.body.currencySymbol).trim() : current.currencySymbol,
    activeMonth: (req.body.activeMonth && String(req.body.activeMonth).trim()) ? String(req.body.activeMonth).trim() : (current.activeMonth || new Date().toISOString().substring(0, 7)),
    managedMonths: Array.isArray(req.body.managedMonths) ? req.body.managedMonths : current.managedMonths
  };

  if (updated.sheetUrl && updated.sheetUrl.startsWith('http')) {
    updated.syncStatus = 'connected';
    updated.syncMessage = 'গুগল শিট লাইভ সিঙ্ক সক্রিয় রয়েছে';
    writeConfig(updated);
    pullFromGoogleSheet().catch(err => console.warn('Background pull after config update:', err.message));
  } else {
    updated.syncStatus = 'idle';
    updated.syncMessage = 'কোনো গুগল শিট লিংক সংযুক্ত নেই';
    writeConfig(updated);
  }

  res.json(updated);
});

// GET month sheet links specifically
app.get('/api/config/month-sheet-links', (req, res) => {
  const config = readConfig();
  res.json(config.monthSheetLinks || []);
});

// POST update month sheet links directly
app.post('/api/config/month-sheet-links', (req, res) => {
  const config = readConfig();
  const links = Array.isArray(req.body.links) ? req.body.links : Array.isArray(req.body) ? req.body : [];
  config.monthSheetLinks = links;

  // Auto-sync month names to managedMonths
  const currentManaged = Array.isArray(config.managedMonths) ? config.managedMonths : [];
  const linkMonths = links.map((l: any) => l.month).filter(Boolean);
  config.managedMonths = Array.from(new Set([...currentManaged, ...linkMonths]));

  writeConfig(config);
  if (links.length > 0) {
    pullFromGoogleSheet().catch(err => console.warn('Background pull after month links update:', err.message));
  }
  res.json({ success: true, links: config.monthSheetLinks, managedMonths: config.managedMonths });
});

// GET inventory month sheet links specifically
app.get('/api/config/inventory-month-sheet-links', (req, res) => {
  const config = readConfig();
  res.json(config.inventoryMonthSheetLinks || []);
});

// POST update inventory month sheet links directly
app.post('/api/config/inventory-month-sheet-links', (req, res) => {
  const config = readConfig();
  const links = Array.isArray(req.body.links) ? req.body.links : Array.isArray(req.body) ? req.body : [];
  config.inventoryMonthSheetLinks = links;

  // Auto-sync month names to managedMonths
  const currentManaged = Array.isArray(config.managedMonths) ? config.managedMonths : [];
  const linkMonths = links.map((l: any) => l.month).filter(Boolean);
  config.managedMonths = Array.from(new Set([...currentManaged, ...linkMonths]));

  writeConfig(config);
  res.json({ success: true, links: config.inventoryMonthSheetLinks, managedMonths: config.managedMonths });
});

// POST sync inventory and equipment stock to separate Google Sheet
app.post('/api/inventory/sync-sheet', async (req, res) => {
  const config = readConfig();
  const monthKey = (req.body && req.body.month) ? String(req.body.month).trim() : (config.activeMonth || new Date().toISOString().substring(0, 7));
  let targetUrl = '';

  // 1. Check if dedicated month-specific stock sheet is configured
  if (Array.isArray(config.inventoryMonthSheetLinks)) {
    const match = config.inventoryMonthSheetLinks.find((l: any) => l && l.month === monthKey && l.sheetUrl);
    if (match && typeof match.sheetUrl === 'string' && match.sheetUrl.trim().startsWith('http')) {
      targetUrl = match.sheetUrl.trim();
    }
  }

  // 2. Fall back to central inventorySheetUrl or sheetUrl
  if (!targetUrl) {
    targetUrl = config.inventorySheetUrl || config.sheetUrl || DEFAULT_SHEET_URL;
  }

  // 3. If client provided a specific inventory sheet URL in the body, update and persist it immediately!
  if (req.body && req.body.sheetUrl && typeof req.body.sheetUrl === 'string') {
    const trimmed = req.body.sheetUrl.trim();
    if (trimmed.startsWith('http')) {
      targetUrl = trimmed;
      if (config.inventorySheetUrl !== trimmed) {
        config.inventorySheetUrl = trimmed;
        writeConfig(config);
      }
    }
  }

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ 
      success: false, 
      message: 'কোনো স্টক গুগল শিট লিংক কনফিগার করা নেই। অনুগ্রহ করে শিট লিংক যোগ করুন।' 
    });
  }

  const rawItems = readInventory();
  const rawLogs = readInventoryLogs();

  // Sort items & logs: 1st entry created at the top, new entries added below
  const items = [...rawItems].sort((a, b) => {
    const tA = new Date((a as any).createdAt || a.updatedAt || a.id || 0).getTime() || 0;
    const tB = new Date((b as any).createdAt || b.updatedAt || b.id || 0).getTime() || 0;
    return tA - tB;
  });

  const logs = [...rawLogs].map(lg => ({
    ...lg,
    date: normalizeDate(lg.date)
  })).sort((a, b) => {
    const dA = new Date(a.date).getTime() || 0;
    const dB = new Date(b.date).getTime() || 0;
    if (dA !== dB) return dA - dB;
    const cA = new Date(a.createdAt || 0).getTime() || 0;
    const cB = new Date(b.createdAt || 0).getTime() || 0;
    return cA - cB;
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_inventory',
        sheetName: config.inventorySheetName || 'মালামাল_ও_ইকুইপমেন্ট_স্টক',
        month: monthKey,
        items,
        logs,
        totalItems: items.length,
        timestamp: new Date().toISOString()
      }),
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    res.json({
      success: true,
      message: `${items.length} টি মালামাল ও ইকুইপমেন্ট স্টক আলাদা শিটে সফলভাবে সিঙ্ক হয়েছে`,
      totalItems: items.length,
      logsCount: logs.length
    });
  } catch (err: any) {
    console.warn('Inventory sync notice:', err.message);
    res.json({
      success: true, // Graceful fallback
      message: `মালামাল স্টক সংরক্ষিত হয়েছে (${items.length} টি আইটেম)। শিট সিঙ্ক: ${err.message}`,
      totalItems: items.length
    });
  }
});

// POST comprehensive inventory backup endpoint (Direct to Google Sheet)
app.post('/api/inventory/backup', async (req, res) => {
  try {
    const rawItems = readInventory();
    const rawLogs = readInventoryLogs();
    const config = readConfig();
    const activeMonth = (req.body && req.body.month) ? String(req.body.month).trim() : (config.activeMonth || new Date().toISOString().substring(0, 7));

    const items = [...rawItems].sort((a, b) => {
      const tA = new Date((a as any).createdAt || a.updatedAt || a.id || 0).getTime() || 0;
      const tB = new Date((b as any).createdAt || b.updatedAt || b.id || 0).getTime() || 0;
      return tA - tB;
    });

    const logs = [...rawLogs].map(lg => ({
      ...lg,
      date: normalizeDate(lg.date)
    })).sort((a, b) => {
      const dA = new Date(a.date).getTime() || 0;
      const dB = new Date(b.date).getTime() || 0;
      if (dA !== dB) return dA - dB;
      const cA = new Date(a.createdAt || 0).getTime() || 0;
      const cB = new Date(b.createdAt || 0).getTime() || 0;
      return cA - cB;
    });

    // Write to persistent backups to guarantee safety
    writeInventory(items);
    writeInventoryLogs(logs);

    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);

    // Determine target Google Sheet URL (month-specific or central inventory/main sheet)
    let targetUrl = '';
    if (Array.isArray(config.inventoryMonthSheetLinks)) {
      const match = config.inventoryMonthSheetLinks.find((l: any) => l && l.month === activeMonth && l.sheetUrl);
      if (match && typeof match.sheetUrl === 'string' && match.sheetUrl.trim().startsWith('http')) {
        targetUrl = match.sheetUrl.trim();
      }
    }
    if (!targetUrl) {
      targetUrl = config.inventorySheetUrl || config.sheetUrl;
    }

    let sheetSyncStatus = 'কোনো শিট লিংক সংযুক্ত নেই';
    let sheetSaved = false;

    if (targetUrl && targetUrl.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'sync_inventory',
            sheetName: config.inventorySheetName || 'মালামাল_ও_ইকুইপমেন্ট_স্টক',
            month: activeMonth,
            items,
            logs,
            totalItems: items.length,
            timestamp: new Date().toISOString()
          }),
          redirect: 'follow',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          sheetSaved = true;
          sheetSyncStatus = 'গুগল শিটের "স্টক_মালামাল" ও "স্টক_হিসাব_লগ" ট্যাবে ডাটা সফলভাবে সেভ হয়েছে ✓';
        } else {
          sheetSyncStatus = `শিট সার্ভার রেসপন্স কোড: ${resp.status}`;
        }
      } catch (e: any) {
        sheetSyncStatus = `লোকাল ব্যাকআপ সফল, শিট সিঙ্ক নোটিস: ${e.message}`;
      }
    }

    res.json({
      success: true,
      sheetSaved,
      message: sheetSaved 
        ? 'গুগল শিটে মালামাল ও স্টক ডাটা সফলভাবে ব্যাকআপ সেভ হয়েছে' 
        : 'মালামাল ও ইকুইপমেন্ট স্টকের সম্পূর্ণ ডাটা ব্যাকআপ করা হয়েছে',
      itemCount: items.length,
      logCount: logs.length,
      totalValue,
      sheetSyncStatus,
      targetSheetUrl: targetUrl || undefined,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Inventory backup error:', err);
    res.status(500).json({ success: false, message: `ব্যাকআপ ত্রুটি: ${err.message}` });
  }
});

// POST force push all data to Google Sheet
app.post('/api/sync/push', async (req, res) => {
  const list = readTransactions();
  const staff = readStaff();
  const salaries = readSalaries();
  const config = readConfig();
  const targetUrl = config.sheetUrl || DEFAULT_SHEET_URL;

  if (!targetUrl) {
    return res.status(400).json({ error: 'গুগল শিট Webhook URL যোগ করা নেই। সেটিংস থেকে URL সেট করুন।' });
  }

  config.syncStatus = 'syncing';
  writeConfig(config);

  const syncResult = await syncToGoogleSheet('bulk_sync', {
    transactions: list,
    staff: staff,
    salaries: salaries,
    companyName: config.companyName
  });

  if (syncResult.synced) {
    // mark all as synced
    list.forEach(t => { t.syncedToSheet = true; });
    writeTransactions(list);
  }

  res.json({
    success: syncResult.synced,
    message: syncResult.message,
    totalRecords: list.length,
    staffRecords: staff.length,
    lastSyncTime: config.lastSyncTime
  });
});

// POST pull data from Google Sheet Webhook / public sheet export
app.post('/api/sync/pull', async (req, res) => {
  try {
    const result = await pullFromGoogleSheet();
    const list = readTransactions();
    const staff = readStaff();
    res.json({
      success: result.success,
      message: result.message,
      count: list.length,
      transactions: list,
      staff
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook for instant notification from Google Apps Script onEdit
app.post('/api/webhook/sheet-update', async (req, res) => {
  try {
    const result = await pullFromGoogleSheet();
    res.json({ success: true, message: 'রিয়েল-টাইম আপডেট সফল হয়েছে', result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Summary API for external websites (CORS enabled)
app.get('/api/external/summary', (req, res) => {
  try {
    const transactions = readTransactions();
    const staff = readStaff();
    const salaries = readSalaries();
    const inventory = readInventory();
    const config = readConfig();

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += (Number(t.amount) || 0);
      else if (t.type === 'expense') totalExpense += (Number(t.amount) || 0);
    });

    const totalSalaryPaid = salaries.reduce((sum, s) => (s.paymentStatus === 'paid' ? sum + (Number(s.netSalary) || 0) : sum), 0);
    const activeStaffCount = staff.filter(s => s.status === 'active').length;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + ((Number(item.currentStock) || 0) * (Number(item.unitCost) || 0)), 0);

    // Set CORS headers for public access from any domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.json({
      success: true,
      applicationName: config.companyName || 'স্মার্ট ব্যবসা ও বিলিং',
      currency: config.currencySymbol || '৳',
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        totalSalaryPaid,
        activeStaffCount,
        totalStaff: staff.length,
        totalInventoryValue
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CSV Export route
app.get('/api/export/csv', (req, res) => {
  const list = readTransactions();
  const config = readConfig();

  // UTF-8 BOM so Excel opens Bengali text without mojibake
  let csv = '\uFEFF';
  csv += 'আইডি,তারিখ,ধরন,বিবরণ,বিভাগ,টাকার পরিমাণ,পেমেন্ট মাধ্যম,নোট\r\n';

  list.forEach(t => {
    const typeLabel = t.type === 'income' ? 'আয়' : 'ব্যয়';
    const row = [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${typeLabel}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\r\n';
  });

  const filename = `hishab-report-${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ======================== SERVER & VITE ========================

async function startServer() {
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    const cfg = readConfig();
    if (cfg.sheetUrl && cfg.sheetUrl.startsWith('http')) {
      pullFromGoogleSheet().then(res => console.log('Startup Sync:', res.message)).catch(err => console.error('Startup Sync Failed:', err));
    }
  });
}

startServer();
