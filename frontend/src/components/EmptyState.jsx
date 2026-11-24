import React from 'react';
import { Sparkles, Zap, ShieldCheck, Database, ArrowRight } from 'lucide-react';

export default function EmptyState({ onSelectPrompt }) {
  const promptSuggestions = [
    {
      title: "Fast Knowledge",
      desc: "What is the capital of France and what is its history?",
      prompt: "What is the capital of France?"
    },
    {
      title: "Cache Verification",
      desc: "Ask an identical question twice to observe LLM_CACHE speedup.",
      prompt: "What is the speed of light in kilometers per second?"
    },
    {
      title: "Code Generation",
      desc: "Write an idempotent Python function for API key failover.",
      prompt: "Write a clean Python function with exponential backoff for retrying failed API requests."
    },
    {
      title: "Deep Reasoning",
      desc: "Explain how LiteLLM caches and routes across multiple keys.",
      prompt: "Explain how LiteLLM routes requests and implements fallback when an API key is rate-limited."
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto select-none">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-5">
        <Sparkles className="w-7 h-7 text-white" />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mb-2">
        How can Nexus AI help you today?
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
        Next-generation AI chatbot powered by LiteLLM multi-key failover, sub-millisecond response caching, and per-turn token metrics.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {promptSuggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col items-start p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-850/80 hover:border-zinc-700/80 transition text-left"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition">
                {item.title}
              </span>
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
            </div>
            <span className="text-[11px] text-zinc-400 line-clamp-2">
              {item.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
