'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Zap,
  Sparkles,
  Clock,
  KeyRound,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  CreditCard,
  History,
} from 'lucide-react';
import { PlanTier } from '@/lib/credits/deduct';
import { UserProfile } from '@/components/Navbar';
import { apiFetch } from '@/lib/api-client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

interface ProfileViewProps {
  user: UserProfile;
  creditBalance: number;
  dailyAllowance: number;
  quota: number;
  planTier: PlanTier;
  currentPeriodEnd: string | null;
  onBackToStudio: () => void;
  onOpenUpgradeModal: () => void;
  onSignOut: () => void;
}

interface TransactionItem {
  id: string;
  amount: number;
  action: string;
  created_at: string;
}

export function ProfileView({
  user,
  creditBalance,
  dailyAllowance,
  quota,
  planTier,
  currentPeriodEnd,
  onBackToStudio,
  onOpenUpgradeModal,
  onSignOut,
}: ProfileViewProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Password update state
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isPro = planTier === 'pro_299';
  const isCreator = planTier === 'creator_199';

  // Load transaction history
  useEffect(() => {
    async function loadTransactions() {
      try {
        const res = await apiFetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          }
        }
      } catch (err) {
        console.warn('Could not load transactions:', err);
      } finally {
        setLoadingTx(false);
      }
    }
    loadTransactions();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await apiFetch('/api/account/delete', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clean up local supabase auth session
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      onSignOut();
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in">
      {/* Top Breadcrumb / Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStudio}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Platform Studio</span>
        </button>

        <button
          onClick={onSignOut}
          className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center text-2xl font-black shadow-md">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {user.email}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isPro
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : isCreator
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isPro ? '★ PRO POWERHOUSE' : isCreator ? 'CREATOR TIER' : 'FREE PLAN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">User ID: {user.id}</p>
            </div>
          </div>

          {!isPro && (
            <button
              onClick={onOpenUpgradeModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Subscription & Credit Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Usable Credits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Available Credits
            </span>
            <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {creditBalance}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Max Cycle Quota: {quota} credits
          </span>
        </div>

        {/* Daily Allowance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daily Recharge Rate
            </span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-900 font-mono">
            +{dailyAllowance}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {isPro
              ? '50 credits/day (1,500/mo)'
              : isCreator
              ? '25 credits/day (750/mo)'
              : '20 credits/day (Midnight IST)'}
          </span>
        </div>

        {/* Billing Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Billing Cycle
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {currentPeriodEnd
              ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Daily Reset (Free)'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {currentPeriodEnd ? 'Automatic renewal date' : 'Resets every night at midnight IST'}
          </span>
        </div>
      </div>

      {/* Credit Activity Ledger */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Recent Credit Activity</h2>
        </div>

        {loadingTx ? (
          <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
            Loading recent transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No transactions recorded yet. Run a single video check or channel audit to see live deductions.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 capitalize">
                    {tx.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {new Date(tx.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span
                  className={`font-mono font-black ${
                    tx.amount > 0 ? 'text-emerald-600' : 'text-slate-600'
                  }`}
                >
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount} credits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Settings: Update Password */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Change Password</h2>
        </div>

        {passwordMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {passwordMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-rose-50/50 rounded-3xl p-6 sm:p-8 border border-rose-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-700 font-black text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone: Permanent Account Deletion</span>
            </div>
            <p className="text-xs text-rose-600/90 max-w-xl">
              Permanently delete your user profile, credit wallet, active subscriptions, and cached data from our servers. This action cannot be undone.
            </p>
          </div>
          <button
            id="open-delete-modal-btn"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Delete Account */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto text-rose-600 mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-center text-slate-900">
              Are you absolutely sure?
            </h3>
            <p className="text-xs text-slate-500 text-center">
              This will permanently delete your account (<strong>{user.email}</strong>), wipe your remaining credits, and cancel any recurring memberships.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                To confirm, type <strong className="text-rose-600">DELETE</strong> below:
              </label>
              <input
                type="text"
                id="delete-confirm-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-account-btn"
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40 transition-all"
              >
                {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
