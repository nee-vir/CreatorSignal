'use client';

import React, { useState, useRef } from 'react';
import {
  Search,
  Upload,
  Monitor,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { SerpCompetitorVideo } from '@/app/api/serp/preview/route';
import { apiFetch } from '@/lib/api-client';
import { Brain, Zap, Target } from 'lucide-react';
import {
  QueryConfirmationModal,
  QueryConfirmationDetails,
  isConfirmationSkipped,
} from '@/components/QueryConfirmationModal';

interface SerpInjectorProps {
  creditBalance: number;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
  onOpenUpgradeModal?: () => void;
}

export function SerpInjector({
  creditBalance,
  onCreditDeducted,
  onInsufficientCredits,
  onOpenUpgradeModal,
}: SerpInjectorProps) {
  const [keyword, setKeyword] = useState('');
  const [draftTitle, setDraftTitle] = useState('My Next Viral Video: Complete 2026 Strategy');
  const [draftThumbnail, setDraftThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<SerpCompetitorVideo[]>([]);
  const [confirmDetails, setConfirmDetails] = useState<QueryConfirmationDetails | null>(null);
  const [aiLandscape, setAiLandscape] = useState<{
    visualLandscape: string;
    contrastOpportunity: string;
    unmetNeed: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testGrayscale, setTestGrayscale] = useState(false);
  const [testBlur, setTestBlur] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setDraftThumbnail(loadEvt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setDraftThumbnail(loadEvt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeFetchSerp = async (targetKeyword: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/serp/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: targetKeyword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          setError('You ran out of credits! (15 required). Please click the Upgrade button to get more.');
          return;
        }
        throw new Error(data.error || 'Failed to fetch search results.');
      }

      setCompetitors(data.competitors || []);
      setAiLandscape(data.aiLandscape || null);
      if (typeof data.remainingCredits === 'number') {
        onCreditDeducted(data.remainingCredits);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSerp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    if (isConfirmationSkipped()) {
      executeFetchSerp(keyword.trim());
      return;
    }

    setConfirmDetails({
      toolName: 'SERP Competitor Simulator',
      querySummary: keyword.trim(),
      creditCost: 15,
      onConfirm: () => executeFetchSerp(keyword.trim()),
      features: [
        'Live YouTube search ranking scan for top 5 competitors',
        'Injected live preview of your thumbnail against real competitors',
        'Mobile & desktop screen simulation with grayscale and blur audits',
        'AI Competitive Landscape & Visual Contrast Analysis',
      ],
    });
  };

  // Construct combined list: Rank 1, Rank 2, [YOUR INJECTED THUMBNAIL #3], Rank 4, 5, 6
  const feedItems: Array<
    | { type: 'competitor'; rank: number; data: SerpCompetitorVideo }
    | { type: 'injected'; rank: 3 }
  > = [];

  if (competitors.length > 0) {
    if (competitors[0]) feedItems.push({ type: 'competitor', rank: 1, data: competitors[0] });
    if (competitors[1]) feedItems.push({ type: 'competitor', rank: 2, data: competitors[1] });
    feedItems.push({ type: 'injected', rank: 3 });
    if (competitors[2]) feedItems.push({ type: 'competitor', rank: 4, data: competitors[2] });
    if (competitors[3]) feedItems.push({ type: 'competitor', rank: 5, data: competitors[3] });
    if (competitors[4]) feedItems.push({ type: 'competitor', rank: 6, data: competitors[4] });
  }

  return (
    <div className="space-y-6">
      {/* Light Card Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Tool #1: Thumbnail Competitor Tester</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Test Your Thumbnail Before You Hit Publish
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              See your draft thumbnail injected directly into the <strong>#3 ranking spot</strong> on YouTube,
              sitting right next to the actual top videos for your topic.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-auto text-slate-700">
            <span>Cost:</span>
            <span className="text-amber-600 font-bold">15 credits</span>
          </div>
        </div>

        {/* 3 Simple Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-rose-600 block mb-1">Step 1: Enter Topic</span>
            <p className="text-xs text-slate-600">
              Type the search keyword you want to rank for (e.g., "AI tools 2026").
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-rose-600 block mb-1">Step 2: Upload Image</span>
            <p className="text-xs text-slate-600">
              Drag & drop your draft thumbnail image from your computer.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-rose-600 block mb-1">Step 3: Compare</span>
            <p className="text-xs text-slate-600">
              Check how your thumbnail looks on both phone and laptop screens.
            </p>
          </div>
        </div>

        {/* Input Form Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Keyword Search & Draft Title */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                1. Target Search Topic
              </label>
              <form onSubmit={handleFetchSerp} className="flex gap-2">
                <input
                  id="serp-keyword-input"
                  type="text"
                  placeholder="e.g., 'How to grow on YouTube' or 'Python tutorial'"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-500 focus:bg-white"
                />
                <button
                  id="serp-search-btn"
                  type="submit"
                  disabled={loading || !keyword.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-sm flex items-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Fetch Videos</span>
                </button>
              </form>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Draft Video Title (Mockup)
              </label>
              <input
                id="serp-draft-title-input"
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Draft Thumbnail Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Upload Your Thumbnail
            </label>
            <div
              id="serp-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-500 bg-slate-50 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-slate-100 group relative overflow-hidden"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
              {draftThumbnail ? (
                <div className="flex items-center gap-3">
                  <img
                    src={draftThumbnail}
                    alt="Draft"
                    className="w-24 h-14 object-cover rounded-lg border border-slate-300 shadow-sm"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Thumbnail Ready
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click to choose a different image</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-rose-600 transition-colors mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">
                    Click or drag & drop your thumbnail image here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, or WebP</p>
                </>
              )}
            </div>
          </div>
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

      {/* Simulator Workspace */}
      {competitors.length > 0 && (
        <div className="space-y-4">
          {/* AI Competitive Packaging Strategy Card */}
          {aiLandscape && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-500/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    AI Competitive Landscape & Visual Contrast Analysis
                  </span>
                </div>
                <span className="text-xs text-purple-300 font-mono">
                  Keyword: "{keyword}"
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    Feed Theme
                  </span>
                  <p className="text-xs text-purple-100 leading-relaxed font-medium">
                    {aiLandscape.visualLandscape}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Contrast Opportunity
                  </span>
                  <p className="text-xs text-emerald-100 leading-relaxed font-medium">
                    {aiLandscape.contrastOpportunity}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    Unmet Searcher Need
                  </span>
                  <p className="text-xs text-amber-100 leading-relaxed font-medium">
                    {aiLandscape.unmetNeed}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Screen Size:</span>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  id="serp-view-desktop"
                  onClick={() => setViewMode('desktop')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === 'desktop'
                      ? 'bg-white text-rose-600 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Laptop Screen</span>
                </button>
                <button
                  id="serp-view-mobile"
                  onClick={() => setViewMode('mobile')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === 'mobile'
                      ? 'bg-white text-rose-600 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Phone Screen</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Filters */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 hidden sm:inline font-medium">Visual Tests:</span>
              <button
                id="filter-blur-btn"
                onClick={() => setTestBlur(!testBlur)}
                className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  testBlur
                    ? 'bg-amber-100 text-amber-900 font-bold border-amber-300 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Simulates squinting or viewing from across the room"
              >
                <span>🔍 Squint Test (Blur)</span>
              </button>
              <button
                id="filter-grayscale-btn"
                onClick={() => setTestGrayscale(!testGrayscale)}
                className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  testGrayscale
                    ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Tests if your colors have enough light-vs-dark contrast"
              >
                <span>⚫ Black & White Test</span>
              </button>
            </div>
          </div>

          {/* YouTube Results Frame */}
          <div
            id="serp-preview-frame"
            className={`mx-auto transition-all ${
              viewMode === 'mobile' ? 'max-w-md' : 'max-w-4xl'
            } ${testGrayscale ? 'grayscale' : ''} ${testBlur ? 'blur-[1.5px]' : ''}`}
          >
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500">
                <span className="font-mono">YouTube Search Results for: "{keyword}"</span>
                <span>{feedItems.length} videos shown</span>
              </div>

              {feedItems.map((item) => {
                if (item.type === 'injected') {
                  // User Injected Card
                  return (
                    <div
                      key="injected-draft"
                      id="injected-serp-item"
                      className="p-4 rounded-2xl border-2 border-rose-500 bg-rose-50/50 shadow-sm relative group"
                    >
                      {/* Floating Injected Badge */}
                      <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>🎯 YOUR DRAFT THUMBNAIL (RANK #3)</span>
                      </div>

                      {viewMode === 'desktop' ? (
                        <div className="flex flex-col sm:flex-row gap-4 mt-2">
                          <div className="w-full sm:w-80 aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative flex items-center justify-center">
                            {draftThumbnail ? (
                              <img
                                src={draftThumbnail}
                                alt="Draft Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-4">
                                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                                <span className="text-xs text-slate-500 font-medium">
                                  Upload a thumbnail in Step 2 above
                                </span>
                              </div>
                            )}
                            <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white font-bold">
                              12:45
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                              {draftTitle}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                              <span className="font-semibold text-slate-700">Your Channel</span>
                              <span>•</span>
                              <span>0 views</span>
                              <span>•</span>
                              <span>Just now</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                              This is your video sitting at position #3. Notice if your text is readable
                              and whether your colors grab your eyes before the other videos!
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Mobile Layout
                        <div className="space-y-3 mt-2">
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center">
                            {draftThumbnail ? (
                              <img
                                src={draftThumbnail}
                                alt="Draft Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-4">
                                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                                <span className="text-xs text-slate-500">Upload a thumbnail</span>
                              </div>
                            )}
                            <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white font-bold">
                              12:45
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{draftTitle}</h3>
                            <p className="text-xs text-slate-500 mt-1">Your Channel • 0 views • Just now</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Real competitor video
                const comp = item.data;
                return (
                  <div
                    key={comp.videoId}
                    className="p-2 sm:p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                  >
                    {viewMode === 'desktop' ? (
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-80 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0 relative border border-slate-200">
                          <img
                            src={comp.thumbnailUrl}
                            alt={comp.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-mono text-white font-medium">
                            #{item.rank}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-slate-900 line-clamp-2">{comp.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="text-slate-700 font-semibold">{comp.channelTitle}</span>
                            <span>•</span>
                            <span>{comp.viewCount.toLocaleString()} views</span>
                            <span>•</span>
                            <span>{new Date(comp.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Mobile Layout
                      <div className="space-y-2">
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 relative border border-slate-200">
                          <img
                            src={comp.thumbnailUrl}
                            alt={comp.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                            #{item.rank}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{comp.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {comp.channelTitle} • {comp.viewCount.toLocaleString()} views
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
