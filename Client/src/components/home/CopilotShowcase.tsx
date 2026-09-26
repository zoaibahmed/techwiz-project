import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, ShoppingBasket, Sprout, ShieldCheck, Database, Check, ArrowRight } from "lucide-react";
import { usePulse } from "../../data/pulse";
import type { Pulse } from "../../data/pulse";
import { date, money } from "../../data/market";
import { EASE } from "../../motion/motion";

gsap.registerPlugin(ScrollTrigger);

type Flow = {
  key: string;
  role: string;
  name: string;
  icon: typeof Sparkles;
  question: string;
  tools: string[];
  answer: string;
  action?: string;
};

function flowsFrom(p: Pulse): Flow[] {
  const next = p.week.nextMarketDate ? date(p.week.nextMarketDate) : "the next market day";
  const h = p.highlights;
  const growth = h.growthPct;
  return [
    {
      key: "customer",
      role: "Customer",
      name: "Market Companion",
      icon: ShoppingBasket,
      question: "What’s fresh this weekend, and when should I reserve?",
      tools: [`Catalogue · ${p.network.products} products`, `Stock for ${next}`, "Pickup windows"],
      answer: h.topProduct
        ? `${h.topProduct.name} is the most reserved item this month (${h.topProduct.units} units). ${p.week.unitsReserved} units are already reserved for ${next}; reservations close at 06:00 that morning.`
        : `Growers are listing stock for ${next}. Reservations close at 06:00 that morning.`,
      action: "Add to my market bag",
    },
    {
      key: "farmer",
      role: "Grower",
      name: "Farm Copilot",
      icon: Sprout,
      question: "What should I restock before the cutoff?",
      tools: ["Dated stock offers", "30-day sales", `${p.week.openReservations} open reservations`],
      answer: h.restock
        ? `${h.restock.name} at ${h.restock.market} is ${h.restock.sellThrough}% reserved. Publish more before the 06:00 cutoff so walk-up shoppers aren’t turned away.`
        : "Every listed product still has stock for walk-up shoppers.",
      action: "Preview stock change",
    },
    {
      key: "admin",
      role: "Admin",
      name: "Market Intelligence",
      icon: ShieldCheck,
      question: "Which market is strongest, and how are we trending?",
      tools: [`${p.trust.ordersCollected.toLocaleString("en-PK")} collected orders`, `${p.network.markets} markets · ${p.network.cities.length} cities`, "30-day metrics"],
      answer: h.strongestMarket
        ? `${h.strongestMarket.name} in ${h.strongestMarket.city} leads with ${money(h.strongestMarket.valueMinor)} reserved from ${h.strongestMarket.orders} orders.${growth !== null ? ` Booked value is ${growth >= 0 ? "up" : "down"} ${Math.abs(growth)}% on the previous 30 days.` : ""}`
        : "Not enough activity yet to rank markets.",
      action: "Open market report",
    },
  ];
}

/** Scroll plays three copilot workflows: question → data consulted → grounded answer. */
export function CopilotShowcase() {
  const pulse = usePulse();
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!pulse) return;
    const media = gsap.matchMedia();
    media.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const panes = gsap.utils.toArray<HTMLElement>(".ai-pane");
        // Camera: the product window tilts up from the table as the section arrives.
        gsap.fromTo(
          ".ai-window",
          { rotateX: 22, yPercent: 12, scale: 0.9 },
          { rotateX: 0, yPercent: 0, scale: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "top top", scrub: 0.6 } },
        );
        gsap.set(panes.slice(1), { autoAlpha: 0 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: ".ai-stage",
            start: "top top",
            end: () => `+=${window.innerHeight * 2.6}`,
            pin: true,
            scrub: 0.6,
          },
        });
        panes.forEach((pane, i) => {
          const at = i * 1.2;
          if (i > 0) {
            tl.to(panes[i - 1], { autoAlpha: 0, yPercent: -8, duration: 0.25 }, at - 0.25)
              .fromTo(pane, { autoAlpha: 0, yPercent: 8 }, { autoAlpha: 1, yPercent: 0, duration: 0.25 }, at - 0.1)
              .to(".ai-tab-indicator", { xPercent: 100 * i, duration: 0.3 }, at - 0.2);
          }
          tl.fromTo(pane.querySelectorAll(".ai-q-word"), { opacity: 0.12 }, { opacity: 1, stagger: 0.02, duration: 0.05 }, at)
            .fromTo(pane.querySelectorAll(".ai-tool"), { opacity: 0.25, x: -10 }, { opacity: 1, x: 0, stagger: 0.08, duration: 0.15 }, at + 0.3)
            .fromTo(pane.querySelectorAll(".ai-tool svg"), { color: "#a8baa3" }, { color: "#c98646", stagger: 0.08, duration: 0.1 }, at + 0.35)
            .fromTo(pane.querySelector(".ai-answer"), { clipPath: "inset(100% 0 0 0)", y: 20 }, { clipPath: "inset(0% 0 0 0)", y: 0, duration: 0.35 }, at + 0.62)
            .fromTo(pane.querySelector(".ai-action"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.15 }, at + 0.9);
        });
      }, root);
      return () => ctx.revert();
    });
    media.add("(max-width: 899px) and (prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".ai-pane").forEach((pane) =>
          gsap.from(pane.querySelector(".ai-answer"), {
            clipPath: "inset(100% 0 0 0)",
            duration: 0.9,
            ease: EASE.rise,
            scrollTrigger: { trigger: pane, start: "top 75%", once: true },
          }),
        );
      }, root);
      return () => ctx.revert();
    });
    // Sections that mount after data arrives insert pin space; re-measure every trigger in page order.
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => media.revert();
  }, [pulse]);

  if (!pulse) return null;
  const flows = flowsFrom(pulse);
  return (
    <section className="ai-showcase" ref={root} aria-labelledby="ai-title">
      <div className="ai-stage">
        <header className="ai-head">
          <span className="ai-kicker">
            <Sparkles size={15} /> One intelligence, three roles
          </span>
          <h2 id="ai-title">A copilot that reads the market, not a script.</h2>
          <p>
            Customers, growers and administrators each get a copilot that answers from live orders, stock and reviews,
            and asks before it changes anything. Example questions below, answered from this week’s data.
          </p>
          <div className="ai-tabs" aria-hidden="true">
            <span className="ai-tab-indicator" />
            {flows.map((f) => (
              <span key={f.key} className="ai-tab">
                {f.role}
              </span>
            ))}
          </div>
        </header>
        <div className="ai-window-wrap">
          <div className="ai-window">
            <div className="ai-window-bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>Gather & Grow · Copilot</span>
            </div>
            <div className="ai-panes">
              {flows.map((f) => {
                const Icon = f.icon;
                return (
                  <article className={`ai-pane ai-pane-${f.key}`} key={f.key} aria-label={`${f.role}: ${f.name}`}>
                    <p className="ai-pane-role">
                      <Icon size={16} /> {f.name} <span>for {f.role.toLowerCase()}s</span>
                    </p>
                    <p className="ai-q">
                      {f.question.split(" ").map((w, i) => (
                        <span className="ai-q-word" key={i}>
                          {w}{" "}
                        </span>
                      ))}
                    </p>
                    <ul className="ai-tools" aria-label="Data consulted">
                      {f.tools.map((t) => (
                        <li className="ai-tool" key={t}>
                          <Database size={13} /> {t}
                        </li>
                      ))}
                    </ul>
                    <div className="ai-answer">
                      <Sparkles size={16} />
                      <p>{f.answer}</p>
                    </div>
                    {f.action && (
                      <div className="ai-action">
                        <span>
                          <Check size={14} /> Suggested action
                        </span>
                        <strong>
                          {f.action} <ArrowRight size={14} />
                        </strong>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
