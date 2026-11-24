import React from 'react';
import { Sparkles, Terminal, Settings2, Menu, Cpu, ShieldAlert } from 'lucide-react';

export default function Header({
  health,
  onOpenSystemPrompt,
  onOpenSimulator,
  activeSimulation,
  onToggleSidebar,
  systemPrompt
}) {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md px-4 flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide text-zinc-100">NEXUS AI</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                v1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Backend Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-zinc-400">
            {health ? `${health.keys_configured} Keys • Cache On` : 'Connecting...'}
          </span>
        </div>

        {/* System Prompt Toggle */}
        <button
          onClick={onOpenSystemPrompt}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            systemPrompt
              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Configure System Prompt"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">System Prompt</span>
          {systemPrompt && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
        </button>

        {/* Failure Simulator Toggle */}
        <button
          onClick={onOpenSimulator}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            activeSimulation
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/40 hover:bg-rose-500/20 shadow-sm shadow-rose-900/30'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Failover Simulation Testing"
        >
          <ShieldAlert className={`w-3.5 h-3.5 ${activeSimulation ? 'text-rose-400' : ''}`} />
          <span className="hidden md:inline">Simulate Failure</span>
          {activeSimulation && (
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono">
              {activeSimulation}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
