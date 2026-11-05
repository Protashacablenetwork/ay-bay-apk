export const INCOME_CATEGORIES = [
  'মাসিক ইন্টারনেট বিল',
  'ডিস বিল',
  'বকেয়া বিল',
  'নতুন সংযোগ ফি',
  'অন্যান্য আয়'
];

export const EXPENSE_CATEGORIES = [
  'ব্যান্ডউইথ/আপস্ট্রিম বিল',
  'বিদ্যুৎ বিল',
  'অফিস ভাড়া',
  'কর্মচারীদের বেতন',
  'অপটিক্যাল ফাইবার ও কেবল',
  'ONU/OLT/Router ক্রয়',
  'স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ',
  'কেবল মেরামত ও রক্ষণাবেক্ষণ',
  'যাতায়াত ও পরিবহন খরচ',
  'মোবাইল/ইন্টারনেট/যোগাযোগ খরচ',
  'অফিস স্টেশনারি',
  'সফটওয়্যার/সিস্টেম/লাইসেন্স খরচ',
  'বিজ্ঞাপন ও প্রচারণা',
  'ব্যাংক/bKash/Nagad/পেমেন্ট গেটওয়ে চার্জ',
  'UPS/ব্যাটারি/জেনারেটর রক্ষণাবেক্ষণ',
  'উত্তলন',
  'অন্যান্য খরচ'
];

export const STAFF_DESIGNATIONS = [
  'চিফ নেটওয়ার্ক ইঞ্জিনিয়ার',
  'সিনিয়র লাইন টেকনিশিয়ান ও স্প্লাইসার',
  'বিল কালেকশন ও এরিয়া ম্যানেজার',
  'হেল্পডেস্ক ও কাস্টমার সাপোর্ট',
  'আইটি ও সার্ভার অ্যাডমিন',
  'অফিস অ্যাসিস্ট্যান্ট / পিয়ন'
];

export const PAYMENT_METHODS = [
  'নগদ (Cash)',
  'বিকাশ (bKash)',
  'নগদ (Nagad)',
  'রকেট (Rocket)',
  'ব্যাংক ট্রান্সফার',
  'চেক'
];

export const QUICK_TEMPLATES = [
  { label: 'মাসিক ইন্টারনেট বিল', type: 'income' as const, category: 'মাসিক ইন্টারনেট বিল', amount: 25000 },
  { label: 'ডিস বিল কালেকশন', type: 'income' as const, category: 'ডিস বিল', amount: 8000 },
  { label: 'বকেয়া বিল আদায়', type: 'income' as const, category: 'বকেয়া বিল', amount: 3500 },
  { label: 'নতুন সংযোগ ফি', type: 'income' as const, category: 'নতুন সংযোগ ফি', amount: 2000 },
  { label: 'ব্যান্ডউইথ/আপস্ট্রিম বিল', type: 'expense' as const, category: 'ব্যান্ডউইথ/আপস্ট্রিম বিল', amount: 45000 },
  { label: 'বিদ্যুৎ বিল', type: 'expense' as const, category: 'বিদ্যুৎ বিল', amount: 6500 },
  { label: 'অপটিক্যাল ফাইবার ও কেবল', type: 'expense' as const, category: 'অপটিক্যাল ফাইবার ও কেবল', amount: 8500 },
  { label: 'কেবল মেরামত ও রক্ষণাবেক্ষণ', type: 'expense' as const, category: 'কেবল মেরামত ও রক্ষণাবেক্ষণ', amount: 1500 }
];

// Helper to format Bengali numbers / Currency safely
export function formatCurrency(amount?: number | null, symbol = '৳'): string {
  try {
    const num = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);
    const formatted = num.toLocaleString('bn-BD');
    return `${symbol} ${formatted}`;
  } catch {
    const num = Number(amount) || 0;
    return `${symbol} ${num.toLocaleString()}`;
  }
}

export function formatEnglishCurrency(amount?: number | null, symbol = '৳'): string {
  try {
    const num = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);
    return `${symbol} ${num.toLocaleString('en-US')}`;
  } catch {
    const num = Number(amount) || 0;
    return `${symbol} ${num.toLocaleString()}`;
  }
}

export function getMonthBengaliName(monthString?: string): string {
  if (!monthString || typeof monthString !== 'string') return '';
  try {
    const parts = monthString.split('-');
    if (parts.length < 2) return monthString;
    const [year, month] = parts;
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
      'মে', 'জুন', 'জুলাই', 'আগস্ট',
      'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const mIndex = parseInt(month, 10) - 1;
    const name = monthNames[mIndex] || month;
    return `${name} ${year}`;
  } catch {
    return String(monthString);
  }
}
