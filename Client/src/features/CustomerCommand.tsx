import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  Heart,
  MapPin,
  Search,
  ShoppingBasket,
  Sparkles,
  Bell,
  ListChecks,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMarket, useAction, Status } from "../components/ui";
import { MarketMap } from "../components/MarketMap";
import { marketDayView } from "../data/living-selectors";
import { date, time, money, total, demoDate } from "../data/market";
import { localization } from "../data/localization";
import { useCompanion } from "../app/companion-context";
import { HarvestItem } from "../components/HarvestItem";

export function CustomerCommand() {
  const s = useMarket();
  const act = useAction();
  const openCompanion = useCompanion();
  const reduce = useReducedMotion();
  const [day, setDay] = useState(demoDate);
  const [selected, setSelected] = useState(s.markets[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const view = marketDayView(s, day);
  const selectedId = view.markets.some((m) => m.id === selected)
    ? selected
    : (view.markets[0]?.id ?? "");
  const products = view.products.filter((p) =>
    `${p.name} ${s.farmers.find((f) => f.id === p.farmerId)?.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const orders = view.orders.filter(
    (o) => orderFilter === "all" || o.stage === "Ready for pickup",
  );
  const ready = view.orders.filter(
    (o) => o.stage === "Ready for pickup",
  ).length;
  const unread = s.notices.filter((n) => n.role === "customer" && !n.read);
  const history = s.orders.filter(
    (o) => !view.orders.some((x) => x.id === o.id),
  );
  return (
    <div className="customer-command market-studio">
      <div className="command-title">
        <div>
          <span>{localization.city} / Customer workspace</span>
          <h1 tabIndex={-1}>Your market day, in view.</h1>
        </div>
        <div>
          <Link to="/customer/market-day" className="command-planner">
            <ListChecks size={16} /> Day planner
          </Link>
          <label>
            <CalendarDays size={16} />
            <select
              aria-label="Dashboard market day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {[...new Set(s.markets.filter((m) => m.active).map((m) => m.day))]
                .sort()
                .map((d) => (
                  <option key={d} value={d}>
                    {date(d)}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>
      <div className="command-summary">
        <div>
          <span>Active reservations</span>
          <strong>
            {view.orders.length}
            <small>
              across {new Set(view.orders.map((o) => o.farmerId)).size} stalls
            </small>
          </strong>
        </div>
        <div>
          <span>Ready to collect</span>
          <strong>
            {ready}
            <small>check your Passport</small>
          </strong>
        </div>
        <div>
          <span>Booked order value</span>
          <strong>
            {money(view.orders.reduce((n, o) => n + total(o.lines), 0))}
            <small>pay at pickup</small>
          </strong>
        </div>
        <Link to="/basket">
          <span>Your basket</span>
          <strong>
            {Object.values(s.basket).reduce((a, b) => a + b, 0)}
            <small>
              units to review <ArrowUpRight size={13} />
            </small>
          </strong>
        </Link>
      </div>
      <div className="command-workspace">
        <div className="command-discovery">
          <div className="command-panel-heading">
            <h2>
              <MapPin size={17} /> Market discovery
            </h2>
            <Link to={`/markets?day=${day}`}>
              Directory <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="command-map-layout">
            <MarketMap
              markets={view.markets}
              selected={selectedId}
              onSelect={setSelected}
            />
            <div className="command-market-list">
              {view.markets.map((m, i) => (
                <article
                  key={m.id}
                  className={m.id === selectedId ? "selected" : ""}
                >
                  <button
                    aria-label={`Focus ${m.name}`}
                    aria-pressed={m.id === selectedId}
                    onClick={() => setSelected(m.id)}
                  >
                    <span>0{i + 1}</span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.area}</small>
                      <small>
                        <Clock size={11} />
                        {m.hours}
                      </small>
                    </div>
                  </button>
                  <Link to={`/markets/${m.id}`} aria-label={`View ${m.name}`}>
                    <ArrowUpRight size={15} />
                  </Link>
                </article>
              ))}
              <div className="command-location-note">
                {date(day)}
                <br />
                {localization.city}, {localization.country}
                <br />
                <span>Fictional markets. Real map pending.</span>
              </div>
            </div>
          </div>
        </div>
        <aside className="command-itinerary">
          <div className="command-panel-heading">
            <h2>
              <Clock size={17} /> Pickup itinerary
            </h2>
            <span>{date(day)}</span>
          </div>
          <div className="command-order-tabs">
            <button
              aria-pressed={orderFilter === "all"}
              onClick={() => setOrderFilter("all")}
            >
              All ({view.orders.length})
            </button>
            <button
              aria-pressed={orderFilter === "ready"}
              onClick={() => setOrderFilter("ready")}
            >
              Ready ({ready})
            </button>
          </div>
          {orders.map((o) => {
            const slot = s.slots.find((x) => x.id === o.slotId)!;
            return (
              <article key={o.id} className="agenda-stop command-pickup">
                <time>
                  {time(slot.start)}
                  <small>to {time(slot.end)}</small>
                </time>
                <div>
                  <Status>{o.stage}</Status>
                  <h3>{s.farmers.find((f) => f.id === o.farmerId)?.name}</h3>
                  <p>
                    {o.lines
                      .map((l) => `${l.quantity} × ${l.name}`)
                      .join(" · ")}
                  </p>
                  <Link to={`/customer/orders/${o.id}`}>
                    Open Pickup Passport <ArrowUpRight size={13} />
                  </Link>
                </div>
              </article>
            );
          })}
          {!orders.length && (
            <p className="command-empty">
              No {orderFilter === "ready" ? "ready " : ""}pickups on this day.
              Your other reservations are in Order history.
            </p>
          )}
          <Link to="/customer/orders" className="command-all-orders">
            Manage reservations <ArrowUpRight size={14} />
          </Link>
        </aside>
        <section className="command-harvest">
          <div className="command-panel-heading">
            <h2>
              <ShoppingBasket size={17} /> Available for your day
            </h2>
            <Link to={`/products?day=${day}`}>
              Browse produce <ArrowUpRight size={14} />
            </Link>
          </div>
          <label className="command-search">
            <Search size={15} />
            <input
              aria-label="Search dashboard produce"
              placeholder="Search produce or grower"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && <button onClick={() => setQuery("")}>Clear</button>}
          </label>
          <motion.div
            className="studio-harvest command-produce"
            key={day}
            initial={{ y: reduce ? 0 : 6 }}
            animate={{ y: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            {products.map((p) => (
              <HarvestItem key={p.id} product={p} />
            ))}
          </motion.div>
          {!products.length && (
            <p className="command-empty">
              No available produce for this selection. Choose another market day
              or search.
            </p>
          )}
        </section>
        <aside className="command-tools">
          <section className="command-companion">
            <div>
              <Sparkles size={20} />
              <span>
                Market Companion<small>MarketLink Copilot</small>
              </span>
            </div>
            <p>Understand your next pickup or find available produce.</p>
            <button onClick={openCompanion}>
              Ask your companion <ArrowUpRight size={15} />
            </button>
            <small>Scripted preview · no live AI connection</small>
          </section>
          <section className="command-checklist">
            <div className="command-panel-heading">
              <h2>
                <ListChecks size={16} /> Before you leave
              </h2>
              <span>
                {
                  s.checklist.filter((x) =>
                    ["market-bag", "passport", "pickup-cash"].includes(x),
                  ).length
                }
                /3
              </span>
            </div>
            {[
              ["market-bag", "Pack a reusable bag"],
              ["passport", "Check Pickup Passports"],
              ["pickup-cash", "Plan payment at the stalls"],
            ].map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={s.checklist.includes(id)}
                  onChange={() =>
                    act(
                      { type: "check", id },
                      "Sample market-day checklist updated.",
                    )
                  }
                />
                <span>{label}</span>
                {s.checklist.includes(id) && <Check size={13} />}
              </label>
            ))}
          </section>
        </aside>
        <section className="command-history">
          <div className="command-panel-heading">
            <h2>Other orders & history</h2>
            <Link to="/customer/orders">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="command-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reservation</th>
                  <th>Grower</th>
                  <th>Collection</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{s.farmers.find((f) => f.id === o.farmerId)?.name}</td>
                    <td>
                      {date(
                        s.slots.find((slot) => slot.id === o.slotId)!.start,
                      )}
                    </td>
                    <td>
                      <Status>{o.stage}</Status>
                    </td>
                    <td>{money(total(o.lines))}</td>
                    <td>
                      <Link
                        to={`/customer/orders/${o.id}`}
                        aria-label={`Details for ${o.id}`}
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!history.length && (
              <p className="command-empty">No other sample orders.</p>
            )}
          </div>
        </section>
        <aside className="command-updates">
          <div className="command-panel-heading">
            <h2>
              <Bell size={16} /> Your updates
            </h2>
            <span>{unread.length} unread</span>
          </div>
          {unread.slice(0, 2).map((n) => (
            <Link key={n.id} to={n.href}>
              <span className="update-dot" />
              <span>
                <strong>{n.title}</strong>
                <small>{n.text}</small>
              </span>
              <ArrowUpRight size={14} />
            </Link>
          ))}
          {!unread.length && (
            <p className="command-empty">You’re up to date.</p>
          )}
          <Link to="/customer/favourites">
            <Heart size={16} />
            <span>
              <strong>
                {s.favourites.length} favourites · {s.restock.length} restock
                watches
              </strong>
              <small>Your saved markets, growers and produce</small>
            </span>
            <ArrowUpRight size={14} />
          </Link>
        </aside>
      </div>
      <p className="command-footnote">
        Development fixtures · {localization.timeZone} · payments happen
        physically at pickup · refresh resets simulated changes
      </p>
    </div>
  );
}
