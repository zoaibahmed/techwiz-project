import './support-inbox.css';
import { useEffect, useRef, useState } from 'react';
import { supportApi, adminInquiriesApi } from '../data/api';
import type { SupportTicket, SupportConversationInspect, AdminInquiryItem } from '../data/api';
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
  Mail,
  Inbox,
  Clock,
  RotateCcw,
  Search,
  Phone,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

interface SupportDeskProps {
  initialDeskTab?: 'inquiries' | 'tickets' | 'audit';
}

export function SupportDesk({ initialDeskTab }: SupportDeskProps = {}) {
  const { role, inquiries: contextInquiries } = useMarket();
  const admin = role === 'admin';

  // For admin, determine initial tab (defaults to 'tickets' on /admin/support for test compatibility, or 'inquiries' if specified or on /admin/inquiries)
  const [deskTab, setDeskTab] = useState<'inquiries' | 'tickets' | 'audit'>(() => {
    if (!admin) return 'tickets';
    if (initialDeskTab) return initialDeskTab;
    if (typeof window !== 'undefined' && window.location.pathname.includes('/inquiries')) {
      return 'inquiries';
    }
    return 'tickets';
  });

  // --- Registered Support Tickets State ---
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [chatId, setChatId] = useState('');
  const [chat, setChat] = useState<SupportConversationInspect | null>(null);

  // --- Website & Chatbot Contact Inquiries State (Admin) ---
  const [inquiries, setInquiries] = useState<AdminInquiryItem[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<AdminInquiryItem | null>(null);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inspectEndRef = useRef<HTMLDivElement>(null);

  async function refreshTickets() {
    setTickets(await supportApi.list(query));
  }

  async function refreshInquiries() {
    if (!admin) return;
    try {
      const data = await adminInquiriesApi.list();
      setInquiries(data);
      if (selectedInquiry) {
        const found = data.find((i) => i.id === selectedInquiry.id);
        if (found) setSelectedInquiry(found);
      }
    } catch {
      // Fallback to market context inquiries if available
      if (contextInquiries && contextInquiries.length > 0) {
        setInquiries(
          contextInquiries.map((iq) => ({
            id: iq.id,
            name: iq.name,
            email: iq.email,
            subject: iq.subject,
            message: iq.message,
            status: (iq.status as 'new' | 'in_progress' | 'resolved') || 'new',
            createdAt: iq.at || new Date().toISOString(),
          }))
        );
      }
    }
  }

  useEffect(() => {
    void refreshTickets().catch((e) => setError(e.message));
    if (admin) {
      void refreshInquiries();
    }
  }, [admin]);

  useEffect(() => {
    if (selectedInquiry) {
      setInquiryNotes(selectedInquiry.adminNotes || '');
    }
  }, [selectedInquiry?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length, ticket?.id]);

  useEffect(() => {
    inspectEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages?.length, chat?.id]);

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

  async function handleUpdateInquiryStatus(
    id: string,
    newStatus: 'new' | 'in_progress' | 'resolved',
    notes?: string
  ) {
    try {
      setInquiryBusy(true);
      setError('');
      const updated = await adminInquiriesApi.updateStatus(
        id,
        newStatus,
        notes !== undefined ? notes : inquiryNotes
      );
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: updated.status, adminNotes: updated.adminNotes }
            : item
        )
      );
      setSelectedInquiry((prev) =>
        prev && prev.id === id
          ? { ...prev, status: updated.status, adminNotes: updated.adminNotes }
          : prev
      );
      setInquirySuccessMsg(`Inquiry marked as ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setInquirySuccessMsg(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inquiry status');
    } finally {
      setInquiryBusy(false);
    }
  }

  async function handleSaveNotes(id: string) {
    if (!selectedInquiry) return;
    try {
      setInquiryBusy(true);
      setError('');
      const updated = await adminInquiriesApi.updateStatus(
        id,
        selectedInquiry.status,
        inquiryNotes
      );
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, adminNotes: updated.adminNotes } : item))
      );
      setSelectedInquiry((prev) =>
        prev && prev.id === id ? { ...prev, adminNotes: updated.adminNotes } : prev
      );
      setInquirySuccessMsg('Internal staff notes saved.');
      setTimeout(() => setInquirySuccessMsg(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setInquiryBusy(false);
    }
  }

  // Filtered inquiries calculation
  const filteredInquiries = inquiries.filter((iq) => {
    const matchesFilter = inquiryFilter === 'all' || iq.status === inquiryFilter;
    if (!matchesFilter) return false;
    if (!inquirySearch.trim()) return true;
    const q = inquirySearch.toLowerCase();
    return (
      iq.name?.toLowerCase().includes(q) ||
      iq.email?.toLowerCase().includes(q) ||
      iq.subject?.toLowerCase().includes(q) ||
      iq.message?.toLowerCase().includes(q) ||
      iq.phone?.toLowerCase().includes(q)
    );
  });

  const countNewInquiries = inquiries.filter((i) => i.status === 'new').length;
  const countInProgressInquiries = inquiries.filter((i) => i.status === 'in_progress').length;
  const countResolvedInquiries = inquiries.filter((i) => i.status === 'resolved').length;
  const totalOpenInquiries = countNewInquiries + countInProgressInquiries;
  const totalOpenTickets = tickets.filter((t) => t.status === 'open').length;

  return (
    <div className="container section support-desk">
      <header className="support-heading">
        <div>
          <p className="eyebrow">{admin ? 'Platform support & inquiries' : 'We’re here to help'}</p>
          <h1>
            {admin
              ? deskTab === 'inquiries'
                ? 'Website & Chatbot Inquiries'
                : deskTab === 'audit'
                  ? 'Audit & Inspection Desk'
                  : 'Support inbox'
              : 'Your support tickets'}
          </h1>
          <p>
            {admin
              ? deskTab === 'inquiries'
                ? 'Review, resolve, and reply to messages submitted by users through the Contact page form or the AI Public Guide chatbot.'
                : deskTab === 'audit'
                  ? 'Inspect recorded shopper–grower conversations in read-only audit mode.'
                  : 'Find a ticket, reply to its owner and close resolved conversations.'
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

      {/* Admin Top Navigation Desk Tabs */}
      {admin && (
        <div className="admin-desk-nav" role="tablist" aria-label="Support desk sections">
          <button
            type="button"
            role="tab"
            aria-selected={deskTab === 'inquiries'}
            className={`admin-desk-nav-btn ${deskTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setDeskTab('inquiries')}
          >
            <Inbox size={16} />
            <span>Website & Chatbot Messages</span>
            {totalOpenInquiries > 0 && <span className="badge attention">{totalOpenInquiries}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={deskTab === 'tickets'}
            className={`admin-desk-nav-btn ${deskTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setDeskTab('tickets')}
          >
            <MessageSquare size={16} />
            <span>Platform Support Tickets</span>
            {totalOpenTickets > 0 && <span className="badge">{totalOpenTickets}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={deskTab === 'audit'}
            className={`admin-desk-nav-btn ${deskTab === 'audit' ? 'active' : ''}`}
            onClick={() => setDeskTab('audit')}
          >
            <ShieldCheck size={16} />
            <span>Conversation Audit Desk</span>
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {/* =========================================================================
          SECTION 1: WEBSITE & CHATBOT CONTACT INQUIRIES VIEW (ADMIN ONLY)
          ========================================================================= */}
      {admin && deskTab === 'inquiries' && (
        <div className="inquiries-workspace">
          <div className="inquiries-controls-bar">
            <div className="inquiries-search-box">
              <Search size={16} className="inquiries-search-icon" />
              <input
                aria-label="Search website inquiries"
                placeholder="Search by visitor name, email, subject, or message keyword…"
                value={inquirySearch}
                onChange={(e) => setInquirySearch(e.target.value)}
              />
              {inquirySearch && (
                <button
                  type="button"
                  className="inquiries-search-clear"
                  onClick={() => setInquirySearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="inquiries-status-filter" role="group" aria-label="Filter inquiries">
              <button
                type="button"
                className={`filter-btn ${inquiryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setInquiryFilter('all')}
              >
                All <span>{inquiries.length}</span>
              </button>
              <button
                type="button"
                className={`filter-btn ${inquiryFilter === 'new' ? 'active' : ''}`}
                onClick={() => setInquiryFilter('new')}
              >
                New <span>{countNewInquiries}</span>
              </button>
              <button
                type="button"
                className={`filter-btn ${inquiryFilter === 'in_progress' ? 'active' : ''}`}
                onClick={() => setInquiryFilter('in_progress')}
              >
                In Progress <span>{countInProgressInquiries}</span>
              </button>
              <button
                type="button"
                className={`filter-btn ${inquiryFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => setInquiryFilter('resolved')}
              >
                Resolved <span>{countResolvedInquiries}</span>
              </button>
              <button
                type="button"
                className="filter-btn refresh-btn"
                title="Refresh messages"
                onClick={() => void refreshInquiries()}
              >
                <RotateCcw size={13} /> Refresh
              </button>
            </div>
          </div>

          <div
            className={`support-layout inquiries-layout ${selectedInquiry ? 'thread-selected' : ''}`}
          >
            {/* Left Column: Inquiries List */}
            <aside aria-label="Contact inquiries list" className="inquiries-sidebar-list">
              {filteredInquiries.length ? (
                filteredInquiries.map((iq) => {
                  const isSelected = selectedInquiry?.id === iq.id;
                  const dateStr = new Date(iq.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <button
                      key={iq.id}
                      type="button"
                      className={`inquiry-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedInquiry(iq)}
                    >
                      <div className="inquiry-item-top">
                        <span className={`inquiry-badge ${iq.status}`}>
                          {iq.status === 'in_progress' ? 'In Progress' : iq.status.toUpperCase()}
                        </span>
                        <time className="inquiry-time">{dateStr}</time>
                      </div>
                      <strong className="inquiry-subject">{iq.subject}</strong>
                      <div className="inquiry-sender-line">
                        <span className="inquiry-sender-name">{iq.name}</span>
                        <span className="inquiry-sender-email">({iq.email})</span>
                      </div>
                      <p className="inquiry-preview">{iq.message.slice(0, 90)}…</p>
                    </button>
                  );
                })
              ) : (
                <div className="inquiries-empty-list">
                  <p>No contact messages match your current filter or search query.</p>
                </div>
              )}
            </aside>

            {/* Right Column: Inquiry Inspector & Action Detail */}
            <section className="support-thread inquiry-detail-pane">
              {selectedInquiry ? (
                <div className="inquiry-content-wrapper">
                  <button
                    type="button"
                    className="support-back"
                    onClick={() => setSelectedInquiry(null)}
                  >
                    ← All messages
                  </button>

                  {inquirySuccessMsg && (
                    <div className="inquiry-success-alert" role="status">
                      <CheckCircle2 size={16} />
                      <span>{inquirySuccessMsg}</span>
                    </div>
                  )}

                  <header className="ticket-header-card inquiry-header-card">
                    <div>
                      <h2>{selectedInquiry.subject}</h2>
                      <div className="ticket-meta-badges">
                        <span className={`inquiry-badge ${selectedInquiry.status}`}>
                          {selectedInquiry.status === 'in_progress'
                            ? 'In Progress'
                            : selectedInquiry.status.toUpperCase()}
                        </span>
                        <span className="inquiry-source-tag">
                          <MessageCircle size={13} /> Contact Form / AI Assistant
                        </span>
                        <span className="inquiry-date-tag">
                          <Clock size={13} />{' '}
                          {new Date(selectedInquiry.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="inquiry-header-actions">
                      <a
                        className="button inquiry-email-reply-btn"
                        href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Mail size={15} /> Open Email Reply
                      </a>
                    </div>
                  </header>

                  {/* Sender Contact Information Box */}
                  <div className="inquiry-sender-card">
                    <h3 className="inquiry-section-title">
                      <User size={15} /> Sender Information
                    </h3>
                    <div className="inquiry-sender-grid">
                      <div className="inquiry-sender-field">
                        <span className="label">Full Name</span>
                        <strong>{selectedInquiry.name}</strong>
                      </div>
                      <div className="inquiry-sender-field">
                        <span className="label">Email Address</span>
                        <a
                          href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                          className="inquiry-email-link"
                        >
                          {selectedInquiry.email} <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="inquiry-sender-field">
                        <span className="label">
                          <Phone size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          Phone Number
                        </span>
                        <span>{selectedInquiry.phone || 'Not provided'}</span>
                      </div>
                      <div className="inquiry-sender-field">
                        <span className="label">Reference ID</span>
                        <code>{selectedInquiry.id}</code>
                      </div>
                    </div>
                  </div>

                  {/* Message Content Box */}
                  <div className="inquiry-message-card">
                    <h3 className="inquiry-section-title">
                      <MessageSquare size={15} /> Message Content
                    </h3>
                    <div className="inquiry-message-text">{selectedInquiry.message}</div>
                  </div>

                  {/* Quick Status Control Toolbar */}
                  <div className="inquiry-actions-card">
                    <h3 className="inquiry-section-title">Workflow Actions</h3>
                    <div className="inquiry-action-buttons">
                      {selectedInquiry.status === 'new' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={inquiryBusy}
                          onClick={() =>
                            void handleUpdateInquiryStatus(selectedInquiry.id, 'in_progress')
                          }
                        >
                          <Clock size={15} /> Mark as In Progress
                        </button>
                      )}
                      {selectedInquiry.status !== 'resolved' ? (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={inquiryBusy}
                          onClick={() =>
                            void handleUpdateInquiryStatus(selectedInquiry.id, 'resolved')
                          }
                        >
                          <CheckCircle2 size={15} /> Mark as Resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={inquiryBusy}
                          onClick={() =>
                            void handleUpdateInquiryStatus(selectedInquiry.id, 'new')
                          }
                        >
                          <RotateCcw size={15} /> Reopen Inquiry
                        </button>
                      )}
                      <a
                        className="button secondary"
                        href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                      >
                        <Mail size={15} /> Draft Response in Email App
                      </a>
                    </div>
                  </div>

                  {/* Staff Internal Notes */}
                  <div className="inquiry-notes-card">
                    <h3 className="inquiry-section-title">Internal Staff Notes</h3>
                    <p className="inquiry-notes-hint">
                      Private administrative notes visible only to the Gather & Grow admin team.
                    </p>
                    <textarea
                      aria-label="Internal staff notes"
                      rows={3}
                      className="inquiry-notes-textarea"
                      placeholder="Add follow-up notes, phone log notes, or resolution summary…"
                      value={inquiryNotes}
                      onChange={(e) => setInquiryNotes(e.target.value)}
                    />
                    <div className="inquiry-notes-actions">
                      <button
                        type="button"
                        className="button secondary compact"
                        disabled={inquiryBusy}
                        onClick={() => void handleSaveNotes(selectedInquiry.id)}
                      >
                        Save internal notes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="support-empty">
                  <Mail size={38} color="#2b553c" style={{ margin: '0 auto 12px' }} />
                  <h2>Select a message to view details</h2>
                  <p>
                    Review contact inquiries submitted through the website contact form or the AI
                    Public Guide chatbot. You can mark them resolved or reply directly via email.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: REGISTERED PLATFORM TICKETS VIEW (CUSTOMERS & GROWERS)
          ========================================================================= */}
      {(!admin || deskTab === 'tickets') && (
        <>
          <form
            className="map-search"
            onSubmit={(e) => {
              e.preventDefault();
              void run(refreshTickets);
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

          <div
            className="support-status-tabs"
            role="group"
            aria-label="Filter support tickets"
          >
            {['all', 'open', 'closed'].map((value) => (
              <button
                key={value}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {value === 'all'
                  ? 'All conversations'
                  : value === 'open'
                    ? 'Open'
                    : 'Closed'}{' '}
                <span>
                  {tickets.filter((t) => value === 'all' || t.status === value).length}
                </span>
              </button>
            ))}
          </div>

          <div
            className={`support-layout ${ticket || creating ? 'thread-selected' : ''}`}
          >
            <aside aria-label="Support tickets">
              {tickets.filter((t) => status === 'all' || t.status === status).length ? (
                tickets
                  .filter((t) => status === 'all' || t.status === status)
                  .map((t) => (
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
                <p className="no-tickets-hint">No conversations in this view.</p>
              )}
            </aside>

            <section className="support-thread">
              {(ticket || creating) && (
                <button
                  className="support-back"
                  onClick={() => {
                    setTicket(null);
                    setCreating(false);
                  }}
                >
                  ← All conversations
                </button>
              )}
              {creating ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    void run(async () => {
                      setTicket(
                        await supportApi.create(
                          String(d.get('subject')),
                          String(d.get('message'))
                        )
                      );
                      setCreating(false);
                      await refreshTickets();
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
                    <textarea
                      name="message"
                      required
                      minLength={2}
                      maxLength={4000}
                      rows={6}
                    />
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
                              await refreshTickets();
                            });
                          }
                        }}
                      >
                        <CheckCircle2 size={15} /> Close resolved ticket
                      </button>
                    )}
                  </header>

                  {/* Chat Message Feed */}
                  <div className="support-chat-container">
                    {ticket.messages && ticket.messages.length > 0 ? (
                      ticket.messages.map((m) => {
                        const isSupport = m.senderRole === 'admin';
                        return (
                          <div
                            key={m.id}
                            className={`support-bubble-row ${
                              (admin ? isSupport : m.senderRole === role)
                                ? 'outgoing'
                                : 'incoming'
                            }`}
                          >
                            <div className="support-bubble-sender-line">
                              <span
                                className={`support-sender-pill ${isSupport ? 'pill-admin' : 'pill-user'}`}
                              >
                                {isSupport
                                  ? 'Support Team'
                                  : m.senderRole === 'farmer'
                                    ? 'Grower'
                                    : 'Customer'}
                              </span>
                              <span className="support-sender-name">
                                {isSupport
                                  ? 'Platform Support'
                                  : m.senderName || ticket.ownerName}
                              </span>
                              <time className="support-bubble-timestamp">
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </time>
                            </div>
                            <div className="support-chat-bubble">{m.text || m.body}</div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="support-no-messages">No messages in this ticket yet.</p>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {ticket.status === 'open' ? (
                    <form
                      className="support-reply-bar"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const message = String(new FormData(form).get('message')).trim();
                        if (!message) return;
                        void run(async () => {
                          setTicket(await supportApi.reply(ticket.id, message));
                          form.reset();
                          await refreshTickets();
                        });
                      }}
                    >
                      <textarea
                        name="message"
                        aria-label="Reply to support conversation"
                        required
                        minLength={2}
                        maxLength={4000}
                        rows={2}
                        placeholder="Type your response here… (Press Enter to send, Shift+Enter for new line)"
                        className="support-reply-textarea"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.currentTarget.form?.requestSubmit();
                          }
                        }}
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
        </>
      )}

      {/* =========================================================================
          SECTION 3: CONVERSATION AUDIT & INSPECTION DESK
          ========================================================================= */}
      {admin && (deskTab === 'audit' || deskTab === 'tickets') && (
        <section className="paper-panel chat-inspection" style={{ marginTop: '28px' }}>
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

              {/* Message Feed for Customer-Farmer Thread */}
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
                        <div className="support-chat-bubble">{m.body || m.text}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="inspection-empty-state">
                    <p>No messages have been recorded in this conversation.</p>
                  </div>
                )}
                <div ref={inspectEndRef} />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
