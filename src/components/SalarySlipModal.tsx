import React from 'react';
import { SalaryPayment, SheetConfig } from '../types';
import { formatCurrency, formatEnglishCurrency, getMonthBengaliName } from '../data/categories';
import { Printer, X, CheckCircle2, Building2, User, Calendar, CreditCard, FileText, ArrowLeft } from 'lucide-react';

interface SalarySlipModalProps {
  salary: SalaryPayment | null;
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  salary,
  isOpen,
  onClose,
  config
}) => {
  if (!isOpen || !salary) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 no-print">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="truncate">বেতন স্লিপ / ভাউচার</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 print:p-0 print:bg-white print:text-slate-900 max-h-[75vh] overflow-y-auto">
          {/* Company Header */}
          <div className="text-center pb-5 border-b-2 border-slate-800 dark:border-slate-700 print:border-slate-800">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print:text-slate-900 tracking-tight">
              {config.companyName || 'আয়-ব্যয়'}
            </h2>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 print:text-slate-700 mt-1 space-y-0.5">
              <p>ইন্টারনেট সার্ভিস প্রোভাইডার</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-slate-900">মাসিক বেতন ও পারিশ্রমিক ভাউচার</p>
            </div>
            <div className="inline-block mt-2.5 px-3 py-0.5 bg-slate-100 dark:bg-slate-800 print:bg-slate-100 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800 border border-slate-300 dark:border-slate-700 print:border-slate-300">
              বেতন মাস: {getMonthBengaliName(salary.month)}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 py-4 text-xs border-b border-slate-200">
            <div>
              <span className="text-slate-500 block">কর্মীর নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{salary.staffName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">পদবি:</span>
              <span className="font-semibold text-slate-800">{salary.staffDesignation}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ভাউচার নম্বর:</span>
              <span className="font-mono font-medium text-slate-700">{salary.voucherNumber || 'VCH-N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">পরিশোধের তারিখ:</span>
              <span className="font-medium text-slate-700">{salary.paymentDate || 'বকেয়া'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">পরিশোধের মাধ্যম:</span>
              <span className="font-medium text-slate-700">{salary.paymentMethod || 'নগদ'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">স্ট্যাটাস:</span>
              <span className={`inline-flex items-center gap-1 font-bold ${
                salary.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {salary.paymentStatus === 'paid' ? '✓ পরিশোধিত (PAID)' : '⏳ বকেয়া (PENDING)'}
              </span>
            </div>
          </div>

          {/* Salary Breakdown Table */}
          <div className="py-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              বেতনের বিস্তারিত হিসাব বিবরণী
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <td className="px-3.5 py-2.5 text-slate-600 font-medium">মূল বেতন (Basic Salary)</td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(salary.baseSalary, config.currencySymbol)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3.5 py-2.5 text-emerald-700 font-medium">
                      (+) ওভারটাইম / নাইট শিফট / বোনাস ভাতা
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold text-emerald-700">
                      +{formatCurrency(salary.bonusOrAllowance, config.currencySymbol)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3.5 py-2.5 text-rose-600 font-medium">
                      (-) কর্তন / অগ্রিম বাবদ বাদ
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold text-rose-600">
                      -{formatCurrency(salary.deductionOrAdvance, config.currencySymbol)}
                    </td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-extrabold text-sm">
                    <td className="px-3.5 py-3">সর্বমোট প্রদেয় নীট বেতন (Net Payable)</td>
                    <td className="px-3.5 py-3 text-right text-emerald-300">
                      {formatCurrency(salary.netSalary, config.currencySymbol)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-right italic">
              কথায়: {formatEnglishCurrency(salary.netSalary)} টাকা মাত্র
            </p>
          </div>

          {/* Notes */}
          {salary.note && (
            <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 mb-6 border border-slate-200">
              <span className="font-semibold text-slate-700">মন্তব্য: </span>
              {salary.note}
            </div>
          )}

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-dashed border-slate-300 text-center text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-400 w-32 mx-auto pt-1"></div>
              <span>কর্মচারীর স্বাক্ষর</span>
            </div>
            <div>
              <div className="border-t border-slate-400 w-32 mx-auto pt-1"></div>
              <span>কর্তৃপক্ষের স্বাক্ষর ও সিল</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end items-center no-print">
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট ভাউচার</span>
          </button>
        </div>
      </div>
    </div>
  );
};
