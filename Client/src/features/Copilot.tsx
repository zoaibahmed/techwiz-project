import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Sparkles, ArrowUp, BookOpen, CheckCircle, AlertTriangle } from "lucide-react";
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
  const [question, setQuestion] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
    return () => {
      ref.current?.close();
    };
  }, []);

  const role = s.role ?? "customer";
  const title =
    role === "farmer"
      ? "Farm Copilot"
      : role === "admin"
        ? "Market Intelligence"
        : "Market Companion";

  const prompts =
    role === "farmer"
      ? [
          "Create four products: Heirloom Tomatoes (250/kg), Organic Spinach (120/bunch), Fresh Mint (50/bunch), Strawberries (400/box)",
          "How is my business performing this week?",
          "Compare my tomato prices and suggest how I can improve sales",
        ]
      : role === "admin"
        ? [
            "Which farmers are waiting for approval?",
            "Platform health overview",
            "Draft a Saturday morning reminder announcement",
          ]
        : [
            "What tomatoes are available this Saturday?",
            "What can I cook with today's fresh produce?",
            "Help me plan my market morning visit",
          ];

  async function send(q: string) {
    if (!q.trim() || busy || off) return;
    setQuestion("");
    setBusy(true);

    try {
      const res: any = await chatCopilotApi(q, {
        history,
        pathname: loc.pathname,
        role,
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
          text: `AI Copilot notification: ${err?.message || "Connected service momentarily unavailable. Manual controls remain fully operational."}`,
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
                    "Action confirmed and permanently saved to MongoDB Atlas.",
                },
              }
            : r,
        ),
      );

      // Immediately synchronize newly created products/data from backend to active workspace
      await gateway.syncFromBackend();
    } catch (err: any) {
      alert(`Could not confirm action: ${err?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
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
            MarketLink AI Copilot · Grounded in MongoDB
          </span>
          <h2 id="copilot-title">{title}</h2>
        </div>
        <button
          className="button quiet compact"
          onClick={onClose}
          aria-label="Close Copilot"
        >
          <X size={18} />
        </button>
      </header>

      <div className="copilot-context">
        <span>Active role: {role}</span>
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

                {r.engine && (
                  <div style={{ fontSize: "0.75rem", color: "#6A7B6D", marginTop: "4px" }}>
                    Engine: {r.engine}
                  </div>
                )}

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
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#203328" }}>
                        <CheckCircle size={18} />
                        <strong>Action Executed & Persisted in MongoDB Atlas</strong>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#946927" }}>
                        <AlertTriangle size={18} />
                        <strong>Two-Phase Consequential Action Verification</strong>
                      </div>
                    )}
                    <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", whiteSpace: "pre-line" }}>
                      {r.proposedAction.summary}
                    </p>

                    {/* Itemized product breakdown if multiple items are proposed */}
                    {r.proposedAction.details?.products && Array.isArray(r.proposedAction.details.products) && (
                      <div style={{ margin: "0.75rem 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {r.proposedAction.details.products.map((p: any, pidx: number) => (
                          <div
                            key={pidx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "#ffffff",
                              border: "1px solid rgba(32, 51, 40, 0.15)",
                              borderRadius: "6px",
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.8125rem",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#203328" }}>{p.name}</strong>
                              <span style={{ marginLeft: "6px", color: "#6A7B6D", fontSize: "0.75rem" }}>
                                ({p.category || "Produce"})
                              </span>
                            </div>
                            <strong style={{ color: "#946927" }}>
                              Rs. {p.pricePKR} / {p.unit}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {!r.proposedAction.confirmed && (
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
                          Confirm & Apply to MongoDB
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}

            {busy && (
              <p role="status" style={{ fontStyle: "italic", color: "#6A7B6D" }}>
                Connecting to MarketLink backend & querying Atlas records…
              </p>
            )}
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
