import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              কিছু একটা ভুল হয়েছে
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              অ্যাপ্লিকেশনের কোনো অপশন লোড করতে সাময়িক সমস্যা হয়েছে। ড্যাশবোর্ডে ফিরে যান বা পেজটি রিফ্রেশ করুন।
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>আবার চেষ্টা করুন</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Home className="w-4 h-4" />
                <span>ড্যাশবোর্ডে যান</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
