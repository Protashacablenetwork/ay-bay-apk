import React, { useState } from 'react';
import { Staff, SalaryPayment, SheetConfig } from '../types';
import { STAFF_DESIGNATIONS, PAYMENT_METHODS, formatCurrency, getMonthBengaliName } from '../data/categories';
import { ConfirmModal } from './ConfirmModal';
import {
  Users,
  Plus,
  DollarSign,
  CheckCircle2,
  Clock,
  Printer,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  Phone,
  Briefcase,
  AlertCircle,
  X,
  CreditCard,
  ArrowLeft
} from 'lucide-react';

interface StaffSalaryManagerProps {
  staffList: Staff[];
  salaries: SalaryPayment[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onAddStaff: (data: Omit<Staff, 'id' | 'createdAt'>) => Promise<boolean>;
  onUpdateStaff: (id: string, data: Partial<Staff>) => Promise<boolean>;
  onDeleteStaff: (id: string) => Promise<boolean>;
  onDisburseSalary: (data: {
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
  }) => Promise<boolean>;
  onDeleteSalary: (id: string) => Promise<boolean>;
  onViewSalarySlip: (salary: SalaryPayment) => void;
  config: SheetConfig;
  onBackToDashboard?: () => void;
  isAdminLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

export const StaffSalaryManager: React.FC<StaffSalaryManagerProps> = ({
  staffList,
  salaries,
  selectedMonth,
  onMonthChange,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onDisburseSalary,
  onDeleteSalary,
  onViewSalarySlip,
  config,
  onBackToDashboard,
  isAdminLoggedIn = false,
  onRequireLogin
}) => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'directory'>('payroll');
  const [payrollFilter, setPayrollFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<Staff | null>(null);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Staff Form Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    designation: STAFF_DESIGNATIONS[0],
    phone: '',
    joinDate: new Date().toISOString().split('T')[0],
    baseSalary: '' as number | '',
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  // Salary Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedStaffForPay, setSelectedStaffForPay] = useState<Staff | null>(null);
  const [payFormData, setPayFormData] = useState({
    baseSalary: '' as string | number,
    bonusOrAllowance: '' as string | number,
    deductionOrAdvance: '' as string | number,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'নগদ (Cash)',
    voucherNumber: '',
    note: ''
  });

  // Filter salaries for selected month
  const currentMonthSalaries = salaries.filter(s => s.month === selectedMonth);

  // Map salary records by staffId for fast lookup
  const salaryMap = new Map<string, SalaryPayment>();
  currentMonthSalaries.forEach(s => salaryMap.set(s.staffId, s));

  // Compute live payroll summary
  const activeStaff = staffList.filter(s => s.status === 'active');
  const totalBasePay = activeStaff.reduce((acc, s) => acc + s.baseSalary, 0);

  let paidTotal = 0;
  let paidCount = 0;
  let pendingCount = 0;

  activeStaff.forEach(stf => {
    const sal = salaryMap.get(stf.id);
    if (sal && sal.paymentStatus === 'paid') {
      paidTotal += sal.netSalary;
      paidCount++;
    } else {
      pendingCount++;
    }
  });

  const pendingTotal = activeStaff.reduce((acc, stf) => {
    const sal = salaryMap.get(stf.id);
    if (sal && sal.paymentStatus === 'paid') return acc;
    if (sal) return acc + sal.netSalary;
    return acc + stf.baseSalary;
  }, 0);

  // Open add staff
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffFormData({
      name: '',
      designation: STAFF_DESIGNATIONS[0],
      phone: '',
      joinDate: new Date().toISOString().split('T')[0],
      baseSalary: '',
      status: 'active',
      notes: ''
    });
    setIsStaffModalOpen(true);
  };

  // Open edit staff
  const handleOpenEditStaff = (stf: Staff) => {
    setEditingStaff(stf);
    setStaffFormData({
      name: stf.name,
      designation: stf.designation,
      phone: stf.phone,
      joinDate: stf.joinDate,
      baseSalary: stf.baseSalary,
      status: stf.status,
      notes: stf.notes || ''
    });
    setIsStaffModalOpen(true);
  };

  // Submit staff
  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.name.trim() || !staffFormData.phone.trim()) {
      alert('অনুগ্রহ করে নাম এবং মোবাইল নম্বর দিন');
      return;
    }

    const payload = {
      ...staffFormData,
      baseSalary: Number(staffFormData.baseSalary) || 0
    };

    if (editingStaff) {
      await onUpdateStaff(editingStaff.id, payload);
    } else {
      await onAddStaff(payload);
    }
    setIsStaffModalOpen(false);
  };

  // Open Pay Salary Modal
  const handleOpenPayModal = (staff: Staff) => {
    const existing = salaryMap.get(staff.id);
    setSelectedStaffForPay(staff);
    setPayFormData({
      baseSalary: existing ? existing.baseSalary : (staff.baseSalary || ''),
      bonusOrAllowance: existing && existing.bonusOrAllowance ? existing.bonusOrAllowance : '',
      deductionOrAdvance: existing && existing.deductionOrAdvance ? existing.deductionOrAdvance : '',
      paymentDate: existing?.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: existing?.paymentMethod || 'নগদ (Cash)',
      voucherNumber: existing?.voucherNumber || `VCH-SAL-${Date.now().toString().slice(-4)}`,
      note: existing?.note || `${getMonthBengaliName(selectedMonth)} মাসের বেতন`
    });
    setIsPayModalOpen(true);
  };

  // Submit Pay Salary
  const handlePaySalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPay) return;

    const success = await onDisburseSalary({
      staffId: selectedStaffForPay.id,
      month: selectedMonth,
      baseSalary: Number(payFormData.baseSalary),
      bonusOrAllowance: Number(payFormData.bonusOrAllowance),
      deductionOrAdvance: Number(payFormData.deductionOrAdvance),
      paymentStatus: 'paid',
      paymentDate: payFormData.paymentDate,
      paymentMethod: payFormData.paymentMethod,
      voucherNumber: payFormData.voucherNumber,
      note: payFormData.note
    });

    if (success) {
      setIsPayModalOpen(false);
    }
  };

  // Quick Mark as Pending / Revert
  const handleMarkPending = async (staff: Staff) => {
    const existing = salaryMap.get(staff.id);
    if (!existing) return;
    setConfirmState({
      isOpen: true,
      title: 'বেতন বকেয়া চিহ্নিতকরণ',
      message: `আপনি কি ${staff.name} এর বেতন বকেয়া হিসেবে চিহ্নিত করতে চান? (কোম্পানি খরচের খতিয়ান থেকে লেনদেন মুছে যাবে)`,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        await onDeleteSalary(existing.id);
      }
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card with Month Selector and Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                স্টাফ ও কর্মচারীদের বেতন হিসাব (Payroll)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ইন্টারনেট কোম্পানির ইঞ্জিনিয়ার, টেকনিশিয়ান ও কর্মচারীদের মাসিক বেতন ও পে-স্লিপ
              </p>
            </div>
          </div>

          {/* Month Selector & Add Staff Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>বেতন মাস:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => onMonthChange(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-slate-100 border-none outline-hidden cursor-pointer"
              />
            </div>

            <button
              onClick={handleOpenAddStaff}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কর্মী যোগ</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            💼 মাসিক পে-রোল ও বেতন শিট ({getMonthBengaliName(selectedMonth)})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            👥 কর্মচারীদের তালিকা ({staffList.length} জন)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for Selected Month - CLICKABLE AS REQUESTED */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Total Active Staff */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('directory');
            setPayrollFilter('all');
          }}
          className={`text-left p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-md active:scale-98 cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              মোট কর্মী
            </span>
            <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {activeStaff.length} জন
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 block">
            তালিকা দেখতে ক্লিক করুন →
          </span>
        </button>

        {/* Card 2: Total Base Budget */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('payroll');
            setPayrollFilter('all');
          }}
          className={`text-left p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-md active:scale-98 cursor-pointer ${
            activeTab === 'payroll' && payrollFilter === 'all'
              ? 'bg-slate-100/90 dark:bg-slate-800 border-slate-400 dark:border-slate-600 ring-2 ring-slate-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              নির্ধারিত মূল বেতন
            </span>
            <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {formatCurrency(totalBasePay, config.currencySymbol)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
            সব কর্মী দেখুন ({activeStaff.length} জন) →
          </span>
        </button>

        {/* Card 3: Paid Salary */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('payroll');
            setPayrollFilter('paid');
          }}
          className={`text-left p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-md active:scale-98 cursor-pointer ${
            activeTab === 'payroll' && payrollFilter === 'paid'
              ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/30'
              : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
              পরিশোধিত বেতন
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
            {formatCurrency(paidTotal, config.currencySymbol)}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 block">
            {paidCount} জন পরিশোধিত (ফিল্টার) →
          </span>
        </button>

        {/* Card 4: Pending Salary */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('payroll');
            setPayrollFilter('pending');
          }}
          className={`text-left p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-md active:scale-98 cursor-pointer ${
            activeTab === 'payroll' && payrollFilter === 'pending'
              ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/30'
              : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
              বকেয়া বেতন
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
            {formatCurrency(pendingTotal, config.currencySymbol)}
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5 block">
            {pendingCount} জন বকেয়া (ফিল্টার) →
          </span>
        </button>
      </div>

      {/* TAB 1: MONTHLY PAYROLL SHEET */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {getMonthBengaliName(selectedMonth)} মাসের বেতন হিসাব খতিয়ান
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                বেতন পরিশোধ করলে স্বয়ংক্রিয়ভাবে কোম্পানির খরচের খতিয়ান ও গুগল শিটে রেকর্ড যোগ হয়
              </p>
            </div>
            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setPayrollFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  payrollFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সব কর্মী ({activeStaff.length})
              </button>
              <button
                onClick={() => setPayrollFilter('paid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  payrollFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>পরিশোধিত ({paidCount})</span>
              </button>
              <button
                onClick={() => setPayrollFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  payrollFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>বকেয়া ({pendingCount})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">কর্মীর নাম ও পদবি</th>
                  <th className="px-3 py-3">মূল বেতন</th>
                  <th className="px-3 py-3">ভাতা/ওভারটাইম (+)</th>
                  <th className="px-3 py-3">অগ্রিম/কর্তন (-)</th>
                  <th className="px-3 py-3 font-extrabold text-slate-800">মোট নিট প্রদেয়</th>
                  <th className="px-3 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStaff.filter(staff => {
                  const sal = salaryMap.get(staff.id);
                  const isPaid = sal && sal.paymentStatus === 'paid';
                  if (payrollFilter === 'paid') return isPaid;
                  if (payrollFilter === 'pending') return !isPaid;
                  return true;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {payrollFilter === 'paid'
                        ? 'এই মাসে এখনো কোনো কর্মীর বেতন পরিশোধ করা হয়নি'
                        : payrollFilter === 'pending'
                        ? 'কোনো কর্মীর বেতন বকেয়া নেই (সবাই পরিশোধিত)'
                        : 'কোনো সক্রিয় কর্মচারী পাওয়া যায়নি। উপরে "নতুন কর্মী যোগ" বাটনে ক্লিক করুন।'}
                    </td>
                  </tr>
                ) : (
                  activeStaff.filter(staff => {
                    const sal = salaryMap.get(staff.id);
                    const isPaid = sal && sal.paymentStatus === 'paid';
                    if (payrollFilter === 'paid') return isPaid;
                    if (payrollFilter === 'pending') return !isPaid;
                    return true;
                  }).map(staff => {
                    const sal = salaryMap.get(staff.id);
                    const isPaid = sal && sal.paymentStatus === 'paid';
                    const base = sal ? sal.baseSalary : staff.baseSalary;
                    const bonus = sal ? sal.bonusOrAllowance : 0;
                    const deduction = sal ? sal.deductionOrAdvance : 0;
                    const net = sal ? sal.netSalary : base;

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 text-sm">{staff.name}</div>
                          <div className="text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                              {staff.designation}
                            </span>
                            <span className="text-[10px]">{staff.phone}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 font-semibold text-slate-800">
                          {formatCurrency(base, config.currencySymbol)}
                        </td>

                        <td className="px-3 py-3.5 text-emerald-600 font-medium">
                          {bonus > 0 ? `+${formatCurrency(bonus, config.currencySymbol)}` : '—'}
                        </td>

                        <td className="px-3 py-3.5 text-rose-600 font-medium">
                          {deduction > 0 ? `-${formatCurrency(deduction, config.currencySymbol)}` : '—'}
                        </td>

                        <td className="px-3 py-3.5 font-black text-sm text-slate-900">
                          {formatCurrency(net, config.currencySymbol)}
                        </td>

                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>পরিশোধিত</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>বকেয়া</span>
                              </>
                            )}
                          </span>
                          {isPaid && sal?.paymentDate && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {sal.paymentDate} • {sal.paymentMethod || 'নগদ'}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {isPaid ? (
                              <>
                                <button
                                  onClick={() => onViewSalarySlip(sal!)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
                                  title="বেতন স্লিপ প্রিন্ট করুন"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>রসিদ</span>
                                </button>
                                <button
                                  onClick={() => handleMarkPending(staff)}
                                  className="px-2 py-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="রোলব্যাক / বাতিল করুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleOpenPayModal(staff)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>বেতন প্রদান</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ইন্টারনেট কোম্পানির সকল কর্মচারীদের ডাটাবেজ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                নেটওয়ার্ক ইঞ্জিনিয়ার, লাইন টেকনিশিয়ান ও বিল কালেকশন কর্মীদের তালিকা
              </p>
            </div>
            <button
              onClick={handleOpenAddStaff}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কর্মী যোগ</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {staffList.map(staff => {
              const currentSal = salaryMap.get(staff.id);
              const isPaid = currentSal && currentSal.paymentStatus === 'paid';
              return (
                <div
                  key={staff.id}
                  onClick={() => setSelectedStaffDetail(staff)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all bg-slate-50/50 flex flex-col justify-between gap-3 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{staff.name}</h4>
                          <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">বিস্তারিত তথ্য →</span>
                        </div>
                        <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                          {staff.designation}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {staff.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px]">মোবাইল নম্বর:</span>
                        <span className="font-semibold text-slate-800">{staff.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">মূল মাসিক বেতন:</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(staff.baseSalary, config.currencySymbol)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">যোগদানের তারিখ:</span>
                        <span>{staff.joinDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">চলতি মাস ({getMonthBengaliName(selectedMonth)}):</span>
                        <span className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isPaid ? '✓ পরিশোধিত' : '⏳ বকেয়া'}
                        </span>
                      </div>
                      {staff.notes && (
                        <div className="col-span-2 text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100 mt-1">
                          {staff.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedStaffDetail(staff)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <span>বিস্তারিত তথ্য দেখুন</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditStaff(staff)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>এডিট</span>
                      </button>
                      <button
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: 'স্টাফ মুছে ফেলার নিশ্চিতকরণ',
                            message: `আপনি কি নিশ্চিতভাবে ${staff.name} কে মুছে ফেলতে চান?`,
                            onConfirm: async () => {
                              setConfirmState(prev => ({ ...prev, isOpen: false }));
                              await onDeleteStaff(staff.id);
                            }
                          });
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT STAFF MODAL */}
      {isStaffModalOpen && (
        <div 
          onClick={() => setIsStaffModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full my-auto overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">
                {editingStaff ? 'কর্মীর তথ্য এডিট করুন' : 'নতুন কর্মচারী যোগ করুন'}
              </h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStaffFormSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">কর্মীর নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: তানভীর আহমেদ"
                  value={staffFormData.name}
                  onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">পদবি (Designation) *</label>
                <select
                  value={staffFormData.designation}
                  onChange={e => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {STAFF_DESIGNATIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    placeholder="017XX-XXXXXX"
                    value={staffFormData.phone}
                    onChange={e => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">মূল মাসিক বেতন (৳) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    placeholder="যেমন: ১৫০০০"
                    value={staffFormData.baseSalary === 0 ? '' : staffFormData.baseSalary}
                    onChange={e => setStaffFormData({ ...staffFormData, baseSalary: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">যোগদানের তারিখ</label>
                  <input
                    type="date"
                    value={staffFormData.joinDate}
                    onChange={e => setStaffFormData({ ...staffFormData, joinDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">কর্মীর অবস্থা</label>
                  <select
                    value={staffFormData.status}
                    onChange={e => setStaffFormData({ ...staffFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">কাজের বিবরণ / নোট (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  placeholder="যেমন: লাইন মেইনটেন্যান্স ও স্প্লাইসিং এর দায়িত্বে"
                  value={staffFormData.notes}
                  onChange={e => setStaffFormData({ ...staffFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  {editingStaff ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISBURSE SALARY PAYMENT MODAL */}
      {isPayModalOpen && selectedStaffForPay && (
        <div 
          onClick={() => setIsPayModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md sm:max-w-lg w-full my-auto max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-100 uppercase font-semibold tracking-wider">
                    বেতন পরিশোধ ফরম
                  </span>
                  <h3 className="font-bold text-lg text-white mt-0.5">
                    {selectedStaffForPay.name}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {selectedStaffForPay.designation} • {getMonthBengaliName(selectedMonth)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handlePaySalarySubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-600">মূল বেতন (Base Salary):</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={payFormData.baseSalary}
                    onChange={e => setPayFormData({ ...payFormData, baseSalary: e.target.value })}
                    className="w-32 text-right font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span className="font-medium">(+) ভাতা / বোনাস / ওভারটাইম:</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={payFormData.bonusOrAllowance}
                    onChange={e => setPayFormData({ ...payFormData, bonusOrAllowance: e.target.value })}
                    className="w-32 text-right font-bold px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-center text-rose-700">
                  <span className="font-medium">(-) অগ্রিম / অনুপস্থিতি কর্তন:</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={payFormData.deductionOrAdvance}
                    onChange={e => setPayFormData({ ...payFormData, deductionOrAdvance: e.target.value })}
                    className="w-32 text-right font-bold px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="0"
                  />
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-black text-sm text-slate-900">
                  <span>সর্বমোট প্রদেয় নিট বেতন:</span>
                  <span className="text-emerald-700 text-base">
                    {formatCurrency(
                      Math.max(
                        0,
                        (Number(payFormData.baseSalary) || 0) +
                          (Number(payFormData.bonusOrAllowance) || 0) -
                          (Number(payFormData.deductionOrAdvance) || 0)
                      ),
                      config.currencySymbol
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">পরিশোধের তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={payFormData.paymentDate}
                    onChange={e => setPayFormData({ ...payFormData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">পরিশোধের মাধ্যম *</label>
                  <select
                    value={payFormData.paymentMethod}
                    onChange={e => setPayFormData({ ...payFormData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ভাউচার নম্বর</label>
                <input
                  type="text"
                  placeholder="VCH-SAL-0901"
                  value={payFormData.voucherNumber}
                  onChange={e => setPayFormData({ ...payFormData, voucherNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">মন্তব্য (নোট)</label>
                <input
                  type="text"
                  placeholder="যেমন: সেপ্টেম্বর মাসের বেতন ও নাইট শিফট ভাতা"
                  value={payFormData.note}
                  onChange={e => setPayFormData({ ...payFormData, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  বেতন পরিশোধ বাটন চাপলে এটি সরাসরি কোম্পানির খরচের খতিয়ানে <strong>'স্টাফ বেতন ও টেকনিশিয়ান ভাতা'</strong> ক্যাটাগরিতে স্বয়ংক্রিয়ভাবে যুক্ত হবে।
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>বেতন নিশ্চিত ও পরিশোধ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STAFF DETAIL & HISTORY MODAL (when staff card is clicked) */}
      {selectedStaffDetail && (
        <div 
          onClick={() => setSelectedStaffDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] my-auto flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-xl text-white">
                  {selectedStaffDetail.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">{selectedStaffDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                      {selectedStaffDetail.designation}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStaffDetail.status === 'active' ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-300 text-slate-800'
                    }`}>
                      {selectedStaffDetail.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">মোবাইল নম্বর:</span>
                  <a href={`tel:${selectedStaffDetail.phone}`} className="font-bold text-indigo-600 hover:underline text-sm">
                    {selectedStaffDetail.phone}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">মূল মাসিক বেতন:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {formatCurrency(selectedStaffDetail.baseSalary, config.currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">যোগদানের তারিখ:</span>
                  <span className="font-semibold text-slate-700">{selectedStaffDetail.joinDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">চলতি মাস ({getMonthBengaliName(selectedMonth)}):</span>
                  {(() => {
                    const currentSal = salaryMap.get(selectedStaffDetail.id);
                    const isPaid = currentSal && currentSal.paymentStatus === 'paid';
                    return (
                      <span className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isPaid ? '✓ পরিশোধিত' : '⏳ বকেয়া'}
                      </span>
                    );
                  })()}
                </div>
                {selectedStaffDetail.notes && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px]">মন্তব্য / ঠিকানা:</span>
                    <span className="text-slate-700">{selectedStaffDetail.notes}</span>
                  </div>
                )}
              </div>

              {/* Salary Payment History */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  <span>বেতন প্রদানের ইতিহাস ({salaries.filter(s => s.staffId === selectedStaffDetail.id).length} টি রেকর্ড)</span>
                </h4>
                
                {salaries.filter(s => s.staffId === selectedStaffDetail.id).length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-400">
                    এখনও কোনো বেতন প্রদানের রেকর্ড পাওয়া যায়নি।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {salaries
                      .filter(s => s.staffId === selectedStaffDetail.id)
                      .map(sal => (
                        <div key={sal.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{getMonthBengaliName(sal.month)}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {sal.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বকেয়া'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              তারিখ: {sal.paymentDate || '—'} • মাধ্যম: {sal.paymentMethod || 'নগদ'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              {formatCurrency(sal.netSalary, config.currencySymbol)}
                            </span>
                            {sal.paymentStatus === 'paid' && (
                              <button
                                onClick={() => {
                                  setSelectedStaffDetail(null);
                                  onViewSalarySlip(sal);
                                }}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                                title="বেতন স্লিপ দেখুন"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const stf = selectedStaffDetail;
                    setSelectedStaffDetail(null);
                    handleOpenEditStaff(stf);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>এডিট</span>
                </button>
                <button
                  onClick={() => {
                    const stf = selectedStaffDetail;
                    setConfirmState({
                      isOpen: true,
                      title: 'স্টাফ মুছে ফেলার নিশ্চিতকরণ',
                      message: `আপনি কি নিশ্চিতভাবে ${stf.name} কে মুছে ফেলতে চান?`,
                      onConfirm: async () => {
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        setSelectedStaffDetail(null);
                        await onDeleteStaff(stf.id);
                      }
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>মুছুন</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const stf = selectedStaffDetail;
                    setSelectedStaffDetail(null);
                    handleOpenPayModal(stf);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>বেতন প্রদান করুন</span>
                </button>
                <button
                  onClick={() => setSelectedStaffDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="হ্যাঁ, নিশ্চিত"
        cancelText="বাতিল"
        type="danger"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
