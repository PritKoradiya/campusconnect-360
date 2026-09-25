import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  CornerDownLeft,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  askChatbot,
  deleteChatbotHistory,
  getChatbotHistory
} from '../../services/chatbotService';

const WELCOME_TEXT =
  "Hello! I am your 🤖 AI Campus Assistant. Ask me anything—from general questions like programming, algorithms, and React, to your personal campus complaints, event registrations, attendance, and profile details!";

const SUGGESTED_QUESTIONS = [
  'How many pending complaints do I have?',
  'What events am I registered for?',
  'How many events have I attended?',
  'What are the upcoming events?',
  'What is my profile information?',
  'What is recursion?',
  'Explain React hooks with an example.',
  'Write a C program for binary search.'
];

function formatTime(dateValue) {
  if (!dateValue) return '';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Helper component to render code block with copy action safely without raw HTML.
 */
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', margin: '10px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#040d16',
          padding: '6px 12px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderBottom: 'none',
          fontSize: '11px',
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        <span>{language || 'Code'}</span>
        <button
          onClick={handleCopy}
          type="button"
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? '#4ade80' : '#38bdf8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px'
          }}
          title="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Safely parse inline formatting (bold `**text**` and inline code `` `code` ``) into React elements.
 */
function parseInlineFormatting(text) {
  if (!text) return null;

  // Split by inline code first
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={`code-${pIdx}`}>{part.slice(1, -1)}</code>
      );
    }

    // Split by bold (**bold**)
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
        return (
          <strong key={`b-${pIdx}-${bIdx}`}>{bPart.slice(2, -2)}</strong>
        );
      }
      return bPart;
    });
  });
}

/**
 * Safely formats AI text without dangerouslySetInnerHTML.
 * Supports: code blocks (```lang ... ```), lists (*, -, 1.), bold (**), inline code.
 */
function FormattedMessage({ text }) {
  if (!text) return null;

  // Split content by code fences
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    blocks.push({
      type: 'code',
      language: match[1] || '',
      content: match[2].trimEnd()
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return (
    <div>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              code={block.content}
              key={`block-${idx}`}
              language={block.language}
            />
          );
        }

        // Parse paragraphs and bullet/numbered lists
        const paragraphs = block.content.split(/\n\s*\n/);

        return (
          <div key={`block-${idx}`}>
            {paragraphs.map((para, pIdx) => {
              const lines = para.trim().split('\n');

              // Check if paragraph is a list
              const isBulletList = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
              const isNumberedList = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));

              if (isBulletList) {
                return (
                  <ul key={`ul-${pIdx}`} style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {lines.map((line, lIdx) => (
                      <li key={`li-${lIdx}`}>
                        {parseInlineFormatting(line.replace(/^\s*[-*•]\s+/, ''))}
                      </li>
                    ))}
                  </ul>
                );
              }

              if (isNumberedList) {
                return (
                  <ol key={`ol-${pIdx}`} style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {lines.map((line, lIdx) => (
                      <li key={`li-${lIdx}`}>
                        {parseInlineFormatting(line.replace(/^\s*\d+\.\s+/, ''))}
                      </li>
                    ))}
                  </ol>
                );
              }

              return (
                <p key={`p-${pIdx}`} style={{ margin: pIdx > 0 ? '8px 0 0 0' : 0 }}>
                  {lines.map((line, lIdx) => (
                    <span key={`line-${lIdx}`}>
                      {parseInlineFormatting(line)}
                      {lIdx < lines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, sending]);

  // Load chat history from backend on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expired. Please login again.');
        setLoadingHistory(false);
        return;
      }

      try {
        setLoadingHistory(true);
        setError('');
        const response = await getChatbotHistory();
        const historyList = response.data?.history || response.data || [];

        if (Array.isArray(historyList) && historyList.length > 0) {
          // Backend returns newest first (createdAt: -1), reverse for chronological conversation order
          const chronological = [...historyList].reverse();
          const parsed = [];

          chronological.forEach((item, index) => {
            if (item.question) {
              parsed.push({
                id: `hist-q-${item._id || index}`,
                sender: 'user',
                text: item.question,
                time: formatTime(item.createdAt)
              });
            }
            if (item.answer) {
              parsed.push({
                id: `hist-a-${item._id || index}`,
                sender: 'ai',
                text: item.answer,
                intent: item.intent,
                time: formatTime(item.createdAt)
              });
            }
          });

          setMessages(parsed);
        } else {
          // Empty history: display initial welcome message
          setMessages([
            {
              id: 'initial-welcome',
              sender: 'ai',
              text: WELCOME_TEXT,
              time: formatTime(new Date()),
              isWelcome: true
            }
          ]);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else {
          setError(
            err.response?.data?.message || 'Failed to load chatbot conversation history.'
          );
        }
        // Even on error, show welcome state so user can still chat
        setMessages([
          {
            id: 'initial-welcome',
            sender: 'ai',
            text: WELCOME_TEXT,
            time: formatTime(new Date()),
            isWelcome: true
          }
        ]);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  const handleSendMessage = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend.trim() : input.trim();

    if (!query || sending) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      return;
    }

    const currentTime = formatTime(new Date());
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: currentTime
    };

    // Immediately add user message and clear input
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setSuccess('');
    setSending(true);

    try {
      const response = await askChatbot(query);
      const answer = response.data?.answer || "I'm sorry, I could not process your request.";
      const intent = response.data?.intent;

      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: answer,
        intent,
        time: formatTime(new Date())
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 429) {
        setError(err.response?.data?.message || 'AI usage limit reached. Please try again later.');
      } else {
        setError(
          err.response?.data?.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConfirmClear = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setClearModalOpen(false);
      return;
    }

    try {
      setClearing(true);
      setError('');
      await deleteChatbotHistory();

      // Clear messages and reset to welcome message
      setMessages([
        {
          id: 'welcome-cleared',
          sender: 'ai',
          text: WELCOME_TEXT,
          time: formatTime(new Date()),
          isWelcome: true
        }
      ]);
      setSuccess('Chat history cleared successfully.');
      setClearModalOpen(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(
          err.response?.data?.message || 'Failed to clear chat history.'
        );
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Top Hero Section */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">CampusConnect 360</p>
          <h1>🤖 AI Campus Assistant</h1>
          <p>
            Ask general questions about programming, computer science, and academics, or ask about your complaints, events, attendance, and profile.
          </p>
        </div>
        <div className="chatbot-hero-status">
          <span className="chatbot-status-indicator">
            <span className="chatbot-status-dot" />
            Online • Ready to help
          </span>
          <button
            className="chatbot-clear-btn"
            onClick={() => setClearModalOpen(true)}
            title="Clear Chat History"
            type="button"
          >
            <Trash2 size={16} />
            <span>Clear Chat</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Main Chatbot Card */}
      <AnimatedCard className="chatbot-container-card" delay={0.12} hover={false}>
        {/* Chat Header */}
        <div className="chatbot-card-header">
          <div className="chatbot-header-profile">
            <div className="chatbot-avatar-pulse">
              <Bot size={24} />
            </div>
            <div>
              <div className="chatbot-header-title-row">
                <h2>🤖 AI Campus Assistant</h2>
                <span className="chatbot-live-badge">24/7 AI Support</span>
              </div>
              <p className="chatbot-header-subtitle">
                <span className="chatbot-status-dot-small" />
                Online • Ready to help
              </p>
            </div>
          </div>

          <button
            className="chatbot-header-action-btn"
            onClick={() => setClearModalOpen(true)}
            title="Clear conversation"
            type="button"
          >
            <RotateCcw size={15} />
            <span>Reset History</span>
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {success && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="chatbot-alert chatbot-alert-success"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: -10 }}
            >
              <CheckCircle2 size={18} />
              <span>{success}</span>
              <button
                className="chatbot-alert-close"
                onClick={() => setSuccess('')}
                type="button"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="chatbot-alert chatbot-alert-error"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: -10 }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                className="chatbot-alert-close"
                onClick={() => setError('')}
                type="button"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Body */}
        <div className="chatbot-messages-area" role="log" aria-live="polite">
          {loadingHistory ? (
            <div className="chatbot-loading-state">
              <div className="chatbot-loading-spinner" />
              <p>Loading conversation history...</p>
            </div>
          ) : (
            <div className="chatbot-messages-list">
              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';

                return (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className={`chatbot-message-row ${isUser ? 'user-row' : 'ai-row'}`}
                    initial={{ opacity: 0, y: 12 }}
                    key={msg.id || index}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  >
                    {!isUser && (
                      <div className="chatbot-msg-avatar ai-avatar">
                        <Bot size={18} />
                      </div>
                    )}

                    <div className="chatbot-bubble-wrap">
                      <div className={`chatbot-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
                        {isUser ? (
                          <p>{msg.text}</p>
                        ) : (
                          <FormattedMessage text={msg.text} />
                        )}
                      </div>
                      <div className="chatbot-message-meta">
                        {msg.time && <span className="chatbot-message-time">{msg.time}</span>}
                        {msg.intent && (
                          <span className="chatbot-intent-badge">
                            {msg.intent.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="chatbot-msg-avatar user-avatar">
                        <User size={18} />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing / Thinking Indicator */}
              {sending && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="chatbot-message-row ai-row"
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="chatbot-msg-avatar ai-avatar">
                    <Bot size={18} />
                  </div>
                  <div className="chatbot-bubble-wrap">
                    <div className="chatbot-bubble ai-bubble chatbot-typing-bubble">
                      <span className="chatbot-typing-dot" />
                      <span className="chatbot-typing-dot" />
                      <span className="chatbot-typing-dot" />
                      <span className="chatbot-typing-text">🤖 AI Campus Assistant is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Suggested Questions Section */}
        <div className="chatbot-suggestions-section">
          <div className="chatbot-suggestions-label">
            <Sparkles size={15} />
            <span>Suggested Questions</span>
          </div>
          <div className="chatbot-suggestions-grid">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                className="chatbot-suggestion-chip"
                disabled={sending}
                key={question}
                onClick={() => handleSendMessage(question)}
                type="button"
              >
                <MessageSquare size={14} />
                <span>{question}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Section */}
        <form
          className="chatbot-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="chatbot-input-wrapper">
            <input
              aria-label="Ask anything..."
              className="chatbot-input-field"
              disabled={sending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              ref={inputRef}
              type="text"
              value={input}
            />
            <button
              aria-label="Send message"
              className="chatbot-send-button"
              disabled={sending || !input.trim()}
              type="submit"
            >
              <Send size={18} />
              <span className="chatbot-send-label">Send</span>
              <CornerDownLeft size={13} className="chatbot-send-hint" />
            </button>
          </div>
        </form>
      </AnimatedCard>

      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {clearModalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card chatbot-confirm-modal"
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Confirmation</p>
                  <h2>Clear Chat History</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setClearModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div className="chatbot-confirm-icon-wrap">
                  <Trash2 size={26} />
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    Clear your conversation history?
                  </p>
                  <p className="chatbot-confirm-desc">
                    This will delete your stored conversation history from the server. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={clearing}
                  onClick={() => setClearModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="chatbot-danger-btn"
                  disabled={clearing}
                  onClick={handleConfirmClear}
                  type="button"
                >
                  {clearing ? 'Clearing...' : 'Clear Chat'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default Chatbot;
