'use client';

import React from 'react';
import {
  Radio,
  Zap,
  Sparkles,
  Layers,
  Flame,
  Activity,
  Compass,
  User,
  LogOut,
  Wand2,
  Search,
} from 'lucide-react';
import { PlanTier } from '@/lib/credits/deduct';

export interface UserProfile {
  email: string;
  id: string;
}

interface NavbarProps {
  creditBalance: number;
  dailyAllowance: number;
  quota?: number;
  planTier: PlanTier;
  currentPeriodEnd?: string | null;
  onOpenUpgradeModal: () => void;
  onOpenAuthModal: () => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onOpenProfile: () => void;
}

function formatBillingCycleDate(dateStr?: string | null): string {
  if (!dateStr) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'next billing date';
  }
}

export function Navbar({
  creditBalance,
  dailyAllowance,
  quota,
  planTier,
  currentPeriodEnd,
  onOpenUpgradeModal,
  onOpenAuthModal,
  user,
  onSignOut,
  onOpenProfile,
}: NavbarProps) {
  const isPro = planTier === 'pro_299';
  const isCreator = planTier === 'creator_199';
  const isPaid = isPro || isCreator;
  const currentQuota = quota || (isPro ? 1500 : isCreator ? 750 : 20);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-md shadow-rose-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                CREATOR <span className="gradient-text-red">SIGNAL</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase text-slate-500 font-semibold block -mt-1">
                YouTube Growth Studio
              </span>
            </div>
          </div>

          {/* Right Actions: Plan Badge, Credit Pill, Upgrade Button, and Log In on ONE line */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap">
            {/* Active Plan Badge */}
            <span
              id="plan-tier-badge"
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border hidden md:inline-flex items-center gap-1 shrink-0 ${
                isPro
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : isCreator
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isPro ? '★ PRO' : isCreator ? 'CREATOR' : 'FREE'}
            </span>

            {/* Credit Quota Display Pill */}
            <div
              id="credit-balance-pill"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold shrink-0 whitespace-nowrap ${
                isPaid
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
              title={
                isPaid
                  ? `Monthly Quota: ${creditBalance} / ${currentQuota} Credits. Refills automatically on ${formatBillingCycleDate(currentPeriodEnd)}.`
                  : `Daily Quota: ${creditBalance} / 20 Credits. Resets nightly at midnight IST.`
              }
            >
              <Zap
                className={`w-3.5 h-3.5 ${
                  isPaid ? 'text-purple-600 fill-purple-600' : 'text-emerald-600 fill-emerald-600'
                }`}
              />
              <span
                id="current-credit-count"
                className={`font-mono text-xs font-bold ${
                  creditBalance < 10 ? 'text-rose-600 animate-pulse' : isPaid ? 'text-purple-950' : 'text-emerald-800'
                }`}
              >
                {creditBalance} / {currentQuota} Credits
              </span>
              <span
                id="credit-refill-note"
                className={`text-[11px] font-medium hidden sm:inline ${
                  isPaid ? 'text-purple-700' : 'text-emerald-600'
                }`}
              >
                {isPaid
                  ? `(Refills on ${formatBillingCycleDate(currentPeriodEnd)})`
                  : '(Resets tonight)'}
              </span>
            </div>

            {/* Upgrade CTA */}
            {!isPro && (
              <button
                id="upgrade-button"
                onClick={onOpenUpgradeModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 shadow-xs transition-all hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade</span>
              </button>
            )}

            {/* User Profile / Login Button (Clean, Non-wrapping, High-contrast) */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
                <button
                  id="navbar-profile-btn"
                  onClick={onOpenProfile}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  title={`Logged in as ${user.email} - Click to view Profile & Settings`}
                >
                  {user.email.charAt(0).toUpperCase()}
                </button>
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="open-login-btn"
                onClick={onOpenAuthModal}
                className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5 text-slate-300" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
