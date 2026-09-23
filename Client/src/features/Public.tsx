import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Clock,
  Search,
  ShoppingBasket,
  Leaf,
  CalendarDays,
} from "lucide-react";
import {
  useMarket,
  useAction,
  Heading,
  ProductTile,
  Empty,
  Field,
  SchematicMap,
  Favourite,
  Quantity,
  Notice,
  Form,
  value,
  MarketDate,
} from "../components/ui";
import { date, time, money, images, demoDate } from "../data/market";
import type { Role } from "../data/market";

export function Home() {
  const s = useMarket();
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-leaf">✳</span> The Living Market
          </p>
          <h1>
            Know your market
            <br />
            before you go.
          </h1>
          <p className="lead">
            Good food starts with a connection. Meet the growers, discover the
            harvest, and make a little room for market day.
          </p>
          <div className="actions">
            <Link to="/markets" className="button">
              Find your market <ArrowUpRight size={19} />
            </Link>
            <Link to="/customer/market-day" className="text-link">
              Plan my market day <ArrowRight size={17} />
            </Link>
          </div>
          <p className="hero-note">
            <ShoppingBasket size={17} /> Reserve ahead. Collect locally. Pay at
            pickup.
          </p>
        </div>
        <div className="hero-art">
          <img
            src={images.basket}
            alt="A basket of freshly harvested garden produce"
            width={600}
            height={680}
            fetchPriority="high"
          />
          <div className="hero-caption">
            <span className="caption-mark">✳</span>
            <div>
              <strong>
                A slower Saturday.
                <br />A fresher week.
              </strong>
              <span>From the garden to your market bag.</span>
            </div>
          </div>
          <span className="photo-credit">
            Editorial photograph · sample market experience
          </span>
        </div>
      </section>
      <div className="market-strip">
        <span>
          <Leaf size={18} /> Grown with care
        </span>
        <span>
          <MapPin size={18} /> Collected close to home
        </span>
        <span>
          <CalendarDays size={18} /> Planned around your day
        </span>
      </div>
      {s.announcements
        .filter((a) => a.published)
        .slice(-1)
        .map((a) => (
          <div className="container" key={a.id}>
            <Notice>
              <strong>{a.title}</strong> · {a.body}
            </Notice>
          </div>
        ))}
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Make a day of it</p>
            <h2>Your next market morning.</h2>
          </div>
          <Link className="text-link" to="/markets">
            Explore all markets <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="market-home">
          <img
            src={images.market}
            alt="Seasonal produce displayed at a market stall"
            loading="lazy"
            width={620}
            height={390}
          />
          <div>
            {s.markets.map((m) => (
              <Link className="market-line" key={m.id} to={`/markets/${m.id}`}>
                <MarketDate day={m.day} />
                <div>
                  <h3>{m.name}</h3>
                  <p>
                    {m.area} · {m.hours}
                  </p>
                </div>
                <ArrowUpRight size={21} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A taste of the season</p>
            <h2>On the stalls this week.</h2>
          </div>
          <Link className="text-link" to="/products">
            Browse the harvest <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {s.products
            .filter(
              (p) =>
                p.visible &&
                s.farmers.find((f) => f.id === p.farmerId)?.state ===
                  "Approved",
            )
            .slice(0, 4)
            .map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <h2>
            A little planning.
            <br />A much better market day.
          </h2>
          <div className="steps">
            {[
              [
                "01",
                "Find your market",
                "Choose a day and discover the growers who will be there.",
              ],
              [
                "02",
                "Make it yours",
                "Reserve from the available harvest and select your pickup window.",
              ],
              [
                "03",
                "Meet at the stall",
                "Bring your bag, collect your order, and pay your farmer in person.",
              ],
            ].map(([n, h, p]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section story">
        <img
          src={images.carrots}
          alt="Fresh carrots, photographed as an editorial produce study"
          loading="lazy"
          width={600}
          height={550}
        />
        <div>
          <p className="eyebrow">Behind every harvest</p>
          <h2>
            More than produce.
            <br />
            People to come back to.
          </h2>
          <p className="lead">
            Get to know a stall, save a favourite, and see what they are
            bringing next. A familiar face can make your whole week feel
            different.
          </p>
          <Link to="/farmers" className="button secondary">
            Meet the growers <ArrowUpRight size={18} />
          </Link>
          <p className="small muted">
            Grower stories in this development preview are fictional.
          </p>
        </div>
      </section>
      <section className="container invitation">
        <div>
          <p className="eyebrow">For the people who grow</p>
          <h2>
            Your harvest deserves
            <br />a well-planned market day.
          </h2>
        </div>
        <Link to="/register/farmer" className="button inverse">
          Bring your stall <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}

export function Markets() {
  const s = useMarket();
  const [params, set] = useSearchParams();
  const [selected, select] = useState(s.markets[0].id);
  const [map, showMap] = useState(false);
  const query = params.get("q") ?? "";
  const day = params.get("day") ?? "";
  const filtered = s.markets.filter(
    (m) =>
      m.active &&
      `${m.name} ${m.area}`.toLowerCase().includes(query.toLowerCase()) &&
      (!day || m.day === day),
  );
  const update = (key: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(key, v);
    else next.delete(key);
    set(next);
  };
  return (
    <div className="container section">
      <Heading
        eyebrow="Somewhere good to be"
        title="Find your next market day."
        intro="A place, a morning, and the people who make it worth going."
      />
      <div className="filter-bar">
        <label className="search">
          <Search size={19} />
          <input
            aria-label="Search markets"
            placeholder="Search a market or neighbourhood"
            value={query}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
        <label className="inline-field">
          Market day{" "}
          <select
            aria-label="Market day"
            value={day}
            onChange={(e) => update("day", e.target.value)}
          >
            <option value="">Any day</option>
            <option value={demoDate}>Saturday, 3 October</option>
            <option value="2026-10-04">Sunday, 4 October</option>
          </select>
        </label>
        <button className="button quiet" onClick={() => set({})}>
          Clear filters
        </button>
        <button
          className="button secondary map-toggle"
          onClick={() => showMap(!map)}
        >
          {map ? "Show list" : "Show map"}
        </button>
      </div>
      <p className="small muted">
        {filtered.length} sample markets · Select a market to explore its
        stalls.
      </p>
      {filtered.length ? (
        <div className={`discovery ${map ? "mobile-map" : ""}`}>
          <div className="market-results">
            {filtered.map((m) => (
              <article
                className={`market-result ${selected === m.id ? "selected" : ""}`}
                key={m.id}
              >
                <div className="spread">
                  <span className="eyebrow">{date(m.day)}</span>
                  <Favourite id={m.id} />
                </div>
                <button className="market-select" onClick={() => select(m.id)}>
                  <h2>{m.name}</h2>
                  <p>
                    <MapPin size={15} />
                    {m.area}
                  </p>
                </button>
                <p>
                  <Clock size={15} /> {m.hours} · Asia/Karachi
                </p>
                <div className="spread">
                  <span className="small">
                    {
                      s.farmers.filter(
                        (f) => f.marketId === m.id && f.state === "Approved",
                      ).length
                    }{" "}
                    sample growers
                  </span>
                  <Link className="text-link" to={`/markets/${m.id}`}>
                    Explore <ArrowUpRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <SchematicMap
            selected={selected}
            onSelect={select}
            markets={filtered}
          />
        </div>
      ) : (
        <Empty title="A different day, perhaps?">
          No sample markets match. Clear a filter or choose another day.
        </Empty>
      )}
    </div>
  );
}
export function MarketDetail() {
  const s = useMarket();
  const { marketId } = useParams();
  const m = s.markets.find((m) => m.id === marketId);
  if (!m) return <NotFound />;
  const farmers = s.farmers.filter(
    (f) => f.marketId === m.id && f.state === "Approved",
  );
  return (
    <div className="container section">
      <Link className="back-link" to="/markets">
        ← All markets
      </Link>
      <Heading title={m.name} intro={`${m.area} · ${date(m.day)} · ${m.hours}`}>
        <Favourite id={m.id} />
      </Heading>
      <div className="market-detail-hero">
        <img src={images.market} alt="Illustrative farmers market produce" />
        <div className="paper-panel">
          <p className="eyebrow">Your market morning</p>
          <h2>{date(m.day)}</h2>
          <p>{m.hours} · Asia/Karachi</p>
          <p>{m.address}</p>
          <Notice>
            Sample location. Real coordinates and directions will come from the
            approved market records.
          </Notice>
        </div>
      </div>
      <section className="section">
        <h2>The people on the stalls.</h2>
        {farmers.length ? (
          <div className="grower-list">
            {farmers.map((f) => (
              <Link className="grower-row" key={f.id} to={`/farmers/${f.id}`}>
                <span className="avatar">{f.name.slice(0, 1)}</span>
                <div>
                  <h3>{f.name}</h3>
                  <p>{f.story}</p>
                </div>
                <ArrowUpRight />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Attendance is still taking shape." />
        )}
      </section>
      <section>
        <h2>From this market's harvest.</h2>
        <div className="product-grid">
          {s.products
            .filter(
              (p) => p.visible && farmers.some((f) => f.id === p.farmerId),
            )
            .map((p) => (
              <ProductTile product={p} key={p.id} />
            ))}
        </div>
      </section>
    </div>
  );
}

export function Farmers() {
  const s = useMarket();
  const [q, set] = useState("");
  const fs = s.farmers.filter(
    (f) =>
      f.state === "Approved" && f.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="container section">
      <Heading
        title="Meet your market people."
        intro="The growers, gardens and familiar faces behind the harvest."
      />
      <label className="search">
        <Search size={18} />
        <input
          aria-label="Search growers"
          placeholder="Find a grower"
          value={q}
          onChange={(e) => set(e.target.value)}
        />
      </label>
      <div className="grower-list section">
        {fs.map((f, i) => (
          <article className="grower-row" key={f.id}>
            <img
              src={i % 2 ? images.carrots : images.tomatoes}
              alt="Editorial produce photograph"
            />
            <div>
              <p className="eyebrow">
                {s.markets.find((m) => m.id === f.marketId)?.name}
              </p>
              <h2>
                <Link to={`/farmers/${f.id}`}>{f.name}</Link>
              </h2>
              <p>{f.story}</p>
              <Link className="text-link" to={`/farmers/${f.id}`}>
                Visit the stall <ArrowUpRight size={17} />
              </Link>
            </div>
            <Favourite id={f.id} />
          </article>
        ))}
      </div>
      {!fs.length && <Empty title="No growers match that name." />}
    </div>
  );
}
export function FarmerDetail() {
  const s = useMarket();
  const { farmerId } = useParams();
  const f = s.farmers.find((f) => f.id === farmerId && f.state === "Approved");
  if (!f) return <NotFound />;
  return (
    <div className="container section">
      <Link className="back-link" to="/farmers">
        ← Meet the growers
      </Link>
      <div className="story">
        <img src={images.carrots} alt="Illustrative garden harvest" />
        <div>
          <p className="eyebrow">A sample grower story</p>
          <h1>{f.name}</h1>
          <p className="lead">{f.story}</p>
          <Favourite id={f.id} />
          <p>Next sample market: {date(demoDate)}</p>
          <Link className="text-link" to={`/markets/${f.marketId}`}>
            Explore their market <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <section className="section">
        <h2>From this stall.</h2>
        <div className="product-grid">
          {s.products
            .filter((p) => p.farmerId === f.id && p.visible)
            .map((p) => (
              <ProductTile product={p} key={p.id} />
            ))}
        </div>
      </section>
      <h2>From the market community.</h2>
      {s.reviews
        .filter((r) => r.visible && r.target === f.id)
        .map((r) => (
          <blockquote className="review" key={r.id}>
            <p>{r.rating} / 5 · Sample completed-order review</p>
            <p>“{r.text}”</p>
            {r.reply && <p>Farmer reply: {r.reply}</p>}
          </blockquote>
        ))}
    </div>
  );
}

export function Products() {
  const s = useMarket();
  const [params, set] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const farmer = params.get("farmer") ?? "";
  const market = params.get("market") ?? "";
  const day = params.get("day") ?? "";
  const [available, setAvailable] = useState(
    params.get("available") === "true",
  );
  useEffect(() => setAvailable(params.get("available") === "true"), [params]);
  const sort = params.get("sort") ?? "name";
  const max = Number(params.get("max") ?? 1000);
  const update = (key: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(key, v);
    else n.delete(key);
    set(n);
  };
  const products = s.products
    .filter(
      (p) =>
        p.visible &&
        s.farmers.find((f) => f.id === p.farmerId)?.state === "Approved" &&
        p.name.toLowerCase().includes(q.toLowerCase()) &&
        (!category || p.category === category) &&
        (!farmer || p.farmerId === farmer) &&
        (!market ||
          s.farmers.find((f) => f.id === p.farmerId)?.marketId === market) &&
        (!day || day === demoDate) &&
        (!available || (p.available && p.stock > p.reserved)) &&
        p.price <= max * 100,
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : a.name.localeCompare(b.name),
    );
  return (
    <div className="container section">
      <Heading
        eyebrow="Good things are growing"
        title="Fresh for your market day."
        intro="Choose your harvest. Know your farmer. Make a morning of it."
      />
      <div className="filter-bar">
        <label className="search">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="What are you looking for?"
            aria-label="Search produce"
          />
        </label>
        <select
          aria-label="Sort produce"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="name">Name</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      <div className="catalogue">
        <aside className="filter-rail">
          <h3>Make it your market.</h3>
          <Field label="Market">
            <select
              value={market}
              onChange={(e) => update("market", e.target.value)}
            >
              <option value="">All markets</option>
              {s.markets
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Market date">
            <input
              type="date"
              value={day}
              onChange={(e) => update("day", e.target.value)}
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All produce</option>
              {s.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Grower">
            <select
              value={farmer}
              onChange={(e) => update("farmer", e.target.value)}
            >
              <option value="">All growers</option>
              {s.farmers
                .filter((f) => f.state === "Approved")
                .map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={`Maximum sample price: ${money(max * 100)}`}>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={max}
              onChange={(e) => update("max", e.target.value)}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => {
                setAvailable(e.target.checked);
                update("available", String(e.target.checked));
              }}
            />
            Available only
          </label>
          <button className="text-button" onClick={() => set({})}>
            Clear filters
          </button>
          <p className="small muted">
            Sample offers for Saturday, 3 October. Prices per selling unit;
            unlike units are not directly comparable.
          </p>
        </aside>
        <div>
          <p className="small muted">{products.length} sample offers</p>
          <div className="product-grid three">
            {products.map((p) => (
              <ProductTile product={p} key={p.id} />
            ))}
          </div>
          {!products.length && (
            <Empty title="Nothing in this basket of filters.">
              Clear a filter to see more of the sample harvest.
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}
export function ProductDetail() {
  const s = useMarket();
  const act = useAction();
  const { productId } = useParams();
  const p = s.products.find((p) => p.id === productId && p.visible);
  const [quantity, set] = useState(1);
  if (!p || s.farmers.find((f) => f.id === p.farmerId)?.state !== "Approved")
    return <NotFound />;
  const f = s.farmers.find((f) => f.id === p.farmerId)!;
  const slots = s.slots.filter(
    (x) => x.farmerId === f.id && new Date(x.start) > new Date(s.now),
  );
  const stock = p.stock - p.reserved;
  return (
    <div className="container section">
      <Link className="back-link" to="/products">
        ← Back to the harvest
      </Link>
      <div className="product-detail">
        <div>
          <img className="detail-photo" src={p.image} alt={p.name} />
          <p className="small muted">
            Editorial imagery. Product and availability are development
            fixtures.
          </p>
        </div>
        <div className="purchase-panel">
          <Link className="eyebrow" to={`/farmers/${f.id}`}>
            {f.name}
          </Link>
          <h1>{p.name}</h1>
          <p className="product-price">
            {money(p.price)} <span>/ {p.unit}</span>
          </p>
          <p>{p.description}</p>
          <hr />
          <p>
            <MapPin size={17} />{" "}
            {s.markets.find((m) => m.id === f.marketId)?.name}
          </p>
          <p>
            <CalendarDays size={17} /> {date(demoDate)} · Asia/Karachi
          </p>
          <Field label="Pickup windows available">
            <select aria-label="Preview pickup windows">
              {slots.map((x) => (
                <option key={x.id}>
                  {time(x.start)}–{time(x.end)}
                </option>
              ))}
            </select>
          </Field>
          <p className="small muted">
            Select your final window at checkout. Sample cutoff: Friday, 2
            October, 20:00.
          </p>
          <div className="spread">
            <Quantity
              quantity={quantity}
              onChange={set}
              max={Math.max(1, stock)}
            />
            <span>
              {!p.available
                ? "Temporarily unavailable"
                : `${stock} selling units available`}
            </span>
          </div>
          <div className="actions">
            <button
              className="button grow"
              disabled={!p.available || stock < 1}
              onClick={() =>
                act(
                  {
                    type: "basket",
                    id: p.id,
                    quantity: (s.basket[p.id] ?? 0) + quantity,
                  },
                  "Added to your sample basket.",
                )
              }
            >
              <ShoppingBasket size={19} />
              Add to basket
            </button>
            <Favourite id={p.id} />
          </div>
          <p className="small">Pay in person at pickup. No online payment.</p>
          {(!p.available || stock < 1) && (
            <button
              className="button secondary"
              aria-pressed={s.restock.includes(p.id)}
              onClick={() =>
                act(
                  { type: "restock", id: p.id },
                  "Sample restock preference updated. No email subscription was sent.",
                )
              }
            >
              {s.restock.includes(p.id)
                ? "Stop sample restock alerts"
                : "Notify me in the sample inbox"}
            </button>
          )}
          <Link className="text-link" to="/basket">
            View your basket <ArrowRight size={17} />
          </Link>
        </div>
      </div>
      <section className="section">
        <h2>A little more from this stall.</h2>
        <div className="product-grid">
          {s.products
            .filter((x) => x.farmerId === f.id && x.id !== p.id && x.visible)
            .map((x) => (
              <ProductTile product={x} key={x.id} />
            ))}
        </div>
      </section>
    </div>
  );
}

export function Auth() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const act = useAction();
  const [show, setShow] = useState(false);
  const [success, setSuccess] = useState(false);
  const register = pathname.startsWith("/register");
  const choose = pathname === "/register";
  const role: Role = pathname.includes("farmer")
    ? "farmer"
    : pathname.includes("admin")
      ? "admin"
      : "customer";
  const [loginRole, setRole] = useState<Role>(role);
  const [error, setError] = useState("");
  const enter = (r: Role) => {
    if (
      act({ type: "role", role: r }, `Entered the ${r} development workspace.`)
    ) {
      const next = params.get("next");
      navigate(
        next && next.startsWith(`/${r}`) && !next.startsWith("//")
          ? next
          : `/${r}`,
      );
    }
  };
  return (
    <div className="auth">
      <div className="auth-photo">
        <img src={images.market} alt="Produce laid out at a market" />
        <div>
          <p>The Living Market</p>
          <h2>
            Good mornings
            <br />
            start here.
          </h2>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">
          {role === "admin" ? "Administration" : "A place at the market"}
        </p>
        <h1>
          {choose
            ? "How will you join us?"
            : register
              ? role === "farmer"
                ? "Bring your stall."
                : "Make market day yours."
              : "Welcome back."}
        </h1>
        {choose ? (
          <div className="stack">
            <Link className="choice" to="/register/customer">
              <h3>I’m here for the harvest</h3>
              <p>Discover growers and plan your pickups.</p>
              <ArrowUpRight />
            </Link>
            <Link className="choice" to="/register/farmer">
              <h3>I’m bringing my stall</h3>
              <p>Plan your stock and prepare for market day.</p>
              <ArrowUpRight />
            </Link>
          </div>
        ) : success ? (
          <Notice>
            {role === "farmer"
              ? "Your sample registration preview is complete. A real stall needs administrator approval before publishing."
              : "Your sample registration form is valid. No personal details or password have been stored."}
            <p>
              <button className="button" onClick={() => enter(role)}>
                Explore the existing {role} demo
              </button>
            </p>
          </Notice>
        ) : (
          <>
            <Notice>
              Development preview. Use fictional details only. No authentication
              server or email service is connected.
            </Notice>
            <Form
              onSubmit={(d) => {
                setError("");
                if (register && value(d, "password") !== value(d, "confirm")) {
                  setError("The passwords must match.");
                  return;
                }
                if (register) setSuccess(true);
                else enter(loginRole);
              }}
            >
              {register && (
                <>
                  <Field
                    label={
                      role === "farmer" ? "Stall or business name" : "Full name"
                    }
                  >
                    <input name="name" required autoComplete="off" />
                  </Field>
                  {role === "farmer" && (
                    <Field label="Contact person">
                      <input name="person" required autoComplete="off" />
                    </Field>
                  )}
                  <Field label="Contact number">
                    <input
                      name="phone"
                      type="tel"
                      required
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Address">
                    <textarea name="address" required rows={2} />
                  </Field>
                </>
              )}
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="sample@example.test"
                />
              </Field>
              <Field
                label="Password"
                hint="Demo form rule: at least 8 characters. Never use a real password here."
              >
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>
              {register && (
                <Field label="Confirm password">
                  <input
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="off"
                  />
                </Field>
              )}
              {!register && role !== "admin" && (
                <Field label="Development account">
                  <select
                    value={loginRole}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <option value="customer">Customer demo</option>
                    <option value="farmer">Farmer demo</option>
                  </select>
                </Field>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button" type="submit">
                {register
                  ? "Preview registration"
                  : "Enter development account"}
                <ArrowRight size={18} />
              </button>
            </Form>
            <div className="auth-links">
              {register ? (
                <Link to="/login">Already have an account? Sign in</Link>
              ) : (
                <>
                  <Link to="/register">New to the market? Join us</Link>
                  <button
                    className="text-button"
                    onClick={() => enter(loginRole)}
                  >
                    Try {loginRole} demo without a form
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Info() {
  const { pathname } = useLocation();
  const [q, set] = useState("");
  const faqs = [
    [
      "How do I pay?",
      "Pay your farmer in person when you collect your order. There is no online payment or delivery.",
    ],
    [
      "Can I change a reservation?",
      "The planned experience supports eligible changes before the farmer’s cutoff. The demo allows placed and accepted orders to change before its sample cutoff; final rules need API approval.",
    ],
    [
      "Why is my basket grouped by farmer?",
      "Each farmer prepares a separate pickup commitment. Review every location and window before confirming.",
    ],
    [
      "What does Copilot know?",
      "This preview uses clearly labelled scripted answers from fictional records. The real service will retrieve only information you are permitted to access.",
    ],
    [
      "What if the map does not load?",
      "Use the market list and plain addresses. Accurate directions require approved real market coordinates.",
    ],
    [
      "How do reviews work?",
      "Review a farmer or purchased product after a completed order. In this preview review eligibility is simulated locally.",
    ],
  ];
  if (pathname === "/help")
    return (
      <div className="container narrow section">
        <Heading
          title="A little market know-how."
          intro="The practical details, before you head out."
        />
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search help"
            value={q}
            onChange={(e) => set(e.target.value)}
            placeholder="Find an answer"
          />
        </label>
        <div className="section">
          {faqs
            .filter(([h, p]) =>
              `${h} ${p}`.toLowerCase().includes(q.toLowerCase()),
            )
            .map(([h, p]) => (
              <details key={h}>
                <summary>{h}</summary>
                <p>{p}</p>
              </details>
            ))}
        </div>
        <Link className="text-link" to="/contact">
          Still need a hand? Contact the team <ArrowUpRight size={17} />
        </Link>
      </div>
    );
  if (pathname === "/contact")
    return (
      <div className="container section">
        <Heading
          title="Let’s keep in touch."
          intro="Questions about MarketLink? Start here."
        />
        <div className="two-col">
          <div>
            <h2>The MarketLink team</h2>
            <Notice>
              Verified team email, phone, address and Google Maps location are
              awaiting owner-provided content. No fictional contact details are
              presented as real.
            </Notice>
            <p>
              For reservation questions, review your order and the pickup
              details first.
            </p>
            <Link className="button secondary" to="/customer/orders">
              Open my orders
            </Link>
          </div>
          <div className="contact-map">
            <MapPin size={40} />
            <h2>A real place, soon.</h2>
            <p>
              The required Google Maps embed will be configured when the team
              supplies its public location.
            </p>
          </div>
        </div>
      </div>
    );
  return (
    <div className="container section">
      <div className="story">
        <div>
          <p className="eyebrow">Our purpose</p>
          <h1>
            A closer connection
            <br />
            to market day.
          </h1>
          <p className="lead">
            A great market is about more than what is on the table. It is
            knowing who will be there, what they are bringing, and when you can
            meet them.
          </p>
          <p>
            MarketLink brings discovery, pre-orders and pickup planning into one
            shared place for customers, growers and market operators.
          </p>
          <Link className="button" to="/markets">
            Find your next market <ArrowUpRight size={18} />
          </Link>
        </div>
        <img src={images.basket} alt="A basket filled with a garden harvest" />
      </div>
      <section className="section">
        <h2>Made for the whole market.</h2>
        <div className="steps">
          {[
            [
              "For customers",
              "A clearer plan, from the first search to the last pickup.",
            ],
            [
              "For growers",
              "A place to share weekly stock, prepare orders and plan ahead.",
            ],
            [
              "For market operators",
              "Thoughtful tools to manage the people and places that bring it together.",
            ],
          ].map(([h, p]) => (
            <div key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <Notice>
        TechWiz 7 · eGreen Basket. Team biography and final submission content
        will be supplied and reviewed by the owner.
      </Notice>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="container section">
      <Heading
        title="This path has wandered off."
        intro="The page or sample record could not be found."
      />
      <Link className="button" to="/markets">
        Back to the market <ArrowRight size={18} />
      </Link>
    </div>
  );
}
