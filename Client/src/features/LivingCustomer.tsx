import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Check,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Leaf,
  Clock,
  Bell,
  Heart,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMarket, useAction, Favourite, Status } from "../components/ui";
import { LivingMap } from "../components/LivingMap";
import { date, time, money, total, images, demoDate } from "../data/market";
import type { Product } from "../data/market";
import { marketDayView } from "../data/living-selectors";
import { useCompanion } from "../app/companion-context";

export function HarvestItem({ product }: { product: Product }) {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const quantity = s.basket[product.id] ?? 0;
  return (
    <article className="harvest-item">
      <Link to={`/products/${product.id}`} className="harvest-photo">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span>{product.stock - product.reserved} available</span>
      </Link>
      <Favourite id={product.id} />
      <small>{s.farmers.find((f) => f.id === product.farmerId)?.name}</small>
      <Link to={`/products/${product.id}`}>
        <h3>{product.name}</h3>
      </Link>
      <div className="harvest-price">
        <span>
          <strong>{money(product.price)}</strong>
          <small> / {product.unit}</small>
        </span>
        <motion.button
          key={quantity}
          initial={false}
          animate={{ scale: reduce ? 1 : [1, 1.15, 1] }}
          aria-label={`Add ${product.name} to basket`}
          disabled={quantity >= product.stock - product.reserved}
          onClick={() =>
            act(
              { type: "basket", id: product.id, quantity: quantity + 1 },
              `${product.name} added to your sample basket.`,
            )
          }
        >
          {quantity ? (
            <>
              <Check size={14} />
              <span>{quantity}</span>
            </>
          ) : (
            <Plus size={17} />
          )}
        </motion.button>
      </div>
    </article>
  );
}

export function LivingCustomer() {
  const s = useMarket();
  const openCompanion = useCompanion();
  const reduce = useReducedMotion();
  const [day, setDay] = useState(demoDate);
  const [selected, setSelected] = useState(s.markets[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const view = marketDayView(s, day);
  const selectedId = view.markets.some((m) => m.id === selected)
    ? selected
    : (view.markets[0]?.id ?? "");
  const products = view.products.filter((p) =>
    `${p.name} ${s.farmers.find((f) => f.id === p.farmerId)?.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const unread = s.notices.filter(
    (n) => n.role === "customer" && !n.read,
  ).length;
  return (
    <div className="market-studio">
      <div className="studio-greeting">
        <div>
          <p>Your Market Day</p>
          <h1 tabIndex={-1}>A little closer to good food.</h1>
          <span>Your stalls, your harvest, your Saturday ritual.</span>
        </div>
        <label className="studio-date">
          <CalendarDays size={18} />
          <span>
            Plan for
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
          </span>
        </label>
      </div>
      <section className="studio-welcome">
        <div className="studio-welcome-copy">
          <span className="living-kicker">
            <Leaf size={15} /> The Living Market
          </span>
          <h2>
            Make room for
            <br />a market morning.
          </h2>
          <p>
            Know who grew it. Reserve what you love.
            <br />
            Collect it with a hello.
          </p>
          <Link to="/customer/market-day" className="button">
            Open my day planner <ArrowUpRight size={17} />
          </Link>
        </div>
        <img
          src={images.basket}
          alt="Editorial photograph of a freshly gathered harvest basket"
        />
        <div className="studio-welcome-ticket">
          <span>On your selected day</span>
          <strong>{view.orders.length} pickups</strong>
          <small>{date(day)} · pay at the stall</small>
        </div>
      </section>
      <div className="studio-day-strip">
        <span>
          <span className="step-number">1</span>Discover
        </span>
        <ArrowRight size={14} />
        <span>
          <span className="step-number">2</span>Reserve
        </span>
        <ArrowRight size={14} />
        <span>
          <span className="step-number">3</span>Collect
        </span>
        <Link to="/help">
          Your market-day guide <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="studio-main-grid">
        <div className="studio-main-column">
          <section className="studio-section">
            <div className="studio-heading">
              <div>
                <h2>Find your corner of the market</h2>
                <p>
                  {view.markets.length} sample markets on {date(day)}
                </p>
              </div>
              <Link to={`/markets?day=${day}`}>
                Explore all <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="studio-discovery">
              <LivingMap
                markets={view.markets}
                selected={selectedId}
                onSelect={setSelected}
              />
              <div className="studio-market-list">
                {view.markets.map((m, i) => (
                  <article
                    key={m.id}
                    className={selectedId === m.id ? "selected" : ""}
                  >
                    <button
                      onClick={() => setSelected(m.id)}
                      aria-pressed={selectedId === m.id}
                      aria-label={`Focus ${m.name}`}
                    >
                      <span className="studio-market-number">0{i + 1}</span>
                      <span>
                        <strong>{m.name}</strong>
                        <small>{m.area}</small>
                        <span className="market-hours">
                          <Clock size={12} />
                          {m.hours}
                        </span>
                      </span>
                    </button>
                    <Link to={`/markets/${m.id}`} aria-label={`View ${m.name}`}>
                      <ArrowUpRight size={17} />
                    </Link>
                  </article>
                ))}
                <p className="studio-map-note">
                  Choose a market to see its place on the illustrative map.
                </p>
              </div>
            </div>
          </section>
          <section className="studio-section">
            <div className="studio-heading">
              <div>
                <h2>Fresh for your selected day</h2>
                <p>Available produce from approved sample stalls</p>
              </div>
              <Link to={`/products?day=${day}`}>
                Browse produce <ArrowUpRight size={15} />
              </Link>
            </div>
            <label className="studio-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find something for your basket…"
                aria-label="Search dashboard produce"
              />
              {query && <button onClick={() => setQuery("")}>Clear</button>}
            </label>
            <motion.div
              className="studio-harvest"
              key={day}
              initial={{ opacity: reduce ? 1 : 0.6 }}
              animate={{ opacity: 1 }}
            >
              {products.slice(0, 4).map((p) => (
                <HarvestItem key={p.id} product={p} />
              ))}
            </motion.div>
            {!products.length && (
              <div className="studio-empty">
                <Leaf />
                <h3>No available produce for this selection.</h3>
                <p>
                  Try another market day or clear your search. New offers will
                  appear here when available.
                </p>
              </div>
            )}
          </section>
          <section className="studio-grower-story">
            <img
              src="/images/grower.jpg"
              alt="Editorial photograph of a grower holding freshly pulled beetroot"
              loading="lazy"
            />
            <div>
              <small>Behind every market bag</small>
              <h2>
                Good food has
                <br />
                people behind it.
              </h2>
              <p>
                Get to know the stalls and the growers in this sample market
                community.
              </p>
              <Link to="/farmers">
                Meet the growers <ArrowUpRight size={17} />
              </Link>
              <small className="editorial-credit">
                Editorial image · Heather Gill / Unsplash
              </small>
            </div>
          </section>
        </div>
        <aside className="studio-day-column">
          <section className="pickup-agenda">
            <div className="studio-heading">
              <div>
                <h2>Your pickup itinerary</h2>
                <p>{date(day)}</p>
              </div>
              <ShoppingBasket size={20} />
            </div>
            <div className="agenda-total">
              <strong>{view.orders.length}</strong>
              <span>
                stalls on your day
                <br />
                <small>
                  {money(view.orders.reduce((n, o) => n + total(o.lines), 0))}{" "}
                  booked value
                </small>
              </span>
            </div>
            {view.orders.map((o) => {
              const slot = s.slots.find((x) => x.id === o.slotId)!;
              return (
                <article className="agenda-stop" key={o.id}>
                  <span
                    className={`agenda-dot ${o.stage === "Ready for pickup" ? "ready" : ""}`}
                  />
                  <div>
                    <time>
                      {time(slot.start)}–{time(slot.end)}
                    </time>
                    <Status>{o.stage}</Status>
                    <h3>{s.farmers.find((f) => f.id === o.farmerId)?.name}</h3>
                    <p>
                      {o.lines
                        .map((l) => `${l.quantity} × ${l.name}`)
                        .join(" · ")}
                    </p>
                    <Link to={`/customer/orders/${o.id}`}>
                      Pickup Passport <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              );
            })}
            {!view.orders.length && (
              <p className="studio-empty-small">
                Your day is open. Explore a market and start planning your first
                pickup.
              </p>
            )}
            <div className="agenda-foot">
              <span>Payment happens at pickup.</span>
              <Link to="/customer/orders">
                All orders <ArrowRight size={14} />
              </Link>
            </div>
          </section>
          <section className="studio-companion">
            <Sparkles size={24} />
            <small>MarketLink Copilot</small>
            <h2>
              A little help
              <br />
              for your market day.
            </h2>
            <p>
              Find produce or understand your next pickup with Market Companion.
            </p>
            <button onClick={openCompanion}>
              Ask your companion <ArrowUpRight size={17} />
            </button>
            <span>Scripted preview · no live AI connection</span>
          </section>
          <section className="studio-saved">
            <div className="studio-heading">
              <h2>Your market notebook</h2>
              <Heart size={18} />
            </div>
            <Link to="/customer/favourites">
              <span>
                Saved favourites<small>Farmers, markets & produce</small>
              </span>
              <strong>{s.favourites.length}</strong>
            </Link>
            <Link to="/customer/favourites">
              <span>
                Restock watches<small>Your selected produce alerts</small>
              </span>
              <strong>{s.restock.length}</strong>
            </Link>
            <Link to="/customer/notifications">
              <span>
                Unread updates<small>Pickups & announcements</small>
              </span>
              <span className="notebook-count">
                <Bell size={14} />
                {unread}
              </span>
            </Link>
          </section>
        </aside>
      </div>
      <p className="studio-footnote">
        All records and actions are development fixtures. Stock is rechecked at
        sample checkout. No online payment.
      </p>
    </div>
  );
}
