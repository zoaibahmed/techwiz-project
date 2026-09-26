import { useEffect, useState } from "react";

/** Anonymised live platform figures from GET /api/v1/pulse (see workspace.service.js). */
export interface Pulse {
  generatedAt: string;
  network: {
    countries: number;
    cities: { city: string; region: string; markets: number; growers: number; coordinates: { lng: number; lat: number } | null; bookedValueMinor: number }[];
    markets: number;
    growers: number;
    products: number;
    categories: number;
  };
  week: { reservations: number; openReservations: number; unitsReserved: number; nextMarketDate: string | null };
  trust: {
    fulfilmentRate: number | null;
    ordersCollected: number;
    rating: number | null;
    reviews: number;
    repeatCustomers: number;
    customers: number;
    bookedValueMinor: number;
  };
  highlights: {
    topProduct: { name: string; units: number; valueMinor: number } | null;
    strongestMarket: { name: string; city: string; orders: number; valueMinor: number } | null;
    topGrower: { name: string; orders: number } | null;
    restock: { name: string; grower: string; sellThrough: number; market: string } | null;
    growthPct: number | null;
  };
  activity: { at: string; quantity: number; unit: string; product: string; grower: string; market: string; city: string; status: string }[];
  routes: { grower: string; market: string; city: string; from: { lng: number; lat: number }; to: { lng: number; lat: number }; km: number }[];
  averageRouteKm: number | null;
  reviews: { text: string; rating: number; author: string; grower: string }[];
}

let cache: { at: number; value: Pulse } | null = null;
let inflight: Promise<Pulse | null> | null = null;

async function load(): Promise<Pulse | null> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  inflight ??= fetch("/api/v1/pulse", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j?.data) cache = { at: Date.now(), value: j.data };
      return j?.data ?? null;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Shared, cached pulse data; refreshes every minute while mounted. */
export function usePulse() {
  const [pulse, setPulse] = useState<Pulse | null>(cache?.value ?? null);
  useEffect(() => {
    let alive = true;
    const tick = () => load().then((p) => alive && p && setPulse(p));
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return pulse;
}

/** "12 min ago" style relative time. */
export function ago(isoTime: string, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - new Date(isoTime).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
