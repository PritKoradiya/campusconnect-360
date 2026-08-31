import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
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
  "Hello! I'm the CampusConnect AI Assistant. I can help you with complaints, complaint tracking, notices, events, lost & found, and other student support questions.";

const SUGGESTED_QUESTIONS = [
  'How to submit complaint?',
  'How can I track my complaint?',
  'Where can I check notices?',
  'What are the upcoming events?',
  'How to report a lost item?'
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
          <p className="dashboard-kicker">AI Campus Support</p>
          <h1>AI Campus Assistant</h1>
          <p>
            Ask questions about complaints, notices, events, lost &amp; found, and student support.
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
                <h2>CampusConnect AI</h2>
                <span className="chatbot-live-badge">24/7 Support</span>
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
                        <p>{msg.text}</p>
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
                      <span className="chatbot-typing-text">CampusConnect AI is thinking...</span>
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
              aria-label="Ask CampusConnect AI a question"
              className="chatbot-input-field"
              disabled={sending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask CampusConnect AI a question... (Press Enter to send)"
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
                    Clear your chatbot conversation history?
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
