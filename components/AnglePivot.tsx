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

      {/* 3 Psychological Angle Cards */}
      {angles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              3 High-Converting Psychological Hooks
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {angles.map((angle, idx) => {
              const isContrarian = angle.type === 'Contrarian';
              const isResource = angle.type === 'Resource';
              const isMistake = angle.type === 'Mistake';

              const badgeColor = isContrarian
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : isResource
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800';

              const Icon = isContrarian ? Sparkles : isResource ? BookOpen : ShieldAlert;

              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 relative group hover:border-purple-300 transition-all"
                >
                  <div>
                    {/* Angle Type Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${badgeColor}`}>
                        <Icon className="w-3 h-3" />
                        <span>The {angle.type} Angle</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Hook #{idx + 1}</span>
                    </div>

                    {/* Generated Title */}
                    <h4 className="text-base font-bold text-slate-900 leading-snug mb-2">
                      "{angle.title}"
                    </h4>

                    {/* Psychological Trigger */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-4">
                      <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                        Psychological Trigger:
                      </span>
                      {angle.trigger}
                    </div>

                    {/* First 30 Seconds Script */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          First 30 Seconds Script:
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                        "{angle.openingScript}"
                      </p>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(angle.openingScript, idx)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Script Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Hook Script</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Embedded AI Co-Pilot */}
          <div className="mt-6">
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
