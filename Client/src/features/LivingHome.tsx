import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  MapPin,
  Plus,
  Minus,
  ShoppingBasket,
  Sprout,
  Clock,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMarket, useAction, Favourite, Notice } from "../components/ui";
import { MarketMap } from "../components/MarketMap";
import { date, time, money, demoDate } from "../data/market";
import { marketDayView } from "../data/living-selectors";
import { localization } from "../data/localization";

gsap.registerPlugin(ScrollTrigger);

export function LivingHome() {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState(demoDate);
  const [query, setQuery] = useState("");
  const [marketId, setMarket] = useState(s.markets[0]?.id ?? "");
  const [farmerId, setFarmer] = useState("");
  const [productId, setProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState("");
  const days = [
    ...new Set(s.markets.filter((m) => m.active).map((m) => m.day)),
  ].sort();
  const view = marketDayView(s, day);
  const markets = view.markets.filter((m) =>
    `${localization.city} ${m.name} ${m.area}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const market = markets.find((m) => m.id === marketId) ?? markets[0];
  const growers = view.growers.filter((f) => f.marketId === market?.id);
  const farmer = growers.find((f) => f.id === farmerId) ?? growers[0];
  const offers = view.products.filter((p) => p.farmerId === farmer?.id);
  const product = offers.find((p) => p.id === productId) ?? offers[0];
  const slots = s.slots.filter(
    (slot) =>
      slot.marketId === market?.id &&
      slot.farmerId === farmer?.id &&
      slot.start.startsWith(day) &&
      slot.cutoff > s.now,
  );
  const basketCount = Object.values(s.basket).reduce((a, b) => a + b, 0);
  function scrollToDiscovery() {
    document
      .getElementById("market-explorer")
      ?.scrollIntoView({
        behavior: reduce ? "instant" : "smooth",
        block: "start",
      });
  }
  function chooseDay(value: string) {
    setDay(value);
    setQuantity(1);
    setAdded("");
  }
  function chooseMarket(value: string) {
    setMarket(value);
    setQuantity(1);
    setAdded("");
  }
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(
            ".arrival-word",
            { yPercent: 80, rotation: 3, stagger: 0.09, duration: 1.05 },
            0,
          )
          .from(
            ".arrival-main-photo",
            { clipPath: "inset(20% 20% 20% 20%)", scale: 0.94, duration: 1.1 },
            0.12,
          )
          .from(
            ".arrival-portrait",
            { y: 55, rotation: -9, duration: 0.9 },
            0.25,
          )
          .from(".arrival-ticket", { x: 24, rotation: 5, duration: 0.7 }, 0.4);
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".arrival-scene",
              start: "top top",
              end: "bottom 15%",
              scrub: 0.35,
            },
          })
          .to(".arrival-stage", { y: -50, scale: 0.96, ease: "none" }, 0)
          .to(".arrival-portrait", { y: -75, rotation: 0, ease: "none" }, 0)
          .to(
            ".arrival-connector path",
            { strokeDashoffset: 0, ease: "none" },
            0,
          );
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(""), 3500);
    return () => clearTimeout(timer);
  }, [added]);
  return (
    <div className="market-experience" ref={root}>
      <section className="arrival-scene" aria-labelledby="arrival-title">
        <div className="arrival-meta">
          <span>
            <MapPin size={14} />
            {localization.city}, {localization.country} / demo edition
          </span>
          <span>Reserve online. Meet at the market.</span>
        </div>
        <div className="arrival-title">
          <p>A morning worth stepping out for.</p>
          <h1 id="arrival-title" tabIndex={-1}>
            <span className="arrival-word">The living</span>{" "}
            <span className="arrival-word">market.</span>
          </h1>
        </div>
        <div className="arrival-stage">
          <figure className="arrival-main-photo">
            <img
              src="/images/market-arrival.jpg"
              alt="Editorial street-market scene with a fruit seller and people moving between stalls"
              fetchPriority="high"
            />
            <figcaption>
              Market life, in the frame. Editorial photograph by Veera Jayanth.
            </figcaption>
          </figure>
          <figure className="arrival-portrait">
            <img
              src="/images/market-person.jpg"
              alt="Editorial portrait of a vegetable vendor at his stall"
            />
            <figcaption>
              The people make the market.
              <small>Ravi Sharma / Unsplash · not a MarketLink seller</small>
            </figcaption>
          </figure>
          <div className="arrival-ticket">
            <Sprout size={27} />
            <span>Your next market day</span>
            <strong>{date(day)}</strong>
            <p>
              Find the growers.
              <br />
              See what’s fresh.
              <br />
              Make it your morning.
            </p>
            <button onClick={scrollToDiscovery}>
              Step into the market <ArrowDown size={17} />
            </button>
          </div>
        </div>
        <div className="arrival-bottom">
          <p>
            Discover local stalls, reserve your produce and plan your pickup.
            <br />
            <strong>A little less guesswork. A lot more market day.</strong>
          </p>
          <button
            onClick={scrollToDiscovery}
            className="arrival-down"
            aria-label="Explore the market below"
          >
            <ArrowDown />
          </button>
          <span>
            All market records are fictional.
            <br />
            Photos depict markets in India, not Lahore.
          </span>
        </div>
        <svg
          className="arrival-connector"
          viewBox="0 0 600 90"
          aria-hidden="true"
        >
          <path
            d="M20 4C20 80 420 -15 570 65l-15 -3m15 3-7 -14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="700"
            strokeDashoffset="700"
          />
        </svg>
      </section>
      <section
        id="market-explorer"
        className="market-explorer"
        aria-labelledby="explorer-title"
      >
        <div className="explorer-heading">
          <div>
            <span>Now, make it your market.</span>
            <h2 id="explorer-title">One day. So many possibilities.</h2>
          </div>
          <p>
            Choose a day and a market.
            <br />
            The growers and harvest follow your lead.
          </p>
        </div>
        <div className="explorer-toolbar">
          <label>
            <MapPin size={17} />
            <input
              aria-label="Find a neighbourhood"
              placeholder={`${localization.city} · neighbourhood or market`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="market-day-tabs" aria-label="Choose your market day">
            {days.map((d) => (
              <button
                key={d}
                aria-pressed={day === d}
                onClick={() => chooseDay(d)}
              >
                {day === d && (
                  <motion.span
                    layoutId="selected-market-day"
                    className="day-tab-highlight"
                    transition={{ duration: reduce ? 0 : 0.3, type: "tween" }}
                  />
                )}
                <CalendarDays size={16} />
                <span>{date(d)}</span>
              </button>
            ))}
          </div>
          <Link to={`/markets?${new URLSearchParams({ day, q: query })}`}>
            Full directory <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="explorer-workspace">
          <div className="explorer-market-list">
            <div className="explorer-list-label">
              <strong>{markets.length} markets</strong>
              <span>{localization.city} · demo</span>
            </div>
            {markets.map((m, i) => (
              <button
                className={`explorer-market-choice ${market?.id === m.id ? "selected" : ""}`}
                aria-pressed={market?.id === m.id}
                key={m.id}
                onClick={() => chooseMarket(m.id)}
              >
                <span className="market-choice-index">0{i + 1}</span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.area}</small>
                  <span>
                    <Clock size={12} />
                    {m.hours}
                  </span>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {!markets.length && (
              <div className="explorer-empty">
                <h3>A different day, perhaps?</h3>
                <p>No sample markets match this search.</p>
                <button onClick={() => setQuery("")}>Clear search</button>
              </div>
            )}
            <div className="explorer-list-foot">
              <Sprout size={20} />
              <p>
                Choose a marker or a market.
                <br />
                Your selection stays connected below.
              </p>
            </div>
          </div>
          <MarketMap
            markets={markets}
            selected={market?.id ?? ""}
            onSelect={chooseMarket}
          />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="selected-market-ribbon"
            key={`${day}-${market?.id}`}
            initial={{ x: reduce ? 0 : 25, opacity: reduce ? 1 : 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : -15, opacity: reduce ? 1 : 0.5 }}
            transition={{ duration: reduce ? 0 : 0.22 }}
          >
            <div>
              <span>Your selected market</span>
              <strong>{market?.name ?? "No market selected"}</strong>
            </div>
            <div>
              <span>When</span>
              <strong>
                {date(day)} {market ? `/ ${market.hours}` : ""}
              </strong>
            </div>
            <div>
              <span>Who’s attending</span>
              <strong>{growers.length} approved sample growers</strong>
            </div>
            {market && (
              <Link to={`/markets/${market.id}`}>
                Market details <ArrowUpRight size={17} />
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
      <section className="market-stall-scene" aria-labelledby="stall-title">
        <div className="stall-intro">
          <span>From your selected market</span>
          <h2 id="stall-title">
            Not just a stall.
            <br />
            Someone’s hard work.
          </h2>
          <p>
            Meet the sample growers attending {market?.name ?? "your market"}.
            Choose a stall to see its available harvest and collection windows.
          </p>
          <div className="grower-switcher">
            {growers.map((f, i) => (
              <button
                key={f.id}
                aria-pressed={farmer?.id === f.id}
                onClick={() => {
                  setFarmer(f.id);
                  setQuantity(1);
                  setAdded("");
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{f.name}</strong>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
          {!growers.length && (
            <p className="no-stall">
              No approved growers or reservable produce are listed for this
              sample market yet.
            </p>
          )}
          <Link to="/farmers">
            Browse all grower profiles <ArrowUpRight size={16} />
          </Link>
        </div>
        <figure className="stall-person">
          <img
            src="/images/grower.jpg"
            alt="Editorial photograph of a grower holding freshly harvested beetroot"
            loading="lazy"
          />
          <figcaption>
            Behind the harvest.
            <small>
              Heather Gill / Unsplash. Editorial image, not the selected farmer.
            </small>
          </figcaption>
        </figure>
        <div className="stall-story">
          <Sprout size={27} />
          <span>Fictional grower profile</span>
          <h3>{farmer?.name ?? "A space for the next grower."}</h3>
          <p>
            {farmer?.story ??
              "Check another market day to discover the available sample stalls."}
          </p>
          {farmer && (
            <>
              <p className="stall-attendance">
                <CalendarDays size={16} />
                {date(day)} · {market?.name}
              </p>
              <Link to={`/farmers/${farmer.id}`}>
                Visit the stall profile <ArrowUpRight size={17} />
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="reservation-bench" aria-labelledby="reserve-title">
        <div className="bench-heading">
          <div>
            <span>{farmer?.name ?? "Your selected grower"}</span>
            <h2 id="reserve-title">From this stall. Into your day.</h2>
          </div>
          <p>
            {date(day)} · {market?.name ?? "Choose a market above"}
            <br />
            Availability is checked again at sample checkout.
          </p>
        </div>
        {product ? (
          <div className="bench-body">
            <div className="bench-offer-list" aria-label="Available produce">
              {offers.map((p) => (
                <button
                  key={p.id}
                  aria-pressed={product.id === p.id}
                  onClick={() => {
                    setProduct(p.id);
                    setQuantity(1);
                    setAdded("");
                  }}
                >
                  <img src={p.image} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {money(p.price)} / {p.unit}
                    </small>
                  </span>
                  <span>{p.stock - p.reserved} left</span>
                </button>
              ))}
            </div>
            <div className="bench-photo">
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={product.id}
                  src={product.image}
                  alt={product.name}
                  initial={{
                    clipPath: reduce ? "inset(0%)" : "inset(0 100% 0 0)",
                  }}
                  animate={{ clipPath: "inset(0%)" }}
                  exit={{ opacity: reduce ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.32 }}
                />
              </AnimatePresence>
              <Favourite id={product.id} />
              <span>
                {product.stock - product.reserved} selling units available
              </span>
            </div>
            <div className="bench-details">
              <span>
                {farmer?.name} / {product.category}
              </span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="bench-price">
                <strong>{money(product.price)}</strong>
                <span>per {product.unit}</span>
              </div>
              <div className="bench-pickup">
                <Clock size={17} />
                <div>
                  <strong>Collect on {date(day)}</strong>
                  <span>
                    {slots
                      .map((slot) => `${time(slot.start)}–${time(slot.end)}`)
                      .join(" or ")}
                  </span>
                  <small>Choose your window at checkout · pay at pickup</small>
                </div>
              </div>
              <div className="bench-quantity">
                <button
                  aria-label="Decrease reservation quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                >
                  <Minus size={15} />
                </button>
                <output aria-label="Reservation quantity">{quantity}</output>
                <button
                  aria-label="Increase reservation quantity"
                  disabled={
                    quantity >=
                    product.stock -
                      product.reserved -
                      (s.basket[product.id] ?? 0)
                  }
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={15} />
                </button>
                <span>{product.unit}</span>
              </div>
              <motion.button
                className="bench-add"
                whileTap={reduce ? {} : { scale: 0.97 }}
                disabled={
                  quantity + (s.basket[product.id] ?? 0) >
                  product.stock - product.reserved
                }
                onClick={() => {
                  if (
                    act(
                      {
                        type: "basket",
                        id: product.id,
                        quantity: (s.basket[product.id] ?? 0) + quantity,
                      },
                      "", // The local animated receipt owns successful-add feedback.
                    )
                  ) {
                    setAdded(product.id);
                    setQuantity(1);
                  }
                }}
              >
                {added === product.id ? (
                  <Check size={19} />
                ) : (
                  <Plus size={19} />
                )}{" "}
                {added === product.id
                  ? "Added to your market bag"
                  : "Add to my market bag"}
                <span>{money(product.price * quantity)}</span>
              </motion.button>
              <Link
                to={`/products/${product.id}`}
                className="bench-detail-link"
              >
                Product details <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bench-empty">
            <ShoppingBasket />
            <h3>No reservable produce in this selection.</h3>
            <p>Choose another market or day to find available sample offers.</p>
            <button onClick={scrollToDiscovery}>
              Back to market selection <ArrowUpRight size={16} />
            </button>
          </div>
        )}
        <div className="market-bag-dock">
          <div>
            <ShoppingBasket size={23} />
            <motion.strong
              key={basketCount}
              initial={{ scale: reduce ? 1 : 1.3 }}
              animate={{ scale: 1 }}
            >
              {basketCount}
            </motion.strong>
            <span>
              in your market bag
              <small>Grouped by grower. Paid at the stall.</small>
            </span>
          </div>
          <Link to="/basket">
            Review basket & plan collection <ArrowRight size={18} />
          </Link>
        </div>
        <AnimatePresence>
          {added && (
            <motion.div
              className="bag-confirmation"
              role="status"
              initial={{ y: reduce ? 0 : 60, rotate: reduce ? 0 : -3 }}
              animate={{ y: 0, rotate: 0 }}
              exit={{ y: reduce ? 0 : 60, opacity: 0 }}
            >
              <Check size={20} />
              <span>
                Added to your sample market bag.
                <small>Choose the pickup window when you check out.</small>
              </span>
              <Link to="/basket">
                Review bag <ArrowRight size={16} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {s.announcements
        .filter((a) => a.published)
        .slice(-1)
        .map((a) => (
          <div className="experience-announcement" key={a.id}>
            <Notice>
              <strong>{a.title}</strong> · {a.body}
            </Notice>
          </div>
        ))}
    </div>
  );
}
