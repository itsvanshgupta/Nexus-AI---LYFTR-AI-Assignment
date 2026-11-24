import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, Zap, Clock, Hash, Key, CheckCircle, Database, Layers } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const metadata = message.metadata;
  const [showTechnical, setShowTechnical] = useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end my-4 px-2">
        <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] items-start flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-300">
            <User className="w-4 h-4" />
          </div>
          <div className="rounded-2xl px-4 py-2.5 bg-indigo-600 text-white shadow-sm text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message container with mandatory data-testid
  return (
    <div
      data-testid="assistant-message"
      className="flex justify-start my-4 px-2"
    >
      <div className="flex gap-3 max-w-[95%] sm:max-w-[85%] items-start">
        <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 shadow-sm mt-0.5">
          <Bot className="w-4 h-4" />
        </div>

        <div className="flex-1 space-y-2">
          {/* Main message bubble */}
          <div className="rounded-2xl px-4 py-3 bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 shadow-sm text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>

          {/* Metadata Section */}
          {metadata && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-2.5 text-xs text-zinc-400 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Resolution Source: LIVE_INFERENCE or LLM_CACHE */}
                <span
                  data-testid="meta-source"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border ${
                    metadata.resolution_source === 'LLM_CACHE'
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {metadata.resolution_source === 'LLM_CACHE' ? (
                    <Database className="w-3 h-3" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {metadata.resolution_source}
                </span>

                {/* Model */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono text-[11px]">
                  <Layers className="w-3 h-3 text-zinc-400" />
                  <span data-testid="meta-model">{metadata.model}</span>
                </span>

                {/* Latency */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 font-mono text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span data-testid="meta-latency">{metadata.latency_ms} ms</span>
                </span>

                {/* Input Tokens */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 font-mono text-[11px]">
                  <span className="text-zinc-500">In:</span>
                  <span data-testid="meta-input-tokens">{metadata.input_tokens}</span>
                </span>

                {/* Output Tokens */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 font-mono text-[11px]">
                  <span className="text-zinc-500">Out:</span>
                  <span data-testid="meta-output-tokens">{metadata.output_tokens}</span>
                </span>

                {/* Expand Technical Metadata Toggle */}
                <button
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition py-0.5 px-1.5 rounded hover:bg-zinc-800"
                >
                  <span>Details</span>
                  {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Expandable Technical Metadata */}
              {showTechnical && (
                <div className="pt-2 border-t border-zinc-800/70 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-zinc-400">
                  <div className="bg-zinc-900/90 rounded p-1.5 border border-zinc-800">
                    <div className="text-zinc-500 text-[10px]">API Key ID</div>
                    <div className="text-zinc-200 font-semibold">{metadata.key_id ?? 'None (Cached)'}</div>
                  </div>
                  <div className="bg-zinc-900/90 rounded p-1.5 border border-zinc-800">
                    <div className="text-zinc-500 text-[10px]">Fallback Attempts</div>
                    <div className="text-zinc-200 font-semibold">{metadata.fallback_attempts ?? 0}</div>
                  </div>
                  <div className="bg-zinc-900/90 rounded p-1.5 border border-zinc-800 col-span-2 sm:col-span-1">
                    <div className="text-zinc-500 text-[10px]">Total Tokens</div>
                    <div className="text-zinc-200 font-semibold">
                      {(metadata.input_tokens || 0) + (metadata.output_tokens || 0)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
