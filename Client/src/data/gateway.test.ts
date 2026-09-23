import { describe, expect, it } from "vitest";
import { execute } from "./gateway";
import { seed } from "./market";

describe("isolated development repository", () => {
  it("atomically reserves two farmer groups and keeps the input immutable", () => {
    let s = execute(seed(), { type: "role", role: "customer" });
    s = execute(s, { type: "basket", id: "demo-p1", quantity: 2 });
    s = execute(s, { type: "basket", id: "demo-p3", quantity: 1 });
    const before = structuredClone(s);
    expect(() =>
      execute(s, {
        type: "checkout",
        slots: { "demo-f1": "demo-s1", "demo-f2": "demo-s1" },
      }),
    ).toThrow(/does not belong/);
    expect(s).toEqual(before);
    const result = execute(s, {
      type: "checkout",
      slots: { "demo-f1": "demo-s1", "demo-f2": "demo-s3" },
    });
    expect(result.orders).toHaveLength(5);
    expect(result.products.find((p) => p.id === "demo-p1")?.reserved).toBe(5);
    expect(result.basket).toEqual({});
    expect(s).toEqual(before);
    expect(() => execute(result, { type: "checkout", slots: {} })).toThrow(
      /empty/,
    );
  });
  it("releases reserved stock exactly once on cancellation", () => {
    const s = execute(execute(seed(), { type: "role", role: "customer" }), {
      type: "stage",
      id: "DEMO-1042",
      stage: "Cancelled",
    });
    expect(s.products[0].reserved).toBe(0);
    expect(() =>
      execute(s, { type: "stage", id: "DEMO-1042", stage: "Cancelled" }),
    ).toThrow(/cannot be cancelled/);
    expect(s.products[0].stock).toBe(24);
  });
  it("rejects cutoff at exact boundary and preserves reservations", () => {
    const s = seed();
    s.role = "customer";
    s.now = s.slots[0].cutoff;
    expect(() =>
      execute(s, { type: "stage", id: "DEMO-1042", stage: "Cancelled" }),
    ).toThrow(/cutoff/);
    expect(s.products[0].reserved).toBe(3);
  });
  it("rejects overselling and hides unapproved farmer offers", () => {
    const s = seed();
    expect(() =>
      execute(s, { type: "basket", id: "demo-p1", quantity: 22 }),
    ).toThrow(/quantity changed/);
    s.farmers[0].state = "Suspended";
    expect(() =>
      execute(s, { type: "basket", id: "demo-p1", quantity: 1 }),
    ).toThrow(/stall/);
  });
  it("rebalance edits preserve the historical unit price", () => {
    const s = seed();
    s.role = "customer";
    s.products[0].price = 99900;
    const result = execute(s, {
      type: "edit-order",
      id: "DEMO-1042",
      quantities: { "demo-p1": 4, "demo-p2": 1 },
    });
    expect(result.products[0].reserved).toBe(4);
    expect(result.products[1].reserved).toBe(1);
    expect(result.orders[0].lines[0].price).toBe(18000);
  });
  it("protects reserved quantities when stock changes", () => {
    const s = seed();
    s.role = "farmer";
    expect(() =>
      execute(s, { type: "product", value: { ...s.products[0], stock: 2 } }),
    ).toThrow(/Stock cannot/);
    expect(() => execute(s, { type: "product", value: s.products[2] })).toThrow(
      /Only your/,
    );
  });
  it("enforces ordered farmer transitions and consumes completed stock once", () => {
    let s = seed();
    s.role = "farmer";
    expect(() =>
      execute(s, { type: "stage", id: "DEMO-1042", stage: "Completed" }),
    ).toThrow(/transition/);
    for (const stage of ["Accepted", "Ready for pickup", "Completed"] as const)
      s = execute(s, { type: "stage", id: "DEMO-1042", stage });
    expect(s.products[0].reserved).toBe(0);
    expect(s.products[0].stock).toBe(21);
    expect(() =>
      execute(s, { type: "stage", id: "DEMO-1042", stage: "Completed" }),
    ).toThrow(/transition/);
  });
  it("allows only eligible purchased review targets once", () => {
    let s = seed();
    s.role = "customer";
    expect(() =>
      execute(s, {
        type: "review",
        orderId: "DEMO-1042",
        target: "demo-p1",
        rating: 5,
        text: "A useful review",
      }),
    ).toThrow(/completion/);
    expect(() =>
      execute(s, {
        type: "review",
        orderId: "DEMO-1030",
        target: "demo-p3",
        rating: 5,
        text: "A useful review",
      }),
    ).toThrow(/target/);
    s = execute(s, {
      type: "review",
      orderId: "DEMO-1030",
      target: "demo-p2",
      rating: 5,
      text: "A useful review",
    });
    expect(() =>
      execute(s, {
        type: "review",
        orderId: "DEMO-1030",
        target: "demo-p2",
        rating: 5,
        text: "A useful review",
      }),
    ).toThrow(/already/);
  });
  it("personal checklists never complete an order", () => {
    const s = execute(seed(), { type: "check", id: "DEMO-1042" });
    expect(s.orders[0].stage).toBe("Placed");
  });
  it("prevents removal of referenced categories and market closure with active orders", () => {
    const s = seed();
    s.role = "admin";
    expect(() =>
      execute(s, { type: "category", name: "Vegetables", remove: true }),
    ).toThrow(/used by/);
    expect(() =>
      execute(s, { type: "market", value: { ...s.markets[0], active: false } }),
    ).toThrow(/active reservations/);
  });
  it("templates do not reserve stock and cannot violate reservations", () => {
    let s = seed();
    s.role = "farmer";
    s = execute(s, {
      type: "template",
      name: "Small week",
      quantities: { "demo-p1": 1 },
    });
    expect(s.products[0].reserved).toBe(3);
    expect(() =>
      execute(s, { type: "apply-template", id: s.templates[1].id }),
    ).toThrow(/invalidate reservations/);
  });
});
