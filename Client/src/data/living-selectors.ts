import { activeOrder } from "./market";
import type { DemoState } from "./market";

// View selectors over isolated fixtures; these are not backend response types.
export function marketDayView(s: DemoState, day: string) {
  const markets = s.markets.filter((m) => m.active && m.day === day);
  const marketIds = new Set(markets.map((m) => m.id));
  const growers = s.farmers.filter(
    (f) => f.state === "Approved" && marketIds.has(f.marketId),
  );
  const growerIds = new Set(growers.map((f) => f.id));
  const products = s.products.filter(
    (p) =>
      growerIds.has(p.farmerId) &&
      p.visible &&
      p.available &&
      p.stock > p.reserved &&
      s.slots.some(
        (slot) =>
          slot.farmerId === p.farmerId &&
          slot.start.startsWith(day) &&
          slot.cutoff > s.now,
      ),
  );
  const orders = s.orders
    .filter(
      (o) =>
        activeOrder(o) &&
        s.slots.some(
          (slot) => slot.id === o.slotId && slot.start.startsWith(day),
        ),
    )
    .sort((a, b) =>
      (s.slots.find((slot) => slot.id === a.slotId)?.start ?? "").localeCompare(
        s.slots.find((slot) => slot.id === b.slotId)?.start ?? "",
      ),
    );
  return { markets, growers, products, orders };
}

// Deliberately schematic coordinates, stable across filtering. Never navigation data.
export const sampleMapPositions: Record<string, [number, number]> = {
  "demo-m1": [31, 41],
  "demo-m2": [70, 65],
  "demo-m3": [70, 23],
};
