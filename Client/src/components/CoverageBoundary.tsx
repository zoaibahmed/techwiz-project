import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { MapPin, Sprout, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useVisitor } from "../data/visitor-context";
import { countryName, hasMarketCoverage } from "../data/visitor";
import { useMarket } from "./ui";

export function CoverageEmpty({ heading = false }: { heading?: boolean }) {
  const { visitor, openModal, resetToDemo, t } = useVisitor();
  const reduce = useReducedMotion();
  const Title = heading ? "h1" : "h2";
  return (
    <motion.section
      className="coverage-empty"
      key={`${visitor.country}-${visitor.locale}`}
      initial={{ x: reduce ? 0 : 24, opacity: reduce ? 1 : 0.4 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.3 }}
    >
      <div className="coverage-art" aria-hidden="true">
        <Sprout />
        <span>{visitor.country || "ML"}</span>
        <i />
        <i />
        <i />
      </div>
      <div>
        <span className="coverage-country">
          <MapPin size={16} />
          {visitor.country
            ? countryName(visitor.country, visitor.locale)
            : t("anywhere")}
        </span>
        <Title>{t(visitor.country ? "emptyTitle" : "emptyGlobal")}</Title>
        <p>{t(visitor.country ? "emptyBody" : "emptyGlobalBody")}</p>
        <small>{t("emptyRegion")}</small>
        <div className="coverage-actions">
          <button className="global-primary" onClick={openModal}>
            {t("change")}
            <ArrowRight size={17} />
          </button>
          <button className="global-secondary" onClick={resetToDemo}>
            {t("demo")}
          </button>
        </div>
        <span className="coverage-disclaimer">{t("demoNote")}</span>
      </div>
    </motion.section>
  );
}
export function CoverageBoundary({ children }: { children: ReactNode }) {
  const { visitor, t } = useVisitor();
  const s = useMarket();
  const { pathname } = useLocation();
  const discovery =
    /^\/(markets|products|farmers)(\/|$)/.test(pathname) ||
    /^\/customer(\/market-day)?$/.test(pathname);
  if (discovery && !hasMarketCoverage(s.markets, visitor.country, visitor.city))
    return <CoverageEmpty heading />;
  return (
    <>
      {visitor.locale === "ur" && pathname !== "/" && (
        <div className="locale-fallback" lang="ur" dir="rtl">
          {t("fallback")}
        </div>
      )}
      {children}
    </>
  );
}
