import { MarketHero } from "../components/MarketHero";
import { HarvestIndex } from "../components/HarvestIndex";
import { MarketPulse } from "../components/home/MarketPulse";
import { MarketJourney } from "../components/home/MarketJourney";
import { CopilotShowcase } from "../components/home/CopilotShowcase";
import { TrustLayer } from "../components/home/TrustLayer";
import "../components/home/home.css";
import { MarketExplorer } from "../components/home/MarketExplorer";
import { useEffect, useRef } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMarket, Notice } from "../components/ui";
import { marketDayView } from "../data/living-selectors";
import { countryName, formatMarketDay, hasMarketCoverage, getAvailableDays } from "../data/visitor";
import { CoverageEmpty } from "../components/CoverageBoundary";
import { useVisitor } from "../data/visitor-context";

gsap.registerPlugin(ScrollTrigger);
export function LivingHome() {
  const s = useMarket();
  const reduce = useReducedMotion();
  const { visitor, updateVisitor: save, openModal: open, t } = useVisitor();
  const covered = hasMarketCoverage(s.markets, visitor.country, visitor.city);
  const root = useRef<HTMLDivElement>(null);
  const days = getAvailableDays(s.markets, visitor.country, visitor.city);
  const day = days.includes(visitor.day) ? visitor.day : (days[0] ?? "");
  const view = marketDayView(s, day);
  const markets = covered
    ? view.markets.filter(
        (m) =>
          m.countryCode === visitor.country &&
          (!visitor.city || m.city?.toLowerCase() === visitor.city.toLowerCase()),
      )
    : [];
  const date = (v: string) => formatMarketDay(v, visitor.locale, markets[0]?.timeZone);
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "start",
    });
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        if (document.querySelector(".harvest-index"))
          gsap.from(".harvest-index-tabs button", {
            clipPath: "inset(0 100% 0 0)", stagger: .12, duration: .7,
            scrollTrigger: {trigger: ".harvest-index", start: "top 75%"},
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
                    ? `${visitor.city || t("lahore")} · ${countryName(visitor.country, visitor.locale)}`
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
      <MarketPulse />
      <MarketJourney />
      {!covered ? (
        <>
          <CoverageEmpty />
        </>
      ) : (
        <>
          <MarketExplorer
            city={visitor.city}
            country={visitor.country}
            day={day}
            onDay={(d) => save({ ...visitor, day: d })}
          />
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
      {covered && <HarvestIndex products={view.products.filter(p => s.farmers.some(f => f.id === p.farmerId && markets.some(m => m.id === f.marketId || (f.marketIds ?? []).includes(m.id))))} />}
      <CopilotShowcase />
      <TrustLayer />
    </div>
  );
}
