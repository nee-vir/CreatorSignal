'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  AlertCircle,
  RefreshCw,
  Layers,
  Copy,
  Check,
  Quote,
  RotateCcw,
  Zap,
  Flame,
  ExternalLink,
  Eye,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Award,
  Radio,
  BookOpen,
  ShieldAlert,
  LayoutGrid,
  List,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiCopilotChatProps {
  toolName: string;
  contextData: any;
  contextSummary?: string;
  suggestedPrompts?: string[];
  creditBalance: number;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
  initialMessage?: string;
  placeholder?: string;
}

export function AiCopilotChat({
  toolName,
  contextData,
  contextSummary,
  suggestedPrompts = [],
  creditBalance,
  onCreditDeducted,
  onInsufficientCredits,
  initialMessage,
  placeholder = 'Ask anything: brainstorm 5 viral title angles, analyze audience psychology, or explain the numbers...',
}: AiCopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content:
        initialMessage ||
        `👋 Hey! I'm your **Creator Signal AI Co-Pilot**. I'm connected to the live YouTube dataset for **${toolName}**.\n\nReview the visual intelligence briefing above — notice the patterns in what blew past baseline. Ask me to **brainstorm 5 high-CTR title variations**, **extract top repeated keywords**, **break down the audience psychology**, or **explain the math in plain English**.\n\nWhat should we dig into first?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedAngleIdx, setCopiedAngleIdx] = useState<number | null>(null);
  const [outlierViewMode, setOutlierViewMode] = useState<'grid' | 'table'>('grid');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopyText = (text: string) => {
    const clean = text
      .replace(/^\*\*|^\*|"$|^"|\*\*$|\*$/g, '')
      .replace(/["']/g, '')
      .trim();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clean);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1800);
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 1800);
    }
  };

  const handleCopyScript = (script: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(script);
      setCopiedAngleIdx(idx);
      setTimeout(() => setCopiedAngleIdx(null), 1800);
    }
  };

  const handleResetThread = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content:
          initialMessage ||
          `👋 Welcome back! Thread reset. All live data for **${toolName}** remains active in my memory.\n\nWhat fresh angle or question would you like to explore?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputValue('');
    setErrorMessage(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    if (creditBalance < 5) {
      onInsufficientCredits();
      return;
    }

    setErrorMessage(null);
    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setInputValue('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: contextData,
          history: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          throw new Error('Insufficient credits (5 required for AI Co-Pilot).');
        }
        throw new Error(data.error || 'Failed to get answer from AI Co-Pilot.');
      }

      if (typeof data.remainingCredits === 'number') {
        onCreditDeducted(data.remainingCredits);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Strategic analysis ready.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to render inline formatting: code `text`, bold **text**, and italic *text*
  const renderInline = (str: string) => {
    const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[11px] font-semibold border border-purple-100"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-slate-700">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Structured Markdown Parser
  const renderFormattedContent = (content: string) => {
    const rawLines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
        i++;
        continue;
      }

      // Dividers
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        elements.push(<div key={`div-${i}`} className="my-3 border-t border-slate-200/80" />);
        i++;
        continue;
      }

      // Markdown Table detection
      if (
        trimmed.startsWith('|') &&
        trimmed.endsWith('|') &&
        i + 1 < rawLines.length &&
        rawLines[i + 1].includes('---')
      ) {
        const headers = trimmed
          .split('|')
          .slice(1, -1)
          .map((h) => h.trim());
        const startIdx = i;
        i += 2;
        const rows: string[][] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          const rowCells = rawLines[i]
            .trim()
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          rows.push(rowCells);
          i++;
        }

        elements.push(
          <div key={`table-${startIdx}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-xs">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Blockquotes / Title Cards
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '');
        const isCopied = copiedText === quoteText;
        elements.push(
          <div
            key={`quote-${i}`}
            className="my-2.5 p-3.5 rounded-xl bg-purple-50/90 border border-purple-200 text-slate-900 flex items-start justify-between gap-3 shadow-2xs group hover:border-purple-300 transition-all"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Quote className="w-4 h-4 text-purple-600 shrink-0 mt-0.5 fill-purple-200" />
              <div className="text-xs sm:text-[13px] leading-relaxed font-medium break-words text-purple-950">
                {renderInline(quoteText)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText(quoteText)}
              title="Copy title"
              className="shrink-0 p-1.5 px-2.5 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-900 transition-colors shadow-2xs flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-purple-600" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        );
        i++;
        continue;
      }

      // Heading 2 (Major Theme Section)
      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s+/, '');
        elements.push(
          <h3
            key={`h2-${i}`}
            className="text-sm sm:text-base font-black text-slate-900 mt-4 mb-2 flex items-center gap-2 border-b border-purple-100 pb-1"
          >
            {renderInline(text)}
          </h3>
        );
        i++;
        continue;
      }

      // Heading 3 or 4 (Subsection)
      if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
        const text = trimmed.replace(/^#{3,4}\s+/, '');
        elements.push(
          <h4
            key={`h3-${i}`}
            className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-900 mt-3.5 mb-1.5 flex items-center gap-2"
          >
            <span className="w-2.5 h-1 rounded-full bg-purple-600" />
            {renderInline(text)}
          </h4>
        );
        i++;
        continue;
      }

      // Bullet list item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const indentSpaces = line.search(/\S/);
        const isNested = indentSpaces >= 2;
        const text = trimmed.replace(/^[-*]\s+/, '');
        elements.push(
          <div
            key={`bullet-${i}`}
            className={`flex items-start gap-2.5 my-1.5 ${isNested ? 'pl-5' : 'pl-1'}`}
          >
            <span
              className={`rounded-full shrink-0 ${
                isNested
                  ? 'w-1.5 h-1.5 bg-indigo-400 mt-2 border border-indigo-400'
                  : 'w-2 h-2 bg-purple-600 mt-1.5'
              }`}
            />
            <span className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal">
              {renderInline(text)}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered list item
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const indentSpaces = line.search(/\S/);
        const isNested = indentSpaces >= 2;
        elements.push(
          <div
            key={`num-${i}`}
            className={`flex items-start gap-2.5 my-2 ${isNested ? 'pl-5' : 'pl-1'}`}
          >
            <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 rounded-md shrink-0">
              {numMatch[1]}
            </span>
            <span className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal pt-0.5">
              {renderInline(numMatch[2])}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Normal paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs sm:text-[13px] text-slate-800 leading-relaxed my-1 font-normal">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  // Render Visual Data Showcase inside the first briefing
  const renderVisualDataBriefing = () => {
    if (!contextData) return null;

    // 1. Channel Outlier Audit Showcase (Top 10 Outliers)
    if (contextData.top10Videos && contextData.channel) {
      const { channel, top10Videos, totalOutliersFound } = contextData;
      const outlierCount =
        typeof totalOutliersFound === 'number'
          ? totalOutliersFound
          : top10Videos.filter((v: any) => (v.multiplier || 1) >= 2.0).length;

      return (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d0f22] to-slate-900 text-white p-4 sm:p-6 border border-purple-500/30 shadow-xl relative overflow-hidden backdrop-blur-xl">
          {/* Background Ambient Glow */}
          <div className="absolute -right-20 -top-20 w-56 h-56 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-56 h-56 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Channel Hero Header */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              {channel.avatarUrl ? (
                <img
                  src={channel.avatarUrl}
                  alt={channel.title}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-purple-400/40 shadow-lg shrink-0"
                />
              ) : (
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center font-black text-white text-lg shadow-lg shrink-0">
                  {channel.title?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {channel.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Live Channel Audit
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 mt-0.5 font-medium">
                  {channel.subscriberCount?.toLocaleString()} subscribers • {channel.videosScanned || 30} uploads scanned • {top10Videos.length} top outliers ranked
                </p>
              </div>
            </div>

            {/* Quick Channel Stats 3-Pill Strip */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="px-3 py-2 rounded-2xl bg-white/5 text-center border border-white/10 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-purple-300 block">Baseline Median</span>
                <span className="text-xs sm:text-sm font-mono font-black text-white">
                  {channel.medianViews?.toLocaleString()}
                </span>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-amber-500/15 text-center border border-amber-500/30 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-amber-300 block">Peak Multiplier</span>
                <span className="text-xs sm:text-sm font-mono font-black text-amber-200">
                  🔥 {top10Videos[0]?.multiplier}x
                </span>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-emerald-500/15 text-center border border-emerald-500/30 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-emerald-300 block">Outliers (&gt;2x)</span>
                <span className="text-xs sm:text-sm font-mono font-black text-emerald-200">
                  {outlierCount} Videos
                </span>
              </div>
            </div>
          </div>

          {/* Top 10 Showcase Bar with View Mode Switcher */}
          <div className="relative z-10 mt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Top 10 Outlier Uploads Showcase
                </span>
                <span className="text-[10px] text-purple-300 font-mono bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {top10Videos.length} In Memory
                </span>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setOutlierViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    outlierViewMode === 'grid'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Visual Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOutlierViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    outlierViewMode === 'table'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Ranked Table</span>
                </button>
              </div>
            </div>

            {/* View Mode 1: Visual Cards Grid */}
            {outlierViewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {top10Videos.map((video: any, idx: number) => {
                  const rank = idx + 1;
                  const rankBadgeClass =
                    rank === 1
                      ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-md font-black'
                      : rank === 2
                      ? 'bg-slate-200 text-slate-900 border-white shadow-sm font-black'
                      : rank === 3
                      ? 'bg-orange-500 text-white border-orange-400 shadow-sm font-black'
                      : 'bg-purple-900/90 text-purple-200 border-purple-500/40 font-bold';

                  const mult = video.multiplier || 1.0;
                  const isHighOutlier = mult >= 3.0;

                  return (
                    <div
                      key={video.id || idx}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/40 flex flex-col justify-between gap-2.5 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Video Thumbnail with Rank Badge Overlay */}
                        <div className="relative w-24 h-15 sm:w-28 sm:h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/15 group-hover:scale-102 transition-transform">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-purple-300">
                              #{rank}
                            </div>
                          )}
                          <span
                            className={`absolute top-1 left-1 px-1.5 py-0.2 rounded-md text-[9px] font-mono border ${rankBadgeClass}`}
                          >
                            #{rank}
                          </span>
                        </div>

                        {/* Title & Stats */}
                        <div className="flex-1 min-w-0">
                          <h5
                            className="text-xs font-bold text-slate-100 line-clamp-2 group-hover:text-purple-200 transition-colors leading-snug"
                            title={video.title}
                          >
                            {video.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono">
                            <span className="text-slate-300 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-slate-400" />
                              {(video.viewCount || video.views || 0).toLocaleString()}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                                isHighOutlier
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black'
                                  : mult >= 2.0
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-white/10 text-slate-300 border-white/15'
                              }`}
                            >
                              {mult >= 2.0 && <Flame className="w-2.5 h-2.5" />}
                              {mult}x
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Interactive Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
                        <button
                          type="button"
                          onClick={() =>
                            handleSendMessage(
                              `Conduct a deep psychological breakdown of Video #${rank}: "${video.title}" (${(
                                video.viewCount || video.views || 0
                              ).toLocaleString()} views, ${mult}x baseline). Why did this outperform the rest?`
                            )
                          }
                          disabled={loading}
                          className="text-purple-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer font-semibold"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Ask AI about #{rank}</span>
                        </button>

                        <a
                          href={`https://youtube.com/watch?v=${video.id || video.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-purple-200 flex items-center gap-1 transition-colors"
                        >
                          <span>Watch</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* View Mode 2: Dense Ranked Table */
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-white/10 text-purple-200 font-bold border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider w-12">Rank</th>
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Video Title</th>
                      <th className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-right">Views</th>
                      <th className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-right">Multiplier</th>
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {top10Videos.map((video: any, idx: number) => {
                      const rank = idx + 1;
                      const mult = video.multiplier || 1.0;
                      return (
                        <tr key={video.id || idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-3 py-2 font-mono font-black text-amber-300">
                            #{rank}
                          </td>
                          <td className="px-3 py-2 max-w-xs sm:max-w-md truncate">
                            <span className="text-white font-bold" title={video.title}>
                              {video.title}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-right text-slate-300">
                            {(video.viewCount || video.views || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 font-mono text-right">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                mult >= 2.0
                                  ? 'bg-emerald-500/20 text-emerald-300 font-black'
                                  : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {mult}x
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleSendMessage(
                                  `Analyze Video #${rank}: "${video.title}". What psychological hook drove these ${(
                                    video.viewCount || video.views || 0
                                  ).toLocaleString()} views?`
                                )
                              }
                              disabled={loading}
                              className="px-2 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Analyze
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 2. Single Video Performance Check & Outlier Calc Showcase
    if (contextData.video) {
      const { video } = contextData;
      const views = Number(video.views || video.targetViews || 0);
      const median = Number(video.channelMedian || 0);
      const mult = Number(video.multiplier || video.outlierMultiplier || 1.0);
      const isOutlier = Boolean(video.isOutlier || mult >= 2.0);

      return (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d0f22] to-slate-900 text-white p-4 sm:p-6 border border-purple-500/30 shadow-xl relative overflow-hidden backdrop-blur-xl space-y-4">
          {/* Background Glow */}
          <div className="absolute -right-20 -top-20 w-56 h-56 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Outlier Hero Status Banner */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
              isOutlier
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 shadow-sm'
                : 'bg-white/5 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isOutlier ? (
                <Flame className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
              ) : (
                <BarChart2 className="w-5 h-5 text-purple-400 shrink-0" />
              )}
              <div>
                <span className="text-sm font-black tracking-wide block">
                  {isOutlier
                    ? `🔥 ${mult}x VIRAL OUTLIER DETECTED!`
                    : `📊 ${mult}x Channel Baseline Performance`}
                </span>
                <span className="text-[11px] opacity-80">
                  {isOutlier
                    ? 'Massively outperforming channel standard • High external discovery demand'
                    : 'Performance sits within typical channel viewership norms'}
                </span>
              </div>
            </div>

            <div className="self-start sm:self-auto">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  isOutlier
                    ? 'bg-amber-400 text-amber-950 border-amber-300'
                    : 'bg-slate-700 text-slate-200 border-slate-600'
                }`}
              >
                {isOutlier ? '⭐ HIGH DEMAND TOPIC' : 'CHANNEL BASELINE'}
              </span>
            </div>
          </div>

          {/* Video Identity & 4-Metric Grid */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3.5 min-w-0">
              {video.thumbnail && (
                <div className="w-24 sm:w-28 aspect-video rounded-xl overflow-hidden shrink-0 border border-white/15 bg-slate-800 shadow-md">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Video Baseline Check
                  </span>
                  <span className="text-xs text-purple-300 font-bold truncate">{video.channel}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                  {video.title}
                </h4>
              </div>
            </div>

            {/* Metrics 3-box strip */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="px-3 py-2 rounded-2xl bg-white/5 text-center border border-white/10">
                <span className="text-[9px] uppercase font-bold text-purple-300 block">Total Views</span>
                <span className="text-xs sm:text-sm font-mono font-black text-white">
                  {views.toLocaleString()}
                </span>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white/5 text-center border border-white/10">
                <span className="text-[9px] uppercase font-bold text-purple-300 block">Channel Median</span>
                <span className="text-xs sm:text-sm font-mono font-black text-white">
                  {median.toLocaleString()}
                </span>
              </div>
              <div
                className={`px-3 py-2 rounded-2xl text-center border ${
                  isOutlier
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/30'
                    : 'bg-white/5 text-slate-200 border-white/10'
                }`}
              >
                <span className="text-[9px] uppercase font-bold text-amber-300 block">Multiplier</span>
                <span className="text-xs sm:text-sm font-mono font-black">{mult}x</span>
              </div>
            </div>
          </div>

          {/* If AI Analysis is present (from Outlier Engine) */}
          {video.aiAnalysis && (
            <div className="mt-2 p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Initial Outlier Diagnosis
                </span>
                <span className="text-[10px] font-mono text-amber-300 uppercase">
                  {video.aiAnalysis.verdict || 'Viral Outlier'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {video.aiAnalysis.whyItWorked}
              </p>
              {video.aiAnalysis.actionableAngle && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-purple-300 block">Suggested Packaging Formula:</span>
                    <span className="text-xs font-bold text-white truncate block">"{video.aiAnalysis.actionableAngle}"</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(video.aiAnalysis.actionableAngle)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 text-[10px] font-bold transition-colors cursor-pointer border border-white/10 shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // 3. Generated Angle & Hook Pivot Showcase
    if (contextData.generatedAngles && contextData.generatedAngles.length > 0) {
      return (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d0f22] to-slate-900 text-white p-4 sm:p-6 border border-purple-500/30 shadow-xl space-y-3 relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              3 Viral Psychological Hooks Generated
            </span>
            <span className="text-[11px] text-purple-300 font-mono bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              Concept: "{contextData.videoTitle}"
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {contextData.generatedAngles.map((ang: any, idx: number) => {
              const isContrarian = ang.type === 'Contrarian';
              const isResource = ang.type === 'Resource';
              const Icon = isContrarian ? Sparkles : isResource ? BookOpen : ShieldAlert;
              const colorClass = isContrarian
                ? 'border-purple-400/30 bg-purple-950/20'
                : isResource
                ? 'border-indigo-400/30 bg-indigo-950/20'
                : 'border-rose-400/30 bg-rose-950/20';

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 hover:bg-white/10 transition-all shadow-sm ${colorClass}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                        <Icon className="w-3.5 h-3.5" />
                        {ang.type} Angle
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>

                    <h5 className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-snug">
                      "{ang.title}"
                    </h5>

                    {ang.trigger && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        <strong className="text-purple-300">Trigger:</strong> {ang.trigger}
                      </p>
                    )}

                    {ang.openingScript && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-300 font-normal leading-relaxed line-clamp-3">
                        "{ang.openingScript}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleCopyScript(ang.openingScript || ang.title, idx)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-white/10"
                    >
                      {copiedAngleIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300 font-black">Script Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-purple-300" />
                          <span>Copy 15s Script</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSendMessage(
                          `Expand the opening script for Angle #${idx + 1} ("${ang.title}") into a full high-retention 60-second video hook outline.`
                        )
                      }
                      disabled={loading}
                      title="Expand with AI"
                      className="p-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 4. Evergreen Opportunities Showcase
    if (contextData.opportunities && contextData.opportunities.length > 0) {
      return (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d0f22] to-slate-900 text-white p-4 sm:p-6 border border-purple-500/30 shadow-xl space-y-3 relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Discovered Evergreen Winning Topics ({contextData.opportunities.length})
            </span>
            <span className="text-[11px] text-purple-300 font-mono bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              Channel: {contextData.channelId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contextData.opportunities.map((opp: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col justify-between gap-2.5 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Opportunity Score: {opp.opportunityScore || 85}/100
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {opp.daysAgo ? `${opp.daysAgo}d old` : 'Aging Upload'}
                    </span>
                  </div>
                  <h5 className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-emerald-200 transition-colors">
                    "{opp.title}"
                  </h5>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    ~{opp.estimatedVph || 0} views/hr
                  </span>
                  <span className="text-slate-400">
                    {(opp.totalViews || 0).toLocaleString()} total views
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `How can I modernize the evergreen topic: "${opp.title}" (pulling ~${opp.estimatedVph} views/hr) for modern audiences? Give me 3 fresh hook variations.`
                      )
                    }
                    disabled={loading}
                    className="text-emerald-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI Remake Angle</span>
                  </button>

                  {opp.id && (
                    <a
                      href={`https://youtube.com/watch?v=${opp.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 5. SERP Competitor Simulator Showcase
    if (contextData.competitors && contextData.competitors.length > 0) {
      return (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d0f22] to-slate-900 text-white p-4 sm:p-6 border border-purple-500/30 shadow-xl space-y-3 relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-400" />
              SERP Competitor Intelligence ({contextData.competitors.length} ranking videos)
            </span>
            <span className="text-[11px] text-purple-300 font-mono bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              Keyword: "{contextData.targetKeyword}"
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contextData.competitors.map((comp: any, idx: number) => (
              <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Ranking #{idx + 1}</span>
                  <span className="text-rose-300 font-bold">{(comp.views || 0).toLocaleString()} views</span>
                </div>
                <h5 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                  {comp.title}
                </h5>
                <p className="text-[11px] text-purple-200/80 truncate">
                  {comp.channel}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. VPH Speedometer Showcase
    if (contextData.videos && contextData.tool === 'vph_tracker') {
      return (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d0f22] to-slate-900 text-white p-4 sm:p-6 border border-purple-500/30 shadow-xl space-y-3 relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Real-Time Velocity Intelligence ({contextData.videos.length} videos tracked)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contextData.videos.map((vid: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h5 className="text-xs font-bold text-white line-clamp-2">
                  {vid.title}
                </h5>
                <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-white/10">
                  <span className="text-amber-300 font-bold">⚡ {vid.currentVph} views/hr</span>
                  <span className="text-slate-400">{(vid.latestViews || 0).toLocaleString()} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-purple-200/80 shadow-xl overflow-hidden flex flex-col transition-all">
      {/* Top Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide text-white">
                Creator Signal AI Co-Pilot
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-[11px] text-purple-200/80">
              {contextSummary || `Active Studio Context: ${toolName}`}
            </p>
          </div>
        </div>

        {/* Right Header Stats & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Live YouTube Data Pill */}
          <div className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-[11px] font-bold text-purple-200 flex items-center gap-1.5 shadow-inner">
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Live YouTube Dataset</span>
          </div>

          <button
            type="button"
            onClick={handleResetThread}
            title="Reset conversation thread"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/10 text-right">
            <span className="text-[9px] uppercase font-bold text-purple-300 block">
              5 Credits / Prompt
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {creditBalance} Credits
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Pills */}
      {suggestedPrompts.length > 0 && (
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-600" />
            Suggested:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 text-slate-700 border border-slate-200 shrink-0 transition-all cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message History Feed */}
      <div className="p-4 sm:p-6 space-y-5 min-h-[480px] max-h-[600px] overflow-y-auto bg-slate-50/50">
        {/* Render the Visual Data Briefing Card inside the chatbox feed */}
        {renderVisualDataBriefing()}

        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const isCopied = copiedMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs ${
                  isAssistant
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
                    : 'bg-slate-800 text-white'
                }`}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[92%] rounded-2xl p-4 sm:p-5 text-xs sm:text-[13px] shadow-xs ${
                  isAssistant
                    ? 'bg-white border border-slate-200/90 text-slate-900'
                    : 'bg-purple-700 text-white font-medium'
                }`}
              >
                {isAssistant ? (
                  <div>
                    <div className="space-y-1">{renderFormattedContent(msg.content)}</div>

                    {/* Bottom Action Bar for Assistant Messages */}
                    {msg.id !== 'init-1' && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer font-medium"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied Full Analysis</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Response</span>
                              </>
                            )}
                          </button>

                          <span>•</span>

                          <button
                            type="button"
                            onClick={() =>
                              handleSendMessage(
                                'Give me 3 alternative high-CTR title variations with completely different psychological hooks.'
                              )
                            }
                            disabled={loading}
                            className="hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer font-medium"
                          >
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>Try 3 Fresh Angles</span>
                          </button>
                        </div>

                        <span className="font-mono text-[10px]">{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className="text-[10px] mt-2 text-right text-purple-200/80 font-mono">
                      {msg.timestamp}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-purple-200 rounded-2xl p-4 text-xs sm:text-[13px] text-slate-700 shadow-xs flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
              <div>
                <span className="font-bold text-purple-900 block">AI Co-Pilot is Thinking</span>
                <span className="text-[11px] text-slate-500">
                  Reviewing YouTube algorithm patterns & formulating high-CTR creative angles...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mx-4 mb-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {errorMessage.includes('credits') && (
            <button
              onClick={onInsufficientCredits}
              className="text-xs font-bold underline hover:text-rose-900 cursor-pointer ml-2"
            >
              Buy Credits
            </button>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={2}
              placeholder={placeholder}
              className="w-full resize-none p-3.5 pr-10 text-xs sm:text-[13px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-inner"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={loading || !inputValue.trim()}
            className="h-12 px-5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>
            Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line
          </span>
          <span>5 credits per query</span>
        </div>
      </div>
    </div>
  );
}
