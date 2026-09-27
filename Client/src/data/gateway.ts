import { emptyState, activeOrder } from "./market";
import type {
  Review,
  MarketState,
  Role,
  OrderStage,
  Product,
  Market,
  Slot,
  Farmer,
  Announcement,
  Order,
} from "./market";
import {
  fetchMeApi,
  logoutApi,
  fetchCatalogueApi,
  fetchWorkspaceApi,
  checkoutApi,
  cancelCustomerOrderApi,
  modifyCustomerOrderItemsApi,
  updateFarmerOrderStatusApi,
  createReviewApi,
  replyToReviewApi,
  addFavouriteApi,
  removeFavouriteApi,
  createRestockAlertApi,
  deleteRestockAlertApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  createFarmerProductApi,
  updateFarmerProductApi,
  archiveFarmerProductApi,
  saveFarmerStockOfferApi,
  updateStockOfferStatusApi,
  createPickupWindowApi,
  updateWeeklyTemplateApi,
  updateFarmerApprovalStatusApi,
  updateCustomerStatusApi,
  createAdminMarketApi,
  updateAdminMarketApi,
  deleteAdminMarketApi,
  createAdminCategoryApi,
  deleteAdminCategoryApi,
  createAnnouncementApi,
  updateAnnouncementApi,
  moderateAdminProductApi,
  moderateAdminReviewApi,
} from "./api";
import { productPhoto } from "./photos";

export type Command =
  | { type: "role"; role: Role | null }
  | { type: "basket"; id: string; quantity: number }
  | { type: "favourite" | "check" | "restock"; id: string }
  | { type: "checkout"; slots: Record<string, string> }
  | { type: "stage"; id: string; stage: OrderStage; reason?: string }
  | { type: "edit-order"; id: string; quantities: Record<string, number> }
  | {
      type: "review";
      orderId: string;
      target: string;
      rating: number;
      text: string;
    }
  | { type: "stall-review"; farmerId: string; rating: number; text: string }
  | { type: "review-status"; id: string; status: "approved" | "rejected" | "hidden"; reason?: string }
  | { type: "reply"; id: string; text: string }
  | { type: "read"; id: string }
  | { type: "product"; value: Product; expected?: Product; expiresAt?: number }
  | { type: "market"; value: Market }
  | { type: "slot"; value: Slot }
  | { type: "farmer"; value: Farmer }
  | { type: "announcement"; value: Announcement }
  | { type: "category"; name: string; remove?: boolean }
  | { type: "customer-active"; id?: string; value: boolean }
  | { type: "moderate"; kind: "product" | "review"; id: string }
  | { type: "template"; name: string; quantities: Record<string, number> }
  | { type: "apply-template"; id: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const unique = (prefix: string) =>
  `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
function requireRole(s: MarketState, ...roles: Role[]) {
  assert(
    s.role && roles.includes(s.role),
    "Sign in with the right account for this action.",
  );
}

/**
 * Applies a command to the state and enforces the market rules (stock,
 * cutoffs, allowed status changes). The result is shown immediately; the
 * server then re-validates the same rules when the change is saved.
 */
export function execute(previous: MarketState, command: Command): MarketState {
  const s = structuredClone(previous);
  const approved = () =>
    assert(
      s.farmers.find((f) => f.id === s.farmerId)?.state === "Approved",
      "Your stall must be approved before you can publish.",
    );
  const open = (slotId: string) => {
    const slot = s.slots.find((x) => x.id === slotId);
    assert(slot, "Choose a valid pickup window.");
    assert(
      new Date(s.now) < new Date(slot.cutoff),
      "The cutoff for this pickup window has passed. Choose another market day.",
    );
    return slot;
  };
  switch (command.type) {
    case "role":
      s.role = command.role;
      break;
    case "basket": {
      const p = s.products.find((p) => p.id === command.id);
      assert(p && p.visible, "This product is no longer listed.");
      assert(
        Number.isInteger(command.quantity) && command.quantity >= 0,
        "Choose a whole number of selling units.",
      );
      if (command.quantity > 0) {
        const available = Math.max(0, p.stock - p.reserved);
        assert(
          p.available && available >= command.quantity,
          `Stock is not available for ${command.quantity} ${p.unit} of "${p.name}". The available quantity changed (only ${available} ${p.unit} ${available === 1 ? "is" : "are"} available). Please lower the quantity to continue.`,
        );
        assert(
          s.farmers.find((f) => f.id === p.farmerId)?.state === "Approved",
          "This stall cannot accept new reservations.",
        );
        s.basket[p.id] = command.quantity;
        s.basketPrices[p.id] = p.price;
      } else {
        delete s.basket[p.id];
        delete s.basketPrices[p.id];
      }
      break;
    }
    case "favourite":
    case "check":
    case "restock": {
      if (command.type === "restock" || command.type === "favourite") requireRole(s, "customer");
      const list =
        command.type === "check"
          ? s.checklist
          : command.type === "restock"
            ? s.restock
            : s.favourites;
      const i = list.indexOf(command.id);
      if (i >= 0) list.splice(i, 1);
      else list.push(command.id);
      break;
    }
    case "checkout": {
      requireRole(s, "customer");
      assert(s.customerActive, "Your account is inactive. Contact the market team.");
      assert(Object.keys(s.basket).length, "Your basket is empty.");
      const groups = new Map<string, Product[]>();
      for (const [id, q] of Object.entries(s.basket)) {
        const p = s.products.find((p) => p.id === id);
        assert(
          p && p.visible && p.available && p.stock - p.reserved >= q,
          "Stock changed. Review the basket before reserving.",
        );
        assert(
          s.farmers.find((f) => f.id === p.farmerId)?.state === "Approved",
          "A selected stall is not accepting reservations.",
        );
        assert(
          s.basketPrices[id] === p.price,
          "A price changed. Review and accept the current price in your basket.",
        );
        groups.set(p.farmerId, [...(groups.get(p.farmerId) ?? []), p]);
      }
      for (const [farmerId, products] of groups) {
        const slot = open(command.slots[farmerId] ?? "");
        assert(
          slot.farmerId === farmerId,
          "Pickup window does not belong to this grower.",
        );
        assert(
          s.markets.find((m) => m.id === slot.marketId)?.active,
          "The selected market is closed.",
        );
        const lines = products.map((p) => {
          const quantity = s.basket[p.id];
          p.reserved += quantity;
          return {
            productId: p.id,
            name: p.name,
            unit: p.unit,
            price: p.price,
            quantity,
          };
        });
        s.orders.unshift({
          id: unique("pending"),
          number: "Reserving…",
          farmerId,
          marketId: slot.marketId,
          slotId: slot.id,
          stage: "Placed",
          lines,
          events: [{ label: "Placed", at: s.now }],
          marketDate: slot.date ?? slot.start.slice(0, 10),
        });
      }
      s.basket = {};
      s.basketPrices = {};
      break;
    }
    case "stage": {
      const o = s.orders.find((o) => o.id === command.id);
      assert(o, "Order not found.");
      if (command.stage === "Cancelled") {
        requireRole(s, "customer");
        open(o.slotId);
        assert(
          ["Placed", "Accepted"].includes(o.stage),
          "This order can no longer be cancelled.",
        );
      } else {
        requireRole(s, "farmer");
        approved();
        assert(o.farmerId === s.farmerId, "Only your stall’s orders are available.");
        const next: Partial<Record<OrderStage, OrderStage[]>> = {
          Placed: ["Accepted", "Declined"],
          Accepted: ["Ready for pickup"],
          "Ready for pickup": ["Completed"],
        };
        assert(
          next[o.stage]?.includes(command.stage),
          "This order status change is not available.",
        );
      }
      if (["Cancelled", "Declined", "Completed"].includes(command.stage))
        for (const l of o.lines) {
          const p = s.products.find((p) => p.id === l.productId);
          if (!p) continue;
          p.reserved = Math.max(0, p.reserved - l.quantity);
          if (command.stage === "Completed") p.stock = Math.max(0, p.stock - l.quantity);
        }
      o.stage = command.stage;
      o.events.push({ label: command.stage, at: s.now });
      break;
    }
    case "edit-order": {
      requireRole(s, "customer");
      const o = s.orders.find((o) => o.id === command.id);
      assert(
        o && ["Placed", "Accepted"].includes(o.stage),
        "This reservation can no longer be edited.",
      );
      open(o.slotId);
      for (const line of o.lines) {
        const q = command.quantities[line.productId];
        const p = s.products.find((p) => p.id === line.productId);
        assert(
          Number.isInteger(q) &&
            q > 0 &&
            (!p || p.stock - p.reserved >= q - line.quantity),
          "The requested quantity is unavailable.",
        );
        if (p) p.reserved += q - line.quantity;
        line.quantity = q;
      }
      o.events.push({ label: "Quantities updated", at: s.now });
      break;
    }
    case "review": {
      requireRole(s, "customer");
      const o = s.orders.find((o) => o.id === command.orderId);
      assert(o?.stage === "Completed", "Reviews open once an order is collected.");
      assert(
        command.target === o.farmerId ||
          o.lines.some((l) => l.productId === command.target),
        "Choose a grower or product from this order.",
      );
      assert(
        command.rating >= 1 &&
          command.rating <= 5 &&
          command.text.trim().length >= 8,
        "Choose a rating and write at least eight characters.",
      );
      assert(
        !s.reviews.some(
          (r) => r.orderId === o.id && r.target === command.target,
        ),
        "You have already reviewed this.",
      );
      s.reviews.unshift({
        id: unique("pending-r"),
        orderId: o.id,
        target: command.target,
        targetType: command.target === o.farmerId ? "farmer" : "product",
        rating: command.rating,
        text: command.text.trim(),
        reply: "",
        // Published only after an administrator approves it.
        visible: false,
        status: "pending",
        verified: true,
        author: s.session?.name ?? "You",
        at: s.now,
      });
      break;
    }
    case "stall-review": {
      requireRole(s, "customer");
      const f = s.farmers.find((f) => f.id === command.farmerId && f.state === "Approved");
      assert(f, "This grower is not accepting reviews.");
      assert(
        command.rating >= 1 && command.rating <= 5 && command.text.trim().length >= 8,
        "Choose a star rating and write at least eight characters.",
      );
      const open = s.reviews.find(
        (r) =>
          r.mine &&
          !r.orderId &&
          r.target === f.id &&
          (r.status === "pending" || r.status === "approved"),
      );
      assert(!open, open?.status === "pending" ? "Your review is waiting for approval." : "You have already reviewed this grower.");
      s.reviews.unshift({
        id: unique("pending-r"),
        orderId: "",
        target: f.id,
        targetType: "farmer",
        rating: command.rating,
        text: command.text.trim(),
        reply: "",
        visible: false,
        status: "pending",
        mine: true,
        verified: s.orders.some((o) => o.farmerId === f.id && o.stage === "Completed"),
        author: s.session?.name ?? "You",
        at: s.now,
      });
      break;
    }
    case "review-status": {
      requireRole(s, "admin");
      const r = s.reviews.find((r) => r.id === command.id);
      assert(r, "Review not found.");
      r.status = command.status;
      r.visible = command.status === "approved";
      r.reason = command.reason ?? "";
      break;
    }
    case "reply": {
      requireRole(s, "farmer");
      const r = s.reviews.find((r) => r.id === command.id);
      assert(r, "This review is not for your stall.");
      r.reply = command.text.trim();
      break;
    }
    case "read":
      for (const n of s.notices)
        if (n.role === s.role && (command.id === "all" || n.id === command.id))
          n.read = true;
      break;
    case "product": {
      requireRole(s, "farmer");
      approved();
      const p = command.value;
      const old = s.products.find((x) => x.id === p.id);
      if (command.expected) {
        assert(
          old && JSON.stringify(old) === JSON.stringify(command.expected),
          "Stock changed since this draft. Request a fresh preview.",
        );
        assert(
          command.expiresAt && Date.now() < command.expiresAt,
          "This draft expired. Request a fresh preview.",
        );
      }
      assert(
        p.farmerId === s.farmerId && (!old || old.farmerId === s.farmerId),
        "Only your products can be changed.",
      );
      assert(
        p.name.trim() &&
          s.categories.includes(p.category) &&
          Number.isInteger(p.price) &&
          p.price > 0 &&
          Number.isInteger(p.stock) &&
          p.stock >= (old?.reserved ?? 0),
        "Check name, category, price and stock. Stock cannot be below reservations.",
      );
      p.reserved = old?.reserved ?? 0;
      s.products = [...s.products.filter((x) => x.id !== p.id), p];
      break;
    }
    case "market":
      requireRole(s, "admin");
      assert(
        command.value.name.trim() && command.value.address.trim(),
        "Market name and address are required.",
      );
      if (!command.value.active)
        assert(
          !s.orders.some(
            (o) => o.marketId === command.value.id && activeOrder(o),
          ),
          "Resolve open reservations before closing this market.",
        );
      s.markets = [
        ...s.markets.filter((m) => m.id !== command.value.id),
        command.value,
      ];
      break;
    case "farmer":
      requireRole(s, "admin");
      s.farmers = s.farmers.map((f) =>
        f.id === command.value.id ? command.value : f,
      );
      break;
    case "slot": {
      requireRole(s, "farmer");
      approved();
      const x = command.value;
      assert(
        x.farmerId === s.farmerId &&
          new Date(x.start) < new Date(x.end) &&
          new Date(x.cutoff) < new Date(x.start),
        "A window must end after it starts, with the cutoff before pickup.",
      );
      assert(
        !s.orders.some((o) => o.slotId === x.id && activeOrder(o)),
        "This window already has reservations. Create a new window instead.",
      );
      s.slots = [...s.slots.filter((y) => y.id !== x.id), x];
      break;
    }
    case "announcement":
      requireRole(s, "admin");
      assert(
        command.value.title.trim() && command.value.body.trim(),
        "Title and announcement text are required.",
      );
      s.announcements = [
        ...s.announcements.filter((a) => a.id !== command.value.id),
        command.value,
      ];
      break;
    case "category":
      requireRole(s, "admin");
      if (command.remove) {
        assert(
          !s.products.some((p) => p.category === command.name && !p.archived),
          "This category is used by products.",
        );
        s.categories = s.categories.filter((c) => c !== command.name);
      } else {
        assert(
          command.name.trim() &&
            !s.categories.some(
              (c) => c.toLowerCase() === command.name.trim().toLowerCase(),
            ),
          "Choose a new category name.",
        );
        s.categories.push(command.name.trim());
      }
      break;
    case "customer-active":
      requireRole(s, "admin");
      s.customers = s.customers.map((c) =>
        c.id === command.id ? { ...c, active: command.value } : c,
      );
      break;
    case "moderate":
      requireRole(s, "admin");
      if (command.kind === "product") {
        const p = s.products.find((p) => p.id === command.id);
        assert(p, "Product not found.");
        p.visible = !p.visible;
      } else {
        const r = s.reviews.find((r) => r.id === command.id);
        assert(r, "Review not found.");
        r.visible = !r.visible;
        r.status = r.visible ? "approved" : "hidden";
      }
      break;
    case "template":
      requireRole(s, "farmer");
      assert(command.name.trim(), "Name your template.");
      s.templates.push({
        id: unique("pending-t"),
        name: command.name,
        quantities: command.quantities,
      });
      break;
    case "apply-template": {
      requireRole(s, "farmer");
      approved();
      const t = s.templates.find((t) => t.id === command.id);
      assert(t, "Template not found.");
      for (const [id, q] of Object.entries(t.quantities)) {
        const p = s.products.find(
          (p) => p.id === id && p.farmerId === s.farmerId,
        );
        assert(p && q >= p.reserved, "This template would go below existing reservations.");
        p.stock = q;
      }
      break;
    }
  }
  return s;
}

// ─── Live data: catalogue + role workspace ───────────────────────────────────

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const isSaved = (id: string) => OBJECT_ID.test(id);
const STAGE_TO_STATUS: Record<OrderStage, string> = {
  Placed: "placed",
  Accepted: "accepted",
  "Ready for pickup": "ready_for_pickup",
  Completed: "completed",
  Cancelled: "cancelled",
  Declined: "declined",
};
const BASKET_KEY = "gather-grow.basket.v1";

function readBasket(): Pick<MarketState, "basket" | "basketPrices"> {
  try {
    const raw = localStorage.getItem(BASKET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { basket: parsed.basket ?? {}, basketPrices: parsed.basketPrices ?? {} };
    }
  } catch {
    /* storage unavailable */
  }
  return { basket: {}, basketPrices: {} };
}
function writeBasket(s: MarketState) {
  try {
    localStorage.setItem(BASKET_KEY, JSON.stringify({ basket: s.basket, basketPrices: s.basketPrices }));
  } catch {
    /* storage unavailable */
  }
}

const withPhoto = (p: Product): Product => ({ ...p, image: productPhoto(p) });
function mergeById<T extends { id: string }>(...lists: (T[] | undefined)[]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) for (const item of list ?? []) map.set(item.id, item);
  return [...map.values()];
}

/** Builds UI state from the two server payloads, keeping client-only choices. */
function toState(catalogue: any, ws: any | null, prev: MarketState): MarketState {
  const role: Role | null = ws?.session?.role ?? null;
  const catalogueCategories: any[] = catalogue.categories ?? [];
  const categories: any[] = role === "admin" && ws?.categories ? ws.categories : catalogueCategories;

  let products: Product[] = catalogue.products ?? [];
  let farmers: Farmer[] = catalogue.farmers ?? [];
  let markets: Market[] = catalogue.markets ?? [];
  let slots: Slot[] = catalogue.slots ?? [];
  let reviews = catalogue.reviews ?? [];
  let announcements: Announcement[] = catalogue.announcements ?? [];

  if (role === "farmer" && ws) {
    const own = new Set((ws.products ?? []).map((p: Product) => p.id));
    products = [...products.filter((p) => !own.has(p.id)), ...(ws.products ?? [])];
    if (ws.profile) farmers = mergeById(farmers, [ws.profile]);
    slots = mergeById(slots, ws.slots);
    reviews = mergeById(reviews, ws.reviews);
  } else if (role === "admin" && ws) {
    products = ws.products ?? products;
    farmers = ws.farmers ?? farmers;
    markets = ws.markets ?? markets;
    reviews = mergeById(reviews, ws.reviews);
    announcements = ws.announcements ?? announcements;
  } else if (role === "customer" && ws) {
    reviews = mergeById(reviews, (ws.myReviews ?? []).map((r: Review) => ({ ...r, mine: true })));
  }

  // Past orders reference pickup windows that are no longer listed; rebuild
  // them from the order's own snapshot so every order has its window.
  const orders: Order[] = ws?.orders ?? [];
  const knownSlots = new Set(slots.map((x) => x.id));
  for (const o of orders) {
    if (!o.slotId || knownSlots.has(o.slotId) || !o.marketDate) continue;
    knownSlots.add(o.slotId);
    slots = [
      ...slots,
      {
        id: o.slotId,
        farmerId: o.farmerId,
        marketId: o.marketId,
        date: o.marketDate,
        start: `${o.marketDate}T${o.window?.start || "08:00"}:00+05:00`,
        end: `${o.marketDate}T${o.window?.end || "10:00"}:00+05:00`,
        cutoff: o.cutoff ?? `${o.marketDate}T06:00:00+05:00`,
      },
    ];
  }

  const available = new Set(products.map((p) => p.id));
  const basket = Object.fromEntries(Object.entries(prev.basket).filter(([id]) => available.has(id)));

  return {
    ...prev,
    role,
    status: "ready",
    session: ws?.session ?? null,
    farmerId: ws?.profile?.id ?? "",
    now: new Date().toISOString(),
    markets,
    farmers,
    products: products.map(withPhoto),
    slots,
    orders,
    basket,
    basketPrices: Object.fromEntries(Object.entries(prev.basketPrices).filter(([id]) => id in basket)),
    favourites: (ws?.favourites ?? []).map((f: { id: string }) => f.id),
    restock: (ws?.restockAlerts ?? []).map((a: { productId: string }) => a.productId),
    restockAlerts: ws?.restockAlerts ?? [],
    reviews,
    notices: ws?.notices ?? [],
    templates: ws?.templates ?? [],
    announcements,
    categories: categories.map((c) => c.name),
    categoryIds: Object.fromEntries(categories.map((c) => [c.name, c.id])),
    categoryCounts: Object.fromEntries(catalogueCategories.map((c) => [c.name, c.productCount ?? 0])),
    customerActive: ws?.session?.active ?? true,
    metrics: ws?.metrics ?? null,
    customers: ws?.customers ?? [],
    inquiries: ws?.inquiries ?? [],
  };
}

const slug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** HH:MM of an ISO instant in Pakistan time. */
const pkClock = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const pkDate = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(value));

function hoursOf(m: Market) {
  const [open, close] = (m.hours || "").split(/[–-]/).map((x) => x.trim());
  return { open: m.open || open || "08:00", close: m.close || close || "13:00" };
}

/** Where a farmer's new stock is offered: an existing offer, else their next market day. */
function stockTarget(s: MarketState, p: Product) {
  if (p.marketId && p.date) return { marketId: p.marketId, date: p.date };
  const farmer = s.farmers.find((f) => f.id === s.farmerId);
  const ids = farmer?.marketIds?.length ? farmer.marketIds : [farmer?.marketId ?? ""];
  const options = s.markets
    .filter((m) => ids.includes(m.id) && m.day)
    .sort((a, b) => a.day.localeCompare(b.day));
  const m = options[0];
  if (m) return { marketId: m.id, date: m.day };
  return null;
}

/** Saves one command through the API. `before` and `after` bracket the local change. */
async function persist(command: Command, before: MarketState, after: MarketState) {
  switch (command.type) {
    case "role":
      if (command.role === null) await logoutApi();
      return;
    case "favourite": {
      const type = before.products.some((p) => p.id === command.id)
        ? "product"
        : before.farmers.some((f) => f.id === command.id)
          ? "farmer"
          : "market";
      if (after.favourites.includes(command.id)) await addFavouriteApi(type, command.id);
      else await removeFavouriteApi(type, command.id);
      return;
    }
    case "restock": {
      if (after.restock.includes(command.id)) {
        const p = before.products.find((x) => x.id === command.id);
        const marketId = p?.marketId || p?.offers?.[0]?.marketId;
        if (!marketId) throw new Error("This product has no upcoming market to watch.");
        await createRestockAlertApi({ productId: command.id, marketId });
      } else {
        const alert = before.restockAlerts.find((a) => a.productId === command.id);
        if (alert) await deleteRestockAlertApi(alert.id);
      }
      return;
    }
    case "checkout": {
      const groups = new Map<string, { productId: string; quantity: number }[]>();
      for (const [productId, quantity] of Object.entries(before.basket)) {
        const p = before.products.find((x) => x.id === productId);
        if (!p) continue;
        groups.set(p.farmerId, [...(groups.get(p.farmerId) ?? []), { productId, quantity }]);
      }
      for (const [farmerId, items] of groups) {
        const slot = before.slots.find((x) => x.id === command.slots[farmerId]);
        if (!slot) throw new Error("Choose a pickup window for every grower.");
        await checkoutApi({
          marketId: slot.marketId,
          marketDate: slot.date ?? pkDate(slot.start),
          pickupWindowId: slot.id,
          items,
          customerNotes: "Reserved online. Payment at the stall.",
          idempotencyKey: `web-${globalThis.crypto.randomUUID()}`,
        });
      }
      await gateway.refresh();
      return;
    }
    case "stage":
      if (command.stage === "Cancelled") await cancelCustomerOrderApi(command.id, command.reason || "Cancelled by customer");
      else await updateFarmerOrderStatusApi(command.id, STAGE_TO_STATUS[command.stage] as any, command.reason);
      return;
    case "edit-order":
      await modifyCustomerOrderItemsApi(
        command.id,
        Object.entries(command.quantities).map(([productId, quantity]) => ({ productId, quantity })),
      );
      return;
    case "review": {
      const order = before.orders.find((o) => o.id === command.orderId);
      await createReviewApi({
        orderId: command.orderId,
        targetType: order?.farmerId === command.target ? "farmer" : "product",
        targetId: command.target,
        rating: command.rating,
        comment: command.text.trim(),
      } as any);
      return;
    }
    case "stall-review":
      await createReviewApi({
        targetType: "farmer",
        targetId: command.farmerId,
        rating: command.rating,
        comment: command.text.trim(),
      });
      return;
    case "review-status":
      await moderateAdminReviewApi(command.id, command.status, command.reason);
      return;
    case "reply":
      await replyToReviewApi(command.id, command.text.trim());
      return;
    case "read":
      if (command.id === "all") await markAllNotificationsReadApi();
      else if (isSaved(command.id)) await markNotificationReadApi(command.id);
      return;
    case "product": {
      const p = command.value;
      const old = before.products.find((x) => x.id === p.id && isSaved(x.id));
      const categoryId =
        before.categoryIds[p.category] ||
        (p.category ? before.categoryIds[p.category.toLowerCase()] : "") ||
        p.categoryId ||
        (p.category && /^[0-9a-fA-F]{24}$/.test(p.category) ? p.category : "") ||
        "";

      const details = {
        name: p.name.trim(),
        description: p.description || "",
        categoryId,
        category: p.category || "",
        unit: (p.unit || "kg").toLowerCase().trim(),
        basePriceMinor: Math.round(Number(p.price) || 100),
        imageUrl: p.image || "",
        image: p.image || "",
      };
      let productId = p.id;
      if (old) {
        await updateFarmerProductApi(p.id, details);
        if (old.visible && !p.visible) {
          await archiveFarmerProductApi(p.id);
          return;
        }
      } else {
        const created = await createFarmerProductApi(details);
        productId = created?.id || created?.data?.id || p.id;
      }
      const target = stockTarget(before, p);
      if (target && (!old || old.stock !== p.stock || old.price !== p.price)) {
        await saveFarmerStockOfferApi({
          ...target,
          productId,
          totalQuantity: Number(p.stock) || 50,
          priceMinor: Math.round(Number(p.price) || 100),
          unit: (p.unit || "kg").toLowerCase().trim(),
        });
      }
      if (old?.offerId && old.available !== p.available)
        await updateStockOfferStatusApi(old.offerId, p.available ? "available" : "unavailable");
      return;
    }
    case "market": {
      const m = command.value;
      const existing = before.markets.find((x) => x.id === m.id && isSaved(x.id));
      if (existing && !m.active) {
        await deleteAdminMarketApi(m.id);
        return;
      }
      const day = m.day ? new Date(`${m.day}T12:00:00+05:00`).getDay() : 6;
      const payload = {
        name: m.name.trim(),
        locality: m.area?.trim() ?? "",
        address: m.address.trim(),
        coordinates: m.coordinates,
        countryCode: m.countryCode, countryName: m.countryName, city: m.city, region: m.region, timezone: m.timeZone, currency: m.currency,
        operatingDays: m.operatingDays?.length ? m.operatingDays : [day],
        operatingHours: hoursOf(m),
        ...(m.description !== undefined ? { description: m.description } : {}),
      };
      if (existing) await updateAdminMarketApi(m.id, { ...payload, isActive: true });
      else await createAdminMarketApi(payload);
      return;
    }
    case "slot": {
      const x = command.value;
      await createPickupWindowApi({
        marketId: x.marketId,
        date: pkDate(x.start),
        startTime: pkClock(x.start),
        endTime: pkClock(x.end),
        cutoffAt: new Date(x.cutoff).toISOString(),
        maxCapacity: x.capacity ?? 20,
      });
      return;
    }
    case "farmer": {
      const status = { Approved: "approved", Suspended: "suspended", Pending: "rejected" } as const;
      await updateFarmerApprovalStatusApi(command.value.id, status[command.value.state]);
      return;
    }
    case "announcement": {
      const a = command.value;
      if (isSaved(a.id)) await updateAnnouncementApi(a.id, { isActive: a.published, title: a.title, message: a.body });
      else await createAnnouncementApi({ title: a.title.trim(), message: a.body.trim(), isActive: a.published });
      return;
    }
    case "category":
      if (command.remove) {
        const id = before.categoryIds[command.name];
        if (id) await deleteAdminCategoryApi(id);
      } else {
        await createAdminCategoryApi({ name: command.name.trim(), slug: slug(command.name) });
      }
      return;
    case "customer-active":
      if (command.id) await updateCustomerStatusApi(command.id, command.value);
      return;
    case "moderate":
      if (command.kind === "product") {
        const p = after.products.find((x) => x.id === command.id);
        await moderateAdminProductApi(command.id, p?.visible ? "active" : "hidden");
      } else {
        const r = after.reviews.find((x) => x.id === command.id);
        await moderateAdminReviewApi(command.id, r?.visible ? "approved" : "hidden");
      }
      return;
    case "template": {
      const farmer = before.farmers.find((f) => f.id === before.farmerId);
      const market = before.markets.find((m) => m.id === (farmer?.marketIds?.[0] ?? farmer?.marketId));
      if (!market) throw new Error("Join a market before saving a weekly template.");
      await updateWeeklyTemplateApi({
        marketId: market.id,
        dayOfWeek: market.operatingDays?.[0] ?? 6,
        items: Object.entries(command.quantities)
          .filter(([, q]) => q > 0)
          .map(([productId, defaultQuantity]) => {
            const p = before.products.find((x) => x.id === productId)!;
            return { productId, defaultQuantity, defaultPriceMinor: p.price, unit: p.unit };
          }),
      } as any);
      return;
    }
    case "apply-template": {
      const t = before.templates.find((x) => x.id === command.id);
      if (!t) return;
      const market = before.markets.find((m) => m.id === t.marketId);
      for (const [productId, quantity] of Object.entries(t.quantities)) {
        const p = before.products.find((x) => x.id === productId);
        if (!p) continue;
        const target = market?.day ? { marketId: market.id, date: market.day } : stockTarget(before, p);
        if (!target) continue;
        await saveFarmerStockOfferApi({ ...target, productId, totalQuantity: quantity, priceMinor: p.price, unit: p.unit });
      }
      return;
    }
    default:
      return;
  }
}

const LOCAL_ONLY = new Set<Command["type"]>(["basket", "check"]);

let state: MarketState = { ...emptyState(), ...readBasket() };
const listeners = new Set<() => void>();
const errorListeners = new Set<(message: string) => void>();
const emit = () => listeners.forEach((l) => l());
const reportError = (message: string) => errorListeners.forEach((l) => l(message));

let queue: Promise<void> = Promise.resolve();
let refreshing: Promise<void> | null = null;
let refreshAgain = false;

async function load(): Promise<void> {
  try {
    const hasSession = await fetchMeApi().then((u) => !!u?.role).catch(() => false);
    const [catalogue, ws] = await Promise.all([
      fetchCatalogueApi(),
      hasSession ? fetchWorkspaceApi(state.period).catch(() => null) : Promise.resolve(null),
    ]);
    state = toState(catalogue, ws, state);
  } catch {
    state = { ...state, status: state.markets.length ? "ready" : "offline" };
  }
  emit();
}

export const gateway = {
  snapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Notified when a saved change is rejected by the server. */
  onError: (listener: (message: string) => void) => {
    errorListeners.add(listener);
    return () => {
      errorListeners.delete(listener);
    };
  },
  /** Applies the change on screen immediately, then saves it (throws on rule violations). */
  dispatch(command: Command) {
    const before = state;
    const after = execute(state, command);
    state = after;
    emit();
    if (command.type === "basket") writeBasket(state);
    if (LOCAL_ONLY.has(command.type)) return;
    queue = queue.then(async () => {
      try {
        await persist(command, before, after);
        if (command.type === "checkout") writeBasket(state);
      } catch (e) {
        reportError(e instanceof Error ? e.message : "The change could not be saved.");
      }
      await gateway.refresh();
    });
  },
  /** Reloads the catalogue and workspace from the server (coalesces concurrent calls). */
  refresh(): Promise<void> {
    if (refreshing) {
      refreshAgain = true;
      return refreshing;
    }
    refreshing = (async () => {
      do {
        refreshAgain = false;
        await load();
      } while (refreshAgain);
      refreshing = null;
    })();
    return refreshing;
  },
  /** Called after a successful sign-in. */
  async signIn() {
    state = { ...state, status: "loading" };
    emit();
    await gateway.refresh();
  },
  async signOut() {
    try {
      await logoutApi();
    } catch {
      /* already signed out */
    }
    state = { ...state, role: null, session: null, orders: [], notices: [], metrics: null };
    emit();
    await gateway.refresh();
  },
  /** Changes the dashboard reporting period and reloads metrics. */
  async setPeriod(period: string) {
    state = { ...state, period };
    emit();
    await gateway.refresh();
  },
  /** Resolves once in-flight saves have reached the server. */
  settled: () => queue,
};

// Kept for existing callers (Copilot, layout) that re-sync after server-side changes.
export const syncFromBackend = () => gateway.refresh();

if (typeof window !== "undefined" && typeof fetch !== "undefined" && !import.meta.env.VITEST)
  void gateway.refresh();
