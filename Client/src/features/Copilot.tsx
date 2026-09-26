import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Sparkles, ArrowUp, BookOpen, CheckCircle, RotateCcw, MessageSquare } from "lucide-react";
import { useMarket } from "../components/ui";
import { chatCopilotApi, confirmCopilotActionApi } from "../data/api";
import { gateway } from "../data/gateway";

type Reply = {
  question: string;
  text: string;
  sources: { title: string; href: string }[];
  contextSummary?: any;
  engine?: string;
  proposedAction?: {
    draftId: string;
    actionType: string;
    summary: string;
    details?: any;
    requiresConfirmation?: boolean;
    confirmed?: boolean;
  } | null;
};

export function Copilot({ onClose }: { onClose: () => void }) {
  const s = useMarket();
  const loc = useLocation();
  const ref = useRef<HTMLDialogElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const role = s.role ?? "customer";
  const storageKeyReplies = `ml_copilot_${role}_replies`;
  const storageKeyHistory = `ml_copilot_${role}_history`;

  const [question, setQuestion] = useState("");
  const [replies, setReplies] = useState<Reply[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKeyReplies);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKeyHistory);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
    return () => {
      ref.current?.close();
    };
  }, []);

  // Persist conversation across opens, closes, and page navigation
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKeyReplies, JSON.stringify(replies));
    } catch {}
  }, [replies, storageKeyReplies]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKeyHistory, JSON.stringify(history));
    } catch {}
  }, [history, storageKeyHistory]);

  // Keep scroll focused on the latest message/action
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies, busy]);

  function clearChat() {
    setReplies([]);
    setHistory([]);
    try {
      sessionStorage.removeItem(storageKeyReplies);
      sessionStorage.removeItem(storageKeyHistory);
    } catch {}
  }

  const title =
    role === "farmer"
      ? "Farm Copilot"
      : role === "admin"
        ? "Market Intelligence"
        : "Market Companion";

  const prompts =
    role === "farmer"
      ? [
          "Check customer messages and inquiries",
          "How is my business performing this week?",
          "Compare my tomato prices and suggest how I can improve sales",
          "Create four products: Heirloom Tomatoes (250/kg), Organic Spinach (120/bunch), Fresh Mint (50/bunch), Strawberries (400/box)",
        ]
      : role === "admin"
        ? [
            "Which farmers are waiting for approval?",
            "Platform health overview",
            "Draft a Saturday morning reminder announcement",
          ]
        : [
            "What tomatoes are available this Saturday?",
            "What can I cook with fresh Lahore tomatoes and vegetables?",
            "Help me plan my market morning visit",
          ];

  async function send(q: string) {
    if (!q.trim() || busy || off) return;
    setQuestion("");
    setBusy(true);

    try {
      // Extract contextual IDs from route if present
      const pathParts = loc.pathname.split("/").filter(Boolean);
      const possibleId = pathParts[pathParts.length - 1];
      const selectedId = possibleId && /^[0-9a-fA-F]{24}$/.test(possibleId) ? possibleId : undefined;

      const res: any = await chatCopilotApi(q, {
        history,
        pathname: loc.pathname,
        role,
        selectedId,
      });

      const replyData = res?.data || res;
      const text =
        replyData?.reply ||
        "I was unable to complete the request. Please try again.";
      const action = replyData?.proposedAction || null;
      const contextSummary = replyData?.contextSummary;
      const engine = replyData?.engine;

      const sources: { title: string; href: string }[] = [];
      if (role === "customer") {
        sources.push({ title: "Public Markets", href: "/markets" });
        sources.push({ title: "Harvest Catalogue", href: "/products" });
      } else if (role === "farmer") {
        sources.push({ title: "Order Workbench", href: "/farmer/orders" });
        sources.push({ title: "Customer Messages", href: "/farmer/messages" });
        sources.push({ title: "Stall Inventory", href: "/farmer/stock" });
        sources.push({ title: "Produce Catalogue", href: "/farmer/products" });
      } else if (role === "admin") {
        sources.push({ title: "Command Centre", href: "/admin" });
        sources.push({ title: "Platform Reports", href: "/admin/reports" });
      }

      setReplies((old) => [
        ...old,
        {
          question: q,
          text,
          sources,
          contextSummary,
          engine,
          proposedAction: action,
        },
      ]);

      // Append turn to conversation memory
      setHistory((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: text },
      ]);
    } catch (err: any) {
      setReplies((old) => [
        ...old,
        {
          question: q,
          text: `The service is temporarily unavailable. Please check your connection or try again. (${err?.message || "Connection failed"})`,
          sources: [],
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction(replyIndex: number, draftId: string) {
    try {
      setBusy(true);
      const res: any = await confirmCopilotActionApi(draftId);
      const data = res?.data || res;

      setReplies((old) =>
        old.map((r, i) =>
          i === replyIndex && r.proposedAction
            ? {
                ...r,
                proposedAction: {
                  ...r.proposedAction,
                  confirmed: true,
                  summary:
                    data?.summary ||
                    "Done. The proposed changes have been applied successfully.",
                },
              }
            : r,
        ),
      );

      // Immediately synchronize newly created/updated data from backend to active workspace
      await gateway.syncFromBackend();
    } catch (err: any) {
      alert(`Could not confirm action: ${err?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  function getActionPreviewTitle(actionType: string) {
    switch (actionType) {
      case "create_products":
        return "Proposed Catalogue Additions";
      case "edit_saved_product":
        return "Proposed Catalogue Changes";
      case "publish_dated_stock":
        return "Proposed Market Day Allocation";
      case "update_stall_pin":
        return "Proposed Stall Assignment";
      case "cancel_order":
        return "Order Cancellation Request";
      case "change_farmer_status":
        return "Farmer Status Update";
      case "publish_announcement":
        return "Platform Announcement Broadcast";
      case "send_chat_message":
        return "Proposed Message Reply";
      default:
        return "Proposed Action Preview";
    }
  }

  function getConfirmButtonLabel(actionType: string) {
    switch (actionType) {
      case "create_products":
        return "Save to Catalogue";
      case "cancel_order":
        return "Confirm Order Cancellation";
      case "change_farmer_status":
        return "Confirm Status Change";
      case "publish_dated_stock":
        return "Publish Market Allocation";
      case "publish_announcement":
        return "Broadcast Announcement";
      case "send_chat_message":
        return "Send Reply to Customer";
      default:
        return "Confirm Proposed Action";
    }
  }

  function getConfirmedTitle(actionType: string) {
    switch (actionType) {
      case "create_products":
      case "edit_saved_product":
        return "Saved to Produce Catalogue";
      case "publish_dated_stock":
      case "mark_sold_out":
        return "Market Allocation Updated";
      case "update_stall_pin":
        return "Stall Location Updated";
      case "cancel_order":
        return "Reservation Cancelled";
      case "change_farmer_status":
        return "Farmer Status Updated";
      case "publish_announcement":
        return "Announcement Broadcasted";
      case "send_chat_message":
        return "Message Delivered to Customer";
      default:
        return "Action Completed Successfully";
    }
  }

  function renderConfirmedLink(actionType: string) {
    if (actionType === "create_products" || actionType === "edit_saved_product") {
      return (
        <Link to="/farmer/products" className="button compact" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }} onClick={onClose}>
          <BookOpen size={14} /> Open Produce Catalogue
        </Link>
      );
    }
    if (actionType === "publish_dated_stock" || actionType === "mark_sold_out") {
      return (
        <Link to="/farmer/stock" className="button compact" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }} onClick={onClose}>
          <BookOpen size={14} /> View Stall Inventory
        </Link>
      );
    }
    if (actionType === "cancel_order") {
      return (
        <Link to="/customer/orders" className="button compact" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }} onClick={onClose}>
          <BookOpen size={14} /> View Orders
        </Link>
      );
    }
    if (actionType === "change_farmer_status") {
      return (
        <Link to="/admin/farmers" className="button compact" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }} onClick={onClose}>
          <BookOpen size={14} /> Open Farmer Directory
        </Link>
      );
    }
    if (actionType === "send_chat_message") {
      return (
        <Link to="/farmer/messages" className="button compact" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }} onClick={onClose}>
          <MessageSquare size={14} /> Open Messages
        </Link>
      );
    }
    return null;
  }

  return (
    <dialog
      ref={ref}
      className="copilot"
      onCancel={onClose}
      aria-labelledby="copilot-title"
    >
      <header>
        <div>
          <span className="eyebrow">
            MarketLink Operating Intelligence
          </span>
          <h2 id="copilot-title">{title}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {replies.length > 0 && (
            <button
              className="button quiet compact"
              onClick={clearChat}
              title="Start a new conversation"
              aria-label="New conversation"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            className="button quiet compact"
            onClick={onClose}
            aria-label="Close Copilot"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="copilot-context">
        <span>Workspace: {role === "farmer" ? "Farm Workbench" : role === "admin" ? "Command Centre" : "Shopper"}</span>
        <span>Route: {loc.pathname}</span>
      </div>

      <div className="copilot-body">
        <label className="toggle">
          <input
            type="checkbox"
            checked={off}
            onChange={(e) => setOff(e.target.checked)}
          />
          <span>Simulate Copilot offline</span>
        </label>

        {off ? (
          <div className="notice" role="status">
            <Sparkles size={18} />
            <div>
              <strong>Copilot paused</strong>
              <p>
                Copilot is paused. All ordinary filters, forms, inventory sliders and
                checkout controls remain available.
              </p>
            </div>
          </div>
        ) : (
          <>
            <h3>A little help with your market day?</h3>
            <div className="suggestions">
              {prompts.map((p) => (
                <button disabled={busy} key={p} onClick={() => send(p)}>
                  {p}
                  <ArrowUp size={15} />
                </button>
              ))}
            </div>

            {replies.map((r, i) => (
              <article className="conversation" key={i}>
                <p className="question">{r.question}</p>
                <p style={{ whiteSpace: "pre-line" }}>{r.text}</p>

                <div className="source-list">
                  {r.sources.map((source) => (
                    <Link to={source.href} key={source.href} onClick={onClose}>
                      <BookOpen size={14} />
                      {source.title}
                    </Link>
                  ))}
                </div>

                {r.proposedAction && (
                  <div
                    className="draft-preview"
                    style={{
                      border: r.proposedAction.confirmed
                        ? "1px solid #203328"
                        : "1px solid #946927",
                      background: r.proposedAction.confirmed
                        ? "rgba(32, 51, 40, 0.04)"
                        : "rgba(148, 105, 39, 0.05)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    {r.proposedAction.confirmed ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#203328" }}>
                          <CheckCircle size={18} />
                          <strong>{getConfirmedTitle(r.proposedAction.actionType)}</strong>
                        </div>
                        <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#203328", whiteSpace: "pre-line" }}>
                          {r.proposedAction.summary}
                        </p>
                        <div style={{ marginTop: "0.5rem" }}>
                          {renderConfirmedLink(r.proposedAction.actionType)}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#946927" }}>
                          <Sparkles size={16} />
                          <strong>{getActionPreviewTitle(r.proposedAction.actionType)}</strong>
                        </div>

                        {/* Itemized product breakdown with description and details */}
                        {r.proposedAction.details?.products && Array.isArray(r.proposedAction.details.products) ? (
                          <div style={{ margin: "0.75rem 0", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                            {r.proposedAction.details.products.map((p: any, pidx: number) => (
                              <div
                                key={pidx}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid rgba(32, 51, 40, 0.15)",
                                  borderRadius: "6px",
                                  padding: "0.6rem 0.75rem",
                                  fontSize: "0.8125rem",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <div>
                                    <strong style={{ color: "#203328", fontSize: "0.875rem" }}>{p.name}</strong>
                                    <span style={{ marginLeft: "8px", color: "#6A7B6D", fontSize: "0.75rem" }}>
                                      ({p.category || "Produce"})
                                    </span>
                                  </div>
                                  <strong style={{ color: "#946927" }}>
                                    Rs. {p.pricePKR} / {p.unit}
                                  </strong>
                                </div>
                                {p.description && (
                                  <p style={{ margin: 0, color: "#4A5A4D", fontSize: "0.78rem", fontStyle: "italic", lineHeight: 1.4 }}>
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", whiteSpace: "pre-line" }}>
                            {r.proposedAction.summary}
                          </p>
                        )}

                        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="button"
                            style={{
                              background: "#203328",
                              color: "#F4EFE6",
                              padding: "0.45rem 1rem",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                            disabled={busy}
                            onClick={() => confirmAction(i, r.proposedAction!.draftId)}
                          >
                            {getConfirmButtonLabel(r.proposedAction.actionType)}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}

            {busy && (
              <p role="status" style={{ fontStyle: "italic", color: "#6A7B6D" }}>
                Reviewing your request and checking records…
              </p>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form
        className="copilot-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(question);
        }}
      >
        <label className="sr-only" htmlFor="copilot-question">
          Ask Copilot
        </label>
        <textarea
          id="copilot-question"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask ${title} about products, stock, pricing or operations…`}
          disabled={busy || off}
        />
        <button
          className="button"
          type="submit"
          disabled={!question.trim() || busy || off}
        >
          Send
        </button>
      </form>
    </dialog>
  );
}
