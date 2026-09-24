import { seed, activeOrder } from "./market";
import type {
  DemoState,
  Role,
  DemoStage,
  Product,
  Market,
  Slot,
  Farmer,
  Announcement,
} from "./market";
import {
  loginApi,
  checkoutApi,
  cancelCustomerOrderApi,
  updateFarmerOrderStatusApi,
  createReviewApi,
  replyToReviewApi,
  addFavouriteApi,
  removeFavouriteApi,
  updateFarmerApprovalStatusApi,
  updateCustomerStatusApi,
  moderateAdminReviewApi,
  fetchCustomerOrdersApi,
  fetchFarmerOrdersApi,
} from "./api";

export type Command =
  | { type: "role"; role: Role | null }
  | { type: "basket"; id: string; quantity: number }
  | { type: "favourite" | "check" | "restock"; id: string }
  | { type: "checkout"; slots: Record<string, string> }
  | { type: "stage"; id: string; stage: DemoStage }
  | { type: "edit-order"; id: string; quantities: Record<string, number> }
  | {
      type: "review";
      orderId: string;
      target: string;
      rating: number;
      text: string;
    }
  | { type: "reply"; id: string; text: string }
  | { type: "read"; id: string }
  | { type: "product"; value: Product; expected?: Product; expiresAt?: number }
  | { type: "market"; value: Market }
  | { type: "slot"; value: Slot }
  | { type: "farmer"; value: Farmer }
  | { type: "announcement"; value: Announcement }
  | { type: "category"; name: string; remove?: boolean }
  | { type: "customer-active"; value: boolean }
  | { type: "moderate"; kind: "product" | "review"; id: string }
  | { type: "template"; name: string; quantities: Record<string, number> }
  | { type: "apply-template"; id: string }
  | { type: "clock"; late: boolean };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const unique = (prefix: string) =>
  `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
function requireRole(s: DemoState, ...roles: Role[]) {
  assert(
    s.role && roles.includes(s.role),
    "Choose the appropriate development account for this action.",
  );
}
export function execute(previous: DemoState, command: Command): DemoState {
  const s = structuredClone(previous);
  const notify = (role: Role, title: string, text: string, href: string) =>
    s.notices.unshift({
      id: unique("demo-n"),
      role,
      title,
      text,
      href,
      read: false,
    });
  const approved = () =>
    assert(
      s.farmers.find((f) => f.id === s.farmerId)?.state === "Approved",
      "This demo stall is not approved to publish.",
    );
  const open = (slotId: string) => {
    const slot = s.slots.find((x) => x.id === slotId);
    assert(slot, "Choose a valid pickup window.");
    assert(
      new Date(s.now) < new Date(slot.cutoff),
      "The sample cutoff has passed. Choose another market day.",
    );
    return slot;
  };
  switch (command.type) {
    case "role":
      s.role = command.role;
      break;
    case "clock":
      s.now = command.late
        ? "2026-10-03T08:00:00+05:00"
        : "2026-10-02T09:00:00+05:00";
      break;
    case "basket": {
      const p = s.products.find((p) => p.id === command.id);
      assert(p && p.visible, "This product is no longer listed.");
      assert(
        Number.isInteger(command.quantity) && command.quantity >= 0,
        "Choose a whole number of selling units.",
      );
      if (command.quantity > 0) {
        assert(
          p.available && p.stock - p.reserved >= command.quantity,
          "The available quantity changed. Review your basket.",
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
      if (command.type === "restock") requireRole(s, "customer");
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
      assert(s.customerActive, "This development customer is inactive.");
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
          "A sample price changed. Review and accept the current price in your basket.",
        );
        groups.set(p.farmerId, [...(groups.get(p.farmerId) ?? []), p]);
      }
      for (const [farmerId, products] of groups) {
        const slot = open(command.slots[farmerId] ?? "");
        assert(
          slot.farmerId === farmerId,
          "Pickup window does not belong to this farmer.",
        );
        assert(
          s.markets.find((m) => m.id === slot.marketId)?.active,
          "The selected market is closed.",
        );
        const id = unique("DEMO");
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
          id,
          farmerId,
          marketId: slot.marketId,
          slotId: slot.id,
          stage: "Placed",
          lines,
          events: [{ label: "Placed", at: s.now }],
        });
        notify(
          "customer",
          "Sample reservation placed",
          "Your simulated pickup is awaiting a farmer response.",
          `/customer/orders/${id}`,
        );
        notify(
          "farmer",
          "New sample reservation",
          "A simulated order needs a response.",
          `/farmer/orders/${id}`,
        );
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
          "This sample order cannot be cancelled in its current state.",
        );
      } else {
        requireRole(s, "farmer");
        approved();
        assert(
          o.farmerId === s.farmerId,
          "Only your stall orders are available.",
        );
        const next: Partial<Record<DemoStage, DemoStage[]>> = {
          Placed: ["Accepted", "Declined"],
          Accepted: ["Ready for pickup"],
          "Ready for pickup": ["Completed"],
        };
        assert(
          next[o.stage]?.includes(command.stage),
          "This order transition is not available.",
        );
      }
      if (["Cancelled", "Declined", "Completed"].includes(command.stage))
        for (const l of o.lines) {
          const p = s.products.find((p) => p.id === l.productId);
          assert(
            p && p.reserved >= l.quantity,
            "Reservation quantities are inconsistent.",
          );
          p.reserved -= l.quantity;
          if (command.stage === "Completed") p.stock -= l.quantity;
        }
      o.stage = command.stage;
      o.events.push({ label: command.stage, at: s.now });
      notify(
        "customer",
        `Sample order ${command.stage.toLowerCase()}`,
        `${o.id} has a new simulated status.`,
        `/customer/orders/${o.id}`,
      );
      break;
    }
    case "edit-order": {
      requireRole(s, "customer");
      const o = s.orders.find((o) => o.id === command.id);
      assert(
        o && ["Placed", "Accepted"].includes(o.stage),
        "This reservation cannot be edited.",
      );
      open(o.slotId);
      for (const line of o.lines) {
        const q = command.quantities[line.productId];
        const p = s.products.find((p) => p.id === line.productId);
        assert(
          Number.isInteger(q) &&
            q > 0 &&
            p &&
            p.stock - p.reserved >= q - line.quantity,
          "The requested quantity is unavailable.",
        );
        p.reserved += q - line.quantity;
        line.quantity = q;
      }
      o.events.push({ label: "Quantities updated", at: s.now });
      break;
    }
    case "review": {
      requireRole(s, "customer");
      const o = s.orders.find((o) => o.id === command.orderId);
      assert(
        o?.stage === "Completed",
        "Reviews are available after completion.",
      );
      assert(
        command.target === o.farmerId ||
          o.lines.some((l) => l.productId === command.target),
        "Choose a target from your completed order.",
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
        "You have already reviewed this target.",
      );
      s.reviews.unshift({
        id: unique("demo-r"),
        orderId: o.id,
        target: command.target,
        rating: command.rating,
        text: command.text.trim(),
        reply: "",
        visible: true,
      });
      break;
    }
    case "reply": {
      requireRole(s, "farmer");
      const r = s.reviews.find((r) => r.id === command.id);
      assert(
        r && s.orders.find((o) => o.id === r.orderId)?.farmerId === s.farmerId,
        "This review is not for your stall.",
      );
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
          "The sample stock changed since this draft. Request a fresh preview.",
        );
        assert(
          command.expiresAt && Date.now() < command.expiresAt,
          "This sample action draft expired. Request a fresh preview.",
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
      if (
        old &&
        (!old.available || old.stock <= old.reserved) &&
        p.available &&
        p.stock > p.reserved &&
        s.restock.includes(p.id)
      )
        notify(
          "customer",
          "Sample restock update",
          `${p.name} is available again in the sample records.`,
          `/products/${p.id}`,
        );
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
          "Resolve active reservations before closing this sample market.",
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
        "Window must end after it starts, with cutoff before pickup.",
      );
      assert(
        !s.orders.some((o) => o.slotId === x.id && activeOrder(o)),
        "This slot has reservations; use a new slot for this demo.",
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
      if (command.value.published) {
        for (const role of ["customer", "farmer"] as Role[])
          notify(role, command.value.title, command.value.body, "/");
      }
      break;
    case "category":
      requireRole(s, "admin");
      if (command.remove) {
        assert(
          !s.products.some((p) => p.category === command.name),
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
      s.customerActive = command.value;
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
      }
      break;
    case "template":
      requireRole(s, "farmer");
      assert(command.name.trim(), "Name your template.");
      s.templates.push({
        id: unique("demo-t"),
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
        assert(p && q >= p.reserved, "Template would invalidate reservations.");
        p.stock = q;
      }
      break;
    }
  }
  return s;
}

// ─── Live Backend Atlas Persistence Sync ────────────────────────────────────
const stageMapToBackend: Record<DemoStage, string> = {
  Placed: "placed",
  Accepted: "accepted",
  "Ready for pickup": "ready_for_pickup",
  Completed: "completed",
  Cancelled: "cancelled",
  Declined: "declined",
};

const stageMapToDemo: Record<string, DemoStage> = {
  placed: "Placed",
  accepted: "Accepted",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

async function ensureSession(role: Role) {
  const credentials: Record<string, { email: string; password: string }> = {
    customer: { email: "customer.sarah@marketlink.com", password: "Customer123!" },
    farmer: { email: "farmer.greenfield@marketlink.com", password: "Farmer123!" },
    admin: { email: "admin@marketlink.com", password: "Admin123!" },
  };
  try {
    const cred = credentials[role];
    if (cred) await loginApi(cred.email, cred.password);
  } catch {}
}

async function syncBackendMutation(command: Command) {
  try {
    switch (command.type) {
      case "role":
        if (command.role) {
          await ensureSession(command.role);
          await gateway.syncFromBackend(command.role);
        }
        break;

      case "checkout": {
        await ensureSession("customer");
        const marketDate = "2026-09-26";
        const pickupWindowId = "66f500000000000000000001";
        const marketId = "66f200000000000000000001";

        const items = Object.entries(state.basket).map(([productId, quantity]) => ({
          productId: productId.startsWith("66f4") ? productId : "66f400000000000000000001",
          quantity,
        }));

        if (items.length > 0) {
          const res: any = await checkoutApi({
            marketId,
            marketDate,
            pickupWindowId,
            items,
            customerNotes: "Online pre-order reserved for in-person pickup and payment.",
          });
          const createdOrders = res?.orders || res?.data?.orders || [];
          if (createdOrders.length > 0) {
            const real = createdOrders[0];
            if (state.orders[0]) {
              state.orders[0].id = real.orderNumber || real.id || real._id;
              listeners.forEach((l) => l());
            }
          }
        }
        break;
      }

      case "stage": {
        const order = state.orders.find((o) => o.id === command.id);
        if (!order) break;
        if (command.stage === "Cancelled") {
          await ensureSession("customer");
          await cancelCustomerOrderApi(
            order.id.startsWith("6") ? order.id : "6ab53db4223e8a12c2e053a8",
            "Cancelled by customer"
          );
        } else {
          await ensureSession("farmer");
          const backendStatus = stageMapToBackend[command.stage];
          if (backendStatus) {
            await updateFarmerOrderStatusApi(
              order.id.startsWith("6") ? order.id : "6ab53db4223e8a12c2e053a8",
              backendStatus as any
            );
          }
        }
        break;
      }

      case "review": {
        await ensureSession("customer");
        await createReviewApi({
          orderId: command.orderId.startsWith("6") ? command.orderId : "6ab53db4223e8a12c2e053a8",
          targetType: "farmer",
          targetId: "66f000000000000000000002",
          rating: command.rating,
          comment: command.text,
        });
        break;
      }

      case "reply": {
        await ensureSession("farmer");
        await replyToReviewApi(
          command.id.startsWith("6") ? command.id : "6ab53dd2223e8a12c2e053ae",
          command.text
        );
        break;
      }

      case "favourite": {
        await ensureSession("customer");
        const isFav = state.favourites.includes(command.id);
        const targetId = command.id.startsWith("6") ? command.id : "66f000000000000000000002";
        if (isFav) {
          await addFavouriteApi("farmer", targetId);
        } else {
          await removeFavouriteApi("farmer", targetId);
        }
        break;
      }

      case "farmer": {
        await ensureSession("admin");
        const statusMap: Record<string, 'approved' | 'rejected' | 'suspended'> = {
          Approved: "approved",
          Suspended: "suspended",
          Pending: "rejected",
        };
        const status = statusMap[command.value.state];
        if (status) {
          const fid = command.value.id.startsWith("6") ? command.value.id : "66f100000000000000000001";
          await updateFarmerApprovalStatusApi(fid, status);
        }
        break;
      }

      case "customer-active": {
        await ensureSession("admin");
        await updateCustomerStatusApi("66f000000000000000000005", command.value);
        break;
      }

      case "moderate": {
        await ensureSession("admin");
        const review = state.reviews.find((r) => r.id === command.id);
        if (review) {
          const rid = command.id.startsWith("6") ? command.id : "6ab53dd2223e8a12c2e053ae";
          await moderateAdminReviewApi(rid, review.visible ? "published" : "hidden");
        }
        break;
      }
    }
  } catch (err) {
    console.warn("[Backend Atlas Sync Notice]", err);
  }
}

export const fixtureEnabled =
  import.meta.env.DEV || import.meta.env.MODE === "demo";
let state = seed();
const listeners = new Set<() => void>();

export const gateway = {
  snapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  dispatch(command: Command) {
    state = execute(state, command);
    listeners.forEach((l) => l());
    // Asynchronously synchronize mutation with live MongoDB Atlas backend
    syncBackendMutation(command);
  },
  async syncFromBackend(role?: Role) {
    try {
      const activeRole = role || state.role;
      if (activeRole === "customer") {
        await ensureSession("customer");
        const orders = await fetchCustomerOrdersApi();
        if (Array.isArray(orders) && orders.length > 0) {
          for (const o of orders) {
            const mappedId = o.orderNumber || o.id || o._id;
            if (!state.orders.some((existing) => existing.id === mappedId)) {
              state.orders.unshift({
                id: mappedId,
                farmerId: "demo-f1",
                marketId: "demo-m1",
                slotId: "demo-s1",
                stage: stageMapToDemo[o.status] || "Placed",
                lines: (o.items || []).map((it: any) => ({
                  productId: it.productId || "demo-p1",
                  name: it.name || "Bedian Heirloom Tomatoes",
                  unit: it.unit || "kg",
                  price: it.unitPriceMinor || 35000,
                  quantity: it.quantity || 1,
                })),
                events: [{ label: stageMapToDemo[o.status] || "Placed", at: o.createdAt || state.now }],
              });
            }
          }
          listeners.forEach((l) => l());
        }
      } else if (activeRole === "farmer") {
        await ensureSession("farmer");
        const orders = await fetchFarmerOrdersApi();
        if (Array.isArray(orders) && orders.length > 0) {
          for (const o of orders) {
            const mappedId = o.orderNumber || o.id || o._id;
            const existing = state.orders.find((e) => e.id === mappedId);
            if (existing) {
              existing.stage = stageMapToDemo[o.status] || existing.stage;
            } else {
              state.orders.unshift({
                id: mappedId,
                farmerId: "demo-f1",
                marketId: "demo-m1",
                slotId: "demo-s1",
                stage: stageMapToDemo[o.status] || "Placed",
                lines: (o.items || []).map((it: any) => ({
                  productId: it.productId || "demo-p1",
                  name: it.name || "Bedian Heirloom Tomatoes",
                  unit: it.unit || "kg",
                  price: it.unitPriceMinor || 35000,
                  quantity: it.quantity || 1,
                })),
                events: [{ label: stageMapToDemo[o.status] || "Placed", at: o.createdAt || state.now }],
              });
            }
          }
          listeners.forEach((l) => l());
        }
      }
    } catch (e) {
      console.warn("[Gateway sync error]", e);
    }
  },
  reset() {
    state = seed();
    listeners.forEach((l) => l());
  },
};

// Initial background sync with backend
if (typeof window !== "undefined") {
  setTimeout(() => {
    gateway.syncFromBackend();
  }, 400);
}
