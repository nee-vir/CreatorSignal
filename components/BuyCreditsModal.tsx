'use client';

import React, { useState } from 'react';
import { X, Sparkles, Zap, Check, ShieldCheck, Coins, AlertCircle, RefreshCw, Rocket } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { CREDIT_PACKS, CreditPack } from '@/app/api/payments/create-order/route';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number, addedCredits: number) => void;
  currentBalance?: number;
}

export function BuyCreditsModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
}: BuyCreditsModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('creator_300');
  const [loading, setLoading] = useState(false);
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

  const handleBuyCredits = async (packId: string, sandboxBypass = false) => {
    setLoading(true);
    setError(null);

    try {
      if (sandboxBypass) {
        // Direct sandbox instant activation
        const verifyRes = await apiFetch('/api/payments/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId,
            isSandbox: true,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Failed to apply sandbox credits.');
        }

        onSuccess(verifyData.newBalance, verifyData.addedCredits);
        onClose();
        return;
      }

      // 1. Create order on backend
      const res = await apiFetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize order.');
      }

      // If test sandbox returned
      if (data.isSandbox) {
        const verifyRes = await apiFetch('/api/payments/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId,
            isSandbox: true,
          }),
        });
        const verifyData = await verifyRes.json();
        onSuccess(verifyData.newBalance, verifyData.addedCredits);
        onClose();
        return;
      }

      // 2. Open live Razorpay modal
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay payment SDK. Please check internet connection.');
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'Creator Signal',
        description: data.pack.name,
        image: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
        handler: async function (response: any) {
          try {
            const verifyRes = await apiFetch('/api/payments/verify-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              onSuccess(verifyData.newBalance, verifyData.addedCredits);
              onClose();
            } else {
              setError(verifyData.error || 'Payment signature verification failed.');
            }
          } catch (vErr: any) {
            setError(vErr.message || 'Verification error.');
          }
        },
        theme: {
          color: '#7c3aed',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const packList = Object.values(CREDIT_PACKS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-amber-400" />
              Never Expire • Instant Top-Up
            </span>
            {typeof currentBalance === 'number' && (
              <span className="text-xs font-mono text-purple-200">
                Current: <strong>{currentBalance}</strong> Credits
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Top Up Your Studio Credits
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-xl">
            Stock up on credits with no recurring monthly commitment. Usable across all analytical studio tools, channel audits, and conversational AI Co-Pilot prompts.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pack Cards Grid */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packList.map((pack) => {
              const isSelected = selectedPackId === pack.id;
              const perCreditPrice = (pack.priceInr / pack.credits).toFixed(2);

              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  {pack.badge && (
                    <div className="absolute -top-3 right-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-700 text-white shadow-xs">
                        {pack.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900">{pack.name}</h3>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-purple-600 bg-purple-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">₹{pack.priceInr}</span>
                      <span className="text-xs font-mono text-slate-500">one-time</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="font-bold text-purple-700 font-mono text-sm">
                        {pack.credits.toLocaleString()} Credits
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ₹{perCreditPrice} / credit
                      </span>
                    </div>

                    <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Instant account credit</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Credits never expire or reset</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Full access to AI Co-Pilot chatbox</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyCredits(pack.id);
                    }}
                    disabled={loading}
                    className={`mt-5 w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-purple-700 hover:bg-purple-800 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {loading && selectedPackId === pack.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Buy {pack.credits} Credits for ₹{pack.priceInr}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sandbox Bypass for Local Testing */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Test Sandbox Mode:</strong> Want to test adding credits immediately without using a real payment card?
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleBuyCredits(selectedPackId, true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer shadow-2xs"
            >
              Instant Sandbox Top-Up
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted 256-bit Razorpay Checkout</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
