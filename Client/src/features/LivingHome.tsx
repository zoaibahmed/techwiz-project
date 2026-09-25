import { MarketChapter } from "../components/MarketChapter";
import { MarketHero } from "../components/MarketHero";
import { HarvestIndex, MarketPackingGuide } from "../components/HarvestIndex";
import { PickupJourney } from "../components/PublicScenes";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  Heart,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Sprout,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMarket, useAction, Notice } from "../components/ui";
import { MarketMap } from "../components/MarketMap";
import { marketDayView } from "../data/living-selectors";
import {
  countryName,
  formatMarketDay,
  formatMarketMoney,
  formatMarketTime,
  hasMarketCoverage,
  getAvailableDays,
} from "../data/visitor";
import { CoverageEmpty } from "../components/CoverageBoundary";
import { useVisitor } from "../data/visitor-context";

gsap.registerPlugin(ScrollTrigger);
export function LivingHome() {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const { visitor, updateVisitor: save, openModal: open, t } = useVisitor();
  const covered = hasMarketCoverage(s.markets, visitor.country, visitor.city);
  const root = useRef<HTMLDivElement>(null);
  const days = getAvailableDays(s.markets, visitor.country, visitor.city);
  const day = days.includes(visitor.day) ? visitor.day : (days[0] ?? "");
  const [query, setQuery] = useState("");
  const [marketId, setMarket] = useState("");
  const [farmerId, setFarmer] = useState("");
  const [productId, setProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState("");
  const date = (v: string) =>
    formatMarketDay(v, visitor.locale, market?.timeZone);
  const money = (v: number) =>
    formatMarketMoney(v, market?.currency, visitor.locale);
  const time = (v: string) =>
    formatMarketTime(v, visitor.locale, market?.timeZone);
  const view = marketDayView(s, day);
  const markets = covered
    ? view.markets
        .filter(
          (m) =>
            m.countryCode === visitor.country &&
            (!visitor.city ||
              m.city?.toLowerCase() === visitor.city.toLowerCase()),
        )
        .filter((m) =>
          `${m.name} ${m.area}`.toLowerCase().includes(query.toLowerCase()),
        )
    : [];
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
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "start",
    });
  const chooseMarket = (id: string) => {
    setMarket(id);
    setQuantity(1);
    setAdded("");
  };
  useEffect(() => {
    setQuantity(1);
    setAdded("");
    setQuery("");
  }, [visitor.country, visitor.city, day]);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(""), 3500);
    return () => clearTimeout(timer);
  }, [added]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".harvest-index-tabs button", {
          clipPath: "inset(0 100% 0 0)", stagger: .12, duration: .7,
          scrollTrigger: {trigger: ".harvest-index", start: "top 75%"},
        });
        gsap.from(".packing-guide h2", {
          clipPath: "inset(0 0 100% 0)", duration: .85,
          scrollTrigger: {trigger: ".packing-guide", start: "top 75%"},
        });
        if (covered)
          gsap.from(".global-grower-photo img", {
            clipPath: "inset(0 0 100% 0)",
            duration: 0.85,
            scrollTrigger: {
              trigger: ".global-grower-photo",
              start: "top 85%",
            },
          });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, [covered, visitor.locale]);
  return (
    <div className="global-market" ref={root}>
      <MarketHero headline={t("headline")} lead={t("lead")}>
          <div className="global-discovery-form">
            <button className="hero-location" onClick={open}>
              <MapPin size={20} />
              <span>
                <small>{t("location")}</small>
                <strong>
                  {covered
                    ? market?.id.startsWith("demo-")
                      ? t("lahore")
                      : `${visitor.city} · ${countryName(visitor.country, visitor.locale)}`
                    : visitor.country
                      ? countryName(visitor.country, visitor.locale)
                      : t("anywhere")}
                </strong>
              </span>
              <ArrowUpRight size={18} />
            </button>
            {covered && (
              <label className="hero-day">
                <CalendarDays size={20} />
                <span>
                  <small>{t("day")}</small>
                  <select
                    aria-label={t("day")}
                    value={day}
                    onChange={(e) => save({ ...visitor, day: e.target.value })}
                  >
                    {days.map((d) => (
                      <option value={d} key={d}>
                        {date(d)}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            )}
            <button
              className="global-primary"
              onClick={() => (covered ? scrollTo("market-explorer") : open())}
            >
              {t("discover")}
              <ArrowRight size={18} />
            </button>
          </div>
      </MarketHero>
      {!covered ? (
        <>
          <MarketChapter kind="discover" />
          <CoverageEmpty />
          <MarketChapter kind="grow" />
          <MarketChapter kind="harvest" />
        </>
      ) : (
        <>
          <section id="market-explorer" className="global-explorer">
            <MarketChapter kind="discover" />
            <div className="explorer-heading">
              <div>
                <span>
                  <MapPin size={14} />
                  {visitor.city} ·{" "}
                  {countryName(visitor.country, visitor.locale)}
                </span>
                <h2>{t("discovery")}</h2>
              </div>
              <p>{t("discoveryBody")}</p>
            </div>
            <div className="global-explorer-toolbar">
              <label>
                <Search size={18} />
                <input
                  aria-label={t("neighbourhood")}
                  placeholder={t("search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="global-days">
                {days.map((d) => (
                  <button
                    key={d}
                    aria-pressed={d === day}
                    onClick={() => save({ ...visitor, day: d })}
                  >
                    {day === d && (
                      <motion.span
                        layoutId="global-day"
                        transition={{ duration: reduce ? 0 : 0.25 }}
                      />
                    )}
                    <CalendarDays size={16} />
                    <span>{date(d)}</span>
                  </button>
                ))}
              </div>
              <Link to={`/markets?${new URLSearchParams({ day, q: query })}`}>
                {t("directory")}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            {visitor.locale === "ur" && (
              <p className="fixture-source-note">{t("fixtureLanguage")}</p>
            )}
            <div className="global-discovery-workspace">
              <div className="global-market-list">
                <div className="global-list-count">
                  <strong>
                    {markets.length} {t("markets")}
                  </strong>
                  <span>{t("sampleMarket")}</span>
                </div>
                {markets.map((m, i) => (
                  <button
                    key={m.id}
                    className={`explorer-market-choice ${market?.id === m.id ? "selected" : ""}`}
                    aria-pressed={market?.id === m.id}
                    onClick={() => chooseMarket(m.id)}
                  >
                    <span className="global-market-number">0{i + 1}</span>
                    <span>
                      <strong lang="en" dir="ltr">
                        {m.name}
                      </strong>
                      <small lang="en">{m.area}</small>
                      <small>
                        <Clock size={12} />
                        <bdi>{m.hours}</bdi>
                      </small>
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                ))}
                {!markets.length && (
                  <div className="global-list-empty">
                    <p>{t("noMarket")}</p>
                    <button onClick={() => setQuery("")}>{t("clear")}</button>
                  </div>
                )}
                <small className="global-list-foot">{t("demoNote")}</small>
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
                initial={{ x: reduce ? 0 : 24 }}
                animate={{ x: 0 }}
                exit={{ x: reduce ? 0 : -24, opacity: reduce ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              >
                <div>
                  <span>{t("selected")}</span>
                  <strong lang="en">{market?.name ?? t("noMarket")}</strong>
                </div>
                <div>
                  <span>{t("when")}</span>
                  <strong>{date(day)}</strong>
                </div>
                <div>
                  <span>{t("navGrowers")}</span>
                  <strong>
                    {growers.length} {t("growers")}
                  </strong>
                </div>
                {market && (
                  <Link to={`/markets/${market.id}`}>
                    {t("marketDetails")}
                    <ArrowUpRight size={17} />
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
          <section className="global-growers" id="grower-section">
            <MarketChapter kind="grow" />
            <figure className="global-grower-photo">
              <img
                src="/images/market-person.jpg"
                alt={t("portrait")}
                loading="lazy"
              />
              <figcaption>{t("portrait")}</figcaption>
            </figure>
            <div className="global-grower-copy">
              <span>
                <Sprout size={16} />
                {t("people")}
              </span>
              <h2>{t("stallTitle")}</h2>
              <p>{t("stallBody")}</p>
              <div className="grower-switcher">
                {growers.map((f) => (
                  <button
                    key={f.id}
                    aria-pressed={farmer?.id === f.id}
                    onClick={() => {
                      setFarmer(f.id);
                      setQuantity(1);
                      setAdded("");
                    }}
                  >
                    <strong lang="en">{f.name}</strong>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
              {farmer ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={farmer.id}
                    className="global-grower-story"
                    initial={{ y: reduce ? 0 : 14, opacity: reduce ? 1 : 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: reduce ? 1 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  >
                    <p lang="en" dir="ltr">
                      {farmer.story}
                    </p>
                    <Link to={`/farmers/${farmer.id}`}>
                      {t("profile")}
                      <ArrowUpRight size={16} />
                    </Link>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <p className="no-stall">{t("noGrower")}</p>
              )}
            </div>
          </section>
          <section
            className="global-reservation"
            aria-labelledby="reserve-title"
          >
            <MarketChapter kind="harvest" />
            <div className="global-section-title">
              <div>
                <span lang="en">{farmer?.name}</span>
                <h2 id="reserve-title">{t("reserve")}</h2>
              </div>
              <p>{t("reserveBody")}</p>
            </div>
            {product ? (
              <div className="global-bench">
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
                        <strong lang="en">{p.name}</strong>
                        <small>
                          {money(p.price)} / <bdi lang="en">{p.unit}</bdi>
                        </small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
                <div className="global-product-image">
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
                  <button
                    className="global-favourite"
                    aria-label={t(
                      s.favourites.includes(product.id)
                        ? "unfavourite"
                        : "favourite",
                    )}
                    aria-pressed={s.favourites.includes(product.id)}
                    onClick={() =>
                      act({ type: "favourite", id: product.id }, "")
                    }
                  >
                    <Heart
                      size={18}
                      fill={
                        s.favourites.includes(product.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                  <span>
                    {product.stock - product.reserved} {t("left")}
                  </span>
                </div>
                <div className="bench-details global-product-details">
                  <span lang="en">{product.category}</span>
                  <h3 lang="en">{product.name}</h3>
                  <p lang="en" dir="ltr">
                    {product.description}
                  </p>
                  <div className="global-price">
                    <strong>{money(product.price)}</strong>
                    <span>
                      {t("unit")}: <bdi lang="en">{product.unit}</bdi>
                    </span>
                  </div>
                  <div className="bench-pickup">
                    <Clock size={18} />
                    <div>
                      <strong>
                        {t("pickup")} {date(day)}
                      </strong>
                      <span>
                        {slots
                          .map(
                            (slot) => `${time(slot.start)}–${time(slot.end)}`,
                          )
                          .join(" / ")}
                      </span>
                      <small>{t("pickupNote")}</small>
                    </div>
                  </div>
                  <div className="global-buy-row">
                    <div className="global-quantity">
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
                    </div>
                    <motion.button
                      className="bench-add global-primary"
                      whileTap={reduce ? {} : { scale: 0.96 }}
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
                            "",
                          )
                        ) {
                          setAdded(product.id);
                          setQuantity(1);
                        }
                      }}
                    >
                      {added === product.id ? (
                        <Check size={18} />
                      ) : (
                        <Plus size={18} />
                      )}{" "}
                      {t(added === product.id ? "added" : "add")}
                    </motion.button>
                  </div>
                  <Link to={`/products/${product.id}`}>
                    {t("productDetails")}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bench-empty">
                <ShoppingBasket />
                <h3>{t("none")}</h3>
                <p>{t("noneBody")}</p>
                <button onClick={() => scrollTo("market-explorer")}>
                  {t("back")}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            )}
            <p className="global-market-terms">{t("currency")}</p>
            <div className="market-bag-dock">
              <div>
                <ShoppingBasket size={23} />
                <motion.strong
                  key={basketCount}
                  initial={{ scale: reduce ? 1 : 1.4 }}
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
                {t("review")}
                <ArrowRight size={18} />
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
                  <span>{t("addedNote")}</span>
                  <Link to="/basket">{t("review")}</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          {s.announcements
            .filter((a) => a.published)
            .slice(-1)
            .map((a) => (
              <div
                className="experience-announcement"
                lang="en"
                dir="ltr"
                key={a.id}
              >
                <Notice>
                  <strong>{a.title}</strong> · {a.body}
                </Notice>
              </div>
            ))}
        </>
      )}
      {covered && <HarvestIndex products={view.products.filter(p => s.farmers.some(f => f.id === p.farmerId && markets.some(m => m.id === f.marketId)))} />}
      <MarketPackingGuide />
      <PickupJourney compact />
    </div>
  );
}
