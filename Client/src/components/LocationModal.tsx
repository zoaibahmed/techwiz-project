import { useState, useMemo, useEffect, useRef } from "react";
import {
  Globe,
  Search,
  X,
  Sprout,
  CalendarDays,
  MapPin,
  Check,
  ArrowRight,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useVisitor } from "../data/visitor-context";
import { useMarket } from "./ui";
import {
  countryName,
  countryOptions,
  hasMarketCoverage,
  getAvailableCities,
  getAvailableDays,
  formatMarketDay,
  demoLocation,
} from "../data/visitor";
import type { Locale } from "../data/visitor";
import { en, ur } from "../data/messages";
import type { MessageKey } from "../data/messages";

export function LocationModal() {
  const { visitor, modalOpen, closeModal, updateVisitor } =
    useVisitor();
  const s = useMarket();
  const reduce = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);

  // Local draft state until user applies
  const [selectedLocale, setSelectedLocale] = useState<Locale>(visitor.locale);
  const [selectedCountry, setSelectedCountry] = useState(visitor.country);
  const [selectedCity, setSelectedCity] = useState(visitor.city || "");
  const [selectedDay, setSelectedDay] = useState(visitor.day || "");
  const [countrySearch, setCountrySearch] = useState("");

  const isDraftRTL = selectedLocale === "ur";
  const t = (key: MessageKey): string => {
    return (isDraftRTL ? ur[key] : en[key]) ?? en[key] ?? key;
  };

  useEffect(() => {
    if (!modalOpen) return;
    setSelectedLocale(visitor.locale);
    setSelectedCountry(visitor.country);
    setSelectedCity(visitor.city);
    setSelectedDay(visitor.day);
    setCountrySearch("");
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modalOpen]);

  // Available countries matching search query
  const countries = useMemo(
    () => countryOptions(selectedLocale, countrySearch),
    [selectedLocale, countrySearch],
  );

  // Coverage & available cities for the draft country
  const hasCoverage = useMemo(
    () => hasMarketCoverage(s.markets, selectedCountry),
    [s.markets, selectedCountry],
  );

  const availableCities = useMemo(
    () => getAvailableCities(s.markets, selectedCountry),
    [s.markets, selectedCountry],
  );

  const effectiveCity = selectedCity || availableCities[0] || "";

  const availableDays = useMemo(
    () => getAvailableDays(s.markets, selectedCountry, effectiveCity),
    [s.markets, selectedCountry, effectiveCity],
  );

  function handleSelectCountry(code: string) {
    setSelectedCountry(code);
    const cities = getAvailableCities(s.markets, code);
    const defaultCity = cities[0] ?? "";
    setSelectedCity(defaultCity);
    const days = getAvailableDays(s.markets, code, defaultCity);
    setSelectedDay(days[0] ?? "");
  }

  function handleDemo() {
    updateVisitor({locale:selectedLocale,country:demoLocation.country,city:demoLocation.city,day:demoLocation.days[0],seen:true});
    closeModal();
  }

  function handleApply() {
    updateVisitor({
      locale: selectedLocale,
      country: selectedCountry,
      city: effectiveCity,
      day: selectedDay || availableDays[0] || "",
      seen: true,
    });
    closeModal();
  }

  function handleSkip() {
    // Retain default or current, mark as seen
    updateVisitor({
      seen: true,
      country: visitor.country,
      city: visitor.city,
      day: visitor.day,
    });
    closeModal();
  }

  if (!modalOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="location-modal-overlay"
        ref={modalRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            handleSkip();
          }
          if (e.key === "Tab") {
            const nodes = Array.from(
              modalRef.current?.querySelectorAll<HTMLElement>(
                "button:not([disabled]),input,select,a[href]",
              ) ?? [],
            );
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        dir={isDraftRTL ? "rtl" : "ltr"}
      >
        <motion.div
          className="location-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
        />

        <motion.div
          className="location-modal-card"
          initial={{
            opacity: reduce ? 1 : 0,
            y: reduce ? 0 : 24,
            scale: reduce ? 1 : 0.98,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="location-modal-header">
            <div className="location-modal-badge">
              <Sprout size={18} />
              <span>{t("living")}</span>
            </div>
            <button
              className="location-modal-close"
              onClick={handleSkip}
              aria-label={t("close")}
            >
              <X size={20} />
            </button>
          </div>

          <div className="location-modal-heading">
            <h2 id="location-modal-title">{t("intro")}</h2>
            <p>{t("welcomeBody")}</p>
          </div>

          <div className="location-modal-body">
            {/* Step 1: Language Selection */}
            <div className="location-section">
              <label className="location-label">
                <Globe size={15} />
                <span>{t("language")}</span>
              </label>
              <div className="location-lang-toggle">
                <button
                  type="button"
                  className={`lang-btn ${selectedLocale === "en" ? "active" : ""}`}
                  onClick={() => setSelectedLocale("en")}
                >
                  <span className="lang-name">English</span>
                  <small className="lang-sub">Full experience</small>
                </button>
                <button
                  type="button"
                  className={`lang-btn ${selectedLocale === "ur" ? "active" : ""}`}
                  onClick={() => setSelectedLocale("ur")}
                >
                  <span className="lang-name">اردو</span>
                  <small className="lang-sub">پیش منظر</small>
                </button>
              </div>
              <p className="location-hint">
                <HelpCircle size={13} />
                {t("languageNote")}
              </p>
            </div>

            {/* Step 2: Country Selection (Independent & Comprehensive ISO) */}
            <div className="location-section">
              <div className="location-label-row">
                <label
                  className="location-label"
                  htmlFor="country-search-input"
                >
                  <MapPin size={15} />
                  <span>{t("country")}</span>
                </label>
                {selectedCountry && (
                  <span className="selected-country-pill">
                    {countryName(selectedCountry, selectedLocale)} (
                    {selectedCountry})
                  </span>
                )}
              </div>

              {/* Quick shortcut pills */}
              <div className="quick-country-row">
                <button
                  type="button"
                  className={`quick-pill ${selectedCountry === "PK" ? "active" : ""}`}
                  onClick={() => handleSelectCountry("PK")}
                >
                  🇵🇰 Pakistan ({t("lahore")})
                </button>
                <button
                  type="button"
                  className={`quick-pill ${selectedCountry === "GB" ? "active" : ""}`}
                  onClick={() => handleSelectCountry("GB")}
                >
                  🇬🇧 United Kingdom
                </button>
                <button
                  type="button"
                  className={`quick-pill ${selectedCountry === "US" ? "active" : ""}`}
                  onClick={() => handleSelectCountry("US")}
                >
                  🇺🇸 United States
                </button>
              </div>

              {/* Search box */}
              <div className="location-search-box">
                <Search size={15} />
                <input
                  id="country-search-input"
                  type="text"
                  placeholder={t("searchCountry")}
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  autoComplete="off"
                />
                {countrySearch && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setCountrySearch("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Country options list */}
              <div className="country-list-scroll">
                {countries.map(([code, name]) => {
                  const isCurrent = selectedCountry === code;
                  const hasLocalMarkets = hasMarketCoverage(s.markets, code);
                  return (
                    <button
                      key={code}
                      type="button"
                      className={`country-item ${isCurrent ? "selected" : ""}`}
                      onClick={() => handleSelectCountry(code)}
                    >
                      <span className="country-name">{name}</span>
                      <span className="country-tag">
                        {hasLocalMarkets ? (
                          <span className="tag-demo">Demo markets</span>
                        ) : (
                          <span className="tag-code">{code}</span>
                        )}
                        {isCurrent && <Check size={14} className="tag-check" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: City & Market Day OR Empty State */}
            {hasCoverage ? (
              <div className="location-section-grid">
                {/* City Picker */}
                <div className="location-section">
                  <label className="location-label">
                    <MapPin size={15} />
                    <span>{t("city")}</span>
                  </label>
                  <div className="city-options-row">
                    {availableCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className={`city-pill ${effectiveCity === city ? "active" : ""}`}
                        onClick={() => {
                          setSelectedCity(city);
                          const days = getAvailableDays(
                            s.markets,
                            selectedCountry,
                            city,
                          );
                          setSelectedDay(days[0] ?? "");
                        }}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Market Day Picker */}
                <div className="location-section">
                  <label className="location-label">
                    <CalendarDays size={15} />
                    <span>{t("day")}</span>
                  </label>
                  <div className="day-options-row">
                    {availableDays.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`day-pill ${(selectedDay || availableDays[0]) === d ? "active" : ""}`}
                        onClick={() => setSelectedDay(d)}
                      >
                        {formatMarketDay(d, selectedLocale)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Beautiful Empty State for countries without active markets */
              <div className="location-empty-card">
                <Sprout size={24} className="empty-icon" />
                <div className="empty-content">
                  <h4>{t("emptyTitle")}</h4>
                  <p>{t("emptyBody")}</p>
                </div>
                <button
                  type="button"
                  className="empty-action-btn"
                  onClick={handleDemo}
                >
                  <Sparkles size={15} />
                  <span>{t("demo")}</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="location-modal-footer">
            <button type="button" className="skip-btn" onClick={handleSkip}>
              {t("skip")}
            </button>

            <div className="primary-actions">
              <button
                type="button"
                className="demo-switch-btn"
                onClick={handleDemo}
              >
                {t("demo")}
              </button>
              <button type="button" className="apply-btn" onClick={handleApply}>
                <span>{t("apply")}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
