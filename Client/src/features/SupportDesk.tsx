import { useEffect, useState } from 'react';
import { supportApi } from '../data/api';
import type { SupportTicket, SupportConversationInspect } from '../data/api';
import { useMarket } from '../components/ui';
import {
  ShieldCheck,
  MessageSquare,
  Package,
  ClipboardList,
  Send,
  Store,
  User,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export function SupportDesk() {
  const { role } = useMarket();
  const admin = role === 'admin';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [chatId, setChatId] = useState('');
  const [chat, setChat] = useState<SupportConversationInspect | null>(null);

  async function refresh() {
    setTickets(await supportApi.list(query));
  }

  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!ticket) return;
    let active = true;
    const timer = setInterval(() => {
      void supportApi
        .get(ticket.id)
        .then((t) => {
          if (active) setTicket(t);
        })
        .catch(() => {});
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ticket?.id]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete this request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container section support-desk">
      <header className="support-heading">
        <div>
          <p className="eyebrow">{admin ? 'Platform support' : 'We’re here to help'}</p>
          <h1>{admin ? 'Support inbox' : 'Your support tickets'}</h1>
          <p>
            {admin
              ? 'Find a ticket, reply to its owner and close resolved conversations.'
              : 'Ask about your application, orders or markets. Your conversation stays here.'}
          </p>
        </div>
        {!admin && (
          <button
            className="button"
            onClick={() => {
              setCreating(true);
              setTicket(null);
            }}
          >
            Open a ticket
          </button>
        )}
      </header>

      <form
        className="map-search"
        onSubmit={(e) => {
          e.preventDefault();
          void run(refresh);
        }}
      >
        <input
          aria-label="Search ticket ID"
          placeholder="Search exact ticket ID (SUP-…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="button secondary" disabled={busy}>
          Search / refresh
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="support-layout">
        <aside aria-label="Support tickets">
          {tickets.length ? (
            tickets.map((t) => (
              <button
                className={`support-ticket ${ticket?.id === t.id ? 'selected' : ''}`}
                key={t.id}
                onClick={() =>
                  void run(async () => {
                    setCreating(false);
                    setTicket(await supportApi.get(t.id));
                  })
                }
              >
                <span>
                  {t.status} · {admin ? t.ownerName : t.ownerRole}
                </span>
                <strong>{t.subject}</strong>
                <small>{t.reference}</small>
                <time>{new Date(t.updatedAt).toLocaleString()}</time>
              </button>
            ))
          ) : (
            <p className="no-tickets-hint">No tickets found. Open a ticket to start a conversation.</p>
          )}
        </aside>

        <section className="support-thread">
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void run(async () => {
                  setTicket(
                    await supportApi.create(String(d.get('subject')), String(d.get('message')))
                  );
                  setCreating(false);
                  await refresh();
                });
              }}
            >
              <h2>How can we help?</h2>
              <label>
                Subject
                <input name="subject" required minLength={4} maxLength={140} />
              </label>
              <label>
                Your message
                <textarea name="message" required minLength={2} maxLength={4000} rows={6} />
              </label>
              <p className="small">
                Please include your order or conversation ID when relevant. Never share passwords.
              </p>
              <button className="button" disabled={busy}>
                Send ticket
              </button>
            </form>
          ) : ticket ? (
            <>
              <header className="ticket-header-card">
                <div>
                  <h2>{ticket.subject}</h2>
                  <div className="ticket-meta-badges">
                    <span className="ticket-reference">{ticket.reference}</span>
                    <span className={`ticket-status-pill ${ticket.status}`}>
                      {ticket.status === 'closed' ? 'Closed' : 'Active'}
                    </span>
                    <span className="ticket-owner">Owner: {ticket.ownerName}</span>
                  </div>
                </div>
                {admin && ticket.status === 'open' && (
                  <button
                    className="button secondary compact"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Close this resolved ticket? The owner will no longer be able to reply.'
                        )
                      ) {
                        void run(async () => {
                          setTicket(await supportApi.close(ticket.id));
                          await refresh();
                        });
                      }
                    }}
                  >
                    <CheckCircle2 size={15} /> Close resolved ticket
                  </button>
                )}
              </header>

              {/* Chat Inbox Style Message Feed */}
              <div className="support-chat-container">
                {ticket.messages && ticket.messages.length > 0 ? (
                  ticket.messages.map((m) => {
                    const isSupport = m.senderRole === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`support-bubble-row ${isSupport ? 'outgoing' : 'incoming'}`}
                      >
                        <div className="support-bubble-sender-line">
                          <span
                            className={`support-sender-pill ${isSupport ? 'pill-admin' : 'pill-user'}`}
                          >
                            {isSupport ? 'Support Team' : m.senderRole === 'farmer' ? 'Grower' : 'Customer'}
                          </span>
                          <span className="support-sender-name">
                            {isSupport ? 'Platform Support' : m.senderName || ticket.ownerName}
                          </span>
                          <time className="support-bubble-timestamp">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                        <div className="support-chat-bubble">
                          {m.text || m.body}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="support-no-messages">No messages in this ticket yet.</p>
                )}
              </div>

              {ticket.status === 'open' ? (
                <form
                  className="support-reply-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const message = String(new FormData(form).get('message'));
                    void run(async () => {
                      setTicket(await supportApi.reply(ticket.id, message));
                      form.reset();
                      await refresh();
                    });
                  }}
                >
                  <textarea
                    name="message"
                    required
                    minLength={2}
                    maxLength={4000}
                    rows={2}
                    placeholder="Type your response here…"
                    className="support-reply-textarea"
                  />
                  <button className="button support-reply-send-btn" disabled={busy}>
                    <Send size={15} />
                    <span>Send reply</span>
                  </button>
                </form>
              ) : (
                <div className="ticket-closed-banner">
                  <Lock size={15} />
                  <span>This ticket is closed. Open a new ticket if you need further help.</span>
                </div>
              )}
            </>
          ) : (
            <div className="support-empty">
              <MessageSquare size={36} color="var(--forest)" style={{ margin: '0 auto 12px' }} />
              <h2>A direct line to the team</h2>
              <p>Select a ticket to see its full conversation and latest response.</p>
            </div>
          )}
        </section>
      </div>

      {/* Admin Conversation Inspection Desk */}
      {admin && (
        <section className="paper-panel chat-inspection">
          <div className="chat-inspection-header-block">
            <div className="chat-inspection-badge">
              <ShieldCheck size={16} /> Audit & Inspection Desk
            </div>
            <h2>Review Customer–Grower Conversation</h2>
            <p>
              Enter a 24-character conversation ID to inspect the full conversation history. Access is read-only and logged in the administrator audit trail.
            </p>
          </div>

          <form
            className="map-search chat-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => setChat(await supportApi.conversation(chatId.trim())));
            }}
          >
            <input
              aria-label="Conversation ID"
              required
              pattern="[a-fA-F0-9]{24}"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter 24-character conversation ID (e.g. 6ab94061a3369363dc6e4234)"
              className="chat-id-input"
            />
            <button className="button secondary" disabled={busy || !chatId.trim()}>
              {busy ? 'Opening thread…' : 'Open conversation'}
            </button>
          </form>

          {chat && (
            <div className="chat-inspection-viewer">
              <div className="inspection-card-header">
                <div className="inspection-parties">
                  <div className="inspection-party customer">
                    <span className="party-label">
                      <User size={13} /> Shopper
                    </span>
                    <strong>{chat.conversation?.customerName || 'Customer'}</strong>
                    {chat.conversation?.customerEmail && (
                      <small>{chat.conversation.customerEmail}</small>
                    )}
                  </div>
                  <div className="inspection-exchange-icon">
                    <MessageSquare size={18} />
                  </div>
                  <div className="inspection-party farmer">
                    <span className="party-label">
                      <Store size={13} /> Grower Stall
                    </span>
                    <strong>{chat.conversation?.farmerBusinessName || 'Farmstead'}</strong>
                    {chat.conversation?.farmerContactPerson && (
                      <small>Contact: {chat.conversation.farmerContactPerson}</small>
                    )}
                  </div>
                </div>

                <div className="inspection-meta-bar">
                  <span className="inspection-id-code">
                    Conversation: <code>{chat.id}</code>
                  </span>
                  {chat.conversation?.status && (
                    <span className={`inspection-status-tag ${chat.conversation.status}`}>
                      {chat.conversation.status.toUpperCase()}
                    </span>
                  )}
                  {chat.conversation?.relatedProductName && (
                    <span className="inspection-context-tag">
                      <Package size={13} /> Product: {chat.conversation.relatedProductName}
                    </span>
                  )}
                  {chat.conversation?.relatedOrderNumber && (
                    <span className="inspection-context-tag">
                      <ClipboardList size={13} /> Order #{chat.conversation.relatedOrderNumber}
                    </span>
                  )}
                  <span className="inspection-readonly-tag">
                    <ShieldCheck size={13} /> Read-only audit mode
                  </span>
                </div>
              </div>

              {/* Chat Inbox Style Message Feed for Customer-Farmer Thread */}
              <div className="inspection-messages-flow">
                {chat.messages && chat.messages.length > 0 ? (
                  chat.messages.map((m) => {
                    const isCustomer = m.senderRole === 'customer';
                    return (
                      <div
                        key={m.id}
                        className={`support-bubble-row ${isCustomer ? 'incoming' : 'outgoing'}`}
                      >
                        <div className="support-bubble-sender-line">
                          <span
                            className={`support-sender-pill ${isCustomer ? 'pill-customer' : 'pill-farmer'}`}
                          >
                            {isCustomer ? 'Customer' : 'Grower Stall'}
                          </span>
                          <span className="support-sender-name">
                            {m.senderName ||
                              (isCustomer
                                ? chat.conversation?.customerName || 'Customer'
                                : chat.conversation?.farmerBusinessName || 'Grower')}
                          </span>
                          <time className="support-bubble-timestamp">
                            {new Date(m.createdAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </time>
                        </div>
                        <div className="support-chat-bubble">
                          {m.body || m.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="inspection-empty-state">
                    <p>No messages have been recorded in this conversation.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
