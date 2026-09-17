'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle, Wand2, ShieldAlert, BookOpen, Lightbulb } from 'lucide-react';
import { AngleHook } from '@/app/api/generate-angle/route';
import { apiFetch } from '@/lib/api-client';
import {
  QueryConfirmationModal,
  QueryConfirmationDetails,
  isConfirmationSkipped,
} from '@/components/QueryConfirmationModal';
import { AiCopilotChat } from '@/components/AiCopilotChat';

interface AnglePivotProps {
  creditBalance: number;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
  onOpenUpgradeModal?: () => void;
}

export function AnglePivot({
  creditBalance,
  onCreditDeducted,
  onInsufficientCredits,
  onOpenUpgradeModal,
}: AnglePivotProps) {
  const [videoTitle, setVideoTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [angles, setAngles] = useState<AngleHook[] | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<QueryConfirmationDetails | null>(null);

  const executeGenerate = async (targetTitle: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/generate-angle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoTitle: targetTitle }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          setError('You ran out of credits! (10 required). Please upgrade or wait for your midnight reset.');
          return;
        }
        throw new Error(data.error || 'Failed to generate angles.');
      }

      setAngles(data.angles || []);
      if (typeof data.remainingCredits === 'number') {
        onCreditDeducted(data.remainingCredits);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) return;

    if (isConfirmationSkipped()) {
      executeGenerate(videoTitle.trim());
      return;
    }

    setConfirmDetails({
      toolName: 'Angle Pivot AI Hook Generator',
      querySummary: videoTitle.trim(),
      creditCost: 10,
      onConfirm: () => executeGenerate(videoTitle.trim()),
      features: [
        'Deconstructs topic into 3 psychological hook angles (Contrarian, Resource, Mistake)',
        'Generates high-retention 30-second opening script frameworks',
        'Includes visual thumbnail pairing and curiosity trigger rationale',
      ],
    });
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Light Card Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-2">
              <Wand2 className="w-3.5 h-3.5" />
              <span>Tool #5: "Angle Pivot" AI Hook Generator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Turn Any Winning Topic Into 3 Viral Angles
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Never copy a competitor's exact title. This AI breaks down their topic and generates
              <strong> 3 psychological hooks</strong> (Contrarian, Resource, Mistake) with complete opening scripts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-auto text-slate-700">
            <span>Cost:</span>
            <span className="text-purple-700 font-bold">10 credits</span>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleGenerate} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            id="angle-title-input"
            type="text"
            placeholder="Paste any successful video title (e.g., 'How I Built a $10k/Month SaaS with Next.js')"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500 focus:bg-white"
          />
          <button
            id="angle-submit-btn"
            type="submit"
            disabled={loading || !videoTitle.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate 3 Angles</span>
          </button>
        </form>

        {/* Quick sample prompt */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Need a test title? Try:</span>
          <button
            type="button"
            onClick={() => setVideoTitle('How to Learn to Code in 2026 (Zero Experience)')}
            className="text-purple-600 font-medium hover:underline"
          >
            "How to Learn to Code in 2026 (Zero Experience)"
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

      {/* AI Angle & Hook Strategy Chatbox Hero */}
      {angles && (
        <div className="space-y-4">
          {/* Sleek Concept Summary Pill */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Concept Analyzed: "{videoTitle}"
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Contrarian, Resource Blueprint, and Mistake angles loaded in memory
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              3 Angles Ready
            </span>
          </div>

          {/* Embedded AI Co-Pilot - The Hero */}
          <AiCopilotChat
            toolName={`Hook & Angle Pivot: "${videoTitle}"`}
              contextData={{
                tool: 'angle_pivot',
                videoTitle: videoTitle,
                generatedAngles: angles.map((a) => ({
                  type: a.type,
                  title: a.title,
                  trigger: a.trigger,
                  openingScript: a.openingScript,
                })),
              }}
              contextSummary={`Refining 3 psychological angles for "${videoTitle}"`}
              suggestedPrompts={[
                '🎯 Expand the opening script for Angle #1 into the first 60 seconds',
                '💡 Give me 5 thumbnail image concepts to match Angle #2',
                '🔤 Write a shorter, punchier variant of the title for Angle #3',
                '🔍 Which of these 3 angles has the lowest audience bounce risk?',
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
