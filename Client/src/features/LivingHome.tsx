import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  CalendarDays,
  Sprout,
  ShoppingBasket,
} from "lucide-react";
import gsap from "gsap";
import { useMarket, Notice } from "../components/ui";
import { images, date, demoDate } from "../data/market";
import { marketDayView } from "../data/living-selectors";
import { HarvestItem } from "./LivingCustomer";

export function LivingHome() {
  const s = useMarket();
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [day, setDay] = useState(demoDate);
  const [area, setArea] = useState("");
  const view = marketDayView(s, day);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".living-hero h1 span", {
          yPercent: 110,
          stagger: 0.12,
          duration: 0.95,
          ease: "power3.out",
        });
        gsap.from(".living-hero-photo", {
          scale: 1.07,
          duration: 1.5,
          ease: "power2.out",
        });
        gsap.from(".living-finder", {
          y: 18,
          opacity: 0,
          duration: 0.65,
          delay: 0.4,
        });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);
  return (
    <div className="living-home" ref={root}>
      <section className="living-hero">
        <div className="living-hero-copy">
          <p>
            <Sprout size={19} /> MarketLink / The Living Market
          </p>
          <h1 tabIndex={-1}>
            <span>Know your market</span>
            <span>before you go.</span>
          </h1>
          <div className="living-hero-bottom">
            <p>
              The people. The produce. The pleasure of a Saturday well spent.
              Your next market morning starts here.
            </p>
            <Link
              to="/farmers"
              className="living-round-link"
              aria-label="Meet our growers"
            >
              <ArrowUpRight size={30} />
            </Link>
          </div>
        </div>
        <div className="living-hero-image">
          <img
            className="living-hero-photo"
            src={images.basket}
            alt="Fresh garden produce gathered in a woven market basket"
            fetchPriority="high"
          />
          <span className="living-photo-caption">
            A basket full of possibilities.
            <small>Editorial photograph · sample market experience</small>
          </span>
        </div>
        <div className="living-hero-margin">
          <span>Grown by people. Collected by you.</span>
          <span>eGreen Basket</span>
        </div>
      </section>
      <form
        className="living-finder"
        onSubmit={(e) => {
          e.preventDefault();
          const p = new URLSearchParams({ day });
          if (area) p.set("q", area);
          navigate(`/markets?${p}`);
        }}
      >
        <label>
          <MapPin size={21} />
          <span>
            Where shall we meet?
            <input
              aria-label="Find a neighbourhood"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="A market or neighbourhood"
            />
          </span>
        </label>
        <label>
          <CalendarDays size={21} />
          <span>
            Your market day
            <select
              aria-label="Find a market day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {[...new Set(s.markets.filter((m) => m.active).map((m) => m.day))]
                .sort()
                .map((d) => (
                  <option value={d} key={d}>
                    {date(d)}
                  </option>
                ))}
            </select>
          </span>
        </label>
        <button className="button">
          Find my market <ArrowUpRight size={18} />
        </button>
      </form>
      <div className="living-assurances">
        <span>
          <Sprout size={17} /> Meet your grower
        </span>
        <span>
          <ShoppingBasket size={17} /> Reserve the harvest
        </span>
        <span>
          <MapPin size={17} /> Collect & pay at the stall
        </span>
      </div>
      {s.announcements
        .filter((a) => a.published)
        .slice(-1)
        .map((a) => (
          <div className="living-announcement" key={a.id}>
            <Notice>
              <strong>{a.title}</strong> · {a.body}
            </Notice>
          </div>
        ))}
      <section className="living-market-section">
        <div className="living-section-intro">
          <div>
            <p>Out of the ordinary. Close to home.</p>
            <h2>
              A place to fill your basket.
              <br />
              And your morning.
            </h2>
          </div>
          <Link to="/markets">
            Explore the Living Market Map <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="living-market-editorial">
          <div className="living-market-image">
            <img
              src={images.market}
              alt="A colourful display of produce at a market stall"
              loading="lazy"
            />
            <div>
              <span>Market mornings</span>
              <h3>
                A slower start.
                <br />A fresher week.
              </h3>
            </div>
          </div>
          <div className="living-market-index">
            {view.markets.map((m, i) => (
              <Link key={m.id} to={`/markets/${m.id}`}>
                <span className="index-number">0{i + 1}</span>
                <div>
                  <small>{m.area}</small>
                  <h3>{m.name}</h3>
                  <p>
                    {date(m.day)} / {m.hours}
                  </p>
                </div>
                <ArrowUpRight size={23} />
              </Link>
            ))}
            <div className="living-market-note">
              <CalendarDays size={22} />
              <p>
                Market plans can change. Check the day, stall and pickup window
                before reserving.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="living-harvest-section">
        <div className="living-section-intro">
          <div>
            <p>Picked for your selected market day</p>
            <h2>What’s fresh?</h2>
          </div>
          <Link to={`/products?day=${day}`}>
            Browse the harvest <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="living-harvest-grid">
          {view.products.slice(0, 4).map((p) => (
            <HarvestItem key={p.id} product={p} />
          ))}
        </div>
        {!view.products.length && (
          <p className="studio-empty">
            No sample offers available on this day. Choose another day above.
          </p>
        )}
      </section>
      <section className="living-people">
        <img
          src="/images/grower.jpg"
          alt="A grower holding beetroot freshly pulled from the field; editorial photograph"
          loading="lazy"
        />
        <div>
          <Sprout size={32} />
          <p>From a pair of hands, to yours.</p>
          <h2>
            There’s a person
            <br />
            behind every harvest.
          </h2>
          <p>
            MarketLink brings the grower back into the story. Discover the
            people behind the stalls, what they’re bringing, and where you can
            meet them.
          </p>
          <Link className="button" to="/farmers">
            Meet the growers <ArrowUpRight size={18} />
          </Link>
          <small>
            Editorial photography by Heather Gill / Unsplash. Not a verified
            MarketLink grower.
          </small>
        </div>
      </section>
      <section className="living-how">
        <h2>
          A good market day.
          <br />
          With a little less guesswork.
        </h2>
        <div>
          {[
            [
              "Discover",
              "Find a market, meet its growers and see what’s available.",
              "/markets",
            ],
            [
              "Reserve",
              "Build a basket by farmer and choose your pickup window.",
              "/products",
            ],
            [
              "Collect",
              "Bring your Pickup Passport. Meet your grower. Pay in person.",
              "/help",
            ],
          ].map(([title, copy, href], i) => (
            <Link key={title} to={href}>
              <span>{i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <ArrowRight size={20} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
