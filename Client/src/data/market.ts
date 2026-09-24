import { localization } from "./localization";
// UI-only development models. These are NOT approved API DTOs or lifecycle enums.
export type Role = "customer" | "farmer" | "admin";
export type DemoStage =
  | "Placed"
  | "Accepted"
  | "Ready for pickup"
  | "Completed"
  | "Cancelled"
  | "Declined";
export interface Market {
  id: string;
  name: string;
  area: string;
  address: string;
  day: string;
  hours: string;
  active: boolean;
  countryCode?: string;
  countryName?: string;
  city?: string;
  currency?: string;
  timeZone?: string;
}
export interface Farmer {
  id: string;
  name: string;
  person: string;
  story: string;
  marketId: string;
  state: "Pending" | "Approved" | "Suspended";
}
export interface Product {
  id: string;
  farmerId: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  reserved: number;
  description: string;
  image: string;
  visible: boolean;
  available: boolean;
}
export interface Slot {
  id: string;
  farmerId: string;
  marketId: string;
  start: string;
  end: string;
  cutoff: string;
}
export interface Line {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}
export interface Order {
  id: string;
  farmerId: string;
  marketId: string;
  slotId: string;
  stage: DemoStage;
  lines: Line[];
  events: { label: string; at: string }[];
}
export interface Review {
  id: string;
  orderId: string;
  target: string;
  rating: number;
  text: string;
  reply: string;
  visible: boolean;
}
export interface Notice {
  id: string;
  role: Role;
  title: string;
  text: string;
  href: string;
  read: boolean;
}
export interface Template {
  id: string;
  name: string;
  quantities: Record<string, number>;
}
export interface Announcement {
  id: string;
  title: string;
  body: string;
  published: boolean;
}
export interface DemoState {
  role: Role | null;
  farmerId: string;
  now: string;
  markets: Market[];
  farmers: Farmer[];
  products: Product[];
  slots: Slot[];
  orders: Order[];
  basket: Record<string, number>;
  basketPrices: Record<string, number>;
  favourites: string[];
  restock: string[];
  reviews: Review[];
  notices: Notice[];
  templates: Template[];
  announcements: Announcement[];
  categories: string[];
  customerActive: boolean;
  checklist: string[];
}
export const demoDate = "2026-10-03";
export const currency = localization.currency;
export const money = (minor: number) =>
  new Intl.NumberFormat(localization.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
export const total = (lines: Line[]) =>
  lines.reduce((n, l) => n + l.price * l.quantity, 0);
export const images = {
  basket: "/images/harvest.jpg",
  market: "/images/market.jpg",
  tomatoes: "/images/tomatoes.jpg",
  carrots: "/images/carrots.jpg",
};
export function seed(): DemoState {
  return {
    role: null,
    farmerId: "demo-f1",
    now: "2026-10-02T09:00:00+05:00",
    customerActive: true,
    basket: {},
    basketPrices: {},
    favourites: [],
    restock: [],
    checklist: [],
    categories: ["Vegetables", "Fruit", "Herbs", "Bakery"],
    markets: [
      {
        id: "demo-m1",
        name: "The Orchard Market",
        area: "Model Town",
        city: "Lahore",
        countryCode: "PK",
        countryName: "Pakistan",
        currency: "PKR",
        timeZone: "Asia/Karachi",
        address: "Model Town Sunday Organic Bazaar, Lahore",
        day: demoDate,
        hours: "08:00–13:00",
        active: true,
      },
      {
        id: "demo-m2",
        name: "Riverside Gathering",
        area: "Gulberg III",
        city: "Lahore",
        countryCode: "PK",
        countryName: "Pakistan",
        currency: "PKR",
        timeZone: "Asia/Karachi",
        address: "Liberty Roundabout, Gulberg III, Lahore",
        day: demoDate,
        hours: "09:00–14:00",
        active: true,
      },
      {
        id: "demo-m3",
        name: "Sunday at the Grove",
        area: "DHA Phase 5",
        city: "Lahore",
        countryCode: "PK",
        countryName: "Pakistan",
        currency: "PKR",
        timeZone: "Asia/Karachi",
        address: "Sector J Park, DHA Phase 5, Lahore",
        day: "2026-10-04",
        hours: "08:00–12:00",
        active: true,
      },
    ],
    farmers: [
      {
        id: "demo-f1",
        name: "Good Earth Growers",
        person: "Demo grower A",
        story:
          "A fictional small stall with a simple rhythm: plan the week, bring the harvest, meet the neighbours. This story is illustrative.",
        marketId: "demo-m1",
        state: "Approved",
      },
      {
        id: "demo-f2",
        name: "The Kitchen Garden",
        person: "Demo grower B",
        story:
          "A fictional garden stall celebrating everyday seasonal ingredients. Photography is editorial, not a portrait of this seller.",
        marketId: "demo-m1",
        state: "Approved",
      },
      {
        id: "demo-f3",
        name: "Riverbank Produce",
        person: "Demo grower C",
        story: "An illustrative stall preparing for its first market.",
        marketId: "demo-m2",
        state: "Pending",
      },
      {
        id: "demo-f4",
        name: "Grove Harvest",
        person: "Demo grower D",
        story: "A fictional account used to demonstrate restricted access.",
        marketId: "demo-m3",
        state: "Suspended",
      },
    ],
    products: [
      {
        id: "demo-p1",
        farmerId: "demo-f1",
        name: "Vine tomatoes",
        category: "Vegetables",
        unit: "500 g basket",
        price: 18000,
        stock: 24,
        reserved: 3,
        description:
          "A basket of tomatoes for everyday cooking. Sample product description; availability is simulated for the selected market day.",
        image: images.tomatoes,
        visible: true,
        available: true,
      },
      {
        id: "demo-p2",
        farmerId: "demo-f1",
        name: "Garden carrots",
        category: "Vegetables",
        unit: "bunch",
        price: 12000,
        stock: 20,
        reserved: 2,
        description:
          "A generous bunch for roasting, soups and the week ahead. An illustrative offer sold by the bunch.",
        image: images.carrots,
        visible: true,
        available: true,
      },
      {
        id: "demo-p3",
        farmerId: "demo-f2",
        name: "Mixed harvest basket",
        category: "Vegetables",
        unit: "basket",
        price: 65000,
        stock: 10,
        reserved: 1,
        description:
          "A sample selection of seasonal produce. Contents shown in the photograph are illustrative, not a guaranteed assortment.",
        image: images.basket,
        visible: true,
        available: true,
      },
      {
        id: "demo-p4",
        farmerId: "demo-f2",
        name: "Market vegetables",
        category: "Vegetables",
        unit: "box",
        price: 48000,
        stock: 12,
        reserved: 0,
        description:
          "A demonstration market box for planning your next pickup.",
        image: images.market,
        visible: true,
        available: true,
      },
      {
        id: "demo-p5",
        farmerId: "demo-f1",
        name: "Late-season tomatoes",
        category: "Vegetables",
        unit: "500 g basket",
        price: 16000,
        stock: 0,
        reserved: 0,
        description: "A sold-out fixture for restock and empty-state testing.",
        image: images.tomatoes,
        visible: true,
        available: true,
      },
      {
        id: "demo-p6",
        farmerId: "demo-f2",
        name: "Tender carrots",
        category: "Vegetables",
        unit: "bunch",
        price: 14000,
        stock: 8,
        reserved: 0,
        description:
          "A temporarily unavailable fixture. New reservations are disabled.",
        image: images.carrots,
        visible: true,
        available: false,
      },
    ],
    slots: [
      {
        id: "demo-s1",
        farmerId: "demo-f1",
        marketId: "demo-m1",
        start: `${demoDate}T09:00:00+05:00`,
        end: `${demoDate}T10:00:00+05:00`,
        cutoff: "2026-10-02T20:00:00+05:00",
      },
      {
        id: "demo-s2",
        farmerId: "demo-f1",
        marketId: "demo-m1",
        start: `${demoDate}T10:00:00+05:00`,
        end: `${demoDate}T11:00:00+05:00`,
        cutoff: "2026-10-02T20:00:00+05:00",
      },
      {
        id: "demo-s3",
        farmerId: "demo-f2",
        marketId: "demo-m1",
        start: `${demoDate}T10:00:00+05:00`,
        end: `${demoDate}T11:00:00+05:00`,
        cutoff: "2026-10-02T20:00:00+05:00",
      },
      {
        id: "demo-history-slot",
        farmerId: "demo-f1",
        marketId: "demo-m1",
        start: "2026-09-26T09:00:00+05:00",
        end: "2026-09-26T10:00:00+05:00",
        cutoff: "2026-09-25T20:00:00+05:00",
      },
    ],
    orders: [
      {
        id: "DEMO-1042",
        farmerId: "demo-f1",
        marketId: "demo-m1",
        slotId: "demo-s1",
        stage: "Placed",
        lines: [
          {
            productId: "demo-p1",
            name: "Vine tomatoes",
            unit: "500 g basket",
            price: 18000,
            quantity: 3,
          },
          {
            productId: "demo-p2",
            name: "Garden carrots",
            unit: "bunch",
            price: 12000,
            quantity: 2,
          },
        ],
        events: [{ label: "Placed", at: "2026-10-02T08:00:00+05:00" }],
      },
      {
        id: "DEMO-1043",
        farmerId: "demo-f2",
        marketId: "demo-m1",
        slotId: "demo-s3",
        stage: "Ready for pickup",
        lines: [
          {
            productId: "demo-p3",
            name: "Mixed harvest basket",
            unit: "basket",
            price: 65000,
            quantity: 1,
          },
        ],
        events: [
          { label: "Placed", at: "2026-10-01T08:00:00+05:00" },
          { label: "Accepted", at: "2026-10-01T10:00:00+05:00" },
          { label: "Ready for pickup", at: "2026-10-02T08:00:00+05:00" },
        ],
      },
      {
        id: "DEMO-1030",
        farmerId: "demo-f1",
        marketId: "demo-m1",
        slotId: "demo-history-slot",
        stage: "Completed",
        lines: [
          {
            productId: "demo-p2",
            name: "Garden carrots",
            unit: "bunch",
            price: 10000,
            quantity: 2,
          },
        ],
        events: [
          {
            label: "Completed · historical example",
            at: "2026-09-26T10:00:00+05:00",
          },
        ],
      },
    ],
    reviews: [
      {
        id: "demo-r1",
        orderId: "DEMO-1030",
        target: "demo-f1",
        rating: 5,
        text: "A sample review demonstrating the completed-order review experience.",
        reply: "",
        visible: true,
      },
    ],
    notices: [
      {
        id: "demo-n1",
        role: "customer",
        title: "Your pickup is ready",
        text: "The Kitchen Garden has prepared your sample reservation.",
        href: "/customer/orders/DEMO-1043",
        read: false,
      },
      {
        id: "demo-n2",
        role: "farmer",
        title: "A reservation needs your response",
        text: "Review DEMO-1042 before the next market.",
        href: "/farmer/orders/DEMO-1042",
        read: false,
      },
      {
        id: "demo-n3",
        role: "admin",
        title: "A new stall is waiting",
        text: "Riverbank Produce has requested approval.",
        href: "/admin/farmers/demo-f3",
        read: false,
      },
    ],
    templates: [
      {
        id: "demo-t1",
        name: "Saturday staples",
        quantities: { "demo-p1": 24, "demo-p2": 20 },
      },
    ],
    announcements: [
      {
        id: "demo-a1",
        title: "Bring your market bag",
        body: "Sample announcement: reserve ahead and pay at pickup.",
        published: true,
      },
    ],
  };
}
export const time = (value: string) =>
  new Intl.DateTimeFormat(localization.dateLocale, {
    timeZone: localization.timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const date = (value: string) =>
  new Intl.DateTimeFormat(localization.dateLocale, {
    timeZone: localization.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+05:00` : value));
export const activeOrder = (o: Order) =>
  !["Completed", "Cancelled", "Declined"].includes(o.stage);
