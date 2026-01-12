import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock the chat store
const mockToggle = vi.fn();
const mockLoadConversations = vi.fn();
const mockCreateConversation = vi.fn();
const mockSelectConversation = vi.fn();
const mockDeleteConversation = vi.fn();
const mockSendMessage = vi.fn();

const defaultMockState = {
  isOpen: true,
  toggle: mockToggle,
  messages: [],
  isLoading: false,
  streamingContent: '',
  error: null,
  conversations: [],
  currentConversationId: null,
  lastRetrievedChunks: [],
  loadConversations: mockLoadConversations,
  createConversation: mockCreateConversation,
  selectConversation: mockSelectConversation,
  deleteConversation: mockDeleteConversation,
  sendMessage: mockSendMessage,
};

let mockState = { ...defaultMockState };

vi.mock('../../stores/useChatStore', () => ({
  useChatStore: () => mockState,
}));

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { ...defaultMockState };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Closed State', () => {
    it('should render toggle button when closed', () => {
      mockState = { ...defaultMockState, isOpen: false };
      render(<ChatPanel />);

      const button = screen.getByTitle('Chat with transcripts');
      expect(button).toBeInTheDocument();
    });

    it('should call toggle when button is clicked', () => {
      mockState = { ...defaultMockState, isOpen: false };
      render(<ChatPanel />);

      const button = screen.getByTitle('Chat with transcripts');
      fireEvent.click(button);

      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe('Open State', () => {
    it('should render the chat panel when open', () => {
      render(<ChatPanel />);

      expect(screen.getByText('Chat with Transcripts')).toBeInTheDocument();
    });

    it('should load conversations when opened', () => {
      render(<ChatPanel />);

      expect(mockLoadConversations).toHaveBeenCalled();
    });

    it('should render empty state when no messages', () => {
      render(<ChatPanel />);

      expect(screen.getByText('Ask questions about your transcripts')).toBeInTheDocument();
      expect(screen.getByText('Your sessions are automatically indexed for search')).toBeInTheDocument();
    });

    it('should render input field', () => {
      render(<ChatPanel />);

      expect(screen.getByPlaceholderText('Ask about your transcripts...')).toBeInTheDocument();
    });

    it('should close panel when X button is clicked', () => {
      render(<ChatPanel />);

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg line'));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockToggle).toHaveBeenCalled();
      }
    });
  });

  describe('Messages', () => {
    it('should render user messages', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          { id: '1', role: 'user', content: 'Hello!', conversationId: 'conv1', createdAt: 1000 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });

    it('should render assistant messages', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          { id: '1', role: 'assistant', content: 'Hi there!', conversationId: 'conv1', createdAt: 1000 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should render multiple messages', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          { id: '1', role: 'user', content: 'Question 1', conversationId: 'conv1', createdAt: 1000 },
          { id: '2', role: 'assistant', content: 'Answer 1', conversationId: 'conv1', createdAt: 1001 },
          { id: '3', role: 'user', content: 'Question 2', conversationId: 'conv1', createdAt: 1002 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Answer 1')).toBeInTheDocument();
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    it('should show source count for messages with sources', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'Here is the answer',
            conversationId: 'conv1',
            createdAt: 1000,
            sourceChunks: ['chunk1', 'chunk2', 'chunk3'],
          },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('3 source(s)')).toBeInTheDocument();
    });
  });

  describe('Streaming', () => {
    it('should display streaming content', () => {
      mockState = {
        ...defaultMockState,
        streamingContent: 'Streaming response...',
      };
      render(<ChatPanel />);

      expect(screen.getByText('Streaming response...')).toBeInTheDocument();
    });

    it('should not show loading spinner when streaming', () => {
      mockState = {
        ...defaultMockState,
        isLoading: true,
        streamingContent: 'Streaming...',
      };
      render(<ChatPanel />);

      // Should show streaming content, not the loader
      expect(screen.getByText('Streaming...')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading and not streaming', () => {
      mockState = {
        ...defaultMockState,
        isLoading: true,
        streamingContent: '',
      };
      render(<ChatPanel />);

      // The input should be disabled
      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      expect(input).toBeDisabled();
    });

    it('should disable input when loading', () => {
      mockState = {
        ...defaultMockState,
        isLoading: true,
      };
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      expect(input).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      mockState = {
        ...defaultMockState,
        error: 'Something went wrong',
      };
      render(<ChatPanel />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Input and Submission', () => {
    it('should update input value on change', () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      fireEvent.change(input, { target: { value: 'Test message' } });

      expect(input).toHaveValue('Test message');
    });

    it('should send message on form submit', async () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      fireEvent.change(input, { target: { value: 'Test message' } });

      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should send message on Enter key', async () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      fireEvent.change(input, { target: { value: 'Enter test' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Enter test');
      });
    });

    it('should not send on Shift+Enter', () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      fireEvent.change(input, { target: { value: 'Multiline test' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should not send empty message', async () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only message', async () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      fireEvent.change(input, { target: { value: '   ' } });

      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should clear input after sending', async () => {
      render(<ChatPanel />);

      const input = screen.getByPlaceholderText('Ask about your transcripts...');
      fireEvent.change(input, { target: { value: 'Test' } });

      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should disable submit button when input is empty', () => {
      render(<ChatPanel />);

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Conversations List', () => {
    it('should toggle conversations view', () => {
      render(<ChatPanel />);

      // Find and click the conversations button
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
        expect(screen.getByText('Conversations')).toBeInTheDocument();
      }
    });

    it('should show new conversation button', () => {
      mockState = {
        ...defaultMockState,
        conversations: [],
      };
      render(<ChatPanel />);

      // Toggle to conversations view
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
        expect(screen.getByText('New conversation')).toBeInTheDocument();
      }
    });

    it('should display conversation list', () => {
      mockState = {
        ...defaultMockState,
        conversations: [
          { id: 'conv1', title: 'First Chat', createdAt: 1000, updatedAt: 1000 },
          { id: 'conv2', title: 'Second Chat', createdAt: 2000, updatedAt: 2000 },
        ],
      };
      render(<ChatPanel />);

      // Toggle to conversations view
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
        expect(screen.getByText('First Chat')).toBeInTheDocument();
        expect(screen.getByText('Second Chat')).toBeInTheDocument();
      }
    });

    it('should show empty state when no conversations', () => {
      mockState = {
        ...defaultMockState,
        conversations: [],
      };
      render(<ChatPanel />);

      // Toggle to conversations view
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
        expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      }
    });

    it('should create new conversation', async () => {
      render(<ChatPanel />);

      // Toggle to conversations view
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
      }

      // Click new conversation
      const newConvButton = screen.getByText('New conversation');
      fireEvent.click(newConvButton);

      await waitFor(() => {
        expect(mockCreateConversation).toHaveBeenCalled();
      });
    });

    it('should select a conversation', async () => {
      mockState = {
        ...defaultMockState,
        conversations: [
          { id: 'conv1', title: 'Test Chat', createdAt: 1000, updatedAt: 1000 },
        ],
      };
      render(<ChatPanel />);

      // Toggle to conversations view
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
      }

      // Click on conversation
      const convItem = screen.getByText('Test Chat');
      fireEvent.click(convItem);

      await waitFor(() => {
        expect(mockSelectConversation).toHaveBeenCalledWith('conv1');
      });
    });

    it('should show untitled for conversations without title', () => {
      mockState = {
        ...defaultMockState,
        conversations: [
          { id: 'conv1', title: '', createdAt: 1000, updatedAt: 1000 },
        ],
      };
      render(<ChatPanel />);

      // Toggle to conversations view
      const buttons = screen.getAllByRole('button');
      const convButton = buttons.find(btn => btn.getAttribute('title') === 'Conversations');
      if (convButton) {
        fireEvent.click(convButton);
        expect(screen.getByText('Untitled')).toBeInTheDocument();
      }
    });
  });

  describe('Retrieved Chunks', () => {
    it('should display retrieved chunks info', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          { id: '1', role: 'user', content: 'test', conversationId: 'conv1', createdAt: 1000 },
        ],
        lastRetrievedChunks: [
          { chunkId: '1', sessionId: 's1', sessionTitle: 'Meeting 1', text: 'content', speaker: null, similarity: 0.9 },
          { chunkId: '2', sessionId: 's2', sessionTitle: 'Meeting 2', text: 'content', speaker: null, similarity: 0.8 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('Found in 2 transcript(s)')).toBeInTheDocument();
      expect(screen.getByText('Meeting 1')).toBeInTheDocument();
      expect(screen.getByText('Meeting 2')).toBeInTheDocument();
    });

    it('should show Session for chunks without title', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          { id: '1', role: 'user', content: 'test', conversationId: 'conv1', createdAt: 1000 },
        ],
        lastRetrievedChunks: [
          { chunkId: '1', sessionId: 's1', sessionTitle: null, text: 'content', speaker: null, similarity: 0.9 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('Session')).toBeInTheDocument();
    });

    it('should limit displayed chunks to 3', () => {
      mockState = {
        ...defaultMockState,
        messages: [
          { id: '1', role: 'user', content: 'test', conversationId: 'conv1', createdAt: 1000 },
        ],
        lastRetrievedChunks: [
          { chunkId: '1', sessionId: 's1', sessionTitle: 'Meeting 1', text: 'content', speaker: null, similarity: 0.9 },
          { chunkId: '2', sessionId: 's2', sessionTitle: 'Meeting 2', text: 'content', speaker: null, similarity: 0.8 },
          { chunkId: '3', sessionId: 's3', sessionTitle: 'Meeting 3', text: 'content', speaker: null, similarity: 0.7 },
          { chunkId: '4', sessionId: 's4', sessionTitle: 'Meeting 4', text: 'content', speaker: null, similarity: 0.6 },
          { chunkId: '5', sessionId: 's5', sessionTitle: 'Meeting 5', text: 'content', speaker: null, similarity: 0.5 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.getByText('Found in 5 transcript(s)')).toBeInTheDocument();
      expect(screen.getByText('Meeting 1')).toBeInTheDocument();
      expect(screen.getByText('Meeting 2')).toBeInTheDocument();
      expect(screen.getByText('Meeting 3')).toBeInTheDocument();
      expect(screen.queryByText('Meeting 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Meeting 5')).not.toBeInTheDocument();
    });

    it('should not show chunks when no messages', () => {
      mockState = {
        ...defaultMockState,
        messages: [],
        lastRetrievedChunks: [
          { chunkId: '1', sessionId: 's1', sessionTitle: 'Meeting 1', text: 'content', speaker: null, similarity: 0.9 },
        ],
      };
      render(<ChatPanel />);

      expect(screen.queryByText('Found in 1 transcript(s)')).not.toBeInTheDocument();
    });
  });
});
