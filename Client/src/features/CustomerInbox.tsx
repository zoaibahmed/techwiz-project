import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Send,
  Package,
  Calendar,
  Store,
  ArrowLeft,
  CheckCheck,
  Check,
  Compass,
} from 'lucide-react';
import {
  fetchConversationsApi,
  fetchConversationDetailApi,
  fetchMessagesApi,
  sendMessageApi,
  type ChatConversation,
  type ChatMessage,
} from '../data/api';

export function CustomerInboxWorkspace() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failCountRef = useRef(0);

  async function loadConversations(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchConversationsApi('all', search);
      setConversations(data);
      if (!selectedConvoId && data.length > 0 && window.innerWidth > 640) {
        setSelectedConvoId(data[0].id);
      }
    } catch (err) {
      console.error('[Load Customer Convos Error]:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [search]);

  useEffect(() => {
    if (!selectedConvoId) {
      setSelectedConvo(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    setMessagesLoading(true);

    async function loadSelected() {
      try {
        const detail = await fetchConversationDetailApi(selectedConvoId!);
        if (isMounted) setSelectedConvo(detail);

        const msgs = await fetchMessagesApi(selectedConvoId!);
        if (isMounted) {
          setMessages(msgs);
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConvoId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('[Load Convo Detail Error]:', err);
      } finally {
        if (isMounted) setMessagesLoading(false);
      }
    }

    loadSelected();

    return () => {
      isMounted = false;
    };
  }, [selectedConvoId]);

  // Polling — exponential backoff on failures, pause when tab hidden
  useEffect(() => {
    let cancelled = false;
    failCountRef.current = 0;

    async function poll() {
      if (cancelled) return;
      if (document.hidden) {
        pollingRef.current = setTimeout(poll, 8000);
        return;
      }
      try {
        await loadConversations(true);
        if (selectedConvoId && !cancelled) {
          const freshMsgs = await fetchMessagesApi(selectedConvoId);
          if (!cancelled) setMessages(freshMsgs);
        }
        failCountRef.current = 0;
      } catch {
        failCountRef.current = Math.min(failCountRef.current + 1, 5);
      }
      if (!cancelled) {
        const delay = failCountRef.current === 0
          ? 4000
          : Math.min(4000 * Math.pow(2, failCountRef.current - 1), 32000);
        pollingRef.current = setTimeout(poll, delay);
      }
    }

    pollingRef.current = setTimeout(poll, 4000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [selectedConvoId, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !selectedConvoId || sending) return;

    setSending(true);
    try {
      const sent = await sendMessageApi(selectedConvoId, text);
      setMessages((prev) => [...prev, sent]);
      setInputText('');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvoId
            ? { ...c, lastMessageText: text, lastMessageAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      alert(`Could not send message: ${err.message || 'Network error'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container section">
      <div className="pe-section-header" style={{ marginBottom: '24px' }}>
        <span className="pe-eyebrow">
          <MessageSquare size={14} /> Direct Communications
        </span>
        <h1 className="pe-section-title">Grower Messages & Inquiries</h1>
        <p className="pe-section-lead">
          Connect directly with local producers about crop availability, special harvest requests,
          and pickup coordination.
        </p>
      </div>

      <div className="farmer-inbox-workspace">
        {/* Left: Convo list */}
        <div className={`farmer-inbox-list ${selectedConvoId ? 'hidden-on-mobile' : ''}`}>
          <div className="farmer-inbox-list-header">
            <div className="farmer-inbox-title-row">
              <h2>My Conversations</h2>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                {conversations.length} total
              </span>
            </div>

            <div className="farmer-inbox-search">
              <Search size={14} className="farmer-inbox-search-icon" />
              <input
                type="text"
                placeholder="Search growers or messages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="farmer-inbox-items">
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280', fontSize: '13.5px' }}>
                Loading conversations…
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <MessageSquare size={18} />
                </div>
                <h4 style={{ fontSize: '14.5px', fontWeight: 600, margin: '0 0 6px', color: '#111827' }}>
                  No grower conversations yet
                </h4>
                <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Ask questions about produce freshness or market pickups directly from any grower's stall.
                </p>
                <Link to="/farmers" className="button secondary compact" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={14} /> Discover growers
                </Link>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === selectedConvoId;
                return (
                  <div
                    key={c.id}
                    className={`farmer-inbox-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedConvoId(c.id)}
                  >
                    <div className="farmer-inbox-item-top">
                      <span className="farmer-inbox-item-name">{c.farmerBusinessName}</span>
                      <span className="farmer-inbox-item-time">
                        {c.lastMessageAt
                          ? new Date(c.lastMessageAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>

                    <div className="farmer-inbox-item-preview">
                      {c.lastMessageText || 'New conversation'}
                    </div>

                    <div className="farmer-inbox-item-badges">
                      {c.unreadCount > 0 && (
                        <span className="farmer-unread-badge">
                          {c.unreadCount} new
                        </span>
                      )}
                      {c.relatedProductName && (
                        <span className="farmer-context-badge">
                          {c.relatedProductName}
                        </span>
                      )}
                      {c.relatedOrderNumber && (
                        <span className="farmer-context-badge">
                          Order #{c.relatedOrderNumber}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Centre: Messages thread */}
        <div className={`farmer-inbox-conversation ${!selectedConvoId ? 'hidden-on-mobile' : ''}`}>
          {selectedConvo ? (
            <>
              <div className="farmer-inbox-conv-header">
                <div className="farmer-inbox-conv-title">
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    onClick={() => setSelectedConvoId(null)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="ml-chat-avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                    {selectedConvo.farmerBusinessName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                      {selectedConvo.farmerBusinessName}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Grower: {selectedConvo.farmerContactPerson || 'Stall Producer'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/farmers/${selectedConvo.farmerProfileId}`}
                  className="ml-chat-auth-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Store size={13} /> View Stall Profile
                </Link>
              </div>

              <div className="farmer-inbox-conv-messages">
                {messagesLoading ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    Loading message history…
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
                <div ref={messagesEndRef} />
              </div>

              <form
                className="ml-chat-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <textarea
                  className="ml-chat-textarea"
                  placeholder={`Message ${selectedConvo.farmerBusinessName}…`}
                  value={inputText}
                  rows={2}
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
                >
                  <Send size={15} />
                  <span>{sending ? 'Sending…' : 'Send'}</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', maxWidth: '360px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <MessageSquare size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                Choose a conversation to view your message history with that grower.
              </p>
            </div>
          )}
        </div>

        {/* Right: Producer & context */}
        {selectedConvo && (
          <aside className="farmer-inbox-context-panel">
            <div className="farmer-context-card">
              <h4>
                <Store size={15} /> Farmstead Information
              </h4>
              <p style={{ fontWeight: 600, color: '#111827' }}>
                {selectedConvo.farmerBusinessName}
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                Producer: {selectedConvo.farmerContactPerson || 'Stall Lead'}
              </p>
              <div style={{ marginTop: '12px' }}>
                <Link
                  to={`/farmers/${selectedConvo.farmerProfileId}`}
                  className="button secondary compact"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Open Farm Catalogue →
                </Link>
              </div>
            </div>

            {selectedConvo.productContext && (
              <div className="farmer-context-card">
                <h4>
                  <Package size={15} /> Produce Context
                </h4>
                <p style={{ fontWeight: 600, color: '#111827' }}>
                  {selectedConvo.productContext.name}
                </p>
                <dl style={{ marginTop: '8px' }}>
                  <dt>Price</dt>
                  <dd>Rs. {(selectedConvo.productContext.priceMinor / 100).toFixed(0)} / {selectedConvo.productContext.unit}</dd>
                </dl>
              </div>
            )}

            {selectedConvo.orderContext && (
              <div className="farmer-context-card">
                <h4>
                  <Calendar size={15} /> Linked Reservation
                </h4>
                <dl>
                  <dt>Order #</dt>
                  <dd>#{selectedConvo.orderContext.orderNumber}</dd>
                  <dt>Status</dt>
                  <dd style={{ textTransform: 'capitalize' }}>
                    {selectedConvo.orderContext.status.replace(/_/g, ' ')}
                  </dd>
                  <dt>Pickup</dt>
                  <dd>{selectedConvo.orderContext.pickupDate} ({selectedConvo.orderContext.pickupTimeSlot})</dd>
                </dl>
                <div style={{ marginTop: '12px' }}>
                  <Link
                    to={`/customer/orders/${selectedConvo.orderContext.id}`}
                    className="button secondary compact"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    View Order Passport →
                  </Link>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
