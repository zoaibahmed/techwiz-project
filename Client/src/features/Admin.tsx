import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowUpRight, Sprout, Users, Flag } from "lucide-react";
import {
  useMarket,
  useAction,
  Heading,
  Field,
  Form,
  value,
  Notice,
  Status,
  Confirm,
  Empty,
} from "../components/ui";
import { Notifications } from "./Customer";
import { Reports } from "./Farmer";
import { NotFound } from "./Public";

export function AdminPage() {
  const s = useMarket();
  const act = useAction();
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] ?? "";
  const id = pathname.split("/")[3];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(
    null,
  );
  if (page === "notifications") return <Notifications />;
  if (page === "reports") return <Reports />;
  if (page === "markets" && id) return <MarketEditor />;
  if (page === "farmers" && id) {
    const f = s.farmers.find((f) => f.id === id);
    if (!f) return <NotFound />;
    return (
      <div className="page-pad narrow">
        <Link className="back-link" to="/admin/farmers">
          ← Farmer directory
        </Link>
        <Heading
          title={f.name}
          intro="Review this fictional stall’s platform access."
        >
          <Status>{f.state}</Status>
        </Heading>
        <div className="paper-panel">
          <h2>Registration details</h2>
          <dl className="definition-list">
            <dt>Contact person</dt>
            <dd>{f.person}</dd>
            <dt>Market</dt>
            <dd>{s.markets.find((m) => m.id === f.marketId)?.name}</dd>
            <dt>Public story</dt>
            <dd>{f.story}</dd>
          </dl>
          <Notice>
            Platform approval permits listing. It is not identity, food-safety
            or organic certification.
          </Notice>
          <div className="actions">
            {f.state !== "Approved" && (
              <Confirm
                label="Approve farmer"
                title={`Approve ${f.name}?`}
                onConfirm={() =>
                  act(
                    { type: "farmer", value: { ...f, state: "Approved" } },
                    "Sample farmer approved.",
                  )
                }
              />
            )}
            {f.state !== "Suspended" && (
              <Confirm
                label="Suspend farmer"
                title={`Suspend ${f.name}?`}
                danger
                onConfirm={() =>
                  act({ type: "farmer", value: { ...f, state: "Suspended" } })
                }
              >
                New sample reservations and publication will be blocked.
                Existing orders are preserved for review.
              </Confirm>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (page === "farmers") {
    const fs = s.farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All" || f.state === filter),
    );
    return (
      <div className="page-pad">
        <Heading
          title="The people behind the stalls."
          intro="Review access thoughtfully. Keep the market open to the right people."
        />
        <div className="filter-bar">
          <input
            aria-label="Search farmers"
            placeholder="Search stall name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Farmer state"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All", "Pending", "Approved", "Suspended"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="record-list">
          {fs.map((f) => (
            <Link
              className="record-row"
              key={f.id}
              to={`/admin/farmers/${f.id}`}
            >
              <span className="avatar">{f.name[0]}</span>
              <div className="grow">
                <h3>{f.name}</h3>
                <p>{f.person}</p>
              </div>
              <Status>{f.state}</Status>
              <span className="text-link">
                Review <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
        {!fs.length && (
          <Empty
            title="No stalls match this view."
            href="/admin"
            action="Command centre"
          />
        )}
      </div>
    );
  }
  if (page === "customers")
    return (
      <div className="page-pad">
        <Heading
          title={
            id ? "A customer’s place in the market." : "Your market community."
          }
          intro="Development customer management. No real personal records are loaded."
        />
        <div className="record-row">
          <span className="avatar">D</span>
          <div className="grow">
            <h3>
              {id ? (
                "Demo customer"
              ) : (
                <Link to="/admin/customers/demo-c1">Demo customer</Link>
              )}
            </h3>
            <p>customer@example.test</p>
          </div>
          <Status>{s.customerActive ? "Active" : "Inactive"}</Status>
          <Confirm
            label={s.customerActive ? "Deactivate" : "Activate"}
            title={`${s.customerActive ? "Deactivate" : "Activate"} the sample customer?`}
            danger={s.customerActive}
            onConfirm={() =>
              act({ type: "customer-active", value: !s.customerActive })
            }
          >
            This changes sample account access and preserves existing orders.
          </Confirm>
        </div>
      </div>
    );
  if (page === "markets")
    return (
      <div className="page-pad">
        <Heading
          title="Places that bring people together."
          intro="Sample market schedules and public information."
        >
          <Link className="button" to="/admin/markets/new">
            Add market <ArrowUpRight size={17} />
          </Link>
        </Heading>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search managed markets"
          placeholder="Search markets"
        />
        <div className="record-list">
          {s.markets
            .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
            .map((m) => (
              <article className="record-row" key={m.id}>
                <div className="grow">
                  <h2>{m.name}</h2>
                  <p>{m.address}</p>
                  <p className="small muted">
                    {m.day} · {m.hours} · Asia/Karachi
                  </p>
                </div>
                <Status>{m.active ? "Active" : "Closed"}</Status>
                <Link
                  className="button secondary"
                  to={`/admin/markets/${m.id}/edit`}
                >
                  Edit
                </Link>
                <Confirm
                  label={m.active ? "Close market" : "Reopen market"}
                  title="Review market availability"
                  onConfirm={() =>
                    act({ type: "market", value: { ...m, active: !m.active } })
                  }
                >
                  Closing is blocked while active sample reservations reference
                  this market. Permanent deletion policy awaits approval.
                </Confirm>
              </article>
            ))}
        </div>
      </div>
    );
  if (page === "moderation")
    return (
      <div className="page-pad">
        <Heading
          title="Care for what the market shares."
          intro="Review context before changing visibility. No AI moderation verdicts."
        />
        <div className="segmented">
          {["All", "Products", "Reviews"].map((x) => (
            <button
              key={x}
              className={filter === x ? "active" : ""}
              onClick={() => setFilter(x)}
              aria-pressed={filter === x}
            >
              {x}
            </button>
          ))}
        </div>
        {filter !== "Reviews" && (
          <section className="section">
            <h2>Product listings</h2>
            {s.products.map((p) => (
              <div className="record-row" key={p.id}>
                <div className="grow">
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <Status>{p.visible ? "Visible" : "Hidden"}</Status>
                </div>
                <Confirm
                  label={p.visible ? "Hide listing" : "Restore listing"}
                  title={`Review visibility for ${p.name}`}
                  onConfirm={() =>
                    act({ type: "moderate", kind: "product", id: p.id })
                  }
                >
                  This changes sample visibility. Historical receipts remain
                  intact.
                </Confirm>
              </div>
            ))}
          </section>
        )}
        {filter !== "Products" && (
          <section className="section">
            <h2>Customer reviews</h2>
            {s.reviews.map((r) => (
              <div className="record-row" key={r.id}>
                <div className="grow">
                  <p>
                    {r.rating} / 5 · {r.orderId}
                  </p>
                  <p>{r.text}</p>
                  <Status>{r.visible ? "Visible" : "Hidden"}</Status>
                </div>
                <Confirm
                  label={r.visible ? "Hide review" : "Restore review"}
                  title="Review this moderation action"
                  onConfirm={() =>
                    act({ type: "moderate", kind: "review", id: r.id })
                  }
                />
              </div>
            ))}
          </section>
        )}
      </div>
    );
  if (page === "categories")
    return (
      <div className="page-pad">
        <Heading
          title="A place for every kind of harvest."
          intro="Categories keep the catalogue clear and useful."
        />
        <div className="two-col">
          <div>
            {s.categories.map((c) => (
              <div className="record-row" key={c}>
                <div className="grow">
                  <h3>{c}</h3>
                  <p>
                    {s.products.filter((p) => p.category === c).length} sample
                    products
                  </p>
                </div>
                <Confirm
                  label="Remove"
                  title={`Remove ${c}?`}
                  danger
                  onConfirm={() =>
                    act({ type: "category", name: c, remove: true })
                  }
                >
                  Categories used by products cannot be removed.
                </Confirm>
              </div>
            ))}
          </div>
          <Form
            onSubmit={(d) => act({ type: "category", name: value(d, "name") })}
          >
            <h2>Add a category.</h2>
            <Field label="Category name">
              <input name="name" required maxLength={60} />
            </Field>
            <button className="button">Add sample category</button>
          </Form>
        </div>
      </div>
    );
  if (page === "announcements")
    return (
      <div className="page-pad">
        <Heading
          title="A word for the whole market."
          intro="Write, review, then publish. Sample announcements stay in local memory."
        />
        <div className="two-col">
          <Form
            onSubmit={(d) =>
              setDraft({ title: value(d, "title"), body: value(d, "body") })
            }
          >
            <Field label="Announcement title">
              <input name="title" required maxLength={120} />
            </Field>
            <Field label="Message">
              <textarea name="body" required rows={7} maxLength={1500} />
            </Field>
            <p className="small muted">
              Audience: everyone in the development preview. No email is sent.
            </p>
            <button className="button">Preview announcement</button>
            {draft && (
              <div className="paper-panel">
                <p className="eyebrow">Preview · not published</p>
                <h2>{draft.title}</h2>
                <p>{draft.body}</p>
                <Confirm
                  label="Publish sample announcement"
                  title="Publish this sample message?"
                  onConfirm={() => {
                    const result = act(
                      {
                        type: "announcement",
                        value: {
                          ...draft,
                          id: `demo-a-${crypto.randomUUID().slice(0, 8)}`,
                          published: true,
                        },
                      },
                      "Sample announcement published. No email was sent.",
                    );
                    if (result) setDraft(null);
                    return result;
                  }}
                />
              </div>
            )}
          </Form>
          <section>
            <h2>On the noticeboard.</h2>
            {s.announcements.map((a) => (
              <article className="paper-panel" key={a.id}>
                <Status>{a.published ? "Published · sample" : "Draft"}</Status>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    );
  if (page) return <NotFound />;
  return (
    <div className="page-pad">
      <Heading
        eyebrow="Administrator Command Centre"
        title="Keep the market running."
        intro="A clear view of the people, places and decisions that need your attention."
      />
      <div className="admin-overview">
        <section>
          <h2>Start with what matters.</h2>
          <Link className="action-queue" to="/admin/farmers">
            <span className="queue-icon">
              <Users />
            </span>
            <div>
              <h3>Farmer registrations</h3>
              <p>Review the stalls waiting to join.</p>
            </div>
            <strong>
              {s.farmers.filter((f) => f.state === "Pending").length}
            </strong>
            <ArrowUpRight />
          </Link>
          <Link className="action-queue" to="/admin/moderation">
            <span className="queue-icon">
              <Flag />
            </span>
            <div>
              <h3>Content stewardship</h3>
              <p>Review sample listings and reviews.</p>
            </div>
            <ArrowUpRight />
          </Link>
          <Link className="action-queue" to="/admin/markets">
            <span className="queue-icon">
              <Sprout />
            </span>
            <div>
              <h3>The next market day</h3>
              <p>Check schedules and participation.</p>
            </div>
            <ArrowUpRight />
          </Link>
        </section>
        <aside className="operator-note">
          <p className="eyebrow">Sample operator snapshot</p>
          <h2>
            Saturday
            <br />
            at the Orchard.
          </h2>
          <p>3 October · 08:00–13:00</p>
          <hr />
          <div className="receipt-row">
            <span>Approved attending stalls</span>
            <strong>
              {
                s.farmers.filter(
                  (f) => f.marketId === "demo-m1" && f.state === "Approved",
                ).length
              }
            </strong>
          </div>
          <div className="receipt-row">
            <span>Visible offers</span>
            <strong>{s.products.filter((p) => p.visible).length}</strong>
          </div>
          <Link className="text-link" to="/admin/markets">
            Review the market <ArrowUpRight size={17} />
          </Link>
        </aside>
      </div>
      <section className="section">
        <h2>The whole market, at a glance.</h2>
        <div className="metric-strip">
          <div>
            <span>Farmer accounts</span>
            <strong>{s.farmers.length}</strong>
          </div>
          <div>
            <span>Customer accounts</span>
            <strong>1</strong>
          </div>
          <div>
            <span>Markets</span>
            <strong>{s.markets.length}</strong>
          </div>
          <div>
            <span>Orders</span>
            <strong>{s.orders.length}</strong>
          </div>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <h2>From the noticeboard.</h2>
          <Link className="text-link" to="/admin/announcements">
            Compose a message <ArrowUpRight size={17} />
          </Link>
        </div>
        {s.announcements.map((a) => (
          <div className="record-row" key={a.id}>
            <div>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
function MarketEditor() {
  const s = useMarket();
  const act = useAction();
  const { marketId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const m = s.markets.find((m) => m.id === marketId);
  if (marketId && !m) return <NotFound />;
  return (
    <div className="page-pad narrow">
      <Link className="back-link" to="/admin/markets">
        ← Market management
      </Link>
      <Heading
        title={
          m ? "Give this market a little care." : "Make room for a new market."
        }
      />
      <Form
        onSubmit={(d) => {
          if (value(d, "end") <= value(d, "start")) {
            setError("Closing time must be after opening time.");
            return;
          }
          if (
            act({
              type: "market",
              value: {
                id: m?.id ?? `demo-m-${crypto.randomUUID().slice(0, 8)}`,
                name: value(d, "name"),
                area: value(d, "area"),
                address: value(d, "address"),
                day: value(d, "day"),
                hours: `${value(d, "start")}–${value(d, "end")}`,
                active: m?.active ?? true,
              },
            })
          )
            navigate("/admin/markets");
        }}
      >
        <Field label="Market name">
          <input name="name" required defaultValue={m?.name} />
        </Field>
        <Field label="Neighbourhood">
          <input name="area" required defaultValue={m?.area} />
        </Field>
        <Field label="Sample address">
          <textarea
            name="address"
            required
            defaultValue={m?.address}
            rows={2}
          />
        </Field>
        <Field label="Sample market occurrence">
          <input
            type="date"
            name="day"
            defaultValue={m?.day ?? "2026-10-03"}
            required
          />
        </Field>
        <div className="two-col">
          <Field label="Opens">
            <input
              name="start"
              type="time"
              defaultValue={m?.hours.split("–")[0] ?? "08:00"}
              required
            />
          </Field>
          <Field label="Closes">
            <input
              name="end"
              type="time"
              defaultValue={m?.hours.split("–")[1] ?? "13:00"}
              required
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Notice>
          This fixture models one dated occurrence in Asia/Karachi. Recurring
          schedules, real coordinates and dependent-order changes need the final
          contract.
        </Notice>
        <div className="actions">
          <button className="button">Save sample market</button>
          <Link to="/admin/markets" className="button quiet">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
