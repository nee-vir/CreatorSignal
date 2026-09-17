'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Zap,
  Play,
  Flame,
  ArrowRight,
  TrendingUp,
  Brain,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle2,
  ExternalLink,
  Layers,
  Users,
} from 'lucide-react';
import { parseYouTubeInput, YouTubeParsedInput } from '@/lib/youtube-parser';
import { apiFetch } from '@/lib/api-client';
import {
  QueryConfirmationModal,
  QueryConfirmationDetails,
  isConfirmationSkipped,
} from '@/components/QueryConfirmationModal';
import { AiCopilotChat } from '@/components/AiCopilotChat';

interface UniversalSearchBoxProps {
  creditBalance: number;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
  onOpenUpgradeModal?: () => void;
}

interface SingleVideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  views: number;
  channelMedian: number;
  multiplier: number;
  isOutlier: boolean;
  aiAnalysis?: {
    verdict: string;
    clickabilityScore: number;
    titleCritique: string;
    psychologicalTrigger: string;
    improvementIdea: string;
  } | null;
}

interface ChannelAuditResult {
  channel: {
    id: string;
    title: string;
    avatarUrl: string;
    subscriberCount: number;
    videoCount: number;
    medianViews: number;
    videosScanned: number;
  };
  topVideos?: Array<{
    id: string;
    title: string;
    thumbnail: string;
    viewCount: number;
    publishedAt: string;
    multiplier: number;
    isOutlier: boolean;
  }>;
  outliers: Array<{
    id: string;
    title: string;
    thumbnail: string;
    viewCount: number;
    publishedAt: string;
    multiplier: number;
    isOutlier: boolean;
  }>;
  totalOutliersFound: number;
  topOutlier?: {
    id: string;
    title: string;
    thumbnail: string;
    viewCount: number;
    multiplier: number;
  };
  aiAnalysis?: {
    curiosityGap: string;
    emotionalTrigger: string;
    hookStrategy: string;
    thumbnailPackaging?: string;
    retentionDriver?: string;
    summary: string;
    replicationPlaybook?: string[];
  } | null;
}

export function UniversalSearchBox({
  creditBalance,
  onCreditDeducted,
  onInsufficientCredits,
  onOpenUpgradeModal,
}: UniversalSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [detectedType, setDetectedType] = useState<YouTubeParsedInput>({ type: 'invalid' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<QueryConfirmationDetails | null>(null);

  // Results
  const [videoResult, setVideoResult] = useState<SingleVideoResult | null>(null);
  const [channelResult, setChannelResult] = useState<ChannelAuditResult | null>(null);

  // Real-time detection when typing
  useEffect(() => {
    if (!query.trim()) {
      setDetectedType({ type: 'invalid' });
      return;
    }
    const parsed = parseYouTubeInput(query);
    setDetectedType(parsed);
  }, [query]);

  const executeSearch = async (targetQuery: string, mode: 'video' | 'channel') => {
    setError(null);
    setLoading(true);

    try {
      if (mode === 'video') {
        const res = await apiFetch('/api/check-single-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: targetQuery }),
        });

        const data = await res.json();
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || 'Failed to analyze video.');
        }

        setVideoResult(data);
        setChannelResult(null);
        if (typeof data.remainingCredits === 'number') {
          onCreditDeducted(data.remainingCredits);
        }
      } else {
        const res = await apiFetch('/api/audit-channel-outliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: targetQuery }),
        });

        const data = await res.json();
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || 'Failed to complete channel audit.');
        }

        setChannelResult(data);
        setVideoResult(null);
        if (typeof data.remainingCredits === 'number') {
          onCreditDeducted(data.remainingCredits);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSearch = (forcedMode?: 'video' | 'channel') => {
    if (!query.trim()) return;

    const mode = forcedMode || (detectedType.type === 'video' ? 'video' : 'channel');
    const cost = mode === 'video' ? 10 : 35;
    const toolName = mode === 'video' ? 'Single Video Performance Check' : 'Deep Channel Outlier Audit';

    if (isConfirmationSkipped()) {
      executeSearch(query.trim(), mode);
      return;
    }

    setConfirmDetails({
      toolName,
      querySummary: query.trim(),
      creditCost: cost,
      onConfirm: () => executeSearch(query.trim(), mode),
      features:
        mode === 'video'
          ? [
              'Live YouTube view count & channel baseline calculation',
              'Performance multiplier against channel recent uploads',
              'Live Gemini AI Packaging & Clickability Score (1-100)',
              'Actionable A/B Title & Packaging Improvement Angle',
            ]
          : [
              'Deep channel scan across recent uploads',
              'Statistical median baseline calculation',
              'Outlier discovery & view multiplier detection',
              '7-part Gemini AI Outlier Breakdown & 3 swipeable title formulas',
            ],
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const demo = params.get('demo');
      if (demo === 'video') {
        handleQuickExample('https://www.youtube.com/watch?v=dQw4w9WgXcQ', false);
      } else if (demo === 'channel') {
        handleQuickExample('@veritasium', false);
      }
    }
  }, []);

  const handleQuickExample = (exampleUrl: string, autoRun = true) => {
    setQuery(exampleUrl);
    const parsed = parseYouTubeInput(exampleUrl);
    setDetectedType(parsed);

    if (autoRun) {
      const mode = parsed.type === 'video' ? 'video' : 'channel';
      const cost = mode === 'video' ? 10 : 35;
      const toolName = mode === 'video' ? 'Single Video Performance Check' : 'Deep Channel Outlier Audit';

      if (isConfirmationSkipped()) {
        executeSearch(exampleUrl, mode);
        return;
      }

      setConfirmDetails({
        toolName,
        querySummary: exampleUrl,
        creditCost: cost,
        onConfirm: () => executeSearch(exampleUrl, mode),
        features:
          mode === 'video'
            ? [
                'Live YouTube view count & channel baseline calculation',
                'Performance multiplier against channel recent uploads',
                'Live Gemini AI Packaging & Clickability Score (1-100)',
                'Actionable A/B Title & Packaging Improvement Angle',
              ]
            : [
                'Deep channel scan across recent uploads',
                'Statistical median baseline calculation',
                'Outlier discovery & view multiplier detection',
                '7-part Gemini AI Outlier Breakdown & 3 swipeable title formulas',
              ],
      });
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Modern Minimalist Command Search Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-center space-y-1.5 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/70 uppercase tracking-wider">
              <Zap className="w-3 h-3 fill-rose-600" />
              Universal YouTube Intelligence
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Paste Any Video Link, Channel, or Handle
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Auto-detects single videos for a quick 10-credit baseline check or deep audits an entire channel for 35 credits.
            </p>
          </div>

          {/* Search Input Box */}
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/90 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10 transition-all">
            <div className="flex-1 flex items-center px-3 gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                id="universal-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleRunSearch()}
                placeholder="https://youtube.com/watch?v=... or @MrBeast..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {/* Auto Detection Badge inside Bar */}
              {query.trim() && (
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shrink-0 transition-all ${
                    detectedType.type === 'video'
                      ? 'bg-indigo-100 text-indigo-700'
                      : detectedType.type === 'channel'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {detectedType.type === 'video'
                    ? 'Video'
                    : detectedType.type === 'channel'
                    ? 'Channel'
                    : 'Unrecognized'}
                </span>
              )}
            </div>

            {/* Smart Dual-Action Trigger */}
            <div className="flex items-center gap-1.5 shrink-0">
              {detectedType.type === 'video' ? (
                <button
                  id="universal-check-video-btn"
                  onClick={() => handleRunSearch('video')}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white" />
                  )}
                  <span>Analyze Video (10 Credits)</span>
                </button>
              ) : (
                <button
                  id="universal-audit-channel-btn"
                  onClick={() => handleRunSearch('channel')}
                  disabled={loading || !query.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  <span>Deep Outlier Audit (35 Credits)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Try:</span>
            {[
              { label: '@veritasium', val: '@veritasium' },
              { label: '@hubermanlab', val: '@hubermanlab' },
              { label: '@cleoabram', val: '@cleoabram' },
              { label: 'Sample Video Link', val: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            ].map((chip) => (
              <button
                key={chip.val}
                type="button"
                onClick={() => handleQuickExample(chip.val)}
                className="text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors border border-slate-200"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* SINGLE VIDEO RESULT CARD */}
      {videoResult && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Single Video Baseline Check
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-700">{videoResult.channelTitle}</span>
            </div>
            {videoResult.isOutlier && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-xs">
                <Flame className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                VERIFIED OUTLIER ({videoResult.multiplier}x)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Thumbnail */}
            <div className="md:col-span-5 relative group rounded-2xl overflow-hidden shadow-md aspect-video bg-slate-100">
              <img
                src={videoResult.thumbnail}
                alt={videoResult.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <a
                href={`https://youtube.com/watch?v=${videoResult.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Video Analytics Metrics */}
            <div className="md:col-span-7 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                {videoResult.title}
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Target Views
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                    {videoResult.views.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Channel 10-Vid Median
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-slate-600">
                    {videoResult.channelMedian.toLocaleString()}
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border ${
                    videoResult.isOutlier
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Multiplier
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black font-mono ${
                      videoResult.isOutlier ? 'text-emerald-700' : 'text-slate-800'
                    }`}
                  >
                    {videoResult.multiplier}x
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {videoResult.isOutlier
                    ? `This video generated ${videoResult.multiplier}x more views than the channel's standard upload. Its packaging broke into broad search feeds.`
                    : `This video is performing near the channel's typical average (${videoResult.multiplier}x baseline).`}
                </span>
              </div>
            </div>
          </div>

          {/* SINGLE VIDEO AI PACKAGING BREAKDOWN */}
          {/* Embedded AI Co-Pilot for Single Video */}
          <div className="mt-6 pt-6 border-t border-slate-200/80">
            <AiCopilotChat
              toolName="Single Video Performance Breakdown"
              contextData={{
                tool: 'single_video_check',
                video: {
                  id: videoResult.videoId,
                  title: videoResult.title,
                  channel: videoResult.channelTitle,
                  views: videoResult.views,
                  channelMedian: videoResult.channelMedian,
                  multiplier: videoResult.multiplier,
                  isOutlier: videoResult.isOutlier,
                },
              }}
              contextSummary={`Video: "${videoResult.title}" (${videoResult.views.toLocaleString()} views • ${videoResult.multiplier}x median)`}
              suggestedPrompts={[
                '🎯 Brainstorm 5 higher-CTR title variations for this topic',
                '💡 How could the thumbnail be improved for stronger visual contrast?',
                '🔍 What specific emotional trigger would attract high-intent viewers?',
                '📊 Compare this video against its channel median baseline',
              ]}
              creditBalance={creditBalance}
              onCreditDeducted={onCreditDeducted}
              onInsufficientCredits={onInsufficientCredits}
            />
          </div>
        </div>
      )}

      {/* DEEP CHANNEL OUTLIER AUDIT VIEW */}
      {channelResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Channel Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              {channelResult.channel.avatarUrl && (
                <img
                  src={channelResult.channel.avatarUrl}
                  alt={channelResult.channel.title}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                />
              )}
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl font-black text-slate-900">{channelResult.channel.title}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                    AUDITED
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {channelResult.channel.subscriberCount.toLocaleString()} subscribers • {channelResult.channel.videosScanned} recent uploads analyzed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Channel Median</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {channelResult.channel.medianViews.toLocaleString()}
                </span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Outliers Identified</span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {channelResult.totalOutliersFound}
                </span>
              </div>
            </div>
          </div>

          {/* TOP 10 CHANNEL UPLOADS CATALOG */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <span>Top 10 Channel Uploads (Ranked by Multiplier & Views)</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Baseline: {channelResult.channel.medianViews.toLocaleString()} median views
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(channelResult.topVideos && channelResult.topVideos.length > 0
                ? channelResult.topVideos
                : channelResult.outliers
              ).slice(0, 10).map((video, idx) => (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono bg-slate-900/80 text-white backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black font-mono uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          video.multiplier >= 2.0
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900/80 text-white backdrop-blur-xs'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        {video.multiplier}x
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                      {video.title}
                    </h4>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {video.viewCount.toLocaleString()} views
                      </span>
                      <a
                        href={`https://youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                      >
                        <span>Watch</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EMBEDDED CONVERSATIONAL AI CO-PILOT CHATBOX */}
          <AiCopilotChat
            toolName={`Channel Audit: ${channelResult.channel.title}`}
            contextData={{
              tool: 'channel_audit',
              channel: channelResult.channel,
              top10Videos: (channelResult.topVideos || channelResult.outliers).slice(0, 10),
            }}
            contextSummary={`Auditing ${channelResult.channel.title} • Top 10 uploads loaded in memory`}
            suggestedPrompts={[
              '🎯 Brainstorm 5 viral titles mixing the angles of video #1 and #2',
              '🔍 Extract the most repeated keywords across these top 10 titles',
              '📊 Calculate the view drop-off percentage between video #1 and #10',
              '💡 What made the #1 video outperform the channel baseline by this multiplier?',
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
