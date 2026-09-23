import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowUpRight, ClipboardList, Sprout, Clock } from "lucide-react";
import {
  useMarket,
  useAction,
  Heading,
  Field,
  Form,
  value,
  Notice,
  Status,
  Empty,
  Confirm,
} from "../components/ui";
import { money, total, date, time, images, activeOrder } from "../data/market";
import type { Product } from "../data/market";
import { OrderRows, Notifications } from "./Customer";
import { NotFound } from "./Public";

export function FarmerPage() {
  const s = useMarket();
  const act = useAction();
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] ?? "";
  const f = s.farmers.find((f) => f.id === s.farmerId)!;
  const ownProducts = s.products.filter((p) => p.farmerId === f.id);
  const ownOrders = s.orders.filter((o) => o.farmerId === f.id);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [validated, setValidated] = useState(false);
  if (page === "notifications") return <Notifications />;
  if (page === "products" && pathname.split("/").length > 3)
    return <ProductEditor />;
  if (page === "orders" && pathname.split("/").length > 3)
    return <FarmerOrder />;
  if (page === "access" || f.state !== "Approved")
    return (
      <div className="page-pad">
        <Heading
          title={
            f.state === "Pending"
              ? "Your stall is taking root."
              : "Your stall access"
          }
          intro="This sample account must be approved before publishing."
        />
        <Status>{f.state}</Status>
        <Notice>
          {f.state === "Approved"
            ? "The sample stall is approved to list. This is not identity or organic certification."
            : "Publication is restricted. A real administrator decision will come from the approved backend."}
        </Notice>
        <Link to="/help">Contact and help</Link>
      </div>
    );
  if (page === "profile" || page === "markets")
    return (
      <div className="page-pad narrow">
        <Heading
          title={
            page === "profile"
              ? "The story behind your stall."
              : "Your place at the market."
          }
          intro="Preview your public information and market participation."
        />
        <Notice>
          Profile and attendance forms validate locally. Persistence,
          public/private contact fields and real map pins need the approved
          contract.
        </Notice>
        <Form onSubmit={() => setValidated(true)}>
          {page === "profile" ? (
            <>
              <Field label="Stall name">
                <input required defaultValue={f.name} />
              </Field>
              <Field label="Contact person">
                <input required defaultValue={f.person} />
              </Field>
              <Field label="Your public story">
                <textarea rows={5} required defaultValue={f.story} />
              </Field>
              <Field label="Public photo">
                <input type="file" accept="image/jpeg,image/png,image/webp" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Market">
                <select defaultValue={f.marketId}>
                  {s.markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sample attendance date">
                <input type="date" required defaultValue="2026-10-03" />
              </Field>
              <Field label="Stall location instructions">
                <textarea
                  required
                  rows={3}
                  placeholder="Use fictional location instructions"
                />
              </Field>
              <div className="two-col">
                <Field label="Latitude">
                  <input type="number" step="any" min={-90} max={90} required />
                </Field>
                <Field label="Longitude">
                  <input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    required
                  />
                </Field>
              </div>
            </>
          )}
          <button className="button">Validate preview</button>
          {validated && (
            <p role="status">
              Valid preview. No profile, image or attendance data was uploaded
              or persisted.
            </p>
          )}
        </Form>
      </div>
    );
  if (page === "products")
    return (
      <div className="page-pad">
        <Heading
          title="Everything from your stall."
          intro="Your catalogue, ready for a market day."
        >
          <Link className="button" to="/farmer/products/new">
            Add product <ArrowUpRight size={18} />
          </Link>
        </Heading>
        <input
          aria-label="Search your products"
          placeholder="Search your catalogue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="record-list">
          {ownProducts
            .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <article className="product-management" key={p.id}>
                <img src={p.image} alt={p.name} />
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {p.category} · {p.unit}
                  </p>
                </div>
                <div>
                  <strong>{money(p.price)}</strong>
                  <p className="small muted">Sample dated price</p>
                </div>
                <Status>
                  {!p.visible
                    ? "Hidden"
                    : p.available
                      ? "Listed"
                      : "Unavailable"}
                </Status>
                <div className="actions">
                  <Link
                    className="button secondary compact"
                    to={`/farmer/products/${p.id}/edit`}
                  >
                    Edit
                  </Link>
                  <Confirm
                    label={p.visible ? "Archive" : "Restore"}
                    title={`${p.visible ? "Archive" : "Restore"} ${p.name}?`}
                    onConfirm={() =>
                      act({
                        type: "product",
                        value: { ...p, visible: !p.visible },
                      })
                    }
                  >
                    Historical orders stay intact. Archiving hides this sample
                    listing from discovery.
                  </Confirm>
                </div>
              </article>
            ))}
        </div>
        <Notice>
          Archival preserves historical records. Final delete and media policies
          require API approval.
        </Notice>
      </div>
    );
  if (page === "stock") return <Stock />;
  if (page === "stock-templates")
    return (
      <div className="page-pad">
        <Heading
          title="A familiar rhythm, week after week."
          intro="Templates are a starting point. Review dated stock before publishing."
        />
        <div className="two-col">
          <div>
            {s.templates.map((t) => (
              <section className="paper-panel" key={t.id}>
                <h2>{t.name}</h2>
                {Object.entries(t.quantities).map(([id, q]) => (
                  <p className="receipt-row" key={id}>
                    <span>{s.products.find((p) => p.id === id)?.name}</span>
                    <strong>{q} units</strong>
                  </p>
                ))}
                <Confirm
                  label="Apply to sample Saturday"
                  title="Review template stock changes"
                  onConfirm={() => act({ type: "apply-template", id: t.id })}
                >
                  This replaces the sample Saturday published quantities.
                  Protected reservations cannot be reduced.
                </Confirm>
              </section>
            ))}
          </div>
          <Form
            onSubmit={(d) =>
              act({
                type: "template",
                name: value(d, "name"),
                quantities: Object.fromEntries(
                  ownProducts.map((p) => [p.id, p.stock]),
                ),
              })
            }
          >
            <h2>Save this week as a template.</h2>
            <Field label="Template name">
              <input name="name" required />
            </Field>
            <p>
              Uses the current quantities of your own sample products. A
              template does not reserve stock.
            </p>
            <button className="button">Save sample template</button>
          </Form>
        </div>
      </div>
    );
  if (page === "pickup-windows")
    return (
      <div className="page-pad">
        <Heading
          title="A little room for every pickup."
          intro="Sample windows are in Asia/Karachi. All cutoffs are checked against the demo clock."
        />
        <div className="two-col">
          <div>
            {s.slots
              .filter((x) => x.farmerId === f.id)
              .map((x) => (
                <div className="record-row" key={x.id}>
                  <div>
                    <h3>
                      {date(x.start)} · {time(x.start)}–{time(x.end)}
                    </h3>
                    <p>
                      Cutoff: {date(x.cutoff)}, {time(x.cutoff)}
                    </p>
                    <p className="small muted">
                      {
                        s.orders.filter(
                          (o) => o.slotId === x.id && activeOrder(o),
                        ).length
                      }{" "}
                      active sample reservations
                    </p>
                  </div>
                  <Clock />
                </div>
              ))}
          </div>
          <Form
            onSubmit={(d) =>
              act({
                type: "slot",
                value: {
                  id: `demo-s-${crypto.randomUUID().slice(0, 8)}`,
                  farmerId: f.id,
                  marketId: f.marketId,
                  start: `${value(d, "day")}T${value(d, "start")}:00+05:00`,
                  end: `${value(d, "day")}T${value(d, "end")}:00+05:00`,
                  cutoff: `${value(d, "cutoff")}:00+05:00`,
                },
              })
            }
          >
            <h2>Add a sample window.</h2>
            <Field label="Date">
              <input
                type="date"
                name="day"
                defaultValue="2026-10-03"
                required
              />
            </Field>
            <div className="two-col">
              <Field label="Starts">
                <input type="time" name="start" required />
              </Field>
              <Field label="Ends">
                <input type="time" name="end" required />
              </Field>
            </div>
            <Field label="Order cutoff">
              <input
                type="datetime-local"
                name="cutoff"
                required
                defaultValue="2026-10-02T20:00"
              />
            </Field>
            <button className="button">Add sample window</button>
          </Form>
        </div>
        <Notice>
          Capacity, overlap rules and editing booked windows await the approved
          contract. This preview permits adding valid windows only.
        </Notice>
      </div>
    );
  if (page === "orders") {
    const orders = ownOrders.filter(
      (o) =>
        (filter === "All" || o.stage === filter) &&
        o.id.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <div className="page-pad">
        <Heading
          title="From reservation to market bag."
          intro="Respond, prepare, and keep your customers informed."
        />
        <div className="filter-bar">
          <input
            aria-label="Search farmer orders"
            placeholder="Search order reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Order status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "All",
              "Placed",
              "Accepted",
              "Ready for pickup",
              "Completed",
              "Cancelled",
              "Declined",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {orders.length ? (
          <OrderRows orders={orders} prefix="/farmer" />
        ) : (
          <Empty
            title="Nothing in this queue."
            href="/farmer"
            action="Weekly planner"
          />
        )}
      </div>
    );
  }
  if (page === "pickups") {
    const active = ownOrders.filter(activeOrder);
    const quantities = new Map<string, number>();
    active.forEach((o) =>
      o.lines.forEach((l) =>
        quantities.set(
          l.productId,
          (quantities.get(l.productId) ?? 0) + l.quantity,
        ),
      ),
    );
    return (
      <div className="page-pad">
        <Heading
          title="Ready for the morning rush."
          intro="A sample prep list built from your reserved quantities."
        />
        <div className="two-col">
          <section>
            <h2>Pack for your pickups.</h2>
            {[...quantities].map(([id, q]) => (
              <label className="prep-row checkbox" key={id}>
                <input
                  type="checkbox"
                  checked={s.checklist.includes(`prep-${id}`)}
                  onChange={() =>
                    act(
                      { type: "check", id: `prep-${id}` },
                      "Personal prep checklist updated.",
                    )
                  }
                />
                <span>{s.products.find((p) => p.id === id)?.name}</span>
                <strong>
                  {q} × {s.products.find((p) => p.id === id)?.unit}
                </strong>
              </label>
            ))}
            <p className="small muted">
              Checkmarks are personal prep notes, not order completion.
            </p>
          </section>
          <section>
            <h2>Pickup worklist.</h2>
            <OrderRows
              orders={active.sort((a, b) =>
                (
                  s.slots.find((x) => x.id === a.slotId)?.start ?? ""
                ).localeCompare(
                  s.slots.find((x) => x.id === b.slotId)?.start ?? "",
                ),
              )}
              prefix="/farmer"
            />
          </section>
        </div>
      </div>
    );
  }
  if (page === "insights") return <Reports farmer />;
  if (page === "reviews")
    return (
      <div className="page-pad">
        <Heading
          title="Words from your market community."
          intro="Read and reply to sample completed-order reviews."
        />
        {s.reviews
          .filter(
            (r) =>
              s.orders.find((o) => o.id === r.orderId)?.farmerId === f.id &&
              r.visible,
          )
          .map((r) => (
            <article className="paper-panel review" key={r.id}>
              <p>
                {r.rating} / 5 · Sample customer · {r.orderId}
              </p>
              <h3>
                {r.target === f.id
                  ? f.name
                  : s.products.find((p) => p.id === r.target)?.name}
              </h3>
              <p>{r.text}</p>
              {r.reply && <blockquote>{r.reply}</blockquote>}
              <Form
                onSubmit={(d) =>
                  act({ type: "reply", id: r.id, text: value(d, "reply") })
                }
              >
                <Field label="Your reply">
                  <textarea
                    name="reply"
                    defaultValue={r.reply}
                    required
                    rows={2}
                  />
                </Field>
                <button className="button secondary">Save sample reply</button>
              </Form>
            </article>
          ))}
      </div>
    );
  if (page) return <NotFound />;
  const pending = ownOrders.filter((o) => o.stage === "Placed");
  return (
    <div className="page-pad">
      <Heading
        eyebrow="Weekly Market Planner"
        title="A good market day starts here."
        intro="Your harvest, your orders, and a clear plan for the week."
      >
        <Link className="button" to="/farmer/stock">
          Review Saturday stock <ArrowUpRight size={17} />
        </Link>
      </Heading>
      <div className="next-market">
        <div>
          <p className="eyebrow">Your next sample market</p>
          <h2>The Orchard Market</h2>
          <p>Saturday, 3 October · 08:00–13:00</p>
        </div>
        <div>
          <p>Order cutoff</p>
          <strong>Friday · 20:00</strong>
          <p className="small">Asia/Karachi</p>
        </div>
        <Sprout size={55} />
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>First, a little attention.</h2>
          <span className="count">{pending.length} to review</span>
        </div>
        {pending.length ? (
          <OrderRows orders={pending} prefix="/farmer" />
        ) : (
          <Notice>No sample orders are awaiting a response.</Notice>
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>The week at a glance.</h2>
          <Link className="text-link" to="/farmer/markets">
            Your markets <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="week-board">
          {[
            "Mon 28",
            "Tue 29",
            "Wed 30",
            "Thu 1",
            "Fri 2",
            "Sat 3",
            "Sun 4",
          ].map((d, i) => (
            <div key={d} className={i === 5 ? "market-day" : ""}>
              <p>{d}</p>
              {i === 5 ? (
                <>
                  <Sprout size={23} />
                  <strong>The Orchard</strong>
                  <span>
                    {ownProducts.filter((p) => p.visible).length} sample offers
                  </span>
                  <Link to="/farmer/pickups">Open prep list</Link>
                </>
              ) : i === 4 ? (
                <>
                  <ClipboardList size={21} />
                  <strong>Review stock</strong>
                  <span>Sample cutoff 20:00</span>
                </>
              ) : (
                <span className="muted">No market</span>
              )}
            </div>
          ))}
        </div>
      </section>
      <div className="metric-strip">
        <div>
          <span>Total sample orders</span>
          <strong>{ownOrders.length}</strong>
        </div>
        <div>
          <span>Awaiting response</span>
          <strong>{pending.length}</strong>
        </div>
        <div>
          <span>Sample order value</span>
          <strong>
            {money(
              ownOrders
                .filter((o) => !["Cancelled", "Declined"].includes(o.stage))
                .reduce((n, o) => n + total(o.lines), 0),
            )}
          </strong>
        </div>
      </div>
      <Notice>
        Order value is not confirmed cash collected. The week and stock are
        illustrative fixture records.
      </Notice>
    </div>
  );
}

function ProductEditor() {
  const s = useMarket();
  const act = useAction();
  const { productId } = useParams();
  const navigate = useNavigate();
  const p = s.products.find(
    (p) => p.id === productId && p.farmerId === s.farmerId,
  );
  const [image, setImage] = useState(p?.image ?? images.tomatoes);
  if (productId && !p) return <NotFound />;
  return (
    <div className="page-pad narrow">
      <Link className="back-link" to="/farmer/products">
        ← Your products
      </Link>
      <Heading
        title={
          p
            ? "A little care for your listing."
            : "Bring something good to the stall."
        }
      />
      <Form
        onSubmit={(d) => {
          const product: Product = {
            id: p?.id ?? `demo-p-${crypto.randomUUID().slice(0, 8)}`,
            farmerId: s.farmerId,
            name: value(d, "name"),
            category: value(d, "category"),
            unit: value(d, "unit"),
            price: Math.round(Number(value(d, "price")) * 100),
            stock: Number(value(d, "stock")),
            reserved: p?.reserved ?? 0,
            description: value(d, "description"),
            image,
            visible: p?.visible ?? true,
            available: p?.available ?? true,
          };
          if (act({ type: "product", value: product }, "Sample product saved."))
            navigate("/farmer/products");
        }}
      >
        <Field label="Product name">
          <input name="name" required defaultValue={p?.name} />
        </Field>
        <div className="two-col">
          <Field label="Category">
            <select name="category" defaultValue={p?.category}>
              {s.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Selling unit">
            <input name="unit" required defaultValue={p?.unit ?? "bunch"} />
          </Field>
        </div>
        <div className="two-col">
          <Field label="Sample unit price (PKR)">
            <input
              type="number"
              name="price"
              min={1}
              step="0.01"
              required
              defaultValue={p ? p.price / 100 : ""}
            />
          </Field>
          <Field label="Sample Saturday published stock">
            <input
              type="number"
              name="stock"
              min={p?.reserved ?? 0}
              step={1}
              required
              defaultValue={p?.stock ?? 0}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            rows={4}
            required
            defaultValue={p?.description}
          />
        </Field>
        <Field label="Editorial preview image">
          <select value={image} onChange={(e) => setImage(e.target.value)}>
            {Object.entries(images).map(([name, url]) => (
              <option key={name} value={url}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <img
          className="form-image"
          src={image}
          alt="Selected product preview"
        />
        <Notice>
          Image selection uses bundled licensed photos. Real uploads, dated
          multi-market offers and validation constraints require the approved
          API.
        </Notice>
        <div className="actions">
          <button className="button">Save sample product</button>
          <Link className="button quiet" to="/farmer/products">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}

function Stock() {
  const s = useMarket();
  return (
    <div className="page-pad">
      <Heading
        title="Bring the right harvest."
        intro="The Orchard Market · Saturday, 3 October · sample dated stock"
      />
      <Notice>
        Published and reserved quantities are distinct. Changes cannot reduce
        stock below existing reservations. This initial fixture has one
        occurrence per farmer; the final dated-offer adapter remains pending.
      </Notice>
      <div className="stock-ledger">
        {s.products
          .filter((p) => p.farmerId === s.farmerId)
          .map((p) => (
            <StockRow key={p.id} p={p} />
          ))}
      </div>
    </div>
  );
}
function StockRow({ p }: { p: Product }) {
  const act = useAction();
  const [stock, setStock] = useState(p.stock);
  const [price, setPrice] = useState(p.price / 100);
  return (
    <article className="stock-row">
      <div>
        <h3>{p.name}</h3>
        <p className="small muted">{p.unit}</p>
        <Status>{p.available ? "Available" : "Unavailable"}</Status>
      </div>
      <Field label="Published">
        <input
          type="number"
          min={p.reserved}
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
        />
      </Field>
      <div>
        <span className="small muted">Reserved</span>
        <strong className="stock-number">{p.reserved}</strong>
      </div>
      <div>
        <span className="small muted">Available</span>
        <strong className="stock-number">{p.stock - p.reserved}</strong>
      </div>
      <Field label="PKR / unit">
        <input
          type="number"
          min={1}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </Field>
      <div className="stack">
        <Confirm
          label="Save stock"
          title={`Review ${p.name} changes`}
          onConfirm={() =>
            act({
              type: "product",
              value: { ...p, stock, price: Math.round(price * 100) },
            })
          }
        >
          <p>
            Published: {p.stock} → {stock}. Price: {money(p.price)} →{" "}
            {money(Math.round(price * 100))}.
          </p>
          <p>{p.reserved} selling units remain reserved.</p>
        </Confirm>
        <button
          className="text-button"
          onClick={() =>
            act({ type: "product", value: { ...p, available: !p.available } })
          }
        >
          {p.available ? "Make unavailable" : "Make available"}
        </button>
      </div>
    </article>
  );
}

function FarmerOrder() {
  const s = useMarket();
  const act = useAction();
  const { orderId } = useParams();
  const o = s.orders.find((o) => o.id === orderId && o.farmerId === s.farmerId);
  if (!o) return <NotFound />;
  const slot = s.slots.find((x) => x.id === o.slotId)!;
  return (
    <div className="page-pad narrow">
      <Link className="back-link" to="/farmer/orders">
        ← Order queue
      </Link>
      <Heading title="A bag to get ready." intro={o.id}>
        <Status>{o.stage}</Status>
      </Heading>
      <div className="paper-panel">
        <h2>
          {date(slot.start)} · {time(slot.start)}–{time(slot.end)}
        </h2>
        <p>Sample customer · The Orchard Market</p>
        {o.lines.map((l) => (
          <div className="receipt-row" key={l.productId}>
            <div>
              <h3>{l.name}</h3>
              <p>
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
        <div className="actions">
          {o.stage === "Placed" && (
            <>
              <Confirm
                label="Accept order"
                title="Accept this sample reservation?"
                onConfirm={() =>
                  act({ type: "stage", id: o.id, stage: "Accepted" })
                }
              />
              <Confirm
                label="Decline order"
                title="Decline and release sample stock?"
                danger
                onConfirm={() =>
                  act({ type: "stage", id: o.id, stage: "Declined" })
                }
              />
            </>
          )}
          {o.stage === "Accepted" && (
            <Confirm
              label="Mark ready"
              title="Have you prepared this sample order?"
              onConfirm={() =>
                act({ type: "stage", id: o.id, stage: "Ready for pickup" })
              }
            />
          )}
          {o.stage === "Ready for pickup" && (
            <Confirm
              label="Complete sample pickup"
              title="Complete this fixture order?"
              onConfirm={() =>
                act({ type: "stage", id: o.id, stage: "Completed" })
              }
            >
              Farmer completion is an illustrative demo policy, not the final
              approved completion authority.
            </Confirm>
          )}
        </div>
      </div>
      <h2 className="section">Reservation history</h2>
      {o.events.map((e, i) => (
        <p key={i}>
          {e.label} · {date(e.at)} {time(e.at)}
        </p>
      ))}
    </div>
  );
}

export function Reports({ farmer = false }: { farmer?: boolean }) {
  const s = useMarket();
  const [filter, set] = useState("all");
  const orders = s.orders.filter(
    (o) =>
      (!farmer || o.farmerId === s.farmerId) &&
      (filter === "all" || o.marketId === filter),
  );
  const valid = orders.filter(
    (o) => !["Cancelled", "Declined"].includes(o.stage),
  );
  const sum = valid.reduce((n, o) => n + total(o.lines), 0);
  const ranks = s.products
    .filter((p) => !farmer || p.farmerId === s.farmerId)
    .map((p) => ({
      ...p,
      value: valid.reduce(
        (n, o) =>
          n +
          o.lines
            .filter((l) => l.productId === p.id)
            .reduce((v, l) => v + l.price * l.quantity, 0),
        0,
      ),
    }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...ranks.map((p) => p.value));
  return (
    <div className="page-pad">
      <Heading
        title={
          farmer
            ? "A clearer view of your harvest."
            : "The market, in perspective."
        }
        intro="Computed from the current sample dataset. No invented trends or cash-collected figures."
      >
        <Field label="Market scope">
          <select value={filter} onChange={(e) => set(e.target.value)}>
            <option value="all">All sample markets</option>
            {s.markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      </Heading>
      <div className="metric-strip">
        <div>
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>Awaiting response</span>
          <strong>{orders.filter((o) => o.stage === "Placed").length}</strong>
        </div>
        <div>
          <span>Order value</span>
          <strong>{money(sum)}</strong>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>What is in the market bags?</h2>
          <span className="small muted">Ranked by sample order value</span>
        </div>
        <div className="bar-chart">
          {ranks.map((p) => (
            <div className="bar-row" key={p.id}>
              <span>{p.name}</span>
              <div className="bar-track">
                <div style={{ width: `${(p.value / max) * 100}%` }} />
              </div>
              <strong>{money(p.value)}</strong>
            </div>
          ))}
        </div>
      </section>
      <details>
        <summary>How these numbers are calculated</summary>
        <p>
          Total orders includes all states. Order value sums historical line
          prices × quantities, excluding cancelled and declined orders. It
          includes reservations, not confirmed cash. This fixture report covers
          all sample records, not a selected calendar period. Previous-period
          comparison awaits an approved aggregate contract.
        </p>
      </details>
      <section className="section">
        <h2>The records behind the picture.</h2>
        <div className="record-list">
          {farmer ? (
            <OrderRows orders={orders} prefix="/farmer" />
          ) : (
            orders.map((o) => (
              <div className="record-row" key={o.id}>
                <div className="grow">
                  <h3>{o.id}</h3>
                  <p>{s.farmers.find((f) => f.id === o.farmerId)?.name}</p>
                </div>
                <Status>{o.stage}</Status>
                <strong>{money(total(o.lines))}</strong>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
