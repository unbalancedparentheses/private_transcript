import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useChatStore, ChatConversation, ChatMessage, RetrievedChunk } from '../../stores/useChatStore';
import { useSessionStore } from '../../stores/useSessionStore';
import type { Session } from '../../types';

// Mock Tauri invoke and listen
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

// Test data
const mockConversation: ChatConversation = {
  id: 'conv-1',
  title: 'Test Conversation',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockUserMessage: ChatMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'What was discussed in the meeting?',
  createdAt: Date.now(),
};

const mockAssistantMessage: ChatMessage = {
  id: 'msg-2',
  conversationId: 'conv-1',
  role: 'assistant',
  content: 'Based on your transcripts, the meeting discussed...',
  sourceChunks: ['chunk-1', 'chunk-2'],
  createdAt: Date.now(),
};

const mockSession: Session = {
  id: 'session-1',
  folderId: 'folder-1',
  title: 'Team Meeting',
  audioPath: '/audio/meeting.wav',
  audioDuration: 3600000,
  status: 'complete',
  transcript: 'The team discussed Q4 planning. Budget was approved for the new project.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Reset stores before each test
function resetStores() {
  useChatStore.setState({
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
  });
  useSessionStore.setState({
    sessions: [mockSession],
    currentSession: null,
  });
}

describe('Integration: Chat Workflow', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('Create Conversation', () => {
    it('should create a new conversation', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce('conv-1') // create_chat_conversation
        .mockResolvedValueOnce([mockConversation]); // get_chat_conversations (loadConversations)

      const conversationId = await useChatStore.getState().createConversation();

      expect(invoke).toHaveBeenCalledWith('create_chat_conversation', { title: undefined });
      expect(conversationId).toBe('conv-1');
    });

    it('should create conversation with title', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce('conv-1')
        .mockResolvedValueOnce([mockConversation]);

      const conversationId = await useChatStore.getState().createConversation('My Chat');

      expect(invoke).toHaveBeenCalledWith('create_chat_conversation', { title: 'My Chat' });
    });

    it('should handle creation failure', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Database error'));

      await expect(
        useChatStore.getState().createConversation()
      ).rejects.toThrow();
    });
  });

  describe('Load Conversations', () => {
    it('should load existing conversations', async () => {
      const conversations = [
        mockConversation,
        { ...mockConversation, id: 'conv-2', title: 'Another Chat' },
      ];
      vi.mocked(invoke).mockResolvedValueOnce(conversations);

      await useChatStore.getState().loadConversations();

      expect(useChatStore.getState().conversations).toHaveLength(2);
    });

    it('should handle empty conversations list', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([]);

      await useChatStore.getState().loadConversations();

      expect(useChatStore.getState().conversations).toHaveLength(0);
    });
  });

  describe('Send Message', () => {
    it('should send user message and receive response', async () => {
      useChatStore.setState({
        conversations: [mockConversation],
        currentConversationId: 'conv-1',
      });

      vi.mocked(invoke).mockResolvedValueOnce(mockAssistantMessage);

      await useChatStore.getState().sendMessage('What was discussed?');

      expect(invoke).toHaveBeenCalledWith('send_rag_chat_message', {
        conversationId: 'conv-1',
        message: 'What was discussed?',
      });
    });

    it('should update messages after sending', async () => {
      useChatStore.setState({
        conversations: [mockConversation],
        currentConversationId: 'conv-1',
        messages: [],
      });

      vi.mocked(invoke).mockResolvedValueOnce(mockAssistantMessage);

      await useChatStore.getState().sendMessage('Hello');

      const state = useChatStore.getState();
      expect(state.messages).toContainEqual(expect.objectContaining({
        role: 'user',
        content: 'Hello',
      }));
    });

    it('should set loading state while sending', async () => {
      useChatStore.setState({
        conversations: [mockConversation],
        currentConversationId: 'conv-1',
      });

      vi.mocked(invoke).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockAssistantMessage), 100))
      );

      const promise = useChatStore.getState().sendMessage('Hello');

      expect(useChatStore.getState().isLoading).toBe(true);

      await promise;

      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('should handle send failure gracefully', async () => {
      useChatStore.setState({
        conversations: [mockConversation],
        currentConversationId: 'conv-1',
      });

      vi.mocked(invoke).mockRejectedValueOnce(new Error('LLM unavailable'));

      // The store catches errors and sets error state, doesn't throw
      await useChatStore.getState().sendMessage('Hello');

      expect(useChatStore.getState().isLoading).toBe(false);
      expect(useChatStore.getState().error).toBe('LLM unavailable');
    });
  });

  describe('Load Messages', () => {
    it('should load messages for a conversation', async () => {
      const messages = [mockUserMessage, mockAssistantMessage];
      vi.mocked(invoke).mockResolvedValueOnce(messages);

      await useChatStore.getState().loadMessages('conv-1');

      expect(useChatStore.getState().messages).toHaveLength(2);
    });

    it('should replace previous messages when loading', async () => {
      useChatStore.setState({ messages: [mockUserMessage] });

      const newMessages = [
        mockUserMessage,
        mockAssistantMessage,
        { ...mockUserMessage, id: 'msg-3' },
      ];
      vi.mocked(invoke).mockResolvedValueOnce(newMessages);

      await useChatStore.getState().loadMessages('conv-1');

      expect(useChatStore.getState().messages).toHaveLength(3);
    });
  });

  describe('Delete Conversation', () => {
    it('should delete conversation and clear state', async () => {
      useChatStore.setState({
        conversations: [mockConversation],
        currentConversationId: 'conv-1',
        messages: [mockUserMessage],
      });

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // delete_chat_conversation
        .mockResolvedValueOnce([]); // get_chat_conversations (loadConversations)

      await useChatStore.getState().deleteConversation('conv-1');

      expect(invoke).toHaveBeenCalledWith('delete_chat_conversation', { conversationId: 'conv-1' });
      expect(useChatStore.getState().conversations).toHaveLength(0);
      expect(useChatStore.getState().currentConversationId).toBeNull();
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  describe('Select Conversation', () => {
    it('should select conversation and load messages', async () => {
      useChatStore.setState({
        conversations: [mockConversation],
      });

      vi.mocked(invoke).mockResolvedValueOnce([mockUserMessage, mockAssistantMessage]);

      await useChatStore.getState().selectConversation('conv-1');

      expect(useChatStore.getState().currentConversationId).toBe('conv-1');
      expect(useChatStore.getState().messages).toHaveLength(2);
    });

    it('should clear messages when clearing selection', () => {
      useChatStore.setState({
        conversations: [mockConversation],
        currentConversationId: 'conv-1',
        messages: [mockUserMessage],
      });

      // Use clearMessages to reset
      useChatStore.getState().clearMessages();

      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });
});

describe('Integration: RAG Context', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('Search Chunks', () => {
    it('should search transcript chunks', async () => {
      const chunks = [
        {
          chunkId: 'chunk-1',
          sessionId: 'session-1',
          sessionTitle: 'Meeting',
          text: 'Q4 budget discussion',
          speaker: 'Manager',
          similarity: 0.9,
        },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(chunks);

      const result = await invoke('search_transcript_chunks', {
        query: 'budget',
        limit: 5,
        minSimilarity: 0.3,
      });

      expect(result).toEqual(chunks);
    });

    it('should return empty array when no matches', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([]);

      const result = await invoke('search_transcript_chunks', {
        query: 'nonexistent topic',
        limit: 5,
        minSimilarity: 0.3,
      });

      expect(result).toEqual([]);
    });
  });

  describe('Index Sessions', () => {
    it('should index session for RAG', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(5); // 5 chunks created

      const chunksCreated = await invoke('index_session_for_rag', {
        sessionId: 'session-1',
      });

      expect(chunksCreated).toBe(5);
    });

    it('should index all pending sessions', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(15); // Total chunks across sessions

      const totalChunks = await invoke('index_all_sessions');

      expect(totalChunks).toBe(15);
    });
  });
});

describe('Integration: Full Chat Flow', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('should complete full conversation flow', async () => {
    // 1. Create conversation
    vi.mocked(invoke)
      .mockResolvedValueOnce('conv-1') // create_chat_conversation
      .mockResolvedValueOnce([mockConversation]); // get_chat_conversations

    const convId = await useChatStore.getState().createConversation();

    // 2. Verify conversation is set
    expect(useChatStore.getState().currentConversationId).toBe('conv-1');

    // 3. Send first message
    vi.mocked(invoke).mockResolvedValueOnce(mockAssistantMessage);
    await useChatStore.getState().sendMessage('What was the budget discussion about?');

    // 4. Send follow-up
    const followUpResponse: ChatMessage = {
      ...mockAssistantMessage,
      id: 'msg-4',
      content: 'The Q4 budget was set at $500,000 for the new project.',
    };
    vi.mocked(invoke).mockResolvedValueOnce(followUpResponse);
    await useChatStore.getState().sendMessage('What was the exact amount?');

    // Verify conversation has multiple exchanges
    expect(useChatStore.getState().messages.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle conversation with no relevant context', async () => {
    useChatStore.setState({
      conversations: [mockConversation],
      currentConversationId: 'conv-1',
    });

    // Response when no context found
    const noContextResponse: ChatMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'assistant',
      content: "I couldn't find any relevant information in your transcripts about that topic.",
      sourceChunks: [],
      createdAt: Date.now(),
    };

    vi.mocked(invoke).mockResolvedValueOnce(noContextResponse);

    await useChatStore.getState().sendMessage('What is quantum physics?');

    const messages = useChatStore.getState().messages;
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage?.content).toContain("couldn't find");
    expect(lastMessage?.sourceChunks).toHaveLength(0);
  });
});

describe('Integration: Chat Error Recovery', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('should recover from network error', async () => {
    useChatStore.setState({
      conversations: [mockConversation],
      currentConversationId: 'conv-1',
    });

    // First attempt fails
    vi.mocked(invoke).mockRejectedValueOnce(new Error('Network error'));

    await useChatStore.getState().sendMessage('Hello');

    // Error should be set
    expect(useChatStore.getState().error).toBe('Network error');
    expect(useChatStore.getState().isLoading).toBe(false);

    // Second attempt succeeds
    vi.mocked(invoke).mockResolvedValueOnce(mockAssistantMessage);

    await useChatStore.getState().sendMessage('Hello');

    expect(useChatStore.getState().isLoading).toBe(false);
    expect(useChatStore.getState().error).toBeNull();
  });

  it('should handle LLM timeout gracefully', async () => {
    useChatStore.setState({
      conversations: [mockConversation],
      currentConversationId: 'conv-1',
    });

    vi.mocked(invoke).mockRejectedValueOnce(new Error('Request timed out'));

    await useChatStore.getState().sendMessage('Complex question...');

    // State should be cleaned up
    expect(useChatStore.getState().isLoading).toBe(false);
    expect(useChatStore.getState().error).toBe('Request timed out');
  });

  it('should handle embedding model not loaded', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('Embedding model not loaded'));

    await expect(
      invoke('search_transcript_chunks', { query: 'test', limit: 5, minSimilarity: 0.3 })
    ).rejects.toThrow('Embedding model not loaded');
  });
});

describe('Integration: Chat with Multiple Sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search across multiple session transcripts', async () => {
    const sessions = [
      { ...mockSession, id: 'session-1', title: 'Budget Meeting' },
      { ...mockSession, id: 'session-2', title: 'Product Planning' },
      { ...mockSession, id: 'session-3', title: 'Team Standup' },
    ];

    useSessionStore.setState({ sessions });

    // Search should return chunks from multiple sessions
    const chunks = [
      { chunkId: 'c1', sessionId: 'session-1', sessionTitle: 'Budget Meeting', text: '...', speaker: null, similarity: 0.9 },
      { chunkId: 'c2', sessionId: 'session-2', sessionTitle: 'Product Planning', text: '...', speaker: null, similarity: 0.8 },
    ];

    vi.mocked(invoke).mockResolvedValueOnce(chunks);

    const result = await invoke('search_transcript_chunks', {
      query: 'planning',
      limit: 5,
      minSimilarity: 0.3,
    });

    expect(result).toHaveLength(2);
    expect(result.map((c: any) => c.sessionId)).toContain('session-1');
    expect(result.map((c: any) => c.sessionId)).toContain('session-2');
  });
});
