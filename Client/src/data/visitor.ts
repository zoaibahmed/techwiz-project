import countries from "i18n-iso-countries";
import english from "i18n-iso-countries/langs/en.json";
import urdu from "i18n-iso-countries/langs/ur.json";
import type { Market } from "./market";

countries.registerLocale(english);
countries.registerLocale(urdu);

export type Locale = "en" | "ur";

export interface Visitor {
  version: 1;
  locale: Locale;
  country: string; // ISO 3166-1 alpha-2 e.g. "PK", "GB", "US"
  city: string; // e.g. "Lahore", "London"
  day: string; // YYYY-MM-DD
  seen: boolean;
}

export const visitorKey = "marketlink.visitor.v1";

export const initialVisitor: Visitor = {
  version: 1,
  locale: "en",
  country: "",
  city: "",
  day: "",
  seen: false,
};

// Demo default location reference (clearly identified as one demo location)
export const demoLocation = {
  country: "PK",
  countryName: "Pakistan",
  city: "Lahore",
  currency: "PKR",
  timeZone: "Asia/Karachi",
  days: ["2026-10-03", "2026-10-04"],
} as const;

export const countryName = (code: string, locale: Locale = "en"): string => {
  if (!code) return "";
  return countries.getName(code.toUpperCase(), locale) ?? code;
};

export function countryOptions(
  locale: Locale,
  search = "",
): [string, string][] {
  const q = search.trim().toLowerCase();
  const names = countries.getNames(locale);
  return Object.entries(names)
    .filter(([code, name]) => {
      const localized = name.toLowerCase();
      const engName = (countries.getName(code, "en") ?? "").toLowerCase();
      const cd = code.toLowerCase();
      return localized.includes(q) || engName.includes(q) || cd === q;
    })
    .sort((a, b) => a[1].localeCompare(b[1], locale));
}

export function hasMarketCoverage(
  markets: Market[],
  countryCode: string,
  city = "",
): boolean {
  if (!countryCode) return false;
  const c = countryCode.toUpperCase();
  return markets.some((m) => {
    const mCountry = (m.countryCode ?? "").toUpperCase();
    if (mCountry !== c) return false;
    if (city) {
      const mCity = (m.city ?? "").toLowerCase();
      return mCity === city.toLowerCase();
    }
    return true;
  });
}

export function getAvailableCities(
  markets: Market[],
  countryCode: string,
): string[] {
  if (!countryCode) return [];
  const c = countryCode.toUpperCase();
  const matching = markets.filter(
    (m) => (m.countryCode ?? "").toUpperCase() === c,
  );
  const cities = new Set<string>();
  for (const m of matching) {
    if (m.city) cities.add(m.city);
    else if (m.countryCode === "PK" || !m.countryCode) cities.add("Lahore");
  }
  return Array.from(cities).sort();
}

export function getAvailableDays(
  markets: Market[],
  countryCode: string,
  city = "",
): string[] {
  if (!countryCode) return [];
  const c = countryCode.toUpperCase();
  const matching = markets.filter((m) => {
    const mCountry = (m.countryCode ?? "").toUpperCase();
    if (mCountry !== c) return false;
    if (city) {
      const mCity = (m.city ?? "").toLowerCase();
      return mCity === city.toLowerCase();
    }
    return true;
  });
  return Array.from(new Set(matching.map((m) => m.day)))
    .filter(Boolean)
    .sort();
}

export function parseVisitor(raw: string | null): Visitor {
  try {
    const v = JSON.parse(raw ?? "null");
    if (
      !v ||
      v.version !== 1 ||
      !["en", "ur"].includes(v.locale) ||
      typeof v.country !== "string" ||
      (v.country &&
        !Object.hasOwn(countries.getAlpha2Codes(), v.country.toUpperCase())) ||
      typeof v.seen !== "boolean"
    ) {
      return { ...initialVisitor };
    }
    return {
      version: 1,
      locale: v.locale,
      country: v.country.toUpperCase(),
      city: typeof v.city === "string" ? v.city : "",
      day:
        typeof v.day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(v.day) &&
        Number.isFinite(Date.parse(v.day))
          ? v.day
          : "",
      seen: v.seen,
    };
  } catch {
    return { ...initialVisitor };
  }
}

export function loadVisitor(): Visitor {
  try {
    const raw = localStorage.getItem(visitorKey);
    return parseVisitor(raw);
  } catch {
    return { ...initialVisitor };
  }
}

export function saveVisitor(visitor: Visitor): void {
  try {
    localStorage.setItem(visitorKey, JSON.stringify(visitor));
  } catch {
    // Graceful fallback when localStorage is disabled or quota exceeded
  }
}

export function formatMarketDay(
  day: string,
  locale: Locale = "en",
  _timeZone = "Asia/Karachi",
): string {
  if (!day) return "";
  try {
    const dateObj = new Date(`${day}T12:00:00Z`);
    return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      // A date-only market day is a calendar label, never a UTC instant to shift.
      timeZone: "UTC",
    }).format(dateObj);
  } catch {
    return day;
  }
}

export function formatMarketMoney(
  minor: number,
  currency = "PKR",
  locale: Locale = "en",
): string {
  try {
    const loc =
      locale === "ur"
        ? "ur-PK"
        : currency === "PKR"
          ? "en-PK"
          : currency === "GBP"
            ? "en-GB"
            : "en-US";
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export function formatMarketTime(
  value: string,
  locale: Locale = "en",
  timeZone = "Asia/Karachi",
): string {
  try {
    return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}
