import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'floating';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled || isDismissed) {
    return null;
  }

  // If not installable and not iOS, don't show header button (browser doesn't support or ambient)
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      install();
    }
  };

  if (variant === 'banner') {
    return (
      <>
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-4 py-2.5 rounded-2xl mb-4 flex items-center justify-between gap-3 shadow-lg border border-indigo-700/50 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-400/30">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-100">
                মোবাইলে অ্যাপের মতো ইন্সটল করুন
              </p>
              <p className="text-[11px] text-slate-300">
                হোম স্ক্রিনে যোগ করে সরাসরি নেটওয়ার্কের আয়-ব্যয় হিসাব রাখুন
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-900/40 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ইন্সটল</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* iOS Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold">iPhone / iPad এ ইন্সটল</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    ১
                  </div>
                  <div>
                    Safari ব্রাউজারের নিচে থাকা <span className="font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Share</span> বাটনে চাপ দিন।
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    ২
                  </div>
                  <div>
                    নিচে স্ক্রল করে <span className="font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</span> অপশনটি বেছে নিন।
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    ৩
                  </div>
                  <div>
                    উপরের ডান কোণায় <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 inline" /> Add</span> বাটনে ট্যাপ করলেই অ্যাপ হোম স্ক্রিনে সেভ হয়ে যাবে।
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
              >
                ঠিক আছে, বুঝতে পেরেছি
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Header Variant (compact pill)
  return (
    <>
      <button
        onClick={handleInstallClick}
        title="অ্যাপ হিসেবে মোবাইলে বা পিসিতে ইন্সটল করুন"
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer animate-pulse"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="whitespace-nowrap">অ্যাপ ইন্সটল</span>
      </button>

      {/* iOS Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold">iPhone / iPad এ ইন্সটল</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ১
                </div>
                <div>
                  Safari ব্রাউজারের নিচে থাকা <span className="font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Share</span> বাটনে চাপ দিন।
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ২
                </div>
                <div>
                  নিচে স্ক্রল করে <span className="font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</span> অপশনটি বেছে নিন।
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ৩
                </div>
                <div>
                  উপরের ডান কোণায় <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 inline" /> Add</span> বাটনে ট্যাপ করলেই অ্যাপ হোম স্ক্রিনে সেভ হয়ে যাবে।
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-2xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              ঠিক আছে, বুঝতে পেরেছি
            </button>
          </div>
        </div>
      )}
    </>
  );
};
