import { describe, it, expect } from "vitest";
import { seed } from "./market";
import { marketDayView } from "./living-selectors";

describe("market day workspace", () => {
  it("keeps pickups and orderable produce scoped to the selected day", () => {
    const state = seed();
    const saturday = marketDayView(state, "2026-10-03");
    expect(saturday.orders.map((o) => o.id)).toEqual([
      "DEMO-1042",
      "DEMO-1043",
    ]);
    expect(saturday.products).toHaveLength(4);
    const sunday = marketDayView(state, "2026-10-04");
    expect(sunday.markets).toHaveLength(1);
    expect(sunday.orders).toHaveLength(0);
    expect(sunday.products).toHaveLength(0);
  });
  it("excludes closed cutoffs and suspended growers without hiding existing pickups", () => {
    const state = seed();
    state.now = "2026-10-03T08:00:00+05:00";
    expect(marketDayView(state, "2026-10-03").products).toHaveLength(0);
    expect(marketDayView(state, "2026-10-03").orders).toHaveLength(2);
    state.now = "2026-10-02T09:00:00+05:00";
    state.farmers[0].state = "Suspended";
    expect(
      marketDayView(state, "2026-10-03").products.every(
        (p) => p.farmerId !== state.farmers[0].id,
      ),
    ).toBe(true);
  });
});
