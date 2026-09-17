'use client';

import React, { useState } from 'react';
import { Compass, Search, Sparkles, AlertCircle, Lightbulb, Brain, Zap, Target } from 'lucide-react';
import { EvergreenVideoOpportunity } from '@/lib/analytics/evergreen';
import { apiFetch } from '@/lib/api-client';
import {
  QueryConfirmationModal,
  QueryConfirmationDetails,
  isConfirmationSkipped,
} from '@/components/QueryConfirmationModal';

interface EvergreenGapProps {
  creditBalance: number;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
  onOpenUpgradeModal?: () => void;
}

export function EvergreenGap({
  creditBalance,
  onCreditDeducted,
  onInsufficientCredits,
  onOpenUpgradeModal,
}: EvergreenGapProps) {
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<EvergreenVideoOpportunity[] | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<QueryConfirmationDetails | null>(null);
  const [aiSynthesis, setAiSynthesis] = useState<{
    coreSearchIntent: string;
    modernizationPlaybook: string;
    recommendedTitleHook: string;
  } | null>(null);

  const executeScan = async (targetChannelId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/analytics/evergreen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: targetChannelId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          setError('You ran out of credits! (25 required). Please click the Upgrade button to get more.');
          return;
        }
        throw new Error(data.error || 'Failed to scan channel.');
      }

      setOpportunities(data.opportunities || []);
      setAiSynthesis(data.aiSynthesis || null);
      if (typeof data.remainingCredits === 'number') {
        onCreditDeducted(data.remainingCredits);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId.trim()) return;

    if (isConfirmationSkipped()) {
      executeScan(channelId.trim());
      return;
    }

    setConfirmDetails({
      toolName: 'Evergreen Competitor Gap Finder',
      querySummary: channelId.trim(),
      creditCost: 25,
      onConfirm: () => executeScan(channelId.trim()),
      features: [
        'Scans competitor catalog for high-velocity videos (>180 days old)',
        'Filters for perennially active topics pulling >20 views/hour',
        'AI Evergreen Remake Strategy & core search intent diagnosis',
        'Actionable 2026 title hook formula and modernization playbook',
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Light Card Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Tool #4: Evergreen Ideas Finder</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Discover Proven, Long-Term Video Ideas
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Scan competitor channels for videos published <strong>more than 6 months ago</strong> that are still
              consistently bringing in views every day.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-auto text-slate-700">
            <span>Cost:</span>
            <span className="text-amber-600 font-bold">25 credits</span>
          </div>
        </div>

        {/* Strategy Tip Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mt-6 flex items-start gap-3 text-xs text-slate-700">
          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">The "Modern Remake" Strategy:</span>
            <span>
              If a competitor made a video 1 year ago and it's still pulling in 50 views an hour, that topic has proven
              longevity. Because their video is now older, you can make a fresh, modernized version with 2026 info, higher
              audio quality, and a better thumbnail to outrank them!
            </span>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleScan} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            id="evergreen-channel-input"
            type="text"
            placeholder="Enter competitor's YouTube Channel ID (e.g., UC_x5XG1OV2P6uZZ5FSM9Ttw)"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-500 focus:bg-white"
          />
          <button
            id="evergreen-submit-btn"
            type="submit"
            disabled={loading || !channelId.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Scan Evergreen Videos</span>
          </button>
        </form>

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

      {/* Results Grid */}
      {opportunities && (
        <div className="space-y-4">
          {/* AI Evergreen Remake Strategy Card */}
          {aiSynthesis && opportunities.length > 0 && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-500/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    AI Evergreen Remake Strategy & Search Intent Analysis
                  </span>
                </div>
                <span className="text-xs text-purple-300 font-mono">
                  {opportunities.length} Evergreen Topics Identified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Core Search Intent
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {aiSynthesis.coreSearchIntent}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    2026 Modernization Playbook
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {aiSynthesis.modernizationPlaybook}
                  </p>
                </div>
              </div>

              {aiSynthesis.recommendedTitleHook && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/20 text-xs flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block mb-0.5">
                      Recommended 2026 Remake Title Hook:
                    </span>
                    <span className="font-mono text-white text-xs font-semibold">
                      "{aiSynthesis.recommendedTitleHook}"
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Discovered Evergreen Winning Topics ({opportunities.length})
            </h3>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-3xl border border-slate-200 shadow-sm">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-800 font-bold text-sm">No Evergreen Winners Found</p>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                None of the older videos in this channel met the 20 views/hour threshold. Try scanning another competitor channel!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp) => (
                <div
                  key={opp.videoId}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {opp.thumbnailUrl && (
                      <div className="w-32 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                        <img
                          src={opp.thumbnailUrl}
                          alt={opp.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          {opp.opportunityScore} Opportunity
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {opp.daysAgo} days old
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2">{opp.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        ~{opp.estimatedVph} views/hr ({opp.totalViews.toLocaleString()} views total)
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold text-rose-600 block mb-0.5">Recommended Remake Strategy:</span>
                    {opp.recommendation}
                  </div>
                </div>
              ))}
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
