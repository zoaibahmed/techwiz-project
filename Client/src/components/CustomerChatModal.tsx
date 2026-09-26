import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  MessageSquare,
  Lock,
  Package,
  Calendar,
  AlertCircle,
  RotateCcw,
  CheckCheck,
  Check,
} from 'lucide-react';
import {
  fetchMessagesApi,
  sendMessageApi,
  startConversationApi,
  fetchConversationDetailApi,
  type ChatConversation,
  type ChatMessage,
} from '../data/api';
import { useMarket } from './ui';

export interface CustomerChatModalProps {
  farmerId: string;
  farmerName?: string;
  farmerPerson?: string;
  productId?: string | null;
  productName?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  conversationId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerChatModal({
  farmerId,
  farmerName,
  farmerPerson,
  productId,
  productName,
  orderId,
  orderNumber,
  conversationId: initialConversationId,
  isOpen,
  onClose,
}: CustomerChatModalProps) {
  const s = useMarket();
  const navigate = useNavigate();

  const [activeConvo, setActiveConvo] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCustomerLoggedIn = s.role === 'customer';

  // 1. Initialize or fetch existing conversation
  useEffect(() => {
    if (!isOpen || !isCustomerLoggedIn) return;

    let isMounted = true;
    setLoading(true);
    setSendError(null);

    async function initChat() {
      try {
        if (initialConversationId) {
          const detail = await fetchConversationDetailApi(initialConversationId);
          if (isMounted) {
            setActiveConvo(detail);
            const msgs = await fetchMessagesApi(detail.id);
            if (isMounted) setMessages(msgs);
          }
        } else {
          // If no initialConversationId, check if conversation already exists or wait for first message
          const existing = await fetch(`/api/v1/chat/conversations`, {
            credentials: 'include',
          })
            .then((r) => r.json())
            .then((j) => (j?.data || []) as ChatConversation[])
            .catch(() => []);

          const match = existing.find(
            (c) =>
              c.farmerProfileId === farmerId &&
              ((orderId && c.relatedOrderId === orderId) ||
                (productId && c.relatedProductId === productId) ||
                (!orderId && !productId))
          );

          if (match && isMounted) {
            setActiveConvo(match);
            const msgs = await fetchMessagesApi(match.id);
            if (isMounted) setMessages(msgs);
          }
        }
      } catch (err: any) {
        console.error('[Chat Init Error]:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initChat();

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, isCustomerLoggedIn, farmerId, productId, orderId, initialConversationId]);

  // 2. Poll for new incoming messages while modal is open
  useEffect(() => {
    if (!isOpen || !isCustomerLoggedIn || !activeConvo) return;

    pollingRef.current = setInterval(async () => {
      try {
        const freshMessages = await fetchMessagesApi(activeConvo.id);
        setMessages(freshMessages);
      } catch {}
    }, 3500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, isCustomerLoggedIn, activeConvo]);

  // 3. Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  // ── A. Logged-Out Authentication Prompt ──
  if (!isCustomerLoggedIn) {
    return (
      <div className="ml-chat-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div className="ml-chat-auth-prompt" onClick={(e) => e.stopPropagation()}>
          <div className="ml-chat-auth-icon">
            <Lock size={26} />
          </div>
          <h3>Sign in to message this grower</h3>
          <p>
            Have a question about harvest times, produce variety, or market day pickup?
            Sign in with your customer account or create one to chat directly with {farmerName || 'the producer'}.
          </p>
          <div className="ml-chat-auth-actions">
            <button
              className="ml-chat-auth-btn-primary"
              onClick={() => {
                onClose();
                navigate('/login', { state: { returnTo: window.location.pathname } });
              }}
            >
              Sign in to MarketLink
            </button>
            <button
              className="ml-chat-auth-btn-secondary"
              onClick={() => {
                onClose();
                navigate('/register/customer', { state: { returnTo: window.location.pathname } });
              }}
            >
              Create customer account
            </button>
            <button className="ml-chat-auth-btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── B. Logged-In Customer Chat Window ──
  async function handleSend(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);
    setLastFailedMessage(null);

    try {
      if (!activeConvo) {
        // First message: start conversation
        const res = await startConversationApi({
          farmerId,
          productId: productId || null,
          orderId: orderId || null,
          message: text,
        });

        setActiveConvo(res.conversation);
        const fresh = await fetchMessagesApi(res.conversationId);
        setMessages(fresh);
      } else {
        // Send message to existing conversation
        const sent = await sendMessageApi(activeConvo.id, text);
        setMessages((prev) => [...prev, sent]);
      }
      setInputText('');
    } catch (err: any) {
      console.error('[Send Error]:', err);
      setSendError(err.message || 'Failed to send message. Please retry.');
      setLastFailedMessage(text);
    } finally {
      setSending(false);
    }
  }

  const displayName = activeConvo?.farmerBusinessName || farmerName || 'Produce Grower';
  const displayContact = activeConvo?.farmerContactPerson || farmerPerson || 'Stall Producer';

  return (
    <div className="ml-chat-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ml-chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ml-chat-header">
          <div className="ml-chat-header-info">
            <div className="ml-chat-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="ml-chat-header-title">
              <span className="ml-chat-header-name">
                {displayName}
              </span>
              <span className="ml-chat-header-sub">
                Lead Grower: {displayContact} · Direct Stall Messaging
              </span>
            </div>
          </div>
          <button className="ml-chat-close-btn" onClick={onClose} aria-label="Close message window">
            <X size={18} />
          </button>
        </div>

        {/* Structured Context Ribbon (Product or Order) */}
        {(activeConvo?.productContext || productId) && (
          <div className="ml-chat-context-ribbon">
            <div className="ml-chat-context-tag">
              <Package size={15} color="#166534" />
              <span>Produce: <strong>{activeConvo?.productContext?.name || productName || 'Selected Harvest'}</strong></span>
            </div>
            <span className="ml-chat-context-badge">Live Context</span>
          </div>
        )}

        {(activeConvo?.orderContext || orderId) && (
          <div className="ml-chat-context-ribbon">
            <div className="ml-chat-context-tag">
              <Calendar size={15} color="#166534" />
              <span>Reservation: <strong>#{activeConvo?.orderContext?.orderNumber || orderNumber || 'Pre-order'}</strong></span>
            </div>
            <span className="ml-chat-context-badge">
              {activeConvo?.orderContext?.status?.replace(/_/g, ' ') || 'Active Order'}
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div className="ml-chat-messages">
          {loading ? (
            <div className="ml-chat-empty">
              <p>Connecting to secure grower conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="ml-chat-empty">
              <div className="ml-chat-empty-icon">
                <MessageSquare size={22} />
              </div>
              <h4>Start your message</h4>
              <p>
                Ask {displayName} about harvest freshness, upcoming Saturday availability,
                or specific pre-order pickup arrangements.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.isSelf || m.senderRole === 'customer';
              return (
                <div
                  key={m.id}
                  className={`ml-chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}
                >
                  <div className="ml-chat-bubble">
                    {m.body}
                  </div>
                  <div className="ml-chat-bubble-meta">
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      m.readAt ? (
                        <span title="Read by grower" style={{ display: 'inline-flex' }}>
                          <CheckCheck size={13} color="#166534" />
                        </span>
                      ) : (
                        <span title="Sent" style={{ display: 'inline-flex' }}>
                          <Check size={13} />
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sendError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontSize: '12.5px', padding: '6px 0' }}>
              <AlertCircle size={15} />
              <span>{sendError}</span>
              {lastFailedMessage && (
                <button
                  type="button"
                  className="ml-chat-retry-btn"
                  onClick={() => handleSend(lastFailedMessage)}
                >
                  <RotateCcw size={12} style={{ display: 'inline', marginRight: '3px' }} /> Retry
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          className="ml-chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <textarea
            className="ml-chat-textarea"
            placeholder={`Message ${displayName}…`}
            value={inputText}
            rows={1}
            maxLength={2000}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="submit"
            className="ml-chat-send-btn"
            disabled={!inputText.trim() || sending}
            aria-label="Send message"
          >
            <Send size={15} />
            <span>{sending ? 'Sending…' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
