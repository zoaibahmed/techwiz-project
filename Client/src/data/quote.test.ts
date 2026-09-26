import { expect, it } from "vitest";
import { execute } from "./gateway";
import { seed } from "./fixtures";

it("requires explicit acceptance of a changed basket price", () => {
  let s = seed();
  s.role = "customer";
  s = execute(s, { type: "basket", id: "demo-p1", quantity: 1 });
  s.products[0].price += 1000;
  expect(() =>
    execute(s, { type: "checkout", slots: { "demo-f1": "demo-s1" } }),
  ).toThrow(/price changed/);
  s = execute(s, { type: "basket", id: "demo-p1", quantity: 1 });
  expect(
    execute(s, { type: "checkout", slots: { "demo-f1": "demo-s1" } }).basket,
  ).toEqual({});
});
it("restocking keeps the watch and never fabricates a notice on the client", () => {
  // Restock notifications are created by the server when an offer becomes available again.
  let s = seed();
  s.role = "customer";
  s = execute(s, { type: "restock", id: "demo-p5" });
  expect(s.restock).toContain("demo-p5");
  s.role = "farmer";
  const before = s.notices.length;
  s = execute(s, { type: "product", value: { ...s.products[4], stock: 5 } });
  expect(s.products.find((p) => p.id === "demo-p5")?.stock).toBe(5);
  expect(s.notices).toHaveLength(before);
});
