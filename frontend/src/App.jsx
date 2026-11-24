import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import EmptyState from './components/EmptyState';
import SystemPromptModal from './components/SystemPromptModal';
import SimulatorModal from './components/SimulatorModal';
import { fetchHealth, sendChatMessage, fetchSessionMessages } from './services/api';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';

function generateSessionId() {
  return `s-${Math.random().toString(36).substring(2, 9)}`;
}

export default function App() {
  // Session State
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_ai_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Configuration & Modals
  const [health, setHealth] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [activeSimulation, setActiveSimulation] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, error]);

  // Initial Health Check
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Backend health check error:', err));
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_ai_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage', e);
    }
  }, [sessions]);

  // Start a new chat session
  const handleNewChat = () => {
    const newId = generateSessionId();
    setSessionId(newId);
    setMessages([]);
    setError(null);
    setInput('');
  };

  // Switch to an existing session
  const handleSelectSession = async (id) => {
    if (id === sessionId) return;
    setSessionId(id);
    setError(null);
    setIsLoading(true);
    try {
      const data = await fetchSessionMessages(id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load session:', err);
      setError(err.message || 'Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a session
  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (sessionId === id) {
      handleNewChat();
    }
  };

  // Send message
  const handleSend = async (messageText = input) => {
    const textToSend = messageText.trim();
    if (!textToSend || isLoading) return;

    // Reset input immediately per frontend contract
    setInput('');
    setError(null);

    // Optimistically add user message
    const userMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Update or add current session to sessions list
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === sessionId);
      if (existing) return prev;
      return [
        {
          id: sessionId,
          title: textToSend.substring(0, 36) + (textToSend.length > 36 ? '...' : ''),
          createdAt: new Date().toISOString()
        },
        ...prev
      ];
    });

    try {
      const response = await sendChatMessage({
        sessionId,
        message: textToSend,
        systemPrompt,
        simulateFailure: activeSimulation
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.reply,
        metadata: response.metadata
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'An error occurred while generating the response.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-zinc-100 font-sans">
      {/* Sidebar for Sessions */}
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          health={health}
          onOpenSystemPrompt={() => setIsSystemPromptOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          activeSimulation={activeSimulation}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          systemPrompt={systemPrompt}
        />

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 flex flex-col">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={(p) => handleSend(p)} />
          ) : (
            <div className="max-w-4xl w-full mx-auto space-y-1">
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start my-4 px-2 animate-in fade-in">
                  <div className="flex gap-3 max-w-[85%] items-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Nexus AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message Card Inside Chat */}
              {error && (
                <div className="flex justify-start my-4 px-2">
                  <div className="flex gap-3 max-w-[85%] items-start">
                    <div className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs shadow-md">
                      <div className="font-semibold mb-1 flex items-center gap-1.5">
                        <span>Provider / Request Error</span>
                      </div>
                      <div className="font-mono text-[11px] leading-relaxed break-words">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Message Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSend(input)}
          isLoading={isLoading}
        />
      </div>

      {/* Modals */}
      <SystemPromptModal
        isOpen={isSystemPromptOpen}
        onClose={() => setIsSystemPromptOpen(false)}
        currentPrompt={systemPrompt}
        onSavePrompt={setSystemPrompt}
      />

      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        activeSimulation={activeSimulation}
        onApplySimulation={setActiveSimulation}
      />
    </div>
  );
}
