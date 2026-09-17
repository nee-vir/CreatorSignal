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
import { AiCopilotChat } from '@/components/AiCopilotChat';

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

      {/* Results Section: Direct Chatbox Hero */}
      {opportunities && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <AiCopilotChat
            key={`evergreen-${channelId}`}
            toolName={`Evergreen Gap Radar: ${channelId}`}
            contextData={{
              tool: 'evergreen_gap',
              channelId: channelId,
              opportunities: opportunities.map((o) => ({
                id: o.videoId,
                title: o.title,
                totalViews: o.totalViews,
                daysAgo: o.daysAgo,
                estimatedVph: o.estimatedVph,
                opportunityScore: o.opportunityScore,
                recommendation: o.recommendation,
              })),
            }}
            contextSummary={`Discovered ${opportunities.length} evergreen remake targets for ${channelId}`}
            suggestedPrompts={[
              '🎯 How can I modernize the #1 opportunity title for 2026 audiences?',
              '📊 Calculate the combined daily views these older videos are still pulling',
              '🔍 What content angles or advancements are missing from these aging uploads?',
              '💡 Give me 3 script hook intros to outperform the highest-ranking video here',
            ]}
            creditBalance={creditBalance}
            onCreditDeducted={onCreditDeducted}
            onInsufficientCredits={onInsufficientCredits}
          />
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
