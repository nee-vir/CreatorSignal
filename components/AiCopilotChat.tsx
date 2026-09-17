'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, AlertCircle, RefreshCw, Layers, Copy, Check, Quote } from 'lucide-react';
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
  placeholder = 'Ask why an outlier blew up, brainstorm 5 fresh title angles, or break down the numbers in plain English...',
}: AiCopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content:
        initialMessage ||
        `👋 Hey! I'm your **Creator Signal AI Co-Pilot**. I'm directly connected to the live YouTube dataset for **${toolName}**.\n\nWhether you want to **uncover why top outliers blew up**, **brainstorm fresh high-CTR title variations**, **spot high-leverage keywords**, or **translate the numbers into plain English** — I'm here as your creative partner.\n\nWhat should we dig into first?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = (text: string) => {
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
              onClick={() => handleCopy(quoteText)}
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

  return (
    <div className="bg-white rounded-3xl border border-purple-200/80 shadow-md overflow-hidden flex flex-col">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
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

        {/* Cost & Balance Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/10 text-right">
            <span className="text-[10px] uppercase font-bold text-purple-200 block">
              Cost: 5 Credits / Message
            </span>
            <span className="text-xs font-mono font-bold text-white">
              Balance: {creditBalance} Credits
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Pills */}
      {suggestedPrompts.length > 0 && (
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-500" />
            Quick Prompts:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="text-[11px] font-medium px-3 py-1 rounded-lg bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 text-slate-700 border border-slate-200 shrink-0 transition-colors cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message History Feed */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[480px] overflow-y-auto bg-slate-50/50">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                  isAssistant
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-800 text-white shadow-xs'
                }`}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl p-4 text-xs shadow-xs ${
                  isAssistant
                    ? 'bg-white border border-slate-200 text-slate-900'
                    : 'bg-purple-700 text-white font-medium'
                }`}
              >
                {isAssistant ? (
                  <div className="space-y-1">{renderFormattedContent(msg.content)}</div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
                <div
                  className={`text-[10px] mt-2.5 text-right ${
                    isAssistant ? 'text-slate-400' : 'text-purple-200/80'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 animate-in fade-in">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-purple-200 rounded-2xl p-4 text-xs text-slate-700 shadow-xs flex items-center gap-2.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
              <span>Reviewing YouTube performance & framing creative angles...</span>
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
      <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
            placeholder={placeholder}
            className="w-full resize-none p-3 pr-10 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={loading || !inputValue.trim()}
          className="h-11 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
