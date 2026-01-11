import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sourceChunks?: string[];
  createdAt: number;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RetrievedChunk {
  chunkId: string;
  sessionId: string;
  sessionTitle: string | null;
  text: string;
  speaker: string | null;
  similarity: number;
}

interface ChatState {
  // Panel visibility
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggle: () => void;

  // Conversations
  conversations: ChatConversation[];
  currentConversationId: string | null;

  // Messages
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent: string;
  error: string | null;

  // Retrieved context
  lastRetrievedChunks: RetrievedChunk[];

  // Embedding model state
  isEmbeddingModelLoaded: boolean;
  isIndexing: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;

  // Streaming support
  appendStreamingContent: (token: string) => void;
  finalizeStreaming: () => void;

  // RAG operations
  searchChunks: (query: string, limit?: number) => Promise<RetrievedChunk[]>;
  indexSession: (sessionId: string) => Promise<number>;
  indexAllSessions: () => Promise<number>;

  // Model management
  checkEmbeddingModel: () => Promise<boolean>;
  loadEmbeddingModel: () => Promise<void>;
  unloadEmbeddingModel: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isOpen: false,
    conversations: [],
    currentConversationId: null,
    messages: [],
    isLoading: false,
    streamingContent: '',
    error: null,
    lastRetrievedChunks: [],
    isEmbeddingModelLoaded: false,
    isIndexing: false,

    // Panel visibility
    setIsOpen: (isOpen) => set({ isOpen }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),

    // Conversations
    loadConversations: async () => {
      const conversations = await invoke<ChatConversation[]>('get_chat_conversations');
      set({ conversations });
    },

    createConversation: async (title) => {
      const id = await invoke<string>('create_chat_conversation', { title });
      await get().loadConversations();
      set({ currentConversationId: id, messages: [] });
      return id;
    },

    selectConversation: async (id) => {
      set({ currentConversationId: id });
      await get().loadMessages(id);
    },

    deleteConversation: async (id) => {
      await invoke('delete_chat_conversation', { conversationId: id });
      const { currentConversationId } = get();
      if (currentConversationId === id) {
        set({ currentConversationId: null, messages: [] });
      }
      await get().loadConversations();
    },

    // Messages
    loadMessages: async (conversationId) => {
      const messages = await invoke<ChatMessage[]>('get_chat_messages', { conversationId });
      set({ messages });
    },

    sendMessage: async (content) => {
      set({ error: null });

      try {
        const { currentConversationId } = get();
        if (!currentConversationId) {
          // Create a new conversation if none exists
          const id = await get().createConversation('New Chat');
          set({ currentConversationId: id });
        }

        const conversationId = get().currentConversationId!;
        set({ isLoading: true });

        // Add user message
        const userMessage = await invoke<ChatMessage>('add_chat_message', {
          conversationId,
          role: 'user',
          content,
          sourceChunks: null,
        });

        set((state) => ({
          messages: [...state.messages, userMessage],
        }));

        // Search for relevant chunks
        const chunks = await get().searchChunks(content, 5);
        set({ lastRetrievedChunks: chunks });

        // Build context for response
        const context = await invoke<string>('build_context_from_chunks', { chunks });

        // For now, store the prompt as the assistant response
        // In a full implementation, this would call the LLM for generation
        const assistantMessage = await invoke<ChatMessage>('add_chat_message', {
          conversationId,
          role: 'assistant',
          content: context
            ? `Based on your transcripts:\n\n${chunks
                .map(
                  (c) =>
                    `**[${c.sessionTitle || 'Session'}]** ${c.speaker ? `(${c.speaker})` : ''}: "${c.text.substring(0, 200)}${c.text.length > 200 ? '...' : ''}"`
                )
                .join('\n\n')}`
            : 'No relevant information found in your transcripts. Try indexing your sessions first.',
          sourceChunks: chunks.map((c) => c.chunkId),
        });

        set((state) => ({
          messages: [...state.messages, assistantMessage],
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Chat error:', errorMessage);
        set({ error: errorMessage });
      } finally {
        set({ isLoading: false });
      }
    },

    clearMessages: () => set({ messages: [], streamingContent: '' }),

    // Streaming support
    appendStreamingContent: (token) =>
      set((state) => ({ streamingContent: state.streamingContent + token })),

    finalizeStreaming: () => {
      const { streamingContent, currentConversationId } = get();
      if (streamingContent && currentConversationId) {
        // The streaming content becomes the last assistant message
        set({ streamingContent: '' });
      }
    },

    // RAG operations
    searchChunks: async (query, limit = 5) => {
      const chunks = await invoke<RetrievedChunk[]>('search_transcript_chunks', {
        query,
        limit,
        minSimilarity: 0.3,
      });
      return chunks;
    },

    indexSession: async (sessionId) => {
      set({ isIndexing: true });
      try {
        const count = await invoke<number>('index_session_for_rag', { sessionId });
        return count;
      } finally {
        set({ isIndexing: false });
      }
    },

    indexAllSessions: async () => {
      set({ isIndexing: true });
      try {
        const count = await invoke<number>('index_all_sessions');
        return count;
      } finally {
        set({ isIndexing: false });
      }
    },

    // Model management
    checkEmbeddingModel: async () => {
      const available = await invoke<boolean>('check_embedding_model');
      set({ isEmbeddingModelLoaded: available });
      return available;
    },

    loadEmbeddingModel: async () => {
      await invoke('load_embedding_model');
      set({ isEmbeddingModelLoaded: true });
    },

    unloadEmbeddingModel: async () => {
      await invoke('unload_embedding_model');
      set({ isEmbeddingModelLoaded: false });
    },
  }))
);
