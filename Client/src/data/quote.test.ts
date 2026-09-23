import { expect, it } from "vitest";
import { execute } from "./gateway";
import { seed } from "./market";

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
it("emits one restock notice on unavailable-to-available transition only", () => {
  let s = seed();
  s.role = "customer";
  s = execute(s, { type: "restock", id: "demo-p5" });
  s.role = "farmer";
  s = execute(s, { type: "product", value: { ...s.products[4], stock: 5 } });
  expect(
    s.notices.filter((n) => n.title === "Sample restock update"),
  ).toHaveLength(1);
  s = execute(s, {
    type: "product",
    value: { ...s.products.find((p) => p.id === "demo-p5")!, stock: 6 },
  });
  expect(
    s.notices.filter((n) => n.title === "Sample restock update"),
  ).toHaveLength(1);
});
