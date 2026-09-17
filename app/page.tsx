'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, UserProfile } from '@/components/Navbar';
import { SerpInjector } from '@/components/SerpInjector';
import { OutlierEngine } from '@/components/OutlierEngine';
import { VphTracker } from '@/components/VphTracker';
import { EvergreenGap } from '@/components/EvergreenGap';
import { AnglePivot } from '@/components/AnglePivot';
import { UniversalSearchBox } from '@/components/UniversalSearchBox';
import { FeatureTabs } from '@/components/FeatureTabs';
import { RazorpayModal } from '@/components/RazorpayModal';
import { AuthModal } from '@/components/AuthModal';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfileView } from '@/components/ProfileView';
import { PlanTier } from '@/lib/credits/deduct';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api-client';

export default function DashboardPage() {
  const [creditBalance, setCreditBalance] = useState(20);
  const [dailyAllowance, setDailyAllowance] = useState(20);
  const [quota, setQuota] = useState(20);
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('universal');
  const [activeView, setActiveView] = useState<'studio' | 'profile'>('studio');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check initial Supabase authentication session
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            email: session.user.email || 'creator@channel.com',
            id: session.user.id,
          });
        }
      } catch (err) {
        console.warn('Session check notice:', err);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuthSession();
  }, []);

  // Fetch initial credits & plan tier when user changes
  useEffect(() => {
    async function loadCredits() {
      if (!user) return;
      try {
        const res = await apiFetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.balance === 'number') {
            setCreditBalance(data.balance);
          }
          if (typeof data.quota === 'number') {
            setQuota(data.quota);
          }
          if (typeof data.dailyAllowance === 'number') {
            setDailyAllowance(data.dailyAllowance);
          }
          if (data.planTier) {
            setPlanTier(data.planTier);
          }
          if (data.currentPeriodEnd) {
            setCurrentPeriodEnd(data.currentPeriodEnd);
          }
        }
      } catch {
        // Fallback starter state
      }

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') === 'upgrade') {
          setIsUpgradeModalOpen(true);
        }
      }
    }
    loadCredits();
  }, [user]);

  const handleCreditDeducted = (newBalance: number) => {
    setCreditBalance(newBalance);
  };

  const handleInsufficientCredits = () => {
    setIsUpgradeModalOpen(true);
  };

  const handleUpgradeSuccess = (newQuota: number, newTier: PlanTier, periodEnd?: string) => {
    setCreditBalance(newQuota);
    setDailyAllowance(newQuota);
    setQuota(newQuota);
    setPlanTier(newTier);
    if (periodEnd) {
      setCurrentPeriodEnd(periodEnd);
    } else {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      setCurrentPeriodEnd(future.toISOString());
    }
  };

  const handleLoginSuccess = (loggedInUser: UserProfile, startingCredits?: number) => {
    setUser(loggedInUser);
    const initialBal = typeof startingCredits === 'number' ? startingCredits : 50;
    setCreditBalance(initialBal);
    setDailyAllowance(20);
    setQuota(initialBal);
    setActiveView('studio');
  };

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('creator_signal_user_id');
    }
    setUser(null);
    setCreditBalance(50);
    setDailyAllowance(20);
    setQuota(50);
    setPlanTier('free');
    setCurrentPeriodEnd(null);
    setActiveView('studio');
  };

  // 1. Initial auth state loading screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-rose-500/20 border-t-rose-600 rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading Creator Signal Studio...</span>
        </div>
      </div>
    );
  }

  // 2. Starting Screen: If not logged in, show Login & Signup Portal
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated User Experience
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-rose-100 selection:text-rose-900">
      {/* Top Navbar */}
      <Navbar
        creditBalance={creditBalance}
        dailyAllowance={dailyAllowance}
        quota={quota}
        planTier={planTier}
        currentPeriodEnd={currentPeriodEnd}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        user={user}
        onSignOut={handleSignOut}
        onOpenProfile={() => setActiveView(activeView === 'profile' ? 'studio' : 'profile')}
      />

      {/* Main View: Profile View vs. Studio Tool Workspace */}
      {activeView === 'profile' ? (
        <main className="flex-1 w-full">
          <ProfileView
            user={user}
            creditBalance={creditBalance}
            dailyAllowance={dailyAllowance}
            quota={quota}
            planTier={planTier}
            currentPeriodEnd={currentPeriodEnd}
            onBackToStudio={() => setActiveView('studio')}
            onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            onSignOut={handleSignOut}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Centered Feature Switcher Dock */}
          <FeatureTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="transition-all">
          {activeTab === 'universal' && (
            <UniversalSearchBox
              creditBalance={creditBalance}
              onCreditDeducted={handleCreditDeducted}
              onInsufficientCredits={handleInsufficientCredits}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}

          {activeTab === 'serp' && (
            <SerpInjector
              creditBalance={creditBalance}
              onCreditDeducted={handleCreditDeducted}
              onInsufficientCredits={handleInsufficientCredits}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}

          {activeTab === 'outlier' && (
            <OutlierEngine
              creditBalance={creditBalance}
              onCreditDeducted={handleCreditDeducted}
              onInsufficientCredits={handleInsufficientCredits}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}

          {activeTab === 'vph' && (
            <VphTracker
              creditBalance={creditBalance}
              planTier={planTier}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
              onCreditDeducted={handleCreditDeducted}
              onInsufficientCredits={handleInsufficientCredits}
            />
          )}

          {activeTab === 'evergreen' && (
            <EvergreenGap
              creditBalance={creditBalance}
              onCreditDeducted={handleCreditDeducted}
              onInsufficientCredits={handleInsufficientCredits}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}

          {activeTab === 'angle' && (
            <AnglePivot
              creditBalance={creditBalance}
              onCreditDeducted={handleCreditDeducted}
              onInsufficientCredits={handleInsufficientCredits}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}
        </div>
      </main>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/60 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-slate-700">
            Creator Signal • Modern YouTube Intelligence Studio
          </span>
          <span className="text-slate-400">
            Quotas: Free (20 daily) • Creator ₹199 (750/mo • 25/day) • Pro ₹299 (1,500/mo • 50/day + Bulk CSV + AI Hooks)
          </span>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 3-Tier Razorpay Subscription Modal */}
      <RazorpayModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={handleUpgradeSuccess}
      />
    </div>
  );
}
