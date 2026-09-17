'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface QueryConfirmationDetails {
  toolName: string;
  querySummary: string;
  creditCost: number;
  onConfirm: () => void;
  features?: string[];
  icon?: React.ReactNode;
}

interface QueryConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: QueryConfirmationDetails | null;
  currentBalance: number;
  onOpenUpgradeModal?: () => void;
}

const SESSION_STORAGE_SKIP_KEY = 'creator_signal_skip_query_confirmation';

export function isConfirmationSkipped(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_STORAGE_SKIP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function QueryConfirmationModal({
  isOpen,
  onClose,
  details,
  currentBalance,
  onOpenUpgradeModal,
}: QueryConfirmationModalProps) {
  const [rememberSession, setRememberSession] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !details) return null;

  const { toolName, querySummary, creditCost, onConfirm, features } = details;
  const balanceAfter = Math.max(0, currentBalance - creditCost);
  const hasSufficientCredits = currentBalance >= creditCost;

  const handleConfirmAction = () => {
    if (rememberSession) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_SKIP_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    }
    onClose();
    onConfirm();
  };

  const defaultDeliverables = [
    'Real-time YouTube Data API v3 live telemetry',
    'Google Gemini AI psychological packaging & angle analysis',
    '6-Hour Quota Cache (Instant free re-scans on this query)',
  ];

  const deliverables = features && features.length > 0 ? features : defaultDeliverables;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold mb-2">
            <Coins className="w-3.5 h-3.5" />
            <span>Query Cost Confirmation</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Confirm Your Query
          </h2>
          <p className="text-rose-100 text-xs mt-1">
            Review the credit cost and deliverables before submitting this search.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Tool & Query Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Action / Tool
              </span>
              <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                {toolName}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Target Query
              </span>
              <p className="text-xs font-mono font-semibold text-slate-800 break-all bg-white p-2.5 rounded-xl border border-slate-200">
                {querySummary}
              </p>
            </div>
          </div>

          {/* Credit Ledger Math Comparison */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Credit Breakdown</span>
              <span className="text-slate-400 font-normal">Instant Deduction</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Current
                </span>
                <span className="text-lg font-black font-mono text-slate-800">
                  {currentBalance}
                </span>
                <span className="text-[10px] text-slate-500 block">credits</span>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">
                  Cost
                </span>
                <span className="text-lg font-black font-mono text-rose-600">
                  -{creditCost}
                </span>
                <span className="text-[10px] text-rose-500 font-semibold block">credits</span>
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  hasSufficientCredits
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <span
                  className={`text-[10px] uppercase font-bold block mb-1 ${
                    hasSufficientCredits ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  Remaining
                </span>
                <span
                  className={`text-lg font-black font-mono ${
                    hasSufficientCredits ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {hasSufficientCredits ? balanceAfter : 'Short'}
                </span>
                <span className="text-[10px] opacity-75 block">credits</span>
              </div>
            </div>
          </div>

          {/* Insufficient Credits Warning or Deliverables */}
          {!hasSufficientCredits ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Insufficient Credits</p>
                <p className="mt-0.5 text-red-800">
                  You have {currentBalance} credits, but this analysis requires {creditCost} credits.
                  Please upgrade your plan to unlock more daily and monthly credits.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                What you'll receive from this query:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Remember session checkbox */}
          {hasSufficientCredits && (
            <label className="flex items-center gap-2.5 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Don't ask confirmation again for the rest of this session</span>
            </label>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              Cancel
            </button>

            {hasSufficientCredits ? (
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Confirm & Run Query</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenUpgradeModal) onOpenUpgradeModal();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Upgrade Plan for Credits</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
