import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  ShoppingBasket,
  Menu,
  X,
  ArrowUpRight,
  Sprout,
  Bell,
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Heart,
  UserRound,
  MapPin,
  LogOut,
  Globe,
} from "lucide-react";
import { useMarket, useAction, Notice } from "../components/ui";
import { useVisitor } from "../data/visitor-context";
import { countryName } from "../data/visitor";
import { gateway } from "../data/gateway";
import { fetchMeApi, logoutApi } from "../data/api";
import type { Role } from "../data/market";
import { Copilot } from "../features/Copilot";
import { CompanionContext } from "./companion-context";
import { motion, useReducedMotion } from "motion/react";

export const nav: Record<Role, [string, string][]> = {
  customer: [
    ["/customer", "Market day"],
    ["/customer/market-day", "My planner"],
    ["/customer/orders", "Orders"],
    ["/customer/favourites", "Favourites"],
    ["/customer/notifications", "Notifications"],
    ["/customer/profile", "Profile"],
  ],
  farmer: [
    ["/farmer", "Weekly planner"],
    ["/farmer/orders", "Orders"],
    ["/farmer/pickups", "Pickup queue"],
    ["/farmer/products", "Products"],
    ["/farmer/stock", "Dated stock"],
    ["/farmer/stock-templates", "Weekly templates"],
    ["/farmer/pickup-windows", "Pickup windows"],
    ["/farmer/markets", "Markets"],
    ["/farmer/profile", "Stall profile"],
    ["/farmer/insights", "Insights"],
    ["/farmer/reviews", "Reviews"],
    ["/farmer/notifications", "Notifications"],
  ],
  admin: [
    ["/admin", "Command centre"],
    ["/admin/farmers", "Farmers"],
    ["/admin/customers", "Customers"],
    ["/admin/markets", "Markets"],
    ["/admin/moderation", "Moderation"],
    ["/admin/reports", "Reports"],
    ["/admin/categories", "Categories"],
    ["/admin/announcements", "Announcements"],
    ["/admin/notifications", "Notifications"],
  ],
};
export function Layout() {
  const s = useMarket();
  const act = useAction();
  const { visitor, openModal, t } = useVisitor();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [controls, setControls] = useState(false);
  const role: Role | null =
    pathname.startsWith("/farmer/") || pathname === "/farmer"
      ? "farmer"
      : pathname.startsWith("/admin") && pathname !== "/admin/login"
        ? "admin"
        : pathname.startsWith("/customer")
          ? "customer"
          : null;
  const workspace = role === "farmer" || role === "admin";

  useEffect(() => {
    let isMounted = true;
    fetchMeApi()
      .then((user) => {
        if (isMounted && user?.role) {
          gateway.dispatch({ type: "role", role: user.role });
          gateway.syncFromBackend(user.role);
        }
      })
      .catch(() => {
        // Session not active, stay unauthenticated
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await logoutApi();
    } catch {}
    act({ type: "role", role: null }, "Signed out successfully.");
  };

  useEffect(() => {
    setMenu(false);
    setAssistant(false);
    window.scrollTo(0, 0);
    const h = document.querySelector("h1");
    if (h) {
      document.title = `${h.textContent} · MarketLink`;
      (h as HTMLElement).focus({ preventScroll: true });
    }
  }, [pathname]);
  return (
    <CompanionContext.Provider value={() => setAssistant(true)}>
      {(pathname === "/" || pathname === "/customer") && (
        <motion.div
          key={pathname}
          className="route-arrival-feedback"
          aria-hidden="true"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: reduceMotion ? 0 : 0.45, ease: "easeOut" },
            opacity: {
              delay: reduceMotion ? 0 : 0.45,
              duration: reduceMotion ? 0 : 0.15,
            },
          }}
        />
      )}
      <a className="skip-link" href="#main">
        {t('skipContent')}
      </a>
      <div className="demo-banner">
        <span>{t('demoBanner')}</span>
        <button onClick={() => setControls(!controls)} aria-expanded={controls}>
          {t('demoControls')}
        </button>
      </div>
      {controls && (
        <div className="demo-controls">
          <span>Sample clock: {s.now.slice(0, 10)} · Asia/Karachi</span>
          {(["customer", "farmer", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() =>
                act({ type: "role", role: r }, `Demo ${r} account selected.`)
              }
            >
              {r}
            </button>
          ))}
          <button
            onClick={() =>
              act({ type: "clock", late: !s.now.startsWith("2026-10-03") })
            }
          >
            Toggle cutoff scenario
          </button>
          <button
            onClick={() => {
              gateway.reset();
              setControls(false);
            }}
          >
            Reset all fixtures
          </button>
        </div>
      )}
      <header
        className={`header ${role === "customer" ? "customer-header" : ""}`}
      >
        <Link to="/" className="brand">
          <Sprout size={27} />
          MarketLink<span className="brand-dot">●</span>
        </Link>
        <nav className="public-nav" aria-label="Primary">
          <NavLink to="/markets">{t('navMarkets')}</NavLink>
          <NavLink to="/products">{t('navProduce')}</NavLink>
          <NavLink to="/farmers">{t('navGrowers')}</NavLink>
          <Link to="/help">{t('navHelp')}</Link>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="header-location-pill"
            onClick={openModal}
            title={t('change')}
            aria-label={t('location')}
          >
            <Globe size={14} />
            <span>
              {visitor.locale === 'ur' ? 'اردو' : 'EN'}
              {visitor.country
                ? ` · ${countryName(visitor.country, visitor.locale)}${visitor.city ? ` (${visitor.city})` : ''}`
                : ` · ${t('anywhere')}`}
            </span>
          </button>
          <Link className="account-link" to={s.role ? `/${s.role}` : "/login"}>
            {s.role ? t('workspace') : t('signIn')}
          </Link>
          <Link
            to="/basket"
            className="basket-link"
            aria-label={`Basket, ${Object.values(s.basket).reduce((a, b) => a + b, 0)} items`}
          >
            <ShoppingBasket size={21} />
            <span>{Object.values(s.basket).reduce((a, b) => a + b, 0)}</span>
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {menu && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button
            type="button"
            className="header-location-pill"
            style={{ margin: "8px 16px", alignSelf: "flex-start" }}
            onClick={() => {
              setMenu(false);
              openModal();
            }}
          >
            <Globe size={14} />
            <span>
              {visitor.locale === "ur" ? "اردو" : "EN"} ·{" "}
              {visitor.country
                ? countryName(visitor.country, visitor.locale)
                : t("anywhere")}
            </span>
          </button>
          <Link to="/markets">{t('navMarkets')}</Link>
          <Link to="/products">{t('navProduce')}</Link>
          <Link to="/farmers">{t('navGrowers')}</Link>
          <Link to="/help">{t('navHelp')}</Link>
          <Link to={s.role ? `/${s.role}` : "/login"}>
            {s.role ? t('workspace') : t('signIn')}
          </Link>
          {role &&
            nav[role].map(([path, label]) => (
              <Link key={path} to={path}>
                {label}
              </Link>
            ))}
        </nav>
      )}
      <div
        className={
          workspace ? "workspace" : role === "customer" ? "customer-shell" : ""
        }
      >
        {role === "customer" && (
          <aside className="customer-rail">
            <p className="rail-caption">Your market space</p>
            <nav aria-label="Customer workspace">
              {nav.customer.map(([path, label], i) => {
                const Icon = [
                  LayoutDashboard,
                  CalendarDays,
                  ClipboardList,
                  Heart,
                  Bell,
                  UserRound,
                ][i];
                return (
                  <NavLink end to={path} key={path}>
                    {pathname === path && (
                      <motion.span
                        aria-hidden="true"
                        className="rail-active-surface"
                        layoutId="customer-navigation-selection"
                        transition={{
                          duration: reduceMotion ? 0 : 0.24,
                          ease: "easeOut",
                        }}
                      />
                    )}
                    <Icon size={18} />
                    {label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="rail-explore">
              <p className="rail-caption">Out in the market</p>
              <Link to="/markets">
                <MapPin size={18} /> Discover markets
              </Link>
              <Link to="/products">
                <ShoppingBasket size={18} /> Browse produce
              </Link>
              <Link to="/farmers">
                <Sprout size={18} /> Meet the growers
              </Link>
            </div>
            <div className="rail-reminder">
              <Sprout size={28} />
              <h3>
                Good things
                <br />
                grow together.
              </h3>
              <p>
                A bag, a little time,
                <br />a favourite market.
              </p>
              <Link to="/help">
                Your market guide <ArrowUpRight size={14} />
              </Link>
            </div>
            <button
              className="rail-signout"
              onClick={handleSignOut}
            >
              <LogOut size={16} /> Sign out
            </button>
          </aside>
        )}
        {workspace && (
          <aside className="sidebar">
            <p className="sidebar-label">
              {role === "farmer" ? "Your stall" : "Administration"}
            </p>
            <nav aria-label={`${role} workspace`}>
              {nav[role].map(([path, label]) => (
                <NavLink key={path} end to={path}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="sidebar-note">
              <Sprout />
              <p>
                {role === "farmer"
                  ? "A good market day starts with a little planning."
                  : "Thoughtful markets. Clear decisions."}
              </p>
              <button
                className="text-button"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </aside>
        )}
        <main
          id="main"
          className={
            workspace
              ? "workspace-main"
              : role === "customer"
                ? "customer-main"
                : "public-main"
          }
        >
          {role && (
            <div className="workspace-top">
              <span>
                {role === "customer"
                  ? "Your market, your rhythm"
                  : role === "farmer"
                    ? "Good Earth Growers · sample stall"
                    : "MarketLink operations"}
              </span>
              <div className="actions">
                <Link
                  className="icon-button"
                  aria-label="Notifications"
                  to={`/${role}/notifications`}
                >
                  <Bell size={19} />
                </Link>
                <button
                  className="button secondary compact"
                  onClick={() => setAssistant(true)}
                >
                  <Sparkles size={16} />
                  Copilot
                </button>
              </div>
            </div>
          )}
          {role === "customer" && (
            <nav
              className="customer-nav"
              aria-label="Compact customer workspace"
            >
              {nav.customer.map(([path, label]) => (
                <NavLink end to={path} key={path}>
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
      {!workspace && role !== "customer" && (
        <footer className="footer">
          <div>
            <Link className="brand" to="/">
              <Sprout />
              MarketLink
            </Link>
            <h2>{t('footerTitle')}</h2>
            <p>{t('footerBody')}</p>
          </div>
          <div>
            <h3>{t('explore')}</h3>
            <Link to="/markets">{t('discover')}</Link>
            <Link to="/products">{t('navProduce')}</Link>
            <Link to="/farmers">{t('navGrowers')}</Link>
          </div>
          <div>
            <h3>{t('come')}</h3>
            <Link to="/register/farmer">{t('bring')}</Link>
            <Link to="/about">{t('purpose')}</Link>
            <Link to="/contact">{t('contact')}</Link>
            <Link to="/help">
              {t('help')} <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="footer-bottom">
            The Living Market · eGreen Basket{" "}
            <span>{t('demoBanner')}</span>
          </p>
        </footer>
      )}
      {assistant && <Copilot onClose={() => setAssistant(false)} />}
    </CompanionContext.Provider>
  );
}
export function Guard({ role }: { role: Role }) {
  const s = useMarket();
  const loc = useLocation();
  if (!s.role)
    return (
      <Navigate
        to={
          role === "admin"
            ? "/admin/login"
            : `/login?next=${encodeURIComponent(loc.pathname)}`
        }
        replace
      />
    );
  if (s.role !== role)
    return (
      <div className="container">
        <h1>That workspace belongs to another role.</h1>
        <Notice>
          Demo guards illustrate navigation only. Real authorisation requires
          the approved backend.
        </Notice>
        <Link className="button" to={`/${s.role}`}>
          Open my workspace
        </Link>
      </div>
    );
  if (role === "customer" && !s.customerActive)
    return (
      <div className="container">
        <h1>This sample account is inactive.</h1>
        <Link to="/help">Get help</Link>
      </div>
    );
  return <Outlet />;
}
