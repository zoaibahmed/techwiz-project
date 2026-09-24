import { describe, expect, it } from "vitest";
import {
  countryOptions,
  parseVisitor,
  hasMarketCoverage,
  formatMarketMoney,
  getAvailableDays,
} from "./visitor";
import { seed } from "./market";

describe("global discovery preferences", () => {
  it("searches the comprehensive ISO registry in English and Urdu", () => {
    expect(countryOptions("en").length).toBeGreaterThanOrEqual(249);
    expect(countryOptions("ur", "Japan").map(([code]) => code)).toContain("JP");
    expect(countryOptions("en", "NZ").map(([code]) => code)).toContain("NZ");
  });
  it("rejects invalid persisted countries and malformed dates", () => {
    expect(parseVisitor("{broken").seen).toBe(false);
    expect(
      parseVisitor(
        JSON.stringify({ version: 1, locale: "en", country: "ZZ", seen: true }),
      ).country,
    ).toBe("");
    expect(
      parseVisitor(
        JSON.stringify({
          version: 1,
          locale: "ur",
          country: "JP",
          day: "bad",
          seen: true,
        }),
      ).day,
    ).toBe("");
  });
  it("never manufactures coverage or currencies from the visitor country", () => {
    const markets = seed().markets;
    expect(hasMarketCoverage(markets, "JP")).toBe(false);
    expect(hasMarketCoverage(markets, "PK", "Karachi")).toBe(false);
    expect(hasMarketCoverage(markets, "PK", "Lahore")).toBe(true);
    expect(getAvailableDays(markets, "JP")).toEqual([]);
    expect(formatMarketMoney(18000, "PKR", "en")).toContain("180");
    expect(formatMarketMoney(18000, "GBP", "en")).toContain("£");
  });
});
