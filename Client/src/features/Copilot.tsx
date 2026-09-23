import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Sparkles, ArrowUp, BookOpen } from "lucide-react";
import { useMarket, useAction, Notice, Confirm } from "../components/ui";
import { money, total } from "../data/market";
import type { Product } from "../data/market";

type Reply = {
  question: string;
  text: string;
  sources: { title: string; href: string }[];
  draft?: { product: Product; expiresAt: number };
};
export function Copilot({ onClose }: { onClose: () => void }) {
  const s = useMarket();
  const act = useAction();
  const loc = useLocation();
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [question, setQuestion] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
    return () => {
      clearTimeout(timer.current);
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
      ? ["What needs my attention?", "Preview a stock change"]
      : role === "admin"
        ? ["Explain this period", "Draft an announcement"]
        : ["What tomatoes are available?", "Explain my next pickup"];
  function send(q: string) {
    if (!q.trim() || busy || off) return;
    setQuestion("");
    setBusy(true);
    timer.current = setTimeout(() => {
      let reply: Reply = {
        question: q,
        text: "This scripted preview supports the suggested questions only. Use the normal filters, forms and order controls for other tasks. No live AI request was made.",
        sources: [],
      };
      if (role === "customer" && /tomato/i.test(q)) {
        const ps = s.products.filter(
          (p) =>
            p.name.toLowerCase().includes("tomato") &&
            p.visible &&
            p.available &&
            p.stock > p.reserved,
        );
        reply = {
          question: q,
          text: ps.length
            ? `In the sample records, ${ps.map((p) => `${p.name}: ${p.stock - p.reserved} ${p.unit} units available at ${money(p.price)} each`).join("; ")}. Availability is rechecked at reservation.`
            : "No available tomatoes in the sample records.",
          sources: ps.map((p) => ({
            title: p.name,
            href: `/products/${p.id}`,
          })),
        };
      }
      if (role === "customer" && /pickup|order/i.test(q)) {
        const o = s.orders.find((o) => o.stage === "Ready for pickup");
        if (o)
          reply = {
            question: q,
            text: `${o.id} is marked “${o.stage}” in this fixture. Open its passport for the sample window. Pay in person; this is not delivery tracking.`,
            sources: [{ title: o.id, href: `/customer/orders/${o.id}` }],
          };
      }
      if (role === "farmer" && /attention|pending/i.test(q)) {
        const orders = s.orders.filter(
          (o) => o.farmerId === s.farmerId && o.stage === "Placed",
        );
        reply = {
          question: q,
          text: `${orders.length} sample order${orders.length === 1 ? "" : "s"} need a response. Review the items and pickup window before accepting.`,
          sources: orders.map((o) => ({
            title: o.id,
            href: `/farmer/orders/${o.id}`,
          })),
        };
      }
      if (role === "farmer" && /stock/i.test(q))
        reply = {
          question: q,
          text: "Proposed sample action: make Vine tomatoes unavailable for new reservations. Existing reserved quantities will be preserved. Review before applying; nothing has changed yet.",
          sources: [{ title: "Dated stock", href: "/farmer/stock" }],
          draft: {
            product: structuredClone(
              s.products.find((p) => p.id === "demo-p1")!,
            ),
            expiresAt: Date.now() + 300000,
          },
        };
      if (role === "admin" && /period|chart/i.test(q))
        reply = {
          question: q,
          text: `The sample dataset contains ${s.orders.length} orders and ${money(s.orders.filter((o) => !["Cancelled", "Declined"].includes(o.stage)).reduce((n, o) => n + total(o.lines), 0))} in order value. This is not confirmed collected cash. There is no comparable previous period for a trend.`,
          sources: [
            { title: "Report definitions and records", href: "/admin/reports" },
          ],
        };
      if (role === "admin" && /announcement/i.test(q))
        reply = {
          question: q,
          text: "Draft: “A little reminder for market day: check your pickup window, bring your bag and pay your farmer at the stall.” Review and edit this in the announcement composer. Nothing has been published.",
          sources: [
            {
              title: "Open announcement composer",
              href: "/admin/announcements",
            },
          ],
        };
      setReplies((old) => [...old, reply]);
      setBusy(false);
    }, 450);
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
            MarketLink Copilot
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
        Context: {loc.pathname} · {role} demo
      </div>
      <div className="copilot-body">
        <Notice>
          Scripted development preview. No OpenAI connection. Sources refer to
          fictional local records.
        </Notice>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={off}
            onChange={(e) => {
              setOff(e.target.checked);
              clearTimeout(timer.current);
              setBusy(false);
            }}
          />
          Simulate AI unavailable
        </label>
        {off ? (
          <div className="empty">
            <h3>Continue at your own pace.</h3>
            <p>
              Copilot is unavailable. All ordinary filters, forms and order
              controls still work.
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
                <span className="small muted">
                  Fixture snapshot · {s.now.slice(0, 10)}
                </span>
                <div className="source-list">
                  {r.sources.map((source) => (
                    <Link to={source.href} key={source.href} onClick={onClose}>
                      <BookOpen size={14} />
                      {source.title}
                    </Link>
                  ))}
                </div>
                {r.draft && (
                  <div className="draft-preview">
                    <h3>Review proposed change</h3>
                    <p>
                      Vine tomatoes: available → unavailable.
                      <br />
                      Reserved quantities unchanged.
                    </p>
                    <Confirm
                      label="Apply sample change"
                      title="Apply this fixture-only stock change?"
                      onConfirm={() => {
                        const p = r.draft!.product;
                        return act(
                          {
                            type: "product",
                            value: { ...p, available: false },
                            expected: p,
                            expiresAt: r.draft!.expiresAt,
                          },
                          "Simulated stock change applied. No live service was called.",
                        );
                      }}
                    />
                  </div>
                )}
              </article>
            ))}
            {busy && <p role="status">Reading sample records…</p>}
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
          placeholder="Ask about this view…"
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
