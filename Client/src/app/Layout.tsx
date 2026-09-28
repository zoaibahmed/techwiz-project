import './workspace-shell.css';
import {PublicGuide} from '../components/PublicGuide';
import { BrandMark } from "../components/BrandMark";
import { ScrollChoreography } from "../components/ScrollChoreography";
import { MarketPreloader } from "../components/MarketPreloader";
import { SmoothScroll } from "../motion/SmoothScroll";
import { CoverageBoundary } from "../components/CoverageBoundary";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
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
  MessageSquare,
  Store,
  Package,
  Sliders,
  ShieldAlert,
  Users,
  Layers,
  LifeBuoy,
  Megaphone,
  UserCheck,
  TrendingUp,
  Settings,
  HelpCircle,
  Apple,
  LogIn,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { useMarket } from "../components/ui";
import { useVisitor } from "../data/visitor-context";
import { countryName } from "../data/visitor";
import { gateway } from "../data/gateway";
import { fetchUnreadChatCountApi } from "../data/api";
import { date } from "../data/market";
import type { Role } from "../data/market";
import { Copilot } from "../features/Copilot";
import { CompanionContext } from "./companion-context";
import { motion, useReducedMotion } from "motion/react";

export const nav: Record<Role, [string, string][]> = {
  customer: [
    ["/customer", "Market day"],
    ["/customer/market-day", "My planner"],
    ["/customer/orders", "Orders"],
    ["/customer/messages", "Messages"],
    ["/customer/support", "Support"],
    ["/customer/favourites", "Favourites"],
    ["/customer/notifications", "Notifications"],
    ["/customer/profile", "Profile"],
  ],
  farmer: [
    ["/farmer", "Weekly planner"],
    ["/farmer/messages", "Messages"],
    ["/farmer/support", "Support"],
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
    ["/admin/support", "Support inbox"],
    ["/admin/customers", "Customers"],
    ["/admin/markets", "Markets"],
    ["/admin/moderation", "Moderation"],
    ["/admin/reports", "Reports"],
    ["/admin/categories", "Categories"],
    ["/admin/announcements", "Announcements"],
    ["/admin/notifications", "Notifications"],
  ],
};

function getNavIcon(path: string) {
  if (path === "/farmer" || path === "/customer" || path === "/admin") return LayoutDashboard;
  if (path.endsWith("/pickups") || path.endsWith("/orders")) return ClipboardList;
  if (path.endsWith("/stock") || path.endsWith("/stock-templates")) return Sliders;
  if (path.endsWith("/pickup-windows") || path.endsWith("/market-day")) return CalendarDays;
  if (path.endsWith("/markets")) return MapPin;
  if (path.endsWith("/messages")) return MessageSquare;
  if (path.endsWith("/support")) return LifeBuoy;
  if (path.endsWith("/notifications") || path.endsWith("/announcements")) return Megaphone;
  if (path.endsWith("/reports") || path.endsWith("/insights") || path.endsWith("/analytics")) return TrendingUp;
  if (path.endsWith("/farmers")) return Users;
  if (path.endsWith("/customers")) return UserCheck;
  if (path.endsWith("/moderation")) return ShieldAlert;
  if (path.endsWith("/categories")) return Layers;
  if (path.endsWith("/favourites")) return Heart;
  if (path.endsWith("/products")) return Package;
  if (path.endsWith("/profile") || path.endsWith("/settings")) return Settings;
  if (path.endsWith("/reviews")) return Heart;
  return LayoutDashboard;
}

export function Layout() {
  const s = useMarket();
  const navigate = useNavigate();
  const { visitor, openModal, t } = useVisitor();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const drawerRef = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const role: Role | null =
    pathname.startsWith("/farmer/") || pathname === "/farmer"
      ? "farmer"
      : pathname.startsWith("/admin") && pathname !== "/admin/login"
        ? "admin"
        : pathname.startsWith("/customer")
          ? "customer"
          : null;
  const workspace = role === "farmer" || role === "admin";
  const restrictedFarmer = role === "farmer" && s.farmers.find(f=>f.id===s.farmerId)?.state !== "Approved";
  const roleNav = role ? (restrictedFarmer ? nav.farmer.filter(([path])=>["/farmer","/farmer/support"].includes(path)) : nav[role]) : [];

  const publishedAnnouncements = s.announcements.filter((a) => a.published);
  const hasUrgent = publishedAnnouncements.some((a) => a.priority === "urgent");

  // Keyboard shortcut (Escape) to close announcements modal and lock background scroll
  useEffect(() => {
    if (!announcementsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAnnouncementsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [announcementsOpen]);

  // Unread message badge for the signed-in workspace.
  useEffect(() => {
    if (!role) return;
    let isMounted = true;
    const fetchCount = () => {
      fetchUnreadChatCountApi()
        .then((res) => {
          if (isMounted) setUnreadChatCount(res?.unreadConversations || 0);
        })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, pathname]);

  useEffect(() => {
    if (!menu) return;
    const previous=document.activeElement as HTMLElement|null, overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const elements=()=>Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]).filter(e=>e.getClientRects().length);
    elements()[0]?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu(false);if(e.key==='Tab'){const a=elements();if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0]?.focus()}}};
    document.addEventListener('keydown',key);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()};
  },[menu]);
  const handleSignOut = async () => {
    await gateway.signOut();
    navigate("/");
  };

  useEffect(() => {
    setMenu(false);
    setAssistant(false);
    window.scrollTo(0, 0);
    const h = document.querySelector("h1");
    if (h) {
      document.title = `${h.textContent} · Gather & Grow`;
      (h as HTMLElement).focus({ preventScroll: true });
    }
  }, [pathname]);
  return (
    <CompanionContext.Provider value={() => setAssistant(true)}>
      <MarketPreloader />
      <SmoothScroll enabled={!role} />
      <a className="skip-link" href="#main">
        {t('skipContent')}
      </a>
      <header
        className={`header ${role === "customer" ? "customer-header" : ""} ${workspace ? "workspace-header" : ""}`}
      >
        <Link to="/" className="brand">
          <BrandMark size={32} />
          Gather & Grow<span className="brand-dot">●</span>
        </Link>
        <nav className="public-nav" aria-label="Primary">
          <NavLink to="/markets">{t('navMarkets')}</NavLink>
          <NavLink to="/products">{t('navProduce')}</NavLink>
          <NavLink to="/farmers">{t('navGrowers')}</NavLink>
          <NavLink to="/help">{t('navHelp')}</NavLink>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className={`announcement-nav-btn ${publishedAnnouncements.length > 0 ? "has-active" : ""} ${hasUrgent ? "has-urgent" : ""}`}
            onClick={() => setAnnouncementsOpen(true)}
            aria-label={`Market announcements (${publishedAnnouncements.length} available)`}
            title={publishedAnnouncements.length > 0 ? `${publishedAnnouncements.length} active market notice${publishedAnnouncements.length > 1 ? "s" : ""}` : "Market notices"}
          >
            <Megaphone size={17} className="announcement-nav-icon" />
            {publishedAnnouncements.length > 0 && (
              <span className="announcement-nav-beacon" aria-hidden="true" />
            )}
          </button>
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
      {/* Mobile Left Sidebar Drawer */}
      {/* Mobile Left Sidebar Drawer */}
      <div
        className={`mobile-drawer-backdrop ${menu ? "open" : ""}`}
        onClick={() => setMenu(false)}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal={menu || undefined}
        inert={!menu}
        className={`mobile-drawer-sidebar ${role ? `dashboard-drawer role-${role}` : "public-drawer"} ${menu ? "open" : ""}`}
        aria-label="Mobile navigation"
      >
        <div className="mobile-drawer-header">
          {role ? (
            <div className="drawer-profile-card">
              <div className="drawer-avatar">
                {role === "farmer" ? <Store size={20} /> : role === "admin" ? <ShieldCheck size={20} /> : <UserRound size={20} />}
              </div>
              <div className="drawer-user-meta">
                <strong>
                  {role === "farmer"
                    ? s.farmers.find((f) => f.id === s.farmerId)?.name || "Grower Stall"
                    : role === "admin"
                      ? "Operations Admin"
                      : s.session?.name || "Shopper Space"}
                </strong>
                <span className="drawer-role-chip">
                  {role === "farmer"
                    ? ((s.farmers.find((f) => f.id === s.farmerId)?.stall ? `Stall ${s.farmers.find((f) => f.id === s.farmerId)?.stall} · ` : "") + "Grower")
                    : role === "admin"
                      ? "System Administrator"
                      : "Verified Shopper"}
                </span>
              </div>
            </div>
          ) : (
            <div className="mobile-drawer-brand">
              <Link to="/" onClick={() => setMenu(false)}>
                <strong>Gather & Grow</strong>
                <small>Farm to table · Local markets</small>
              </Link>
            </div>
          )}
          <button
            type="button"
            className="icon-button mobile-drawer-close"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mobile-drawer-body">
          {role ? (
            <>
              {/* Primary: Workspace Navigation */}
              <div className="drawer-nav-group">
                <p className="drawer-group-title">
                  {role === "farmer" ? "Grower Workbench" : role === "admin" ? "Administration Hub" : "Your Market Space"}
                </p>
                <nav className="mobile-drawer-nav">
                  {roleNav.map(([path, label]) => {
                    const Icon = getNavIcon(path);
                    const isMessages = path.endsWith("/messages");
                    const count = isMessages ? unreadChatCount : 0;
                    return (
                      <NavLink
                        key={path}
                        end={path === `/${role}`}
                        to={path}
                        onClick={() => setMenu(false)}
                        className={({ isActive }) => `drawer-nav-link ${isActive ? "active" : ""}`}
                      >
                        <Icon size={18} />
                        <span className="drawer-nav-label">{label}</span>
                        {count > 0 && <span className="drawer-counter-badge">{count}</span>}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="mobile-drawer-divider" />

              {/* Secondary: Explore Marketplace */}
              <div className="drawer-nav-group">
                <p className="drawer-group-title">Explore Marketplace</p>
                <nav className="mobile-drawer-nav secondary-nav">
                  <NavLink to="/markets" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Store size={17} />
                    <span className="drawer-nav-label">{t("navMarkets")}</span>
                  </NavLink>
                  <NavLink to="/products" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Apple size={17} />
                    <span className="drawer-nav-label">{t("navProduce")}</span>
                  </NavLink>
                  <NavLink to="/farmers" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Users size={17} />
                    <span className="drawer-nav-label">{t("navGrowers")}</span>
                  </NavLink>
                  <NavLink to="/help" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <HelpCircle size={17} />
                    <span className="drawer-nav-label">{t("navHelp")}</span>
                  </NavLink>
                </nav>
              </div>
            </>
          ) : (
            <>
              {/* Public Navigation */}
              <div className="drawer-nav-group">
                <p className="drawer-group-title">Marketplace</p>
                <nav className="mobile-drawer-nav">
                  <NavLink to="/markets" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Store size={18} />
                    <span className="drawer-nav-label">{t("navMarkets")}</span>
                  </NavLink>
                  <NavLink to="/products" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Apple size={18} />
                    <span className="drawer-nav-label">{t("navProduce")}</span>
                  </NavLink>
                  <NavLink to="/farmers" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Users size={18} />
                    <span className="drawer-nav-label">{t("navGrowers")}</span>
                  </NavLink>
                  <NavLink to="/help" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <HelpCircle size={18} />
                    <span className="drawer-nav-label">{t("navHelp")}</span>
                  </NavLink>
                </nav>
              </div>

              <div className="mobile-drawer-divider" />

              {/* Public Accounts */}
              <div className="drawer-nav-group">
                <p className="drawer-group-title">Account & Access</p>
                <nav className="mobile-drawer-nav secondary-nav">
                  <NavLink to="/login" onClick={() => setMenu(false)} className="drawer-nav-link highlight">
                    <LogIn size={18} />
                    <span className="drawer-nav-label">{t("signIn")}</span>
                  </NavLink>
                  <NavLink to="/register/customer" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <UserPlus size={18} />
                    <span className="drawer-nav-label">Join as shopper</span>
                  </NavLink>
                  <NavLink to="/register/farmer" onClick={() => setMenu(false)} className="drawer-nav-link">
                    <Sprout size={18} />
                    <span className="drawer-nav-label">Sell produce (Grower)</span>
                  </NavLink>
                </nav>
              </div>
            </>
          )}

          <div className="mobile-drawer-divider" />

          {/* Location & Language Pill */}
          <button
            type="button"
            className="mobile-drawer-region-btn"
            onClick={() => {
              setMenu(false);
              openModal();
            }}
          >
            <Globe size={15} />
            <div className="region-meta">
              <span className="region-title">Regional Hub</span>
              <span className="region-value">
                {visitor.locale === "ur" ? "اردو" : "English"} ·{" "}
                {visitor.country
                  ? countryName(visitor.country, visitor.locale) + (visitor.city ? ` (${visitor.city})` : "")
                  : t("anywhere")}
              </span>
            </div>
            <ArrowUpRight size={14} className="region-arrow" />
          </button>
        </div>

        <div className="mobile-drawer-footer">
          {s.role ? (
            <button
              className="drawer-signout-btn"
              onClick={() => {
                setMenu(false);
                void handleSignOut();
              }}
            >
              <LogOut size={16} />
              <span>Sign out ({s.role})</span>
            </button>
          ) : (
            <Link to="/register" onClick={() => setMenu(false)} className="drawer-register-btn">
              <span>Create free account</span>
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </aside>
      <div
        className={
          workspace ? `workspace workspace-${role}` : role === "customer" ? "customer-shell" : ""
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
                  MessageSquare,
                  Heart,
                  Bell,
                  UserRound,
                ][i] || MessageSquare;
                const isMessages = path.endsWith('/messages');
                const badge = isMessages && unreadChatCount > 0 ? ` (${unreadChatCount})` : '';
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
                    {label}{badge}
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
              {roleNav.map(([path, label]) => {
                const isMessages = path.endsWith('/messages');
                const badge = isMessages && unreadChatCount > 0 ? ` (${unreadChatCount})` : '';
                const IconComponent = getNavIcon(path);
                return (
                  <NavLink key={path} end to={path}>
                    <IconComponent size={15} />
                    <span>{label}{badge}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="sidebar-note">
              <span className="sidebar-account-label">{role === "farmer" ? "Grower workspace" : "Administrator workspace"}</span>
              <button
                className="text-button"
                onClick={handleSignOut}
              >
                <LogOut size={15}/> Sign out
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
                    ? [s.farmers.find((f) => f.id === s.farmerId)?.name, "Your stall"].filter(Boolean).join(" · ")
                    : "Gather & Grow operations"}
              </span>
              <div className="actions">
                <button
                  type="button"
                  className={`announcement-nav-btn ${publishedAnnouncements.length > 0 ? "has-active" : ""} ${hasUrgent ? "has-urgent" : ""}`}
                  onClick={() => setAnnouncementsOpen(true)}
                  aria-label={`Market announcements (${publishedAnnouncements.length} available)`}
                  title={publishedAnnouncements.length > 0 ? `${publishedAnnouncements.length} active market notice${publishedAnnouncements.length > 1 ? "s" : ""}` : "Market notices"}
                >
                  <Megaphone size={17} className="announcement-nav-icon" />
                  {publishedAnnouncements.length > 0 && (
                    <span className="announcement-nav-beacon" aria-hidden="true" />
                  )}
                </button>
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
          <ScrollChoreography><CoverageBoundary><Outlet /></CoverageBoundary></ScrollChoreography>
        </main>
      </div>
      {!workspace && role !== "customer" && (
        <footer className="footer">
          <div>
            <Link className="brand" to="/">
              <BrandMark />
              Gather & Grow
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
          <div className="footer-invite"><div><span>For growers and independent producers</span><h2>Make room for your next market day.</h2><p>Create your farm profile, apply to a local venue and manage reservations in one place.</p></div><Link className="button" to="/register/farmer">Start your farmer application <ArrowUpRight size={18}/></Link></div>
          <p className="footer-bottom">
            The Living Market · eGreen Basket{" "}
            <span>Pre-order online · Pay at the stall</span>
          </p>
        </footer>
      )}
      {/* Announcements Pop-up Modal */}
      {announcementsOpen && (
        <div
          className="announcements-modal-backdrop"
          onClick={() => setAnnouncementsOpen(false)}
        >
          <div
            className="announcements-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcements-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="announcements-modal-header">
              <div className="announcements-modal-title-wrap">
                <div className="announcements-modal-icon-badge">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 id="announcements-modal-title">Market Bulletins & Notices</h2>
                  <p className="announcements-modal-subtitle">
                    Official updates from Gather & Grow operations
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="announcements-modal-close"
                onClick={() => setAnnouncementsOpen(false)}
                aria-label="Close notices"
              >
                <X size={18} />
              </button>
            </header>

            <div className="announcements-modal-body">
              {publishedAnnouncements.length > 0 ? (
                <div className="announcements-modal-list">
                  {publishedAnnouncements.map((a) => (
                    <article
                      key={a.id}
                      className={`announcement-modal-card ${a.priority === "urgent" ? "is-urgent" : ""}`}
                    >
                      <div className="announcement-modal-card-top">
                        <span className={`announcement-priority-chip ${a.priority || "normal"}`}>
                          {a.priority === "urgent" ? "Urgent Notice" : a.type || "Market Advisory"}
                        </span>
                        {a.at && <time className="announcement-modal-time">{date(a.at)}</time>}
                      </div>
                      <h3 className="announcement-modal-card-title">{a.title}</h3>
                      <p className="announcement-modal-card-body">{a.body}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="announcements-modal-empty">
                  <div className="announcements-empty-icon">
                    <Megaphone size={28} />
                  </div>
                  <h3>No active notices</h3>
                  <p>All clear! There are no active platform announcements or advisories at this time.</p>
                </div>
              )}
            </div>

            <footer className="announcements-modal-footer">
              <Link
                to={role ? `/${role}/notifications` : "/help"}
                className="announcements-footer-link"
                onClick={() => setAnnouncementsOpen(false)}
              >
                <span>View full notification history</span>
                <ArrowUpRight size={14} />
              </Link>
              <button
                type="button"
                className="button secondary compact"
                onClick={() => setAnnouncementsOpen(false)}
              >
                Dismiss
              </button>
            </footer>
          </div>
        </div>
      )}

      {!/^\/(admin|farmer|customer|login|register)(\/|$)/.test(pathname) && <PublicGuide/>}
      {assistant && <Copilot onClose={() => setAssistant(false)} />}
    </CompanionContext.Provider>
  );
}
export function Guard({ role }: { role: Role }) {
  const s = useMarket();
  const loc = useLocation();
  if (s.status === "loading")
    return (
      <div className="workspace-loading" role="status" aria-live="polite">
        <span className="skeleton-line wide" />
        <span className="skeleton-line" />
        <div className="skeleton-grid">
          <span className="skeleton-card" />
          <span className="skeleton-card" />
          <span className="skeleton-card" />
          <span className="skeleton-card" />
        </div>
        <span className="visually-hidden">Opening your workspace…</span>
      </div>
    );
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
        <h1>That workspace belongs to another account.</h1>
        <p>You are signed in as a {s.role}. Open your own workspace, or sign out to switch accounts.</p>
        <Link className="button" to={`/${s.role}`}>
          Open my workspace
        </Link>
      </div>
    );
  if (role === "customer" && !s.customerActive)
    return (
      <div className="container">
        <h1>This account is paused.</h1>
        <p>The market team has deactivated this account. Contact us to restore access.</p>
        <Link to="/help">Get help</Link>
      </div>
    );
  return <Outlet />;
}

