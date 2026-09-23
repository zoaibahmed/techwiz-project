import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Clock,
  ShoppingBasket,
  Check,
  Heart,
} from "lucide-react";
import {
  useMarket,
  useAction,
  Heading,
  Empty,
  Status,
  Field,
  Form,
  value,
  Notice,
  Quantity,
  Confirm,
  ProductTile,
  Favourite,
} from "../components/ui";
import { money, total, time, date, activeOrder, images } from "../data/market";
import type { Order } from "../data/market";
import { NotFound } from "./Public";

export function OrderRows({
  orders,
  prefix = "/customer",
}: {
  orders: Order[];
  prefix?: string;
}) {
  const s = useMarket();
  return (
    <div className="record-list">
      {orders.map((o) => (
        <Link className="order-row" key={o.id} to={`${prefix}/orders/${o.id}`}>
          <div>
            <p className="small muted">{o.id}</p>
            <h3>{s.farmers.find((f) => f.id === o.farmerId)?.name}</h3>
            <p>{s.markets.find((m) => m.id === o.marketId)?.name}</p>
          </div>
          <div>
            <Status>{o.stage}</Status>
            <p className="small">
              {o.lines.reduce((n, l) => n + l.quantity, 0)} units ·{" "}
              {money(total(o.lines))}
            </p>
          </div>
          <ArrowUpRight size={20} />
        </Link>
      ))}
    </div>
  );
}

export function CustomerHome() {
  const s = useMarket();
  const upcoming = s.orders.filter(activeOrder);
  return (
    <div className="container section">
      <Heading
        eyebrow="Your Market Day"
        title="A good day, already taking shape."
        intro="A few favourite stalls. A bag full of possibilities. Everything in its place."
      />
      <div className="customer-overview">
        <section>
          <div className="section-heading">
            <h2>Your next pickups.</h2>
            <Link className="text-link" to="/customer/market-day">
              Open planner <ArrowUpRight size={17} />
            </Link>
          </div>
          {upcoming.length ? (
            <div className="timeline">
              {upcoming.map((o) => {
                const slot = s.slots.find((x) => x.id === o.slotId)!;
                return (
                  <div className="timeline-stop" key={o.id}>
                    <div className="timeline-time">
                      {time(slot.start)}
                      <span>{date(slot.start)}</span>
                    </div>
                    <div className="timeline-content">
                      <Status>{o.stage}</Status>
                      <h3>
                        {s.farmers.find((f) => f.id === o.farmerId)?.name}
                      </h3>
                      <p>
                        {s.markets.find((m) => m.id === o.marketId)?.name} ·{" "}
                        {o.lines.length} kinds of produce
                      </p>
                      <Link
                        className="text-link"
                        to={`/customer/orders/${o.id}`}
                      >
                        Open pickup passport <ArrowRight size={17} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title="A market morning is waiting." />
          )}
        </section>
        <aside className="day-note">
          <img src={images.basket} alt="Editorial harvest basket" />
          <div>
            <p className="eyebrow">Your little reminder</p>
            <h2>
              Bring a bag.
              <br />
              Leave room for good things.
            </h2>
            <p>Your reservations are paid for in person at each stall.</p>
            <Link to="/products" className="text-link">
              A little more for the basket <ArrowUpRight size={17} />
            </Link>
          </div>
        </aside>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>Fresh from familiar stalls.</h2>
          <Link to="/customer/favourites" className="text-link">
            Your favourites <Heart size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {s.products
            .filter((p) => p.visible && p.available && p.stock > p.reserved)
            .slice(0, 4)
            .map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
        </div>
      </section>
    </div>
  );
}

export function Planner() {
  const s = useMarket();
  const act = useAction();
  const [selected, set] = useState("2026-10-03");
  const orders = s.orders
    .filter(activeOrder)
    .filter((o) =>
      s.slots.find((x) => x.id === o.slotId)?.start.startsWith(selected),
    )
    .sort((a, b) =>
      (s.slots.find((x) => x.id === a.slotId)?.start ?? "").localeCompare(
        s.slots.find((x) => x.id === b.slotId)?.start ?? "",
      ),
    );
  return (
    <div className="container section">
      <Heading
        title="Make a morning of it."
        intro="Your pickups, in order. A personal checklist for the day ahead."
      >
        <Field label="Market day">
          <input
            type="date"
            value={selected}
            onChange={(e) => set(e.target.value)}
          />
        </Field>
      </Heading>
      <div className="planner-summary">
        <span>
          <strong>{orders.length}</strong> farmer pickups
        </span>
        <span>
          <strong>
            {money(orders.reduce((n, o) => n + total(o.lines), 0))}
          </strong>{" "}
          sample order value
        </span>
        <span>
          <ShoppingBasket size={22} /> Pay at each stall
        </span>
      </div>
      {orders.length ? (
        <div className="timeline planner">
          {orders.map((o) => {
            const slot = s.slots.find((x) => x.id === o.slotId)!;
            const m = s.markets.find((m) => m.id === o.marketId)!;
            return (
              <article className="timeline-stop" key={o.id}>
                <div className="timeline-time">
                  {time(slot.start)}
                  <span>to {time(slot.end)}</span>
                </div>
                <div className="timeline-content">
                  <div className="spread">
                    <Status>{o.stage}</Status>
                    <span className="small">{o.id}</span>
                  </div>
                  <h2>{s.farmers.find((f) => f.id === o.farmerId)?.name}</h2>
                  <p>
                    <MapPin size={17} />
                    {m.name}
                  </p>
                  <p>{m.address}</p>
                  <ul className="clean-list">
                    {o.lines.map((l) => (
                      <li key={l.productId}>
                        {l.quantity} × {l.name}{" "}
                        <span className="muted">{l.unit}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="actions">
                    <Link
                      className="button secondary"
                      to={`/customer/orders/${o.id}`}
                    >
                      Pickup passport <ArrowUpRight size={17} />
                    </Link>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={s.checklist.includes(o.id)}
                        onChange={() =>
                          act(
                            { type: "check", id: o.id },
                            "Personal checklist updated; order status is unchanged.",
                          )
                        }
                      />
                      Checked my pickup details
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title="Nothing booked for this day." />
      )}
      <Notice>
        Personal checkmarks do not confirm collection. The map and real
        directions await approved pickup coordinates. Windows may overlap; no
        route optimisation is implied.
      </Notice>
    </div>
  );
}

export function Basket() {
  const s = useMarket();
  const act = useAction();
  const navigate = useNavigate();
  const checkout = useLocation().pathname === "/checkout";
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const products = Object.keys(s.basket)
    .map((id) => s.products.find((p) => p.id === id)!)
    .filter(Boolean);
  const farmers = [...new Set(products.map((p) => p.farmerId))];
  const sum = products.reduce((n, p) => n + p.price * s.basket[p.id], 0);
  if (done)
    return (
      <div className="container narrow section">
        <span className="success-icon">
          <Check />
        </span>
        <Heading
          title="Your sample morning is planned."
          intro="Simulated reservations have been created, one for each farmer. No backend order has been placed."
        />
        <Link className="button" to="/customer/orders">
          View sample orders <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="container section">
      <Heading
        eyebrow={
          checkout ? "Basket → Pickup → Review" : "A little of what you love"
        }
        title={checkout ? "A time and a place." : "Your basket, by farmer."}
        intro={
          checkout
            ? "Choose a window for each stall. Review everything, then reserve."
            : "Different growers. Thoughtful pickups. One well-planned market day."
        }
      />
      {products.length ? (
        <div className="basket-layout">
          <div>
            {farmers.map((id) => {
              const f = s.farmers.find((f) => f.id === id)!;
              return (
                <section className="basket-group" key={id}>
                  <div className="spread">
                    <div>
                      <p className="eyebrow">Your farmer</p>
                      <h2>{f.name}</h2>
                      <p>
                        <MapPin size={15} />
                        {s.markets.find((m) => m.id === f.marketId)?.name}
                      </p>
                    </div>
                    <Link
                      to={`/farmers/${id}`}
                      className="icon-button"
                      aria-label={`Visit ${f.name}`}
                    >
                      <ArrowUpRight />
                    </Link>
                  </div>
                  {products
                    .filter((p) => p.farmerId === id)
                    .map((p) => (
                      <div className="basket-line" key={p.id}>
                        <img src={p.image} alt={p.name} />
                        <div>
                          <h3>
                            <Link to={`/products/${p.id}`}>{p.name}</Link>
                          </h3>
                          <p className="small muted">
                            {money(p.price)} / {p.unit}
                          </p>
                          <button
                            className="text-button"
                            onClick={() =>
                              act(
                                { type: "basket", id: p.id, quantity: 0 },
                                "Removed from the sample basket.",
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <Quantity
                          label={`${p.name} quantity`}
                          quantity={s.basket[p.id]}
                          max={p.stock - p.reserved}
                          onChange={(quantity) =>
                            act({ type: "basket", id: p.id, quantity })
                          }
                        />
                        <strong>{money(p.price * s.basket[p.id])}</strong>
                        {s.basketPrices[p.id] !== p.price && (
                          <Notice>
                            Price changed from {money(s.basketPrices[p.id])} to{" "}
                            {money(p.price)} per unit.{" "}
                            <button
                              className="text-button"
                              onClick={() =>
                                act(
                                  {
                                    type: "basket",
                                    id: p.id,
                                    quantity: s.basket[p.id],
                                  },
                                  "Current sample price accepted.",
                                )
                              }
                            >
                              Accept current price
                            </button>
                          </Notice>
                        )}
                      </div>
                    ))}
                  {checkout && (
                    <div className="pickup-select">
                      <Field label={`Pickup window for ${f.name}`}>
                        <select
                          required
                          value={slots[id] ?? ""}
                          onChange={(e) =>
                            setSlots({ ...slots, [id]: e.target.value })
                          }
                        >
                          <option value="">Choose a pickup window</option>
                          {s.slots
                            .filter(
                              (x) =>
                                x.farmerId === id &&
                                new Date(x.start) > new Date(s.now),
                            )
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {date(x.start)} · {time(x.start)}–{time(x.end)}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <p className="small muted">
                        Asia/Karachi · Sample cutoff Friday, 2 October at 20:00.
                      </p>
                    </div>
                  )}
                </section>
              );
            })}
            <Notice>
              Development policy: one simulated reservation per farmer,
              committed together in local memory. Final backend grouping and
              partial-failure rules are not approved.
            </Notice>
          </div>
          <aside className="receipt-summary">
            <p className="eyebrow">Your market bag</p>
            <h2>
              Good things,
              <br />
              gathered together.
            </h2>
            <div className="receipt-row">
              <span>Farmer pickups</span>
              <strong>{farmers.length}</strong>
            </div>
            <div className="receipt-row">
              <span>Selling units</span>
              <strong>
                {Object.values(s.basket).reduce((a, b) => a + b, 0)}
              </strong>
            </div>
            <div className="receipt-row total">
              <span>Order value</span>
              <strong>{money(sum)}</strong>
            </div>
            <p>
              Pay in person at pickup.
              <br />
              No online payment.
            </p>
            {checkout ? (
              <button
                className="button full"
                disabled={farmers.some((f) => !slots[f])}
                onClick={() => {
                  if (s.role !== "customer") {
                    navigate("/login?next=/checkout");
                    return;
                  }
                  if (
                    act(
                      { type: "checkout", slots },
                      "Sample reservations created.",
                    )
                  )
                    setDone(true);
                }}
              >
                Confirm sample reservation <ArrowRight size={18} />
              </button>
            ) : (
              <Link className="button full" to="/checkout">
                Review pickup <ArrowRight size={18} />
              </Link>
            )}
            <p className="small muted">
              Stock and windows are checked again by the fixture adapter. No
              MongoDB connection.
            </p>
          </aside>
        </div>
      ) : (
        <Empty
          title="Leave a little room for the harvest."
          href="/products"
          action="Browse produce"
        >
          Your sample basket is empty. Find something good for your next market
          day.
        </Empty>
      )}
    </div>
  );
}

export function Orders() {
  const s = useMarket();
  const [filter, set] = useState("All");
  const [q, search] = useState("");
  const orders = s.orders.filter(
    (o) =>
      (filter === "All" ||
        (filter === "Active" ? activeOrder(o) : !activeOrder(o))) &&
      `${o.id} ${s.farmers.find((f) => f.id === o.farmerId)?.name}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <div className="container section">
      <Heading
        title="Every market morning, remembered."
        intro="Your upcoming pickups and the good things you have brought home."
      />
      <div className="filter-bar">
        <div className="segmented">
          {["All", "Active", "History"].map((x) => (
            <button
              key={x}
              className={filter === x ? "active" : ""}
              aria-pressed={filter === x}
              onClick={() => set(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <input
          aria-label="Search orders"
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="Search reference or farmer"
        />
      </div>
      {orders.length ? (
        <OrderRows orders={orders} />
      ) : (
        <Empty title="No orders in this view." />
      )}
    </div>
  );
}

export function OrderDetail() {
  const s = useMarket();
  const act = useAction();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { pathname } = useLocation();
  const o = s.orders.find((o) => o.id === orderId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [target, setTarget] = useState("");
  if (!o) return <NotFound />;
  const f = s.farmers.find((f) => f.id === o.farmerId)!;
  const slot = s.slots.find((x) => x.id === o.slotId)!;
  const editable =
    ["Placed", "Accepted"].includes(o.stage) &&
    new Date(s.now) < new Date(slot.cutoff);
  if (pathname.endsWith("/review"))
    return (
      <div className="container narrow section">
        <Heading
          title="A word from your market day."
          intro={`Review ${o.id} · completed purchases only.`}
        />
        {o.stage !== "Completed" ? (
          <Notice>
            Reviews become available after this order is completed.
          </Notice>
        ) : (
          <Form
            onSubmit={(d) => {
              if (
                act(
                  {
                    type: "review",
                    orderId: o.id,
                    target: target || f.id,
                    rating: Number(value(d, "rating")),
                    text: value(d, "text"),
                  },
                  "Your sample review has been saved.",
                )
              )
                navigate(`/customer/orders/${o.id}`);
            }}
          >
            <Field label="Who or what are you reviewing?">
              <select
                value={target || f.id}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value={f.id}>{f.name}</option>
                {o.lines.map((l) => (
                  <option key={l.productId} value={l.productId}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset>
              <legend>Your rating</legend>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n}>
                    <input type="radio" name="rating" value={n} required />
                    {n} ★
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Your review">
              <textarea name="text" required minLength={8} rows={5} />
            </Field>
            <button className="button">Save sample review</button>
          </Form>
        )}
      </div>
    );
  if (pathname.endsWith("/edit"))
    return (
      <div className="container narrow section">
        <Heading
          title="A little change of plan."
          intro={`${o.id} · Changes are simulated and must be before the sample cutoff.`}
        />
        {!editable ? (
          <Notice>
            This reservation cannot be edited in its current state or after its
            cutoff.
          </Notice>
        ) : (
          <>
            <div className="stack">
              {o.lines.map((l) => (
                <div className="receipt-row" key={l.productId}>
                  <div>
                    <h3>{l.name}</h3>
                    <p>
                      Original: {l.quantity} × {money(l.price)}
                    </p>
                  </div>
                  <Quantity
                    label={`${l.name} new quantity`}
                    quantity={quantities[l.productId] ?? l.quantity}
                    onChange={(q) =>
                      setQuantities({ ...quantities, [l.productId]: q })
                    }
                  />
                </div>
              ))}
            </div>
            <p>
              New order value:{" "}
              {money(
                o.lines.reduce(
                  (n, l) =>
                    n + (quantities[l.productId] ?? l.quantity) * l.price,
                  0,
                ),
              )}
            </p>
            <Confirm
              label="Save changes"
              title="Review these quantity changes"
              onConfirm={() => {
                const result = act({
                  type: "edit-order",
                  id: o.id,
                  quantities: Object.fromEntries(
                    o.lines.map((l) => [
                      l.productId,
                      quantities[l.productId] ?? l.quantity,
                    ]),
                  ),
                });
                if (result) navigate(`/customer/orders/${o.id}`);
                return result;
              }}
            />
          </>
        )}
        <p>
          <Link to={`/customer/orders/${o.id}`}>Keep original order</Link>
        </p>
      </div>
    );
  return (
    <div className="container section">
      <Link to="/customer/orders" className="back-link">
        ← Your orders
      </Link>
      <Heading
        eyebrow={o.id}
        title="Your pickup passport."
        intro="Everything you need, when you reach the stall."
      >
        <Status>{o.stage}</Status>
      </Heading>
      <div className="basket-layout">
        <div>
          <div className="passport">
            <div className="spread">
              <span className="eyebrow">Meet at the market</span>
              <span className="passport-symbol">✳</span>
            </div>
            <h2>{f.name}</h2>
            <p>
              <MapPin size={18} />
              {s.markets.find((m) => m.id === o.marketId)?.name}
            </p>
            <div className="passport-time">
              <CalendarText
                label={date(slot.start)}
                value={`${time(slot.start)}–${time(slot.end)}`}
              />
              <span>Asia/Karachi</span>
            </div>
            <p>{s.markets.find((m) => m.id === o.marketId)?.address}</p>
            <Notice>
              Illustrative pickup only. Live directions require approved
              coordinates.
            </Notice>
          </div>
          <section className="section">
            <h2>Your reservation, step by step.</h2>
            <ol className="event-list">
              {o.events.map((e, i) => (
                <li key={i}>
                  <Check size={17} />
                  <div>
                    <strong>{e.label}</strong>
                    <p>
                      {date(e.at)} · {time(e.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="receipt-summary">
          <h2>In your market bag.</h2>
          {o.lines.map((l) => (
            <div className="receipt-row" key={l.productId}>
              <div>
                {l.name}
                <p className="small muted">
                  {l.quantity} × {l.unit}
                </p>
              </div>
              <strong>{money(l.price * l.quantity)}</strong>
            </div>
          ))}
          <div className="receipt-row total">
            <span>Order value</span>
            <strong>{money(total(o.lines))}</strong>
          </div>
          <p>Pay in person at pickup.</p>
          <p className="small muted">
            <Clock size={14} />
            Sample cutoff: {date(slot.cutoff)}, {time(slot.cutoff)}
          </p>
          {editable && (
            <div className="stack">
              <Link
                className="button secondary"
                to={`/customer/orders/${o.id}/edit`}
              >
                Modify quantities
              </Link>
              <Confirm
                label="Cancel reservation"
                title="Cancel this sample reservation?"
                danger
                onConfirm={() =>
                  act({ type: "stage", id: o.id, stage: "Cancelled" })
                }
              >
                Reserved sample quantities will be released once. This does not
                contact a real farmer.
              </Confirm>
            </div>
          )}
          {o.stage === "Completed" && (
            <div className="stack">
              <Link className="button" to={`/customer/orders/${o.id}/review`}>
                Review your purchase
              </Link>
              <button
                className="button secondary"
                onClick={() => {
                  let okay = true;
                  for (const l of o.lines)
                    okay =
                      act(
                        {
                          type: "basket",
                          id: l.productId,
                          quantity: (s.basket[l.productId] ?? 0) + l.quantity,
                        },
                        "Available items added at their current sample prices.",
                      ) && okay;
                  if (okay) navigate("/basket");
                }}
              >
                Reorder available items
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
function CalendarText({
  label,
  value: text,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p>{label}</p>
      <strong>{text}</strong>
    </div>
  );
}

export function Favourites() {
  const s = useMarket();
  const [tab, set] = useState("Products");
  return (
    <div className="container section">
      <Heading
        title="The ones you come back for."
        intro="Saved stalls, familiar markets, and a few favourite ingredients."
      />
      <div className="segmented">
        {["Products", "Farmers", "Markets"].map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            aria-pressed={t === tab}
            onClick={() => set(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="section">
        {tab === "Products" ? (
          <div className="product-grid">
            {s.products
              .filter((p) => s.favourites.includes(p.id) && p.visible)
              .map((p) => (
                <ProductTile key={p.id} product={p} />
              ))}
          </div>
        ) : (
          (tab === "Farmers" ? s.farmers : s.markets)
            .filter((x) => s.favourites.includes(x.id))
            .map((x) => (
              <div className="record-row" key={x.id}>
                <h2>
                  <Link to={`/${tab.toLowerCase()}/${x.id}`}>{x.name}</Link>
                </h2>
                <Favourite id={x.id} />
              </div>
            ))
        )}
        {!(
          tab === "Products"
            ? s.products
            : tab === "Farmers"
              ? s.farmers
              : s.markets
        ).some((x) => s.favourites.includes(x.id)) && (
          <Empty title="Your favourites start with a little exploring." />
        )}
      </section>
      <Notice>
        Favourites are held in this browser session. Restock preferences are
        simulated; no real subscription or email is sent.
      </Notice>
    </div>
  );
}

export function Notifications() {
  const s = useMarket();
  const act = useAction();
  const [unread, set] = useState(false);
  const notices = s.notices.filter(
    (n) => n.role === s.role && (!unread || !n.read),
  );
  return (
    <div className="page-pad">
      <Heading
        title="A note from the market."
        intro="Updates that help you plan your next visit."
      >
        <button
          className="button secondary"
          onClick={() => act({ type: "read", id: "all" })}
        >
          Mark all as read
        </button>
      </Heading>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={unread}
          onChange={(e) => set(e.target.checked)}
        />
        Unread only
      </label>
      <div className="record-list">
        {notices.map((n) => (
          <article
            className={`notification ${n.read ? "" : "unread"}`}
            key={n.id}
          >
            <div>
              <span className="small muted">
                {n.read ? "Read" : "Unread"} · Development event
              </span>
              <h3>
                <Link
                  to={n.href}
                  onClick={() => act({ type: "read", id: n.id })}
                >
                  {n.title}
                </Link>
              </h3>
              <p>{n.text}</p>
            </div>
            {!n.read && (
              <button
                className="button quiet"
                onClick={() => act({ type: "read", id: n.id })}
              >
                Mark read
              </button>
            )}
          </article>
        ))}
      </div>
      {!notices.length && (
        <Empty
          title="You’re all caught up."
          href={`/${s.role}`}
          action="Back to workspace"
        />
      )}
    </div>
  );
}
export function Profile() {
  const [saved, set] = useState(false);
  return (
    <div className="container narrow section">
      <Heading
        title="Your place at the market."
        intro="Preview your contact details and preferences."
      />
      <Notice>
        Form preview only. Real profile persistence and email-change
        verification are awaiting the approved contract. Enter fictional
        details.
      </Notice>
      <Form onSubmit={() => set(true)}>
        <Field label="Name">
          <input name="name" required defaultValue="Demo customer" />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            defaultValue="customer@example.test"
          />
        </Field>
        <Field label="Phone">
          <input
            name="phone"
            type="tel"
            required
            placeholder="Sample contact number"
          />
        </Field>
        <Field label="Address">
          <textarea name="address" required rows={3} />
        </Field>
        <button className="button">Validate profile preview</button>
        {saved && (
          <p role="status">
            The form is valid. No profile was sent or persisted.
          </p>
        )}
      </Form>
    </div>
  );
}
