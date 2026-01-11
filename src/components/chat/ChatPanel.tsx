import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Inline SVG icons
const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export function ChatPanel() {
  const {
    isOpen,
    toggle,
    messages,
    isLoading,
    error,
    conversations,
    currentConversationId,
    lastRetrievedChunks,
    isIndexing,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    indexAllSessions,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-4 right-4 p-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full shadow-lg hover:opacity-90 transition-opacity z-50"
        title="Chat with transcripts"
      >
        <MessageSquareIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {showConversations && (
            <button
              onClick={() => setShowConversations(false)}
              className="p-1 hover:bg-[var(--muted)] rounded"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
          <MessageSquareIcon className="w-5 h-5" />
          <span className="font-medium">
            {showConversations ? 'Conversations' : 'Chat with Transcripts'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConversations(!showConversations)}
            className="p-1.5 hover:bg-[var(--muted)] rounded text-[var(--muted-foreground)]"
            title="Conversations"
          >
            <MessageSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              await indexAllSessions();
            }}
            disabled={isIndexing}
            className="p-1.5 hover:bg-[var(--muted)] rounded text-[var(--muted-foreground)] disabled:opacity-50"
            title="Index all sessions"
          >
            {isIndexing ? (
              <LoaderIcon className="w-4 h-4 animate-spin" />
            ) : (
              <DatabaseIcon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={toggle}
            className="p-1.5 hover:bg-[var(--muted)] rounded text-[var(--muted-foreground)]"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {showConversations ? (
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={async () => {
              await createConversation();
              setShowConversations(false);
            }}
            className="w-full flex items-center gap-2 p-2 hover:bg-[var(--muted)] rounded text-sm mb-2"
          >
            <PlusIcon className="w-4 h-4" />
            New conversation
          </button>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                conv.id === currentConversationId ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]/50'
              }`}
              onClick={async () => {
                await selectConversation(conv.id);
                setShowConversations(false);
              }}
            >
              <span className="text-sm truncate flex-1">
                {conv.title || 'Untitled'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="p-1 hover:bg-[var(--destructive)]/20 rounded text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No conversations yet
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)]">
                <MessageSquareIcon className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Ask questions about your transcripts</p>
                <p className="text-xs mt-1">
                  Make sure to index your sessions first
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'bg-[var(--muted)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)]/30 text-xs text-[var(--muted-foreground)]">
                        {msg.sourceChunks.length} source(s)
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--muted)] p-2.5 rounded-lg">
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sources preview */}
          {lastRetrievedChunks.length > 0 && messages.length > 0 && (
            <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--muted)]/30">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">
                Found in {lastRetrievedChunks.length} transcript(s)
              </p>
              <div className="flex gap-1 overflow-x-auto">
                {lastRetrievedChunks.slice(0, 3).map((chunk, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-[var(--background)] rounded border border-[var(--border)] truncate max-w-[100px]"
                    title={chunk.sessionTitle || chunk.sessionId}
                  >
                    {chunk.sessionTitle || 'Session'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="px-3 py-2 border-t border-[var(--border)] bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your transcripts..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
                {isLoading ? (
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
