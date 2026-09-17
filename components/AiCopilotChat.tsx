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
  Database,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Flame,
  ExternalLink,
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
  const defaultGreeting =
    initialMessage ||
    `👋 Hey! I'm your **Creator Signal AI Co-Pilot**. I'm directly connected to the live YouTube dataset for **${toolName}**.\n\nWhether you want to **uncover why top outliers blew up**, **brainstorm fresh high-CTR title variations**, **spot high-leverage keywords**, or **translate the numbers into plain English** — I'm here as your creative partner.\n\nWhat should we dig into first?`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content: defaultGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showContextDrawer, setShowContextDrawer] = useState(false);

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

  const handleResetThread = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: defaultGreeting,
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
        i += 2; // skip header and separator row
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
            className="my-2.5 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200/90 text-slate-900 flex items-start justify-between gap-3 shadow-2xs group"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Quote className="w-4 h-4 text-purple-600 shrink-0 mt-0.5 fill-purple-200" />
              <div className="text-xs leading-relaxed font-medium break-words text-purple-950">
                {renderInline(quoteText)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText(quoteText)}
              title="Copy to clipboard"
              className="shrink-0 p-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-900 transition-colors shadow-2xs flex items-center gap-1 text-[10px] font-bold cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-purple-600" />
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
            className="text-sm font-black text-slate-900 mt-4 mb-2 flex items-center gap-1.5 border-b border-purple-100 pb-1"
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
            className="text-xs font-black uppercase tracking-wider text-purple-900 mt-3.5 mb-1.5 flex items-center gap-1.5"
          >
            <span className="w-2 h-0.5 rounded-full bg-purple-500" />
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
            className={`flex items-start gap-2 my-1 ${isNested ? 'pl-5' : 'pl-1'}`}
          >
            <span
              className={`rounded-full shrink-0 ${
                isNested
                  ? 'w-1 h-1 bg-indigo-400 mt-2 border border-indigo-400'
                  : 'w-1.5 h-1.5 bg-purple-500 mt-1.5'
              }`}
            />
            <span className="text-xs text-slate-800 leading-relaxed font-normal">
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
            className={`flex items-start gap-2 my-1.5 ${isNested ? 'pl-5' : 'pl-1'}`}
          >
            <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.2 rounded-md shrink-0">
              {numMatch[1]}
            </span>
            <span className="text-xs text-slate-800 leading-relaxed font-normal pt-0.5">
              {renderInline(numMatch[2])}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Normal paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-800 leading-relaxed my-1 font-normal">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  // Helper to count context items
  const getContextItemCount = () => {
    if (!contextData) return 0;
    if (Array.isArray(contextData.top10Videos)) return contextData.top10Videos.length;
    if (Array.isArray(contextData.opportunities)) return contextData.opportunities.length;
    if (Array.isArray(contextData.competitors)) return contextData.competitors.length;
    if (Array.isArray(contextData.generatedAngles)) return contextData.generatedAngles.length;
    if (contextData.video) return 1;
    return 1;
  };

  return (
    <div className="bg-white rounded-3xl border border-purple-200/80 shadow-lg overflow-hidden flex flex-col transition-all">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/50">
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
              {contextSummary || `Active Creative Context: ${toolName}`}
            </p>
          </div>
        </div>

        {/* Right Actions: Context Drawer Toggle, Reset Thread & Balance Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {contextData && (
            <button
              type="button"
              onClick={() => setShowContextDrawer(!showContextDrawer)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-medium text-purple-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-purple-300" />
              <span>{showContextDrawer ? 'Hide Loaded Data' : `Loaded Data (${getContextItemCount()})`}</span>
              {showContextDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

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

      {/* Collapsible Loaded Data Context Drawer */}
      {showContextDrawer && contextData && (
        <div className="bg-slate-900 text-slate-200 p-4 border-b border-purple-900/40 text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Raw YouTube Intelligence Loaded in Memory
              </span>
            </div>
            <span className="text-[11px] font-mono text-purple-300">
              {getContextItemCount()} data points active
            </span>
          </div>

          {/* Render Context Preview */}
          {contextData.top10Videos && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px] font-mono">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                Top Uploads by Outlier Multiplier:
              </span>
              {contextData.top10Videos.map((v: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <span className="text-purple-400 font-bold">#{idx + 1}</span>
                    <span className="truncate text-slate-200">{v.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400">{v.viewCount?.toLocaleString() || v.views?.toLocaleString()} views</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold">
                      {v.multiplier}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {contextData.video && (
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between font-mono text-xs">
              <span className="truncate text-white font-medium">{contextData.video.title}</span>
              <span className="text-purple-300 shrink-0 font-bold ml-2">
                {contextData.video.views?.toLocaleString()} views ({contextData.video.multiplier}x)
              </span>
            </div>
          )}

          {contextData.opportunities && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto text-[11px] font-mono">
              {contextData.opportunities.map((opp: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-white/5 flex items-center justify-between">
                  <span className="truncate text-slate-200">"{opp.title}"</span>
                  <span className="text-emerald-400 shrink-0 ml-2">~{opp.estimatedVph} vph</span>
                </div>
              ))}
            </div>
          )}

          {contextData.generatedAngles && (
            <div className="space-y-1.5 text-[11px] font-mono">
              {contextData.generatedAngles.map((ang: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-white/5">
                  <span className="text-purple-300 font-bold uppercase">[{ang.type}]</span> {ang.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
      <div className="p-4 sm:p-6 space-y-5 min-h-[460px] max-h-[560px] overflow-y-auto bg-slate-50/50">
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
                className={`max-w-[90%] rounded-2xl p-4 sm:p-5 text-xs sm:text-[13px] shadow-xs ${
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
                              handleSendMessage('Give me 3 alternative high-CTR title variations with completely different psychological hooks.')
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
          <span>Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line</span>
          <span>5 credits per query</span>
        </div>
      </div>
    </div>
  );
}
