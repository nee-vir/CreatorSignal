'use client';

import React, { useState } from 'react';
import { Flame, AlertCircle, BarChart2, Lightbulb, Brain, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import {
  QueryConfirmationModal,
  QueryConfirmationDetails,
  isConfirmationSkipped,
} from '@/components/QueryConfirmationModal';

interface OutlierEngineProps {
  creditBalance: number;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
  onOpenUpgradeModal?: () => void;
}

export function OutlierEngine({
  creditBalance,
  onCreditDeducted,
  onInsufficientCredits,
  onOpenUpgradeModal,
}: OutlierEngineProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<QueryConfirmationDetails | null>(null);

  const executeAnalysis = async (targetUrl: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/analytics/outlier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: targetUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          setError('You ran out of credits! (25 required). Please click the Upgrade button to get more.');
          return;
        }
        throw new Error(data.error || 'Failed to analyze video.');
      }

      setResult(data.data);
      if (typeof data.remainingCredits === 'number') {
        onCreditDeducted(data.remainingCredits);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    if (isConfirmationSkipped()) {
      executeAnalysis(videoUrl.trim());
      return;
    }

    setConfirmDetails({
      toolName: 'Viral Topic Outlier Engine',
      querySummary: videoUrl.trim(),
      creditCost: 25,
      onConfirm: () => executeAnalysis(videoUrl.trim()),
      features: [
        "Live YouTube view count & channel's 10-video median comparison",
        'Statistical outlier multiplier calculation',
        'AI Viral Outlier Synthesis & audience resonance diagnosis',
        'Swipeable content angle formula for your next video',
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Light Card Header & Guide */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-2">
              <Flame className="w-3.5 h-3.5" />
              <span>Tool #2: Viral Topic Finder</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Spot Explosive YouTube Video Ideas
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Paste any YouTube video link to check if it succeeded because of <strong>high topic interest</strong> or
              just because the channel already has millions of subscribers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-auto text-slate-700">
            <span>Cost:</span>
            <span className="text-amber-600 font-bold">25 credits</span>
          </div>
        </div>

        {/* 5x Rule Tip Box */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mt-6 flex items-start gap-3 text-xs text-amber-900">
          <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-950 block mb-0.5">
              The 5x Outlier Rule (What to look for):
            </span>
            <span>
              If a channel usually gets 10,000 views on its uploads, but one specific video gets 50,000+ views, that’s a
              <strong> 5x Outlier</strong>! That proves viewers are searching for this topic right now—making it a perfect
              idea for your next video.
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            id="outlier-video-input"
            type="text"
            placeholder="Paste any YouTube video link (e.g., https://www.youtube.com/watch?v=...)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-500 focus:bg-white"
          />
          <button
            id="outlier-submit-btn"
            type="submit"
            disabled={loading || !videoUrl.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
            <span>Calculate Multiplier</span>
          </button>
        </form>

        {/* Test link suggestion */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Need a quick test video? Try:</span>
          <button
            type="button"
            onClick={() => setVideoUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw')}
            className="text-rose-600 font-medium hover:underline"
          >
            First YouTube Video (jNQXAC9IVRw)
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Analyzed Video</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{result.videoTitle}</h3>
              <p className="text-sm text-slate-500">
                Channel: <span className="text-slate-800 font-semibold">{result.channelTitle}</span>
              </p>
            </div>

            {/* Outlier Badge */}
            <div>
              {result.isOutlier ? (
                <div
                  id="outlier-badge-active"
                  className="px-5 py-2.5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center gap-2.5 shadow-sm"
                >
                  <Flame className="w-6 h-6 text-amber-600 animate-bounce" />
                  <div>
                    <div className="text-base font-black text-amber-900">
                      {result.outlierMultiplier}x Viral Outlier!
                    </div>
                    <div className="text-[10px] text-amber-700 uppercase font-bold tracking-wider">
                      ⭐ HIGH DEMAND TOPIC - MAKE A VIDEO ON THIS!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      {result.outlierMultiplier}x Normal Performance
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">
                      Standard Channel Baseline
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">This Video's Views</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {result.targetViews.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">Live view snapshot</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Channel's Normal Average</span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {result.channelMedianViews.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">
                Typical views across last {result.recentUploadCount} uploads
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">The Multiplier</span>
              <div className="text-sm font-mono text-slate-600 mt-1">
                {result.targetViews.toLocaleString()} ÷ {result.channelMedianViews.toLocaleString()}
              </div>
              <div className="text-xl font-bold text-rose-600 mt-1">
                = {result.outlierMultiplier}x more views than usual
              </div>
            </div>
          </div>

          {/* AI Comprehensive Outlier Breakdown Card */}
          {result.aiAnalysis && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-500/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    AI Viral Outlier Synthesis
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  {result.aiAnalysis.verdict}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    Why It Outperformed
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {result.aiAnalysis.whyItWorked}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                    Audience Resonance
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {result.aiAnalysis.audienceAppeal}
                  </p>
                </div>
              </div>

              {result.aiAnalysis.actionableAngle && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/20 text-xs flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block mb-0.5">
                      Swipeable Topic Angle for Your Next Video:
                    </span>
                    <span className="font-mono text-white text-xs font-semibold">
                      "{result.aiAnalysis.actionableAngle}"
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visual Bar Breakdown */}
          {result.recentViewsSample && result.recentViewsSample.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                How this video compares to the channel's other recent uploads:
              </h4>
              <div className="space-y-2">
                {result.recentViewsSample.map((views: number, idx: number) => {
                  const percentOfTarget = Math.min(
                    Math.round((views / Math.max(result.targetViews, 1)) * 100),
                    100
                  );
                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      <span className="w-20 font-mono text-slate-500">Recent #{idx + 1}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-slate-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentOfTarget, 4)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-mono text-slate-700 font-medium">
                        {views.toLocaleString()} views
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Query Cost Confirmation Modal */}
      <QueryConfirmationModal
        isOpen={!!confirmDetails}
        onClose={() => setConfirmDetails(null)}
        details={confirmDetails}
        currentBalance={creditBalance}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />
    </div>
  );
}
