import React, { useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  disabled
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="p-3 sm:p-4 border-t border-zinc-850 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto relative rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-xl focus-within:border-indigo-500/80 transition-colors">
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to Nexus AI... (Enter to send, Shift+Enter for new line)"
          disabled={disabled || isLoading}
          rows={1}
          maxLength={4000}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 min-h-[48px] max-h-[180px] pr-20"
        />

        <div className="absolute right-2.5 bottom-2 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline mr-1">
            {input.length}/4000
          </span>

          <button
            data-testid="send-button"
            onClick={onSend}
            disabled={!input.trim() || isLoading || disabled}
            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition shadow-sm disabled:cursor-not-allowed"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
