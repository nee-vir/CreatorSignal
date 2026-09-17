'use client';

import React, { useState } from 'react';
import {
  Radio,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Zap,
  Flame,
  Search,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api-client';

export interface UserProfile {
  email: string;
  id: string;
}

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile, startingCredits?: number) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both an email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const supabase = createBrowserSupabaseClient();

      if (isSignUp) {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setSuccessMsg('Account created! Crediting your 50 free starter credits...');

          // Call credit sync endpoint to guarantee 50 credits in Supabase
          try {
            await apiFetch('/api/auth/signup-credit-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch {
            // Non-blocking sync
          }

          if (typeof window !== 'undefined' && data.user?.id) {
            localStorage.setItem('creator_signal_user_id', data.user.id);
          }

          setTimeout(() => {
            onLoginSuccess({ email: data.user!.email || email, id: data.user!.id }, 50);
          }, 900);
        }
      } else {
        // Sign In Flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) throw signInError;

        if (data.user) {
          if (typeof window !== 'undefined' && data.user?.id) {
            localStorage.setItem('creator_signal_user_id', data.user.id);
          }
          onLoginSuccess({ email: data.user.email || email, id: data.user.id });
        }
      }
    } catch (err: any) {
      console.warn('Auth Error:', err.message);
      setError(
        err.message?.includes('Email not confirmed')
          ? 'Please check your email inbox to confirm your account, or use Instant Creator Demo below to test immediately.'
          : err.message || 'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(
        'Google Sign-In requires configuring Google OAuth in Supabase (Authentication -> Providers -> Google). Please log in with Email & Password or use the Instant Demo below.'
      );
    }
  };

  const handleInstantDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('creator_signal_user_id', '00000000-0000-0000-0000-000000000001');
    }
    onLoginSuccess(
      {
        email: 'creator.pro@creatorsignal.io',
        id: '00000000-0000-0000-0000-000000000001',
      },
      50
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 selection:bg-rose-100 selection:text-rose-900">
      {/* Background Decor Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-rose-200/40 via-purple-200/30 to-indigo-100/40 blur-3xl rounded-full" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/20 mx-auto mb-4">
            <Radio className="w-7 h-7 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            CREATOR <span className="gradient-text-red">SIGNAL</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            The YouTube Intelligence Studio for Serious Creators
          </p>

          {/* 50 Free Credits Callout */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            <span>50 Free Credits Granted Upon Signup</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-900/5 relative">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-bold text-slate-600">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                !isSignUp ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Log In
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                isSignUp ? 'bg-white text-rose-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Sign Up (+50 Credits)
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="email"
                  id="auth-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@channel.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-sm text-slate-900 placeholder:text-slate-400 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="password"
                  id="auth-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-sm text-slate-900 placeholder:text-slate-400 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              id="auth-submit-btn"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account & Claim 50 Credits' : 'Log In to Studio'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Social Auth Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2.5 transition-all mb-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Instant Creator Demo Option */}
          <button
            type="button"
            id="instant-demo-btn"
            onClick={handleInstantDemo}
            className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
            <span>Instant Demo (Skip Login & Test All Tools)</span>
          </button>
        </div>

        {/* Features Preview Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Outlier Engine
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Wand2 className="w-3 h-3 text-purple-500" /> Angle Pivot AI
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-indigo-500" /> Universal Scanner
            </span>
          </div>
          <span className="flex items-center justify-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Secured with Supabase Authentication & PostgreSQL RLS
          </span>
        </div>
      </div>
    </div>
  );
}
