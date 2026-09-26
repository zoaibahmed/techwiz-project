import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Package,
  Calendar,
  User,
  ArrowLeft,
  CheckCheck,
  Check,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import {
  fetchConversationsApi,
  fetchConversationDetailApi,
  fetchMessagesApi,
  sendMessageApi,
  suggestReplyApi,
  setConversationArchiveApi,
  type ChatConversation,
  type ChatMessage,
} from '../data/api';
import type { Product, Order } from '../data/market';

export interface FarmerInboxProps {
  f: any;
  ownProducts: Product[];
  ownOrders: Order[];
}

export function FarmerInboxWorkspace({ f: _f, ownProducts: _ownProducts, ownOrders: _ownOrders }: FarmerInboxProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'order-linked' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [smartReplyLoading, setSmartReplyLoading] = useState(false);
  const [smartReplyNotice, setSmartReplyNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failCountRef = useRef(0);

  // 1. Fetch conversations list
  async function loadConversations(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchConversationsApi(filter, search);
      setConversations(data);
      // If none selected and list has items, select first item on desktop
      if (!selectedConvoId && data.length > 0 && window.innerWidth > 640) {
        setSelectedConvoId(data[0].id);
      }
    } catch (err) {
      console.error('[Load Conversations Error]:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [filter, search]);

  // 2. Fetch selected conversation detail and messages
  useEffect(() => {
    if (!selectedConvoId) {
      setSelectedConvo(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    setMessagesLoading(true);
    setSmartReplyNotice(null);

    async function loadSelected() {
      try {
        const detail = await fetchConversationDetailApi(selectedConvoId!);
        if (isMounted) setSelectedConvo(detail);

        const msgs = await fetchMessagesApi(selectedConvoId!);
        if (isMounted) {
          setMessages(msgs);
          // Update conversation in list to unread = 0
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConvoId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('[Load Detail Error]:', err);
      } finally {
        if (isMounted) setMessagesLoading(false);
      }
    }

    loadSelected();

    return () => {
      isMounted = false;
    };
  }, [selectedConvoId]);

  // 3. Periodic Background Polling — exponential backoff on failures, pause when tab hidden
  useEffect(() => {
    let cancelled = false;
    failCountRef.current = 0;

    async function poll() {
      if (cancelled) return;
      if (document.hidden) {
        // Tab not visible — retry later without counting as failure
        pollingRef.current = setTimeout(poll, 8000);
        return;
      }
      try {
        await loadConversations(true);
        if (selectedConvoId && !cancelled) {
          const freshMsgs = await fetchMessagesApi(selectedConvoId);
          if (!cancelled) setMessages(freshMsgs);
        }
        failCountRef.current = 0; // reset on success
      } catch {
        failCountRef.current = Math.min(failCountRef.current + 1, 5);
      }
      if (!cancelled) {
        // Backoff: 4s, 8s, 16s, 32s, 32s max
        const delay = Math.min(4000 * Math.pow(2, failCountRef.current - 1), 32000);
        pollingRef.current = setTimeout(poll, failCountRef.current === 0 ? 4000 : delay);
      }
    }

    pollingRef.current = setTimeout(poll, 4000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [selectedConvoId, filter, search]);

  // 4. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. Send message
  async function handleSend() {
    const text = inputText.trim();
    if (!text || !selectedConvoId || sending) return;

    setSending(true);
    setSmartReplyNotice(null);

    try {
      const sent = await sendMessageApi(selectedConvoId, text);
      setMessages((prev) => [...prev, sent]);
      setInputText('');
      // Update preview in list
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

  // 6. AI Smart Reply
  async function handleSuggestReply() {
    if (!selectedConvoId || smartReplyLoading) return;

    setSmartReplyLoading(true);
    setSmartReplyNotice(null);

    try {
      const res = await suggestReplyApi(selectedConvoId);
      if (res?.suggestedReply) {
        setInputText(res.suggestedReply);
        setSmartReplyNotice(
          res.groundingNotes || 'Drafted using live stall inventory and order status.'
        );
      }
    } catch (err: any) {
      alert(`Could not generate suggested reply: ${err.message}`);
    } finally {
      setSmartReplyLoading(false);
    }
  }

  // 7. Toggle Archive
  async function handleToggleArchive() {
    if (!selectedConvo) return;
    const isCurrentlyArchived = selectedConvo.status === 'archived';
    try {
      await setConversationArchiveApi(selectedConvo.id, !isCurrentlyArchived);
      loadConversations();
      setSelectedConvoId(null);
    } catch (err: any) {
      alert(`Could not archive conversation: ${err.message}`);
    }
  }

  return (
    <div className="farmer-workbench container">
      {/* Header */}
      <div className="fw-header">
        <div className="fw-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="fw-status-chip accepted">
              <MessageSquare size={13} /> Official Inbox
            </span>
          </div>
          <h1>Customer Communications & Messages</h1>
          <p>
            Engage directly with market shoppers. Answer freshness questions, coordinate pickup adjustments,
            and review customer requests before Saturday market day.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="farmer-inbox-workspace">
        {/* ── LEFT: CONVERSATION LIST ── */}
        <div
          className={`farmer-inbox-list ${selectedConvoId ? 'hidden-on-mobile' : ''}`}
        >
          <div className="farmer-inbox-list-header">
            <div className="farmer-inbox-title-row">
              <h2>Conversations</h2>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                {conversations.length} total
              </span>
            </div>

            <div className="farmer-inbox-search">
              <Search size={14} className="farmer-inbox-search-icon" />
              <input
                type="text"
                placeholder="Search shoppers or produce…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="farmer-inbox-filters">
              <button
                type="button"
                className={`farmer-inbox-filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`farmer-inbox-filter-tab ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
              <button
                type="button"
                className={`farmer-inbox-filter-tab ${filter === 'order-linked' ? 'active' : ''}`}
                onClick={() => setFilter('order-linked')}
              >
                Order-linked
              </button>
              <button
                type="button"
                className={`farmer-inbox-filter-tab ${filter === 'archived' ? 'active' : ''}`}
                onClick={() => setFilter('archived')}
              >
                Archived
              </button>
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
                  No customer conversations yet
                </h4>
                <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                  Messages from shoppers interested in your produce will appear here.
                </p>
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
                      <span className="farmer-inbox-item-name">{c.customerName}</span>
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
                      {c.relatedOrderNumber && (
                        <span className="farmer-context-badge">
                          Order #{c.relatedOrderNumber}
                        </span>
                      )}
                      {c.relatedProductName && (
                        <span className="farmer-context-badge">
                          {c.relatedProductName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CENTRE: ACTIVE CONVERSATION ── */}
        <div
          className={`farmer-inbox-conversation ${!selectedConvoId ? 'hidden-on-mobile' : ''}`}
        >
          {selectedConvo ? (
            <>
              {/* Conversation Header */}
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
                    {selectedConvo.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                      {selectedConvo.customerName}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Verified Market Customer
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="ml-chat-auth-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleToggleArchive}
                  >
                    {selectedConvo.status === 'archived' ? (
                      <>
                        <ArchiveRestore size={14} /> Unarchive
                      </>
                    ) : (
                      <>
                        <Archive size={14} /> Archive
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="farmer-inbox-conv-messages">
                {messagesLoading ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    Loading message history…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="ml-chat-empty">
                    <h4>No messages yet</h4>
                    <p>Send a message to start communicating with this customer.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFarmer = m.senderRole === 'farmer';
                    return (
                      <div
                        key={m.id}
                        className={`ml-chat-bubble-row ${isFarmer ? 'outgoing' : 'incoming'}`}
                      >
                        <div className="ml-chat-bubble">
                          {m.body}
                        </div>
                        <div className="ml-chat-bubble-meta">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isFarmer && (
                            m.readAt ? (
                              <span title="Read by customer" style={{ display: 'inline-flex' }}>
                                <CheckCheck size={13} color="#166534" />
                              </span>
                            ) : (
                              <span title="Delivered" style={{ display: 'inline-flex' }}>
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

              {/* AI Smart Reply Suggestions for Farmer */}
              <div className="farmer-smart-reply-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#166534" />
                  <span>
                    {smartReplyNotice || 'Need a fast grounded reply? Farm Copilot drafts responses using your live inventory.'}
                  </span>
                </div>
                <button
                  type="button"
                  className="farmer-smart-reply-btn"
                  disabled={smartReplyLoading}
                  onClick={handleSuggestReply}
                >
                  <Sparkles size={13} />
                  <span>{smartReplyLoading ? 'Drafting…' : 'Suggest reply'}</span>
                </button>
              </div>

              {/* Input Area */}
              <form
                className="ml-chat-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <textarea
                  className="ml-chat-textarea"
                  placeholder={`Reply to ${selectedConvo.customerName}…`}
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
                  <span>{sending ? 'Sending…' : 'Reply'}</span>
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
                Choose a customer conversation from the list to view history, review pre-order inquiries, and reply.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: AUTHORITATIVE CONTEXT PANEL ── */}
        {selectedConvo && (
          <aside className="farmer-inbox-context-panel">
            {/* Customer Details */}
            <div className="farmer-context-card">
              <h4>
                <User size={15} /> Customer Details
              </h4>
              <dl>
                <dt>Name</dt>
                <dd>{selectedConvo.customerName}</dd>
                <dt>Status</dt>
                <dd>MarketLink Shopper</dd>
                <dt>Email / ID</dt>
                <dd style={{ wordBreak: 'break-all' }}>{selectedConvo.customerId}</dd>
              </dl>
            </div>

            {/* Produce Context (if linked) */}
            {selectedConvo.productContext && (
              <div className="farmer-context-card">
                <h4>
                  <Package size={15} /> Inquired Produce
                </h4>
                <p style={{ fontWeight: 600, color: '#111827' }}>
                  {selectedConvo.productContext.name}
                </p>
                <dl style={{ marginTop: '8px' }}>
                  <dt>Base Price</dt>
                  <dd>Rs. {(selectedConvo.productContext.priceMinor / 100).toFixed(0)} / {selectedConvo.productContext.unit}</dd>
                </dl>
              </div>
            )}

            {/* Order Context (if linked) */}
            {selectedConvo.orderContext && (
              <div className="farmer-context-card">
                <h4>
                  <Calendar size={15} /> Linked Pre-Order
                </h4>
                <dl>
                  <dt>Order #</dt>
                  <dd>#{selectedConvo.orderContext.orderNumber}</dd>
                  <dt>Status</dt>
                  <dd style={{ textTransform: 'capitalize' }}>
                    {selectedConvo.orderContext.status.replace(/_/g, ' ')}
                  </dd>
                  <dt>Pickup Date</dt>
                  <dd>{selectedConvo.orderContext.pickupDate}</dd>
                  <dt>Slot</dt>
                  <dd>{selectedConvo.orderContext.pickupTimeSlot}</dd>
                  <dt>Total Value</dt>
                  <dd>Rs. {(selectedConvo.orderContext.totalAmountMinor / 100).toFixed(0)}</dd>
                </dl>

                {selectedConvo.orderContext.lines && selectedConvo.orderContext.lines.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Reserved Items:
                    </span>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '16px', fontSize: '12.5px', color: '#374151' }}>
                      {selectedConvo.orderContext.lines.map((l, idx) => (
                        <li key={idx}>
                          {l.quantity} {l.unit} {l.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
