import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
import { usePulse } from "../../data/pulse";
import { EASE } from "../../motion/motion";

gsap.registerPlugin(ScrollTrigger);

/** Proof from real activity: fulfilment, reviews, approved growers and repeat customers. */
export function TrustLayer() {
  const pulse = usePulse();
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!pulse) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".trust-proof", {
          clipPath: "inset(100% 0 0 0)",
          y: 24,
          duration: 1,
          stagger: 0.1,
          ease: EASE.rise,
          scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
        });
      }, root);
      return () => ctx.revert();
    });
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => media.revert();
  }, [pulse]);

  if (!pulse || !pulse.reviews.length) return null;
  const { trust, network } = pulse;
  const half = Math.ceil(pulse.reviews.length / 2);
  const columns = [pulse.reviews.slice(0, half), pulse.reviews.slice(half)];
  return (
    <section className="trust" ref={root} aria-labelledby="trust-title">
      <div className="trust-proofs">
        <span className="trust-kicker">
          <BadgeCheck size={15} /> Built on collected orders, not claims
        </span>
        <h2 id="trust-title">What happens when people show up.</h2>
        <dl>
          <div className="trust-proof">
            <dt>Orders collected</dt>
            <dd>{trust.ordersCollected.toLocaleString("en-PK")}</dd>
          </div>
          <div className="trust-proof">
            <dt>Collected as promised</dt>
            <dd>{trust.fulfilmentRate ?? "—"}%</dd>
          </div>
          <div className="trust-proof">
            <dt>Average rating</dt>
            <dd>
              {trust.rating?.toFixed(1) ?? "—"}
              <Star size={22} fill="currentColor" />
              <small>{trust.reviews.toLocaleString("en-PK")} reviews after pickup</small>
            </dd>
          </div>
          <div className="trust-proof">
            <dt>Growers approved by our team</dt>
            <dd>{network.growers}</dd>
          </div>
        </dl>
        <p className="trust-note">
          Only customers who collected an order can review it. Growers are approved by an administrator before they can
          list, and we never publish organic or certification claims we have not verified.
        </p>
        <Link className="trust-link" to="/farmers">
          Meet the growers <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="trust-wall" aria-label="Recent reviews">
        {columns.map((col, c) => (
          <div className={`trust-column trust-column-${c}`} key={c}>
            <div className="trust-track">
              {[...col, ...col].map((r, i) => (
                <figure className="trust-quote" key={i} aria-hidden={i >= col.length}>
                  <span className="trust-stars" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                  </span>
                  <blockquote>“{r.text}”</blockquote>
                  <figcaption>
                    {r.author}
                    {r.grower && <span> · {r.grower}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
