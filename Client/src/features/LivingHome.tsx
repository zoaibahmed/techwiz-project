import { useEffect, useRef, useState, useMemo } from "react";
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
  Globe,
  Sparkles,
  ShoppingBag,
  Users,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMarket, useAction, Favourite, Notice } from "../components/ui";
import { useVisitor } from "../data/visitor-context";
import { MarketMap } from "../components/MarketMap";
import {
  countryName,
  formatMarketDay,
  formatMarketMoney,
  formatMarketTime,
  hasMarketCoverage,
  getAvailableDays,
  demoLocation,
} from "../data/visitor";
import { marketDayView } from "../data/living-selectors";

gsap.registerPlugin(ScrollTrigger);

export function LivingHome() {
  const s = useMarket();
  const act = useAction();
  const { visitor, openModal, resetToDemo, t, isRTL } = useVisitor();
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  // Active country resolution (from visitor preferences or demo default)
  const activeCountry = visitor.country || demoLocation.country;
  const activeCountryName = countryName(activeCountry, visitor.locale);

  // Check if current country has participating markets
  const hasCoverage = useMemo(
    () => hasMarketCoverage(s.markets, activeCountry),
    [s.markets, activeCountry],
  );

  // Markets belonging to active country
  const countryMarkets = useMemo(
    () =>
      s.markets.filter(
        (m) => (m.countryCode ?? "PK").toUpperCase() === activeCountry.toUpperCase(),
      ),
    [s.markets, activeCountry],
  );

  // Available dates for active country
  const days = useMemo(
    () => getAvailableDays(s.markets, activeCountry, visitor.city),
    [s.markets, activeCountry, visitor.city],
  );

  const [day, setDay] = useState(() => visitor.day || days[0] || demoLocation.days[0]);
  const [query, setQuery] = useState("");
  const [marketId, setMarket] = useState(() => countryMarkets[0]?.id ?? "");
  const [farmerId, setFarmer] = useState("");
  const [productId, setProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState("");

  // Sync state if country or visitor preferences change
  useEffect(() => {
    if (countryMarkets.length > 0) {
      if (!countryMarkets.some((m) => m.id === marketId)) {
        setMarket(countryMarkets[0]?.id ?? "");
      }
    }
  }, [countryMarkets, marketId]);

  useEffect(() => {
    if (days.length > 0 && !days.includes(day)) {
      setDay(days[0]);
    }
  }, [days, day]);

  const view = marketDayView(s, day);

  const markets = useMemo(() => {
    if (!hasCoverage) return [];
    return countryMarkets
      .filter((m) => m.active && m.day === day)
      .filter((m) =>
        `${m.name} ${m.area ?? ""} ${m.city ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
  }, [countryMarkets, hasCoverage, day, query]);

  const market = markets.find((m) => m.id === marketId) ?? markets[0];
  const growers = view.growers.filter((f) => f.marketId === market?.id);
  const farmer = growers.find((f) => f.id === farmerId) ?? growers[0];
  const offers = view.products.filter((p) => p.farmerId === farmer?.id);
  const product = offers.find((p) => p.id === productId) ?? offers[0];

  const marketCurrency = market?.currency ?? "PKR";
  const marketTimeZone = market?.timeZone ?? "Asia/Karachi";

  const slots = s.slots.filter(
    (slot) =>
      slot.marketId === market?.id &&
      slot.farmerId === farmer?.id &&
      slot.start.startsWith(day) &&
      slot.cutoff > s.now,
  );

  const basketCount = Object.values(s.basket).reduce((a, b) => a + b, 0);

  function scrollToDiscovery() {
    document.getElementById("market-explorer")?.scrollIntoView({
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

  // Choreographed GSAP entrance and ScrollTrigger animation
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(
            ".arrival-word",
            { yPercent: 90, rotation: 3, stagger: 0.08, duration: 1.1 },
            0,
          )
          .from(
            ".arrival-main-photo",
            { clipPath: "inset(18% 18% 18% 18%)", scale: 0.95, duration: 1.15 },
            0.12,
          )
          .from(
            ".arrival-portrait",
            { y: 60, rotation: -9, duration: 0.95 },
            0.25,
          )
          .from(
            ".arrival-ticket",
            { x: 28, rotation: 4, duration: 0.75 },
            0.4,
          );

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
    <div className="market-experience" ref={root} dir={isRTL ? "rtl" : "ltr"}>
      {/* 1. HERO ARRIVAL SCENE */}
      <section className="arrival-scene" aria-labelledby="arrival-title">
        <div className="arrival-meta">
          <span>
            <MapPin size={14} />
            {activeCountryName} {visitor.city ? `(${visitor.city})` : ""}
            {activeCountry === "PK" ? " · demo edition" : ""}
          </span>
          <button
            type="button"
            className="change-loc-link"
            onClick={openModal}
            style={{
              background: "none",
              border: "none",
              color: "#385437",
              fontSize: "11px",
              cursor: "pointer",
              textDecoration: "underline",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Globe size={12} />
            {t("change")}
          </button>
        </div>

        <div className="arrival-title">
          <p>{t("welcome")}</p>
          <h1 id="arrival-title" tabIndex={-1}>
            <span className="arrival-word">The living</span>{" "}
            <span className="arrival-word">market.</span>
          </h1>
        </div>

        <div className="arrival-stage">
          <figure className="arrival-main-photo">
            <img
              src="/images/market-arrival.jpg"
              alt="Editorial street-market scene with fresh produce and neighbours gathering"
              fetchPriority="high"
            />
            <figcaption>{t("editorial")}</figcaption>
          </figure>

          <figure className="arrival-portrait">
            <img
              src="/images/market-person.jpg"
              alt="Editorial portrait of a local grower"
            />
            <figcaption>
              {t("people")}
              <small>{t("portrait")}</small>
            </figcaption>
          </figure>

          <div className="arrival-ticket">
            <Sprout size={27} />
            <span>{t("day")}</span>
            <strong>{formatMarketDay(day, visitor.locale, marketTimeZone)}</strong>
            <p>
              {t("fresh")}
              <br />
              {t("people")}
              <br />
              {t("collect")}
            </p>
            <button onClick={scrollToDiscovery}>
              {t("discover")} <ArrowDown size={17} />
            </button>
          </div>
        </div>

        <div className="arrival-bottom">
          <p>
            {t("lead")}
            <br />
            <strong>{t("storyTitle")}</strong>
          </p>
          <button
            onClick={scrollToDiscovery}
            className="arrival-down"
            aria-label={t("discover")}
          >
            <ArrowDown />
          </button>
          <span>
            {t("demoNote")}
            <br />
            {t("editorial")}
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

      {/* 2. CONNECTED STORYTELLING SECTION: 4 MORNING STEPS */}
      <section className="market-story-steps" aria-labelledby="story-section-title">
        <div className="story-header">
          <div className="story-kicker">
            <Sprout size={16} />
            <span>{t("living")}</span>
          </div>
          <h2 id="story-section-title">{t("storyTitle")}</h2>
          <p>{t("storyBody")}</p>
        </div>

        <div className="story-grid">
          {/* Step 1 */}
          <div className="story-card">
            <div className="story-card-top">
              <span className="story-step-num">01</span>
              <MapPin size={22} className="story-card-icon" />
            </div>
            <h3>{t("fresh")}</h3>
            <p>{t("freshBody")}</p>
            <span className="story-card-foot">{t("navMarkets")}</span>
          </div>

          {/* Step 2 */}
          <div className="story-card">
            <div className="story-card-top">
              <span className="story-step-num">02</span>
              <Users size={22} className="story-card-icon" />
            </div>
            <h3>{t("people")}</h3>
            <p>{t("peopleBody")}</p>
            <span className="story-card-foot">{t("navGrowers")}</span>
          </div>

          {/* Step 3 */}
          <div className="story-card">
            <div className="story-card-top">
              <span className="story-step-num">03</span>
              <ShoppingBag size={22} className="story-card-icon" />
            </div>
            <h3>{t("reserve")}</h3>
            <p>{t("reserveBody")}</p>
            <span className="story-card-foot">{t("reserved")}</span>
          </div>

          {/* Step 4 */}
          <div className="story-card">
            <div className="story-card-top">
              <span className="story-step-num">04</span>
              <Clock size={22} className="story-card-icon" />
            </div>
            <h3>{t("collect")}</h3>
            <p>{t("collectBody")}</p>
            <span className="story-card-foot">{t("pay")}</span>
          </div>
        </div>
      </section>

      {/* 3. MARKET EXPLORER & DISCOVERY */}
      <section
        id="market-explorer"
        className="market-explorer"
        aria-labelledby="explorer-title"
      >
        <div className="explorer-heading">
          <div>
            <span>{t("intro")}</span>
            <h2 id="explorer-title">{t("discovery")}</h2>
          </div>
          <p>{t("discoveryBody")}</p>
        </div>

        <div className="explorer-toolbar">
          <label>
            <MapPin size={17} />
            <input
              aria-label={t("neighbourhood")}
              placeholder={`${activeCountryName} · ${t("search")}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {hasCoverage && (
            <div className="market-day-tabs" aria-label={t("day")}>
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
                  <span>{formatMarketDay(d, visitor.locale, marketTimeZone)}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="change-loc-pill-btn"
            onClick={openModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#faf8f2",
              border: "1px solid #cbd1bd",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#183b2b",
            }}
          >
            <Globe size={14} />
            <span>{t("change")}</span>
          </button>
        </div>

        {hasCoverage ? (
          <>
            <div className="explorer-workspace">
              <div className="explorer-market-list">
                <div className="explorer-list-label">
                  <strong>{markets.length} {t("markets")}</strong>
                  <span>{activeCountryName}</span>
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
                    <h3>{t("none")}</h3>
                    <p>{t("noMarket")}</p>
                    <button onClick={() => setQuery("")}>{t("clear")}</button>
                  </div>
                )}

                <div className="explorer-list-foot">
                  <Sprout size={20} />
                  <p>
                    {t("discoveryBody")}
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
                  <span>{t("selected")}</span>
                  <strong>{market?.name ?? t("none")}</strong>
                </div>
                <div>
                  <span>{t("when")}</span>
                  <strong>
                    {formatMarketDay(day, visitor.locale, marketTimeZone)}{" "}
                    {market ? `/ ${market.hours}` : ""}
                  </strong>
                </div>
                <div>
                  <span>{t("growers")}</span>
                  <strong>{growers.length} {t("growers")}</strong>
                </div>
                {market && (
                  <Link to={`/markets/${market.id}`}>
                    {t("marketDetails")} <ArrowUpRight size={17} />
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          /* Empty state when selected country has no markets */
          <div className="market-empty-coverage">
            <div className="empty-badge">
              <Sprout size={16} />
              <span>{activeCountryName}</span>
            </div>
            <h3>{t("emptyTitle")}</h3>
            <p>{t("emptyBody")}</p>
            <div className="market-empty-actions">
              <button
                type="button"
                className="demo-btn"
                onClick={resetToDemo}
              >
                <Sparkles size={16} />
                <span>{t("demo")}</span>
              </button>
              <button
                type="button"
                className="change-country-btn"
                onClick={openModal}
              >
                <Globe size={16} />
                <span>{t("change")}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. GROWER INTRODUCTIONS (Attending Stall) */}
      {hasCoverage && (
        <section className="market-stall-scene" aria-labelledby="stall-title">
          <div className="stall-intro">
            <span>{t("selected")}</span>
            <h2 id="stall-title">
              {t("stallTitle")}
            </h2>
            <p>{t("stallBody")}</p>

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
              <p className="no-stall">{t("noGrower")}</p>
            )}

            <Link to="/farmers">
              {t("navGrowers")} <ArrowUpRight size={16} />
            </Link>
          </div>

          <figure className="stall-person">
            <img
              src="/images/grower.jpg"
              alt="Editorial portrait of grower with freshly harvested produce"
              loading="lazy"
            />
            <figcaption>
              {t("profile")}
              <small>{t("portrait")}</small>
            </figcaption>
          </figure>

          <div className="stall-story">
            <Sprout size={27} />
            <span>{t("profile")}</span>
            <h3>{farmer?.name ?? t("profile")}</h3>
            <p>
              {farmer?.story ?? t("noGrower")}
            </p>
            {farmer && (
              <>
                <p className="stall-attendance">
                  <CalendarDays size={16} />
                  {formatMarketDay(day, visitor.locale, marketTimeZone)} · {market?.name}
                </p>
                <Link to={`/farmers/${farmer.id}`}>
                  {t("profile")} <ArrowUpRight size={17} />
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* 5. AVAILABLE PRODUCE & RESERVATION BENCH */}
      {hasCoverage && (
        <section className="reservation-bench" aria-labelledby="reserve-title">
          <div className="bench-heading">
            <div>
              <span>{farmer?.name ?? t("profile")}</span>
              <h2 id="reserve-title">{t("reserve")}</h2>
            </div>
            <p>
              {formatMarketDay(day, visitor.locale, marketTimeZone)} ·{" "}
              {market?.name ?? t("discover")}
              <br />
              {t("reserveBody")}
            </p>
          </div>

          {product ? (
            <div className="bench-body">
              <div className="bench-offer-list" aria-label={t("available")}>
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
                        {formatMarketMoney(p.price, marketCurrency, visitor.locale)} / {p.unit}
                      </small>
                    </span>
                    <span>{p.stock - p.reserved} {t("left")}</span>
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
                  {product.stock - product.reserved} {t("left")}
                </span>
              </div>

              <div className="bench-details">
                <span>
                  {farmer?.name} / {product.category}
                </span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>

                <div className="bench-price">
                  <strong>{formatMarketMoney(product.price, marketCurrency, visitor.locale)}</strong>
                  <span>/ {product.unit}</span>
                </div>

                <div className="bench-pickup">
                  <Clock size={17} />
                  <div>
                    <strong>
                      {t("pickup")} {formatMarketDay(day, visitor.locale, marketTimeZone)}
                    </strong>
                    <span>
                      {slots
                        .map(
                          (slot) =>
                            `${formatMarketTime(slot.start, visitor.locale, marketTimeZone)}–${formatMarketTime(slot.end, visitor.locale, marketTimeZone)}`,
                        )
                        .join(" or ")}
                    </span>
                    <small>{t("pickupNote")}</small>
                  </div>
                </div>

                <div className="bench-quantity">
                  <button
                    aria-label={t("decrease")}
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => q - 1)}
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-label={t("quantity")}>{quantity}</output>
                  <button
                    aria-label={t("increase")}
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
                        "", // Animated receipt owns success feedback
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
                  {added === product.id ? t("added") : t("add")}
                  <span>
                    {formatMarketMoney(
                      product.price * quantity,
                      marketCurrency,
                      visitor.locale,
                    )}
                  </span>
                </motion.button>

                <Link
                  to={`/products/${product.id}`}
                  className="bench-detail-link"
                >
                  {t("productDetails")} <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bench-empty">
              <ShoppingBasket />
              <h3>{t("none")}</h3>
              <p>{t("noneBody")}</p>
              <button onClick={scrollToDiscovery}>
                {t("back")} <ArrowUpRight size={16} />
              </button>
            </div>
          )}

          {/* Persistent Basket Dock */}
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
                {t("bag")}
                <small>{t("bagNote")}</small>
              </span>
            </div>
            <Link to="/basket">
              {t("review")} <ArrowRight size={18} />
            </Link>
          </div>

          {/* Add-to-bag Floating Confirmation Toast */}
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
                  {t("addedNote")}
                  <small>{t("pickupNote")}</small>
                </span>
                <Link to="/basket">
                  {t("review")} <ArrowRight size={16} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Announcements */}
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
