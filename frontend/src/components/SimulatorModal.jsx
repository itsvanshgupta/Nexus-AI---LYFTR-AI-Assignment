import React, { useState } from 'react';
import { X, ShieldAlert, Check, Terminal, Info, Copy } from 'lucide-react';

export default function SimulatorModal({
  isOpen,
  onClose,
  activeSimulation,
  onApplySimulation
}) {
  const [selectedPreset, setSelectedPreset] = useState(activeSimulation || '');
  const [customValue, setCustomValue] = useState(activeSimulation || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      label: "None (Normal Operation)",
      value: "",
      desc: "Live inference with standard LiteLLM caching and key failover."
    },
    {
      label: "key_1=429 (Primary Rate-Limited)",
      value: "key_1=429",
      desc: "Simulates HTTP 429 on key_1. Verifies automatic fallback to key_2."
    },
    {
      label: "key_1=500 (Primary Server Error)",
      value: "key_1=500",
      desc: "Simulates HTTP 500 on key_1. Verifies automatic fallback to key_2."
    },
    {
      label: "*=429 (All Providers Rate-Limited)",
      value: "*=429",
      desc: "Simulates HTTP 429 on all keys. Verifies clean 503 error."
    },
    {
      label: "key_1=429,key_2=500 (Full Outage)",
      value: "key_1=429,key_2=500",
      desc: "Simulates cascade failure across key pool. Verifies clean 503 error."
    }
  ];

  const handleApply = (val) => {
    onApplySimulation(val);
    onClose();
  };

  const curlExample = `curl -X POST http://localhost:8000/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Simulate-Failure: ${customValue || 'key_1=429'}" \\
  -d '{"session_id": "test-failover", "message": "Test failover"}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Failover Simulation Test Hook</h3>
              <p className="text-xs text-zinc-400">Sets the X-Simulate-Failure request header on subsequent calls.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset choices */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Presets</div>
          <div className="space-y-1.5">
            {presets.map((p, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedPreset(p.value);
                  setCustomValue(p.value);
                }}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between ${
                  selectedPreset === p.value
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div>
                  <div className="font-medium font-mono text-[11px] flex items-center gap-1.5">
                    {p.label}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{p.desc}</div>
                </div>
                {selectedPreset === p.value && (
                  <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Header Input */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Custom Header Value</label>
          <input
            type="text"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value);
              setSelectedPreset(e.target.value);
            }}
            placeholder="e.g. key_1=429 or *=503"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* cURL reproduction card */}
        <div className="rounded-xl bg-zinc-950 p-2.5 border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400 text-[10px]">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-zinc-400" /> CLI Test Equivalent
            </span>
            <button
              onClick={copyCurl}
              className="flex items-center gap-1 text-zinc-400 hover:text-white transition"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <pre className="text-zinc-300 overflow-x-auto p-1 leading-relaxed">
            {curlExample}
          </pre>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleApply(customValue)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-medium shadow-md shadow-rose-600/20 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Simulation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
