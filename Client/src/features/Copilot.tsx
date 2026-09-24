import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Sparkles, ArrowUp, BookOpen, CheckCircle, AlertTriangle } from "lucide-react";
import { useMarket } from "../components/ui";
import { chatCopilotApi, confirmCopilotActionApi, loginApi } from "../data/api";

type Reply = {
  question: string;
  text: string;
  sources: { title: string; href: string }[];
  contextSummary?: any;
  proposedAction?: {
    draftId: string;
    actionType: string;
    summary: string;
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
          "Update stall designation to Stall B-12",
          "What needs my attention?",
          "Check inventory allocations",
        ]
      : role === "admin"
        ? [
            "Explain this period",
            "Platform health overview",
            "Farmer approval status",
          ]
        : [
            "What tomatoes are available?",
            "What can I cook for dinner?",
            "What markets are open?",
          ];

  async function ensureRoleSession() {
    const email =
      role === "farmer"
        ? "farmer.greenfield@marketlink.com"
        : role === "admin"
          ? "admin@marketlink.com"
          : "customer.sarah@marketlink.com";
    const password =
      role === "farmer"
        ? "Farmer123!"
        : role === "admin"
          ? "Admin123!"
          : "Customer123!";

    try {
      await loginApi(email, password);
    } catch {
      // Continue if already authenticated
    }
  }

  async function send(q: string) {
    if (!q.trim() || busy || off) return;
    setQuestion("");
    setBusy(true);

    try {
      await ensureRoleSession();

      const res: any = await chatCopilotApi(q, {
        pathname: loc.pathname,
        role,
      });

      const replyData = res?.data || res;
      const text =
        replyData?.reply ||
        "I was unable to complete the request. Please try again.";
      const action = replyData?.proposedAction || null;
      const contextSummary = replyData?.contextSummary;

      const sources: { title: string; href: string }[] = [];
      if (role === "customer") {
        sources.push({ title: "Public Markets", href: "/markets" });
        sources.push({ title: "Harvest Catalogue", href: "/products" });
      } else if (role === "farmer") {
        sources.push({ title: "Order Workbench", href: "/farmer/orders" });
        sources.push({ title: "Stall Inventory", href: "/farmer/stock" });
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
          proposedAction: action,
        },
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
      await ensureRoleSession();
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
          <p className="eyebrow">
            <Sparkles size={15} />
            MarketLink AI Copilot · Grounded in MongoDB
          </p>
          <h2 id="copilot-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close Copilot"
          onClick={onClose}
        >
          <X />
        </button>
      </header>

      <div className="copilot-context">
        <span>Grounded database session:</span> {loc.pathname} · {role} role active
      </div>

      <div className="copilot-body">
        <label className="checkbox" style={{ marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={off}
            onChange={(e) => {
              setOff(e.target.checked);
              setBusy(false);
            }}
          />
          Simulate Copilot offline
        </label>

        {off ? (
          <div className="empty">
            <h3>Continue at your own pace.</h3>
            <p>
              Copilot is paused. All ordinary filters, forms, inventory sliders and
              order controls operate directly against the database.
            </p>
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
                <p>{r.text}</p>

                {r.contextSummary && (
                  <div
                    style={{
                      background: "rgba(32, 51, 40, 0.05)",
                      border: "1px solid rgba(32, 51, 40, 0.12)",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.8125rem",
                      margin: "0.5rem 0",
                      color: "#203328",
                    }}
                  >
                    <strong>Atlas Context: </strong>
                    {Object.entries(r.contextSummary)
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : typeof v === 'object' ? JSON.stringify(v) : v}`)
                      .join(" · ")}
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
                    <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                      {r.proposedAction.summary}
                    </p>

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
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={`Ask ${title} about this view…`}
          disabled={off}
        />
        <button
          className="icon-button"
          aria-label="Send question"
          disabled={busy || off || !question.trim()}
        >
          <ArrowUp />
        </button>
      </form>
    </dialog>
  );
}
