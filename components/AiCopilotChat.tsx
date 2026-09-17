'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, CornerDownLeft, AlertCircle, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
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
  placeholder = 'Ask anything about this data, request title ideas, extract keywords, or do calculations...',
}: AiCopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content:
        initialMessage ||
        `👋 I am your **Creator Signal AI Co-Pilot**. I have live access to the YouTube data shown above for **${toolName}**.\n\nAsk me anything! For example, ask me to **extract top keywords**, **brainstorm 5 high-CTR titles**, **compare video performance**, or **calculate view multipliers and drop-off rates**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    // Check credit balance before sending
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
        content: data.reply || 'Analysis complete.',
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

  // Helper to format basic markdown-style text safely
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading level 3 or 4
      if (line.startsWith('### ') || line.startsWith('#### ')) {
        const text = line.replace(/^#{3,4}\s+/, '');
        return (
          <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1">
            {text}
          </h4>
        );
      }
      // Heading level 2
      if (line.startsWith('## ')) {
        const text = line.replace(/^##\s+/, '');
        return (
          <h3 key={idx} className="font-black text-slate-900 text-base mt-4 mb-1.5 border-b border-slate-100 pb-1">
            {text}
          </h3>
        );
      }
      // Bullet list item
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const text = line.trim().replace(/^[-*]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
            <span className="text-xs text-slate-800 leading-relaxed font-normal">
              {parseBoldAndItalics(text)}
            </span>
          </div>
        );
      }
      // Numbered list item
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="font-mono text-[11px] font-bold text-purple-600 shrink-0 w-4">
              {numMatch[1]}.
            </span>
            <span className="text-xs text-slate-800 leading-relaxed font-normal">
              {parseBoldAndItalics(numMatch[2])}
            </span>
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Standard line
      return (
        <p key={idx} className="text-xs text-slate-800 leading-relaxed my-1 font-normal">
          {parseBoldAndItalics(line)}
        </p>
      );
    });
  };

  const parseBoldAndItalics = (str: string) => {
    // Basic bold **text** parsing
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
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
                Live Data Grounded
              </span>
            </div>
            <p className="text-[11px] text-purple-200/80">
              {contextSummary || `Active Studio Context: ${toolName}`}
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
      <div className="p-4 sm:p-6 space-y-4 max-h-[460px] overflow-y-auto bg-slate-50/50">
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
                className={`max-w-[85%] rounded-2xl p-4 text-xs shadow-xs ${
                  isAssistant
                    ? 'bg-white border border-slate-200 text-slate-900'
                    : 'bg-purple-700 text-white font-medium'
                }`}
              >
                {isAssistant ? (
                  <div>{renderFormattedContent(msg.content)}</div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
                <div
                  className={`text-[10px] mt-2 text-right ${
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
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-purple-200 rounded-2xl p-4 text-xs text-slate-600 shadow-xs flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
              <span>Analyzing live YouTube dataset & calculating metrics...</span>
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
