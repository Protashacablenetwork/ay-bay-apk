import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-amber-500/95 text-white px-4 py-2 text-xs font-bold shadow-xl backdrop-blur-xs animate-in slide-in-from-top-4 duration-300 no-print border border-amber-400">
      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
      <WifiOff className="w-4 h-4" />
      <span>ইন্টারনেট সংযোগ নেই — ক্যাশড ডাটা প্রদর্শিত হচ্ছে</span>
    </div>
  );
};
