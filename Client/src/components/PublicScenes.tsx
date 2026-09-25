import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  MapPin,
  Search,
  ShoppingBasket,
  Sprout,
  Clock,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useVisitor } from "../data/visitor-context";
import { countryName } from "../data/visitor";

gsap.registerPlugin(ScrollTrigger);
const directions = {
  markets: {
    title: "A place. A morning. Your market.",
    body: "Find the gathering that fits your day. Meet its growers, browse the harvest and plan where you will collect.",
    image: "/images/market-arrival.jpg",
    label: "Explore the gathering",
    caption: "Editorial market photograph. Listed venues are separate records.",
  },
  growers: {
    title: "Food has a story. Start with the people.",
    body: "Go beyond a product label. Find the growers, the way they work and the markets where you can meet them.",
    image: "/images/market-person.jpg",
    label: "Meet the growers",
    caption: "Editorial portrait, not a photograph of a listed grower.",
  },
  produce: {
    title: "What will you bring home?",
    body: "Follow the season, discover a favourite and reserve what is available for your market day.",
    image: "/images/harvest.jpg",
    label: "Browse the harvest",
    caption:
      "Editorial harvest imagery. Availability and prices come from the listings below.",
  },
} as const;
export function SceneHeader({
  kind,
  target,
}: {
  kind: keyof typeof directions;
  target: string;
}) {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { visitor, openModal } = useVisitor();
  const scene = directions[kind];
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .from(".scene-shutter", {
            scaleY: 1,
            transformOrigin: "bottom",
            duration: 1.1,
          })
          .from(
            ".scene-word",
            { yPercent: 110, stagger: 0.055, duration: 0.75 },
            0.15,
          )
          .from(".scene-caption", { xPercent: -100, duration: 0.7 }, 0.6)
          .from(
            ".scene-controls",
            { clipPath: "inset(0 100% 0 0)", duration: 0.6 },
            0.65,
          );
        gsap.to(".scene-photo img", {
          scale: 1.13,
          objectPosition: "50% 70%",
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, [kind]);
  return (
    <section className={`public-scene scene-${kind}`} ref={root}>
      <figure className="scene-photo">
        <img src={scene.image} alt={scene.caption} fetchPriority="high" />
        <span className="scene-shutter" aria-hidden="true" />
        <figcaption className="scene-caption">{scene.caption}</figcaption>
      </figure>
      <div className="scene-copy">
        <span className="scene-kicker">
          <Sprout size={17} /> The Living Market
        </span>
        <h1 tabIndex={-1}>
          {scene.title.split(" ").map((word, i) => (
            <span className="scene-word-mask" key={i}>
              <span className="scene-word">{word}&nbsp;</span>
            </span>
          ))}
        </h1>
        <p>{scene.body}</p>
        <div className="scene-controls">
          <button
            onClick={() =>
              document
                .getElementById(target)
                ?.scrollIntoView({ behavior: reduce ? "instant" : "smooth" })
            }
          >
            {scene.label}
            <ArrowDown size={19} />
          </button>
          <button onClick={openModal}>
            <MapPin size={16} />
            {visitor.city ||
              countryName(visitor.country) ||
              "Choose a location"}
          </button>
        </div>
      </div>
      <span className="scene-side-note">Discover / Reserve / Collect</span>
    </section>
  );
}

const steps = [
  {
    title: "Find your gathering.",
    short: "Discover",
    body: "Choose a country, city and market day. Compare the participating venues and the growers attending each one.",
    image: "/images/market-arrival.jpg",
    href: "/markets",
    action: "Explore markets",
    icon: MapPin,
  },
  {
    title: "Make a little room for fresh.",
    short: "Choose",
    body: "Check the selling unit, dated availability and grower behind each offer. Your basket stays grouped by farmer.",
    image: "/images/tomatoes.jpg",
    href: "/products",
    action: "Discover produce",
    icon: Sprout,
  },
  {
    title: "Give your morning a plan.",
    short: "Reserve",
    body: "Review each farmer’s pickup window and reservation details. Availability is checked again before a reservation can be confirmed.",
    image: "/images/harvest.jpg",
    href: "/basket",
    action: "Review your basket",
    icon: ShoppingBasket,
  },
  {
    title: "Meet. Collect. Enjoy.",
    short: "Collect",
    body: "Follow your order’s collection details, meet the farmer and pay at pickup. Review your experience after the order is completed.",
    image: "/images/market-person.jpg",
    href: "/customer/market-day",
    action: "Open your market day",
    icon: Check,
  },
] as const;
export function PickupJourney({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();
  const current = steps[step];
  const Icon = current.icon;
  return (
    <section
      className={`pickup-theatre ${compact ? "pickup-compact" : ""}`}
      aria-label="How your market day works"
    >
      <div className="pickup-theatre-heading">
        <span>
          <Clock size={16} /> From first discovery to the last pickup
        </span>
        <h2>A market day, made yours.</h2>
        <p>Follow the journey. Choose a step to see what happens next.</p>
      </div>
      <div className="pickup-stage">
        <div className="pickup-visual">
          <AnimatePresence mode="sync" initial={false}>
            <motion.img
              key={step}
              src={current.image}
              alt="Editorial illustration of the market-day journey"
              initial={{
                clipPath: reduce ? "inset(0%)" : "inset(0 100% 0 0)",
                scale: reduce ? 1 : 1.08,
              }}
              animate={{ clipPath: "inset(0%)", scale: 1 }}
              exit={{ clipPath: reduce ? "inset(0%)" : "inset(0 0 0 100%)" }}
              transition={{
                duration: reduce ? 0 : 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </AnimatePresence>
          <span className="pickup-photo-note">
            Editorial imagery, not a confirmed order or participating seller.
          </span>
        </div>
        <div className="pickup-script">
          <div className="pickup-track" aria-hidden="true">
            <svg viewBox="0 0 420 90">
              <path
                d="M20 60C90 60 80 20 150 20S220 70 280 55 335 20 400 30"
                fill="none"
                stroke="#809976"
                strokeWidth="2"
                strokeDasharray="3 6"
              />
              <motion.path
                d="M20 60C90 60 80 20 150 20S220 70 280 55 335 20 400 30"
                fill="none"
                stroke="#e3edbf"
                strokeWidth="4"
                animate={{ pathLength: (step + 1) / 4 }}
                transition={{ duration: reduce ? 0 : 0.6 }}
              />
            </svg>
            <motion.span
              animate={{ x: reduce ? 0 : step * 18 }}
              transition={{ type: "spring", stiffness: 150, damping: 22 }}
            >
              <Icon size={25} />
            </motion.span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ clipPath: reduce ? "inset(0%)" : "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0%)" }}
              exit={{ clipPath: reduce ? "inset(0%)" : "inset(100% 0 0 0)" }}
              transition={{ duration: reduce ? 0 : 0.24 }}
            >
              <span className="pickup-chapter">0{step + 1} / 04</span>
              <h3>{current.title}</h3>
              <p>{current.body}</p>
              <Link to={current.href}>
                {current.action}
                <ArrowRight size={18} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="pickup-step-navigation" aria-label="Market-day steps">
        {steps.map((s, i) => (
          <button
            key={s.short}
            aria-pressed={step === i}
            onClick={() => setStep(i)}
          >
            {step === i && (
              <motion.span
                className="pickup-tab-active"
                layoutId={compact ? "home-pickup-step" : "help-pickup-step"}
                transition={{
                  duration: reduce ? 0 : 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            )}
            <span>0{i + 1}</span>
            <strong>{s.short}</strong>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
    </section>
  );
}

const answers = [
  [
    "Payment",
    "How do I pay?",
    "Pay the farmer in person when you collect. Gather & Grow does not provide an online payment gateway or delivery.",
  ],
  [
    "Reservations",
    "Can I change a reservation?",
    "Open the order to see its current eligibility and cutoff. Changes require confirmation; availability and the farmer’s rules apply.",
  ],
  [
    "Reservations",
    "Why separate my basket by farmer?",
    "Each grower prepares a separate collection. Review every pickup location and time window before confirming.",
  ],
  [
    "Pickup",
    "What should I bring?",
    "Bring your order details and a reusable bag. Check the pickup location, window and payment arrangements before leaving.",
  ],
  [
    "Pickup",
    "What if the map is unavailable?",
    "Use the accessible market list and the order’s address. Demo maps are illustrative; real directions require approved coordinates.",
  ],
  [
    "Copilot",
    "Can I use Gather & Grow without AI?",
    "Yes. Discovery, product browsing, your basket and order pages work independently of Copilot. An unavailable assistant should never block those workflows.",
  ],
  [
    "Reviews",
    "When can I leave a review?",
    "Open a completed order to see eligible review options. Review controls depend on the order and account permissions.",
  ],
] as const;
export function HelpExperience() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All questions");
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const filtered = answers.filter(
    ([c, q, a]) =>
      (category === "All questions" || c === category) &&
      `${q} ${a}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="help-experience">
      <header className="help-opening">
        <span>
          <Sprout /> Gather & Grow field guide
        </span>
        <h1 tabIndex={-1}>
          A better morning starts{" "}
          <br />
          with knowing what to expect.
        </h1>
        <p>
          Explore the journey, then find the practical details for your visit.
        </p>
        <a href="#help-answers">
          Jump to your question
          <ArrowDown size={17} />
        </a>
      </header>
      <PickupJourney />
      <section className="help-answers" id="help-answers">
        <aside>
          <span>The practical details</span>
          <h2>What’s on your mind?</h2>
          <nav aria-label="Help topics">
            {["All questions", ...new Set(answers.map(([c]) => c))].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
              >
                {c}
                <ArrowRight size={16} />
              </button>
            ))}
          </nav>
          <Link to="/contact">
            Still need a hand?
            <ArrowRight size={16} />
          </Link>
        </aside>
        <div>
          <label className="help-search">
            <Search size={20} />
            <input
              aria-label="Search help"
              placeholder="Find an answer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="help-results" aria-live="polite">
            {filtered.map(([c, q, a], i) => (
              <motion.article layout={!reduce} key={q}>
                <button
                  aria-expanded={open === q}
                  aria-controls={`answer-${answers.findIndex((item) => item[1] === q)}`}
                  onClick={() => setOpen(open === q ? null : q)}
                >
                  <span>0{i + 1}</span>
                  <strong>{q}</strong>
                  <motion.span
                    animate={{ rotate: open === q ? 90 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  >
                    <ArrowRight size={19} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === q && (
                    <motion.div
                      id={`answer-${answers.findIndex((item) => item[1] === q)}`}
                      initial={{
                        height: reduce ? "auto" : 0,
                        opacity: reduce ? 1 : 0,
                      }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{
                        height: reduce ? "auto" : 0,
                        opacity: reduce ? 1 : 0,
                      }}
                      transition={{ duration: reduce ? 0 : 0.28 }}
                    >
                      <p>{a}</p>
                      <small>{c}</small>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            ))}
            {!filtered.length && (
              <p>
                No matching answer. Try another phrase or choose all questions.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
