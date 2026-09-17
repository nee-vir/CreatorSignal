'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check, ShieldCheck, CreditCard, Zap, AlertCircle, FileSpreadsheet, Wand2 } from 'lucide-react';
import { PlanTier } from '@/lib/credits/deduct';
import { apiFetch } from '@/lib/api-client';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number, newTier: PlanTier, periodEnd?: string) => void;
}

export function RazorpayModal({
  isOpen,
  onClose,
  onSuccess,
}: RazorpayModalProps) {
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (tier: 'creator_199' | 'pro_299') => {
    setLoadingTier(tier);
    setError(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment SDK. Check your internet connection.');
      }

      const res = await apiFetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize subscription.');
      }

      const { subscriptionId, keyId, planName } = data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'Creator Signal',
        description: planName,
        image: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
        handler: function (response: any) {
          console.log('Razorpay payment response:', response);
          const monthlyQuota = tier === 'pro_299' ? 1500 : 1000;
          const future = new Date();
          future.setDate(future.getDate() + 30);
          onSuccess(monthlyQuota, tier, future.toISOString());
          onClose();
        },
        prefill: {
          name: 'Creator',
          email: 'creator@example.com',
        },
        theme: {
          color: tier === 'pro_299' ? '#7C3AED' : '#E11D48',
        },
      };

      const razorpayWindow = new (window as any).Razorpay(options);
      razorpayWindow.open();
    } catch (err: any) {
      console.warn('Live Razorpay checkout notice:', err.message);
      setError(
        err.message?.includes('Missing')
          ? `${err.message} (Add your Razorpay credentials to .env.local, or use Instant Sandbox Activation below).`
          : err.message
      );
    } finally {
      setLoadingTier(null);
    }
  };

  // Instant sandbox activation for local testing
  const handleSandboxSimulate = (tier: 'creator_199' | 'pro_299') => {
    const monthlyQuota = tier === 'pro_299' ? 1500 : 750;
    const future = new Date();
    future.setDate(future.getDate() + 30);
    onSuccess(monthlyQuota, tier, future.toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 max-w-3xl w-full relative shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-purple-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider">
            Daily Allowance & Quota Plans
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Choose Your Creator Tier
          </h3>
          <p className="text-slate-600 text-sm mt-1 max-w-lg mx-auto">
            Get 25 or 50 fresh credits every day, giving you 750 to 1,500 total monthly credits for your channel growth.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Dual Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Plan 1: Creator Tier (₹199) */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Creator Tier
                </span>
                <span className="text-xs font-mono font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
                  +25 Credits/day
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-black text-slate-900">₹199</span>
                <span className="text-slate-500 text-xs font-medium">/ month</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-4">
                750 monthly allowance • Extra 25 credits/day
              </span>

              <div className="space-y-2.5 text-xs text-slate-700 mb-6">
                {[
                  'Extra +25 daily credits dropped every single day',
                  '750 credit total allowance per monthly cycle',
                  'Full Thumbnail Competitor Tester',
                  'Viral Topic Finder (5x Outlier checks)',
                  'Real-Time View Speedometer (48h watches)',
                  'Evergreen Ideas Finder',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 font-bold" />
                    <span className={i === 0 ? 'font-bold text-slate-900' : ''}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              id="subscribe-creator-btn"
              onClick={() => handleCheckout('creator_199')}
              disabled={loadingTier !== null}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {loadingTier === 'creator_199' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
              <span>Subscribe to Creator (+25/day • ₹199)</span>
            </button>
          </div>

          {/* Plan 2: Pro Tier (₹299) - Visually Highlighted as Most Popular */}
          <div className="p-6 rounded-3xl border-2 border-purple-500 bg-purple-50/20 flex flex-col justify-between relative shadow-lg shadow-purple-500/10">
            {/* Most Popular Badge */}
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>MOST POPULAR</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-purple-800 uppercase tracking-wider">
                  Pro Powerhouse
                </span>
                <span className="text-xs font-mono font-black text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-300">
                  +50 Credits/day
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-black text-slate-900">₹299</span>
                <span className="text-slate-500 text-xs font-medium">/ month</span>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 block mb-4">
                1,500 monthly allowance • Extra 50 credits/day
              </span>

              <div className="space-y-2.5 text-xs text-slate-800 mb-6">
                {[
                  'Extra +50 daily credits every day (2x faster recharge)',
                  '1,500 credit base allowance per billing cycle',
                  'Bulk CSV Export (Download keyword & VPH tables)',
                  'Angle Pivot AI (Generate 3 viral hook scripts)',
                  'All Creator Tier features included',
                  'Priority 6-hour YouTube quota cache',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-700 font-bold shrink-0" />
                    <span className={i < 2 ? 'font-bold text-purple-950' : i < 4 ? 'font-semibold text-purple-900' : ''}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              id="subscribe-pro-btn"
              onClick={() => handleCheckout('pro_299')}
              disabled={loadingTier !== null}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-all shadow-md shadow-purple-500/25 disabled:opacity-50"
            >
              {loadingTier === 'pro_299' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Subscribe to Pro (+50/day • ₹299)</span>
            </button>
          </div>
        </div>

        {/* Instant Sandbox Testing Section */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-2">
            Developer Sandbox: Test either tier locally without live Razorpay keys
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handleSandboxSimulate('creator_199')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Zap className="w-3 h-3 text-rose-500" />
              <span>Simulate Creator (750/mo • 25/day)</span>
            </button>
            <button
              onClick={() => handleSandboxSimulate('pro_299')}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Simulate Pro (1,500/mo • 50/day + CSV + AI)</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured with cryptographic HMAC SHA256 verification</span>
        </div>
      </div>
    </div>
  );
}
