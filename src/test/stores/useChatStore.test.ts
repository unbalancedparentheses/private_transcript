import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Tauri API
const mockInvoke = vi.fn();
const mockListen = vi.fn();
const mockUnlisten = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Import after mocking
import { useChatStore, ChatMessage, ChatConversation, RetrievedChunk } from '../../stores/useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(mockUnlisten);
    // Reset store state
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty conversations list initially', () => {
      const state = useChatStore.getState();
      expect(state.conversations).toEqual([]);
    });

    it('should have empty messages list initially', () => {
      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('should have no current conversation initially', () => {
      const state = useChatStore.getState();
      expect(state.currentConversationId).toBeNull();
    });

    it('should not be loading initially', () => {
      const state = useChatStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const state = useChatStore.getState();
      expect(state.error).toBeNull();
    });

    it('should have empty streaming content initially', () => {
      const state = useChatStore.getState();
      expect(state.streamingContent).toBe('');
    });

    it('should not be open initially', () => {
      const state = useChatStore.getState();
      expect(state.isOpen).toBe(false);
    });

    it('should not have embedding model loaded initially', () => {
      const state = useChatStore.getState();
      expect(state.isEmbeddingModelLoaded).toBe(false);
    });

    it('should not be indexing initially', () => {
      const state = useChatStore.getState();
      expect(state.isIndexing).toBe(false);
    });
  });

  describe('Panel Visibility', () => {
    it('should open the panel', () => {
      useChatStore.getState().setIsOpen(true);
      expect(useChatStore.getState().isOpen).toBe(true);
    });

    it('should close the panel', () => {
      useChatStore.setState({ isOpen: true });
      useChatStore.getState().setIsOpen(false);
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    it('should toggle the panel', () => {
      expect(useChatStore.getState().isOpen).toBe(false);
      useChatStore.getState().toggle();
      expect(useChatStore.getState().isOpen).toBe(true);
      useChatStore.getState().toggle();
      expect(useChatStore.getState().isOpen).toBe(false);
    });
  });

  describe('Conversation Management', () => {
    it('should create a new conversation', async () => {
      const newConversationId = 'conv-123';
      mockInvoke.mockResolvedValueOnce(newConversationId);
      mockInvoke.mockResolvedValueOnce([]); // loadConversations

      const result = await useChatStore.getState().createConversation('Test Chat');

      expect(mockInvoke).toHaveBeenCalledWith('create_chat_conversation', {
        title: 'Test Chat',
      });
      expect(result).toBe(newConversationId);
      expect(useChatStore.getState().currentConversationId).toBe(newConversationId);
    });

    it('should load conversations', async () => {
      const mockConversations: ChatConversation[] = [
        { id: 'conv-1', title: 'Chat 1', createdAt: 1000, updatedAt: 1000 },
        { id: 'conv-2', title: 'Chat 2', createdAt: 2000, updatedAt: 2000 },
      ];
      mockInvoke.mockResolvedValueOnce(mockConversations);

      await useChatStore.getState().loadConversations();

      expect(mockInvoke).toHaveBeenCalledWith('get_chat_conversations');
      expect(useChatStore.getState().conversations).toEqual(mockConversations);
    });

    it('should select a conversation and load messages', async () => {
      const conversationId = 'conv-123';
      const mockMessages: ChatMessage[] = [
        { id: 'msg-1', conversationId, role: 'user', content: 'Hello', createdAt: 1000 },
        { id: 'msg-2', conversationId, role: 'assistant', content: 'Hi there!', createdAt: 1001 },
      ];
      mockInvoke.mockResolvedValueOnce(mockMessages);

      await useChatStore.getState().selectConversation(conversationId);

      expect(useChatStore.getState().currentConversationId).toBe(conversationId);
      expect(useChatStore.getState().messages).toEqual(mockMessages);
    });

    it('should delete a conversation', async () => {
      const conversationId = 'conv-123';
      mockInvoke.mockResolvedValueOnce(undefined); // delete
      mockInvoke.mockResolvedValueOnce([]); // loadConversations

      useChatStore.setState({
        currentConversationId: conversationId,
        conversations: [{ id: conversationId, title: 'Test', createdAt: 1000, updatedAt: 1000 }],
      });

      await useChatStore.getState().deleteConversation(conversationId);

      expect(mockInvoke).toHaveBeenCalledWith('delete_chat_conversation', {
        conversationId,
      });
      expect(useChatStore.getState().currentConversationId).toBeNull();
    });
  });

  describe('Message Handling', () => {
    it('should load messages for a conversation', async () => {
      const conversationId = 'conv-123';
      const mockMessages: ChatMessage[] = [
        { id: 'msg-1', conversationId, role: 'user', content: 'Test', createdAt: 1000 },
      ];
      mockInvoke.mockResolvedValueOnce(mockMessages);

      await useChatStore.getState().loadMessages(conversationId);

      expect(mockInvoke).toHaveBeenCalledWith('get_chat_messages', { conversationId });
      expect(useChatStore.getState().messages).toEqual(mockMessages);
    });

    it('should clear messages', () => {
      useChatStore.setState({
        messages: [{ id: '1', conversationId: 'c', role: 'user', content: 'test', createdAt: 1000 }],
        streamingContent: 'partial',
      });

      useChatStore.getState().clearMessages();

      expect(useChatStore.getState().messages).toEqual([]);
      expect(useChatStore.getState().streamingContent).toBe('');
    });
  });

  describe('Streaming', () => {
    it('should append streaming content', () => {
      useChatStore.setState({ streamingContent: '' });

      useChatStore.getState().appendStreamingContent('Hello');
      expect(useChatStore.getState().streamingContent).toBe('Hello');

      useChatStore.getState().appendStreamingContent(' World');
      expect(useChatStore.getState().streamingContent).toBe('Hello World');
    });

    it('should finalize streaming', () => {
      useChatStore.setState({
        streamingContent: 'Complete response',
        currentConversationId: 'conv-1',
      });

      useChatStore.getState().finalizeStreaming();

      expect(useChatStore.getState().streamingContent).toBe('');
    });
  });

  describe('RAG Operations', () => {
    it('should search transcript chunks', async () => {
      const mockChunks: RetrievedChunk[] = [
        { chunkId: 'chunk-1', sessionId: 'sess-1', sessionTitle: 'Meeting', text: 'Result 1', speaker: null, similarity: 0.9 },
        { chunkId: 'chunk-2', sessionId: 'sess-2', sessionTitle: null, text: 'Result 2', speaker: 'John', similarity: 0.8 },
      ];
      mockInvoke.mockResolvedValueOnce(mockChunks);

      const results = await useChatStore.getState().searchChunks('test query');

      expect(mockInvoke).toHaveBeenCalledWith('search_transcript_chunks', {
        query: 'test query',
        limit: 5,
        minSimilarity: 0.3,
      });
      expect(results).toEqual(mockChunks);
    });

    it('should search with custom limit', async () => {
      mockInvoke.mockResolvedValueOnce([]);

      await useChatStore.getState().searchChunks('test', 10);

      expect(mockInvoke).toHaveBeenCalledWith('search_transcript_chunks', {
        query: 'test',
        limit: 10,
        minSimilarity: 0.3,
      });
    });

    it('should index a session', async () => {
      mockInvoke.mockResolvedValueOnce(15); // 15 chunks indexed

      const count = await useChatStore.getState().indexSession('sess-123');

      expect(mockInvoke).toHaveBeenCalledWith('index_session_for_rag', { sessionId: 'sess-123' });
      expect(count).toBe(15);
    });

    it('should set isIndexing while indexing session', async () => {
      let resolvePromise: (value: number) => void;
      const slowPromise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValueOnce(slowPromise);

      const indexPromise = useChatStore.getState().indexSession('sess-123');
      expect(useChatStore.getState().isIndexing).toBe(true);

      resolvePromise!(10);
      await indexPromise;

      expect(useChatStore.getState().isIndexing).toBe(false);
    });

    it('should index all sessions', async () => {
      mockInvoke.mockResolvedValueOnce(5);

      const count = await useChatStore.getState().indexAllSessions();

      expect(mockInvoke).toHaveBeenCalledWith('index_all_sessions');
      expect(count).toBe(5);
    });
  });

  describe('Model Management', () => {
    it('should check embedding model availability', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const available = await useChatStore.getState().checkEmbeddingModel();

      expect(mockInvoke).toHaveBeenCalledWith('check_embedding_model');
      expect(available).toBe(true);
      expect(useChatStore.getState().isEmbeddingModelLoaded).toBe(true);
    });

    it('should load embedding model', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useChatStore.getState().loadEmbeddingModel();

      expect(mockInvoke).toHaveBeenCalledWith('load_embedding_model');
      expect(useChatStore.getState().isEmbeddingModelLoaded).toBe(true);
    });

    it('should unload embedding model', async () => {
      useChatStore.setState({ isEmbeddingModelLoaded: true });
      mockInvoke.mockResolvedValueOnce(undefined);

      await useChatStore.getState().unloadEmbeddingModel();

      expect(mockInvoke).toHaveBeenCalledWith('unload_embedding_model');
      expect(useChatStore.getState().isEmbeddingModelLoaded).toBe(false);
    });
  });
});

describe('Chat Types', () => {
  describe('ChatMessage', () => {
    it('should have valid role types', () => {
      const validRoles = ['user', 'assistant', 'system'];
      const testMessage: ChatMessage = {
        id: '1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        createdAt: 1000,
      };

      expect(validRoles).toContain(testMessage.role);
    });

    it('should have optional source chunks', () => {
      const messageWithChunks: ChatMessage = {
        id: '1',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Response',
        sourceChunks: ['chunk-1', 'chunk-2'],
        createdAt: 1000,
      };

      const messageWithoutChunks: ChatMessage = {
        id: '2',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Question',
        createdAt: 1000,
      };

      expect(messageWithChunks.sourceChunks).toBeDefined();
      expect(messageWithChunks.sourceChunks?.length).toBe(2);
      expect(messageWithoutChunks.sourceChunks).toBeUndefined();
    });
  });

  describe('RetrievedChunk', () => {
    it('should have required fields', () => {
      const chunk: RetrievedChunk = {
        chunkId: 'chunk-1',
        sessionId: 'sess-1',
        sessionTitle: 'Meeting Notes',
        text: 'This is the chunk content',
        speaker: 'John',
        similarity: 0.85,
      };

      expect(chunk.chunkId).toBeDefined();
      expect(chunk.sessionId).toBeDefined();
      expect(chunk.text).toBeDefined();
      expect(chunk.similarity).toBeGreaterThan(0);
      expect(chunk.similarity).toBeLessThanOrEqual(1);
    });

    it('should allow null for optional fields', () => {
      const chunk: RetrievedChunk = {
        chunkId: 'chunk-1',
        sessionId: 'sess-1',
        sessionTitle: null,
        text: 'Content',
        speaker: null,
        similarity: 0.5,
      };

      expect(chunk.sessionTitle).toBeNull();
      expect(chunk.speaker).toBeNull();
    });
  });
});
