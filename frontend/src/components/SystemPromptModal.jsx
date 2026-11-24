import React, { useState } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

export default function SystemPromptModal({
  isOpen,
  onClose,
  currentPrompt,
  onSavePrompt
}) {
  const [prompt, setPrompt] = useState(currentPrompt || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePrompt(prompt);
    onClose();
  };

  const handleReset = () => {
    setPrompt('');
    onSavePrompt('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Session System Prompt</h3>
            <p className="text-xs text-zinc-400">Override the assistant's persona or instructions for this session.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <textarea
            data-testid="system-prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. You are a senior AI research assistant. Provide concise, highly accurate responses."
            rows={5}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
          />
          <div className="text-[11px] text-zinc-500">
            Note: System prompt is prepended to the LLM context but omitted from the session history endpoint.
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-md shadow-indigo-600/20 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Prompt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
