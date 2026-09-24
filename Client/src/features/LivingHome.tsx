import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  MapPin,
  ShoppingBasket,
  Sprout,
  Clock,
  Globe,
  ShoppingBag,
  Users,
  Star,
  CheckCircle2,
  ShieldCheck,
  Sun,
  HelpCircle,
  Search,
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
  hasMarketCoverage,
  getAvailableDays,
  demoLocation,
} from "../data/visitor";
import { marketDayView } from "../data/living-selectors";

gsap.registerPlugin(ScrollTrigger);

export function LivingHome() {
  const s = useMarket();
  const act = useAction();
  const { visitor, openModal, t, isRTL } = useVisitor();
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
  const marketCurrency = market?.currency ?? "PKR";
  const marketTimeZone = market?.timeZone ?? "Asia/Karachi";

  const basketCount = Object.values(s.basket).reduce((a, b) => a + b, 0);

  function scrollToDiscovery() {
    document.getElementById("market-explorer")?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "start",
    });
  }

  function chooseDay(value: string) {
    setDay(value);
    setAdded("");
  }

  function chooseMarket(value: string) {
    setMarket(value);
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

      {/* 2. DISCOVER A LOCATION & MORNING BRIEFING */}
      <section className="pe-location-bar" aria-labelledby="loc-bar-title">
        <div className="pe-location-info">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="pe-pilot-badge">Active Market Hub</span>
            <span style={{ fontSize: "13px", color: "var(--pe-muted)" }}>
              <Sun size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Saturday Morning: 23°C · Clear Sky · Perfect Market Walk
            </span>
          </div>
          <h3 id="loc-bar-title">{activeCountryName} · {visitor.city || "Lahore"} Region</h3>
          <p>
            <MapPin size={15} />
            Showing operating farmers markets in the Lahore metropolitan pilot area.
          </p>
        </div>
        <div className="pe-location-controls">
          <button
            type="button"
            className="button secondary"
            onClick={openModal}
            style={{ fontSize: "13px", padding: "10px 16px" }}
          >
            <Globe size={15} /> Change Country or City
          </button>
          <a
            href="#market-discovery"
            className="button"
            style={{ fontSize: "13px", padding: "10px 18px" }}
          >
            Explore Markets <ArrowDown size={15} />
          </a>
        </div>
      </section>

      {/* 3. FIND A MARKET DAY (RHYTHM STRIP) */}
      <section className="container" id="market-discovery" style={{ marginBottom: "20px" }}>
        <div className="pe-section-header">
          <span className="pe-eyebrow"><CalendarDays size={14} /> Market Day Calendar</span>
          <h2 className="pe-section-title">Select your morning harvest day.</h2>
          <p className="pe-section-lead">
            Farmers harvest specifically for confirmed Saturday and Sunday arrivals. Select a date to explore attending stalls and reserve produce before Friday evening cutoffs.
          </p>
        </div>

        <div className="pe-day-strip" aria-label="Market day selection">
          {days.map((d) => {
            const dayMarketsCount = countryMarkets.filter((m) => m.active && m.day === d).length;
            const isSelected = day === d;
            return (
              <button
                key={d}
                type="button"
                className={`pe-day-pill ${isSelected ? "active" : ""}`}
                onClick={() => chooseDay(d)}
                aria-pressed={isSelected}
              >
                <CalendarDays size={16} />
                <span>{formatMarketDay(d, visitor.locale, marketTimeZone)}</span>
                <span className="pe-day-count">{dayMarketsCount} markets</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. EXPLORE MARKETS & REAL INTERACTIVE MAP */}
      <section className="container" style={{ marginBottom: "64px" }}>
        <div className="pe-markets-layout">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <strong style={{ fontSize: "15px", color: "var(--pe-forest)" }}>
                {markets.length} Participating Venues in {activeCountryName}
              </strong>
              <div style={{ position: "relative", width: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--pe-muted)" }} />
                <input
                  type="text"
                  placeholder="Filter neighbourhood..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    fontSize: "13px",
                    border: "1px solid var(--pe-border)",
                    borderRadius: "4px",
                    background: "var(--pe-paper)",
                  }}
                />
              </div>
            </div>

            <div className="pe-market-cards-list">
              {markets.map((m) => {
                const attendingCount = s.farmers.filter((f) => f.marketId === m.id && f.state === "Approved").length;
                const isSelected = market?.id === m.id;
                return (
                  <article
                    key={m.id}
                    className={`pe-market-card ${isSelected ? "selected" : ""}`}
                    onClick={() => chooseMarket(m.id)}
                  >
                    <div className="pe-market-card-top">
                      <div>
                        <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pe-harvest)", fontWeight: "600" }}>
                          {m.area} · Lahore
                        </span>
                        <h3 style={{ margin: "4px 0" }}>{m.name}</h3>
                      </div>
                      <Favourite id={m.id} />
                    </div>

                    <div className="pe-market-meta-row">
                      <span className="pe-market-meta-item">
                        <MapPin size={14} color="var(--pe-forest)" />
                        {m.address}
                      </span>
                      <span className="pe-market-meta-item">
                        <Clock size={14} color="var(--pe-forest)" />
                        {m.hours} · {marketTimeZone}
                      </span>
                    </div>

                    <div className="pe-market-card-footer">
                      <span>
                        <Sprout size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                        <strong>{attendingCount} verified stalls</strong> attending
                      </span>
                      <Link
                        to={`/markets/${m.id}`}
                        className="text-link"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--pe-forest)", fontWeight: "600" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Market Details <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {!markets.length && (
                <div style={{ padding: "32px", textAlign: "center", background: "var(--pe-cream)", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 12px", color: "var(--pe-muted)" }}>No market venues match your current filter.</p>
                  <button className="button secondary compact" onClick={() => setQuery("")}>
                    Reset Search
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Leaflet Discovery Map */}
          <div className="pe-map-container">
            <MarketMap
              markets={markets}
              selected={market?.id ?? ""}
              onSelect={chooseMarket}
            />
          </div>
        </div>
      </section>

      {/* 5. MEET PARTICIPATING GROWERS */}
      <section className="container" style={{ marginBottom: "64px" }}>
        <div className="pe-section-header">
          <span className="pe-eyebrow"><Users size={14} /> The People On The Stalls</span>
          <h2 className="pe-section-title">Meet our verified local producers.</h2>
          <p className="pe-section-lead">
            Every farmer on MarketLink is an independent grower or artisanal producer. Read their farm stories, check attending market dates, and pre-order their fresh harvest.
          </p>
        </div>

        <div className="pe-growers-grid">
          {s.farmers
            .filter((f) => f.state === "Approved")
            .slice(0, 3)
            .map((f, i) => {
              const assignedMarket = s.markets.find((m) => m.id === f.marketId);
              const prodsCount = s.products.filter((p) => p.farmerId === f.id && p.visible).length;
              return (
                <Link key={f.id} to={`/farmers/${f.id}`} className="pe-grower-card">
                  <div className="pe-grower-img-box">
                    <img
                      src={i === 0 ? "/images/grower.jpg" : i === 1 ? "/images/market-person.jpg" : "/images/market-arrival.jpg"}
                      alt={f.name}
                    />
                    <span className="pe-grower-badge">
                      <ShieldCheck size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                      Verified Producer
                    </span>
                  </div>
                  <div className="pe-grower-body">
                    <div>
                      <h3>{f.name}</h3>
                      <div className="pe-grower-person">Managed by {f.person}</div>
                      <p className="pe-grower-story">{f.story}</p>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "var(--pe-harvest)" }}>
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} size={14} fill="currentColor" />
                        ))}
                        <span style={{ fontSize: "12px", color: "var(--pe-muted)", marginLeft: "4px" }}>
                          (5.0 · Verified Pickup Reviews)
                        </span>
                      </div>

                      <div className="pe-grower-footer">
                        <span>
                          <MapPin size={13} style={{ display: "inline", verticalAlign: "middle" }} />
                          {assignedMarket?.name ?? "The Orchard Market"}
                        </span>
                        <span>{prodsCount} Produce Lines →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>

        <div style={{ textAlign: "center", marginTop: "-32px", marginBottom: "64px" }}>
          <Link to="/farmers" className="button secondary" style={{ padding: "12px 24px" }}>
            View All Participating Producers <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      {/* 6. DISCOVER DATED PRODUCE */}
      <section className="container" style={{ marginBottom: "64px" }}>
        <div className="pe-section-header">
          <span className="pe-eyebrow"><Sprout size={14} /> Seasonal Harvest Catalogue</span>
          <h2 className="pe-section-title">Fresh from the fields for {formatMarketDay(day, visitor.locale, marketTimeZone)}.</h2>
          <p className="pe-section-lead">
            Produce availability is locked to specific market dates. Reserve your quantities now for guaranteed collection at the stall.
          </p>
        </div>

        <div className="pe-produce-grid">
          {(view.products.length > 0 ? view.products : s.products)
            .filter((p) => p.visible)
            .slice(0, 8)
            .map((p) => {
              const grower = s.farmers.find((f) => f.id === p.farmerId);
              const availableUnits = Math.max(0, p.stock - p.reserved);
              const isAvailable = p.available && availableUnits > 0;
              return (
                <article key={p.id} className="pe-produce-card">
                  <div className="pe-produce-thumb">
                    <img src={p.image} alt={p.name} />
                    <span className={`pe-stock-pill ${!isAvailable ? "out" : availableUnits < 5 ? "low" : ""}`}>
                      {!isAvailable ? "Sold Out" : `${availableUnits} ${p.unit} left`}
                    </span>
                    <Favourite id={p.id} />
                  </div>
                  <div className="pe-produce-info">
                    <div>
                      <span className="pe-produce-farmer">{grower?.name ?? "Local Producer"} · {p.category}</span>
                      <h4 className="pe-produce-title">
                        <Link to={`/products/${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {p.name}
                        </Link>
                      </h4>
                      <div className="pe-produce-price-row">
                        <span className="pe-produce-price-val">
                          {formatMarketMoney(p.price, marketCurrency, visitor.locale)}
                        </span>
                        <span className="pe-produce-unit">/ {p.unit}</span>
                      </div>
                    </div>

                    <div className="pe-produce-actions">
                      <button
                        type="button"
                        className="pe-add-btn"
                        disabled={!isAvailable}
                        onClick={() => {
                          if (
                            act(
                              {
                                type: "basket",
                                id: p.id,
                                quantity: (s.basket[p.id] ?? 0) + 1,
                              },
                              `Added 1 ${p.unit} of ${p.name} to your market bag.`
                            )
                          ) {
                            setAdded(p.id);
                          }
                        }}
                      >
                        <ShoppingBag size={14} />
                        <span>{added === p.id ? "Reserved" : "Pre-order"}</span>
                      </button>
                      <Link to={`/products/${p.id}`} className="button quiet compact" title="View produce details">
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>

        <div style={{ textAlign: "center", marginTop: "-32px", marginBottom: "64px" }}>
          <Link to="/products" className="button" style={{ padding: "12px 28px" }}>
            Explore Full Harvest Catalogue <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 7. BUILD A MARKET BASKET & COLLECTION JOURNEY */}
      <section className="container">
        <div className="pe-journey-banner">
          <div>
            <span className="pe-eyebrow" style={{ color: "#dce3ce" }}>The MarketLink Model</span>
            <h2>Direct producer reservations. Zero grocery markups.</h2>
            <p>
              Unlike conventional grocery apps or warehouse couriers, MarketLink connects you directly with the people who grow your food.
            </p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <Link to="/basket" className="button" style={{ background: "var(--pe-paper)", color: "var(--pe-forest)", border: "none" }}>
                <ShoppingBasket size={17} /> View Current Bag ({basketCount})
              </Link>
              <Link to="/about" className="button secondary" style={{ color: "var(--pe-paper)", borderColor: "#2f523f" }}>
                How Pre-ordering Works
              </Link>
            </div>
          </div>

          <div className="pe-journey-features">
            <div className="pe-journey-feat-item">
              <Sprout size={24} color="#a8dba8" />
              <div>
                <strong>Farmer-Grouped Baskets</strong>
                <span>Items are automatically separated by producer. You know exactly whose stall you are visiting on market morning.</span>
              </div>
            </div>

            <div className="pe-journey-feat-item">
              <Clock size={24} color="#a8dba8" />
              <div>
                <strong>Staggered Arrival Windows</strong>
                <span>Choose a 30-minute pickup slot to collect your pre-packed bags at your own pace without long morning queues.</span>
              </div>
            </div>

            <div className="pe-journey-feat-item">
              <CheckCircle2 size={24} color="#a8dba8" />
              <div>
                <strong>Pay in Person at the Stall</strong>
                <span>No online transaction fees or third-party gateways. Inspect your produce and pay the grower directly in cash or digital transfer.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOUR EDITORIAL STEPS WALKTHROUGH */}
      <section className="container" style={{ marginBottom: "64px" }}>
        <div className="pe-section-header">
          <span className="pe-eyebrow"><Clock size={14} /> The Morning Ritual</span>
          <h2 className="pe-section-title">How a market day unfolds.</h2>
          <p className="pe-section-lead">
            Four simple steps from Thursday harvest planning to your Saturday market breakfast.
          </p>
        </div>

        <div className="pe-steps-grid">
          <div className="pe-step-card">
            <span className="pe-step-num">01</span>
            <h3>Explore & Discover</h3>
            <p>Browse weekly harvest offerings published by verified regional growers across Lahore.</p>
          </div>

          <div className="pe-step-card">
            <span className="pe-step-num">02</span>
            <h3>Lock Pre-orders</h3>
            <p>Select your quantities and reserve before Friday 20:00 cutoff. Farmers pick and crate fresh for you.</p>
          </div>

          <div className="pe-step-card">
            <span className="pe-step-num">03</span>
            <h3>Receive Passport</h3>
            <p>Your digital Pickup Passport organizes your bags by stall number with directions and time windows.</p>
          </div>

          <div className="pe-step-card">
            <span className="pe-step-num">04</span>
            <h3>Collect & Greet</h3>
            <p>Visit the bustling market, greet the farmers, inspect your crated produce, and pay at each stall.</p>
          </div>
        </div>
      </section>

      {/* 9. COMMUNITY FAQ & HARVEST GUIDANCE */}
      <section className="container">
        <div className="pe-faq-section">
          <div className="pe-section-header" style={{ marginBottom: "20px" }}>
            <span className="pe-eyebrow"><HelpCircle size={14} /> Frequently Asked Questions</span>
            <h2 className="pe-section-title">Everything you need to know.</h2>
            <p className="pe-section-lead">
              Common questions about stall collections, payment methods, and producer verification.
            </p>
          </div>

          <div className="pe-faq-grid">
            <div className="pe-faq-item">
              <h4>When is the order cutoff each week?</h4>
              <p>For Saturday markets, pre-orders close strictly at 20:00 on Friday evening so farmers can harvest at dawn on market morning.</p>
            </div>

            <div className="pe-faq-item">
              <h4>Are payments processed online?</h4>
              <p>No. MarketLink facilitates direct reservations. You pay the grower directly at their stall via cash or QR transfer during collection.</p>
            </div>

            <div className="pe-faq-item">
              <h4>What happens if I cannot collect my bag?</h4>
              <p>You can cancel or modify orders in your account prior to Friday's 20:00 cutoff. Uncollected bags are released to general market shoppers at noon.</p>
            </div>

            <div className="pe-faq-item">
              <h4>How are growers verified?</h4>
              <p>Our market administrators physically inspect farming credentials, origin of crops, and stall locations to ensure authenticity.</p>
            </div>
          </div>
        </div>
      </section>

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
