import { fetchPublicFarmerReviewsApi } from "../../data/api";
import type { Review } from "../../data/market";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Clock, LogIn, PenLine, Star } from "lucide-react";
import { useMarket, useAction } from "../ui";
import type { Farmer } from "../../data/market";
import { EASE } from "../../motion/motion";
import "./directory.css";

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Read-only stars; fractional ratings fill part of the last star. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="sr-stars" aria-label={`${value.toFixed(1)} out of 5 stars`} style={{ ["--size" as string]: `${size}px` }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="sr-star">
          <Star size={size} />
          <span style={{ width: `${Math.max(0, Math.min(1, value - n + 1)) * 100}%` }}>
            <Star size={size} fill="currentColor" />
          </span>
        </span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="sr-picker">
      <div role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}, ${WORDS[n]}`}
            className={n <= shown ? "on" : ""}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(5, (value || 0) + 1));
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(1, (value || 2) - 1));
            }}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            animate={reduce ? undefined : { scale: value === n ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Star size={28} fill={n <= shown ? "currentColor" : "none"} />
          </motion.button>
        ))}
      </div>
      <span className="sr-picker-word" aria-hidden="true">
        {WORDS[shown] || "Tap a star"}
      </span>
    </div>
  );
}

/**
 * Reviews on a grower's stall. Anyone can read approved reviews; a signed-in
 * customer can write one, which waits for an administrator before it is
 * published and counted in the grower's stars.
 */
export function StallReviews({ farmer: f }: { farmer: Farmer }) {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = summary.current;
    if (!element) return;
    const update = () => element.style.setProperty("--review-sticky-top", `${Math.min(24, window.innerHeight - element.offsetHeight - 24)}px`);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => setVisibleCount(12), [f.id]);
  const [needSignIn, setNeedSignIn] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const [remote, setRemote] = useState<Review[] | null>(null);
  const [reviewError,setReviewError]=useState("");
  const [loadingReviews,setLoadingReviews]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true; setRemote(null); setReviewError(""); setLoadingReviews(false);
    if(f.id.startsWith("demo-")) return;
    setLoadingReviews(true);
    fetchPublicFarmerReviewsApi(f.id).then(result=>{
      if(!active)return;
      setRemote(result.reviews.filter(r=>r.moderationStatus === "approved").map(r=>({id:r.id,orderId:r.orderId??"",target:f.id,targetType:"farmer",rating:r.rating,text:r.comment,reply:r.farmerReply?.text??"",visible:true,author:r.customerName,at:r.createdAt,status:r.moderationStatus,verified:r.verified===true})));
    }).catch(()=>{if(active)setReviewError("Reviews could not be loaded. Please try again.")}).finally(()=>{if(active)setLoadingReviews(false)});
    return()=>{active=false};
  },[f.id,retry]);
  const published = remote ?? s.reviews.filter((r) => r.visible && r.target === f.id && r.targetType !== "product");
  const mine = s.reviews.find(
    (r) => r.mine && r.target === f.id && r.targetType !== "product" && !r.orderId && (r.status === "pending" || r.status === "approved"),
  );
  const pending = mine?.status === "pending" ? mine : null;
  const count = remote ? remote.length : (f.reviewCount || published.length);
  const average = published.length ? published.reduce((a, r) => a + r.rating, 0) / published.length : (remote ? 0 : f.rating || 0);
  const spread = [5, 4, 3, 2, 1].map((n) => ({ n, count: published.filter((r) => r.rating === n).length }));
  const next = `/farmers/${f.id}?review=1`;

  // Coming back from sign-in with ?review=1 opens the form straight away.
  useEffect(() => {
    if (params.get("review") !== "1" || s.status === "loading") return;
    if (s.role === "customer") {
      setOpen(true);
      root.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
    const p = new URLSearchParams(params);
    p.delete("review");
    setParams(p, { replace: true });
  }, [params, s.role, s.status, reduce, setParams]);

  const start = () => {
    setSent(false);
    if (!s.role) {
      setNeedSignIn(true);
      return;
    }
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!rating) return setError("Choose a star rating.");
    if (text.trim().length < 8) return setError("Write at least eight characters.");
    if (act({ type: "stall-review", farmerId: f.id, rating, text }, "Thanks! Your review was sent for approval.")) {
      setOpen(false);
      setSent(true);
      setRating(0);
      setText("");
    }
  };

  const reveal = reduce
    ? {}
    : { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 } };

  return (
    <section className="sr" ref={root} id="reviews" aria-labelledby="sr-title">
      <div className="sr-summary" ref={summary}>
        <span className="sr-kicker">
          <Star size={14} /> Stall reviews
        </span>
        <h2 id="sr-title">What customers say about {f.name}.</h2>
        {count > 0 ? (
          <div className="sr-score">
            <strong>{average.toFixed(1)}</strong>
            <div>
              <Stars value={average} size={20} />
              <span>
                {count} approved review{count === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        ) : (
          <p className="sr-none">No approved reviews yet. Be the first to share how the stall treated you.</p>
        )}
        {published.length > 0 && (
          <ul className="sr-spread" aria-label={`Ratings breakdown of the latest ${published.length} reviews`}>
            {spread.map(({ n, count: c }) => (
              <li key={n}>
                <span>{n}★</span>
                <span className="sr-bar">
                  <motion.i
                    initial={reduce ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: c / published.length }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: EASE.riseCurve }}
                    style={reduce ? { transform: `scaleX(${c / published.length})` } : undefined}
                  />
                </span>
                <span>{Math.round((c / published.length) * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
        {published.length > 0 && published.length < count && (
          <p className="sr-policy">Breakdown of the latest {published.length} reviews.</p>
        )}
        <p className="sr-policy">
          Every review is checked by our team before it appears here and counts towards the stars.
        </p>

        {pending ? (
          <div className="sr-status" role="status">
            <Clock size={18} />
            <div>
              <strong>Your review is waiting for approval</strong>
              <span>
                You gave {pending.rating} star{pending.rating > 1 ? "s" : ""}. We will let you know when it is published.
              </span>
            </div>
          </div>
        ) : mine ? (
          <div className="sr-status sr-status-done">
            <BadgeCheck size={18} />
            <div>
              <strong>Thanks, your review is published.</strong>
            </div>
          </div>
        ) : !open ? (
          <button className="sr-write" onClick={start}>
            <PenLine size={17} /> Write a review
          </button>
        ) : null}

        <AnimatePresence initial={false}>
          {needSignIn && !s.role && (
            <motion.div key="signin" className="sr-signin" {...reveal} transition={{ duration: 0.35, ease: EASE.riseCurve }}>
              <div>
                <LogIn size={18} />
                <div>
                  <strong>Sign in to review this stall</strong>
                  <span>We ask for an account so every review comes from a real customer.</span>
                </div>
              </div>
              <div className="sr-signin-actions">
                <Link className="sr-primary" to={`/login?next=${encodeURIComponent(next)}`}>
                  Sign in
                </Link>
                <Link to={`/register/customer?next=${encodeURIComponent(next)}`}>Create an account</Link>
              </div>
            </motion.div>
          )}
          {open && s.role && s.role !== "customer" && (
            <motion.p key="role" className="sr-note" {...reveal}>
              Reviews are written from customer accounts. You are signed in as {s.role === "admin" ? "an administrator" : "a grower"}.
            </motion.p>
          )}
          {open && s.role === "customer" && (
            <motion.form key="form" className="sr-form" onSubmit={submit} {...reveal} transition={{ duration: 0.35, ease: EASE.riseCurve }}>
              <StarPicker value={rating} onChange={setRating} />
              <label>
                <span>Your review</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder="Freshness, how you were served, whether your order was ready on time…"
                />
                <small>{text.trim().length}/1000</small>
              </label>
              {error && (
                <p className="sr-error" role="alert">
                  {error}
                </p>
              )}
              <div className="sr-form-actions">
                <button type="submit" className="sr-primary">
                  Send for approval
                </button>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
          {sent && pending && (
            <motion.p key="sent" className="sr-note" role="status" {...reveal}>
              Sent. An administrator will check it shortly.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="sr-content">
      {loadingReviews && <p role="status">Loading reviews…</p>}
      {reviewError && <p role="alert">{reviewError} <button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>}
      <div className="sr-list">
        {published.length ? (
          published.slice(0, visibleCount).map((r, i) => (
            <motion.article
              key={r.id}
              className="sr-card"
              initial={false}
              whileInView={reduce ? undefined : { y: [6, 0] }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.06, ease: EASE.riseCurve }}
            >
              <header>
                <Stars value={r.rating} size={14} />
                {r.verified && (
                  <span className="sr-verified">
                    <BadgeCheck size={13} /> Verified pickup
                  </span>
                )}
              </header>
              <p>“{r.text}”</p>
              <footer>
                <strong>{r.author ?? "Customer"}</strong>
                {r.at && <time dateTime={r.at}>{new Date(r.at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</time>}
              </footer>
              {r.reply && (
                <blockquote className="sr-reply">
                  <span>Reply from {f.name}</span>
                  {r.reply}
                </blockquote>
              )}
            </motion.article>
          ))
        ) : (
          <div className="sr-empty">
            <Stars value={0} size={22} />
            <p>{loadingReviews ? "Checking published reviews…" : reviewError ? "Review service unavailable." : "No approved reviews have been published yet."}</p>
          </div>
        )}
      </div>
      {published.length > visibleCount && <button className="sr-more" onClick={() => setVisibleCount(n => n + 12)}>Show more reviews ({published.length - visibleCount} remaining)</button>}
      </div>
    </section>
  );
}
