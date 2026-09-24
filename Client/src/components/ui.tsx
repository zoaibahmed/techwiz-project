import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, X, MapPin, ArrowRight } from "lucide-react";
import { gateway } from "../data/gateway";
import type { Command } from "../data/gateway";
import type { Product, DemoState } from "../data/market";
import { money, date } from "../data/market";

export const useMarket = () =>
  useSyncExternalStore(gateway.subscribe, gateway.snapshot);
const ToastContext = createContext<(message: string) => void>(() => {});
export function Feedback({ children }: { children: ReactNode }) {
  const [message, set] = useState("");
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => set(""), 5500);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <ToastContext.Provider value={set}>
      {children}
      <div className="toast" role="status">
        {message && (
          <>
            <span>{message}</span>
            <button aria-label="Dismiss notification" onClick={() => set("")}>
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export function useAction() {
  const toast = useContext(ToastContext);
  return (command: Command, success = "Development preview updated.") => {
    try {
      gateway.dispatch(command);
      toast(success);
      return true;
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "This action could not be completed.",
      );
      return false;
    }
  };
}
export function Heading({
  title,
  intro,
  children,
  eyebrow,
}: {
  title: string;
  intro?: string;
  children?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 tabIndex={-1}>{title}</h1>
        {intro && <p className="lead">{intro}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Empty({
  title = "Nothing here just yet.",
  children,
  href = "/markets",
  action = "Explore markets",
}: {
  title?: string;
  children?: ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">✳</span>
      <h2>{title}</h2>
      <p>{children ?? "Choose a market day and see what is on the stalls."}</p>
      <Link className="button secondary" to={href}>
        {action}
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function Status({ children }: { children: ReactNode }) {
  return (
    <span
      className={`status-label ${String(children).includes("Ready") || children === "Approved" ? "positive" : ""}`}
    >
      {children}
    </span>
  );
}
export function Favourite({ id }: { id: string }) {
  const s = useMarket();
  const act = useAction();
  const selected = s.favourites.includes(id);
  return (
    <button
      className={`icon-button favourite ${selected ? "selected" : ""}`}
      aria-label={selected ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={selected}
      onClick={() =>
        act(
          { type: "favourite", id },
          selected
            ? "Removed from sample favourites."
            : "Saved to sample favourites.",
        )
      }
    >
      <Heart size={19} fill={selected ? "currentColor" : "none"} />
    </button>
  );
}
export function ProductTile({ product: p }: { product: Product }) {
  const s = useMarket();
  const farmer = s.farmers.find((f) => f.id === p.farmerId);
  return (
    <article className="product-tile">
      <div className="product-photo">
        <Link to={`/products/${p.id}`}>
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            width={600}
            height={450}
          />
        </Link>
        <Favourite id={p.id} />
        {(!p.available || p.stock <= p.reserved) && (
          <span className="photo-label">
            {!p.available ? "Unavailable" : "Sold out"}
          </span>
        )}
      </div>
      <p className="small muted">{farmer?.name}</p>
      <h3>
        <Link to={`/products/${p.id}`}>{p.name}</Link>
      </h3>
      <div className="spread">
        <span>
          {money(p.price)} <span className="small muted">/ {p.unit}</span>
        </span>
        <Link
          className="icon-button"
          aria-label={`View ${p.name}`}
          to={`/products/${p.id}`}
        >
          <ArrowUpRight size={19} />
        </Link>
      </div>
    </article>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Form({
  children,
  onSubmit,
  className = "",
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => void;
  className?: string;
}) {
  return (
    <form
      className={`form ${className}`}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      {children}
    </form>
  );
}
export const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      aria-labelledby="dialog-title"
    >
      <div className="spread">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  label,
  title,
  children,
  onConfirm,
  danger = false,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  onConfirm: () => boolean | void;
  danger?: boolean;
}) {
  const [open, set] = useState(false);
  return (
    <>
      <button
        className={`button ${danger ? "danger" : "secondary"}`}
        onClick={() => set(true)}
      >
        {label}
      </button>
      {open && (
        <Modal title={title} onClose={() => set(false)}>
          <div className="confirmation-copy">
            {children ??
              "This changes the development fixture only. Review the action before continuing."}
          </div>
          <div className="actions">
            <button
              className={`button ${danger ? "danger" : ""}`}
              onClick={() => {
                if (onConfirm() !== false) set(false);
              }}
            >
              Confirm {label.toLowerCase()}
            </button>
            <button className="button quiet" onClick={() => set(false)}>
              Keep unchanged
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Quantity({
  quantity,
  onChange,
  max = 99,
  min = 1,
  label = "Quantity",
}: {
  quantity: number;
  onChange: (q: number) => void;
  max?: number;
  min?: number;
  label?: string;
}) {
  return (
    <div className="quantity">
      <button
        aria-label={`Decrease ${label}`}
        disabled={quantity <= min}
        onClick={() => onChange(quantity - 1)}
      >
        −
      </button>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        value={quantity}
        onChange={(e) => {
          if (e.target.value !== "") onChange(Number(e.target.value));
        }}
      />
      <button
        aria-label={`Increase ${label}`}
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}
export function SchematicMap({
  selected,
  onSelect,
  markets,
}: {
  selected: string;
  onSelect: (id: string) => void;
  markets: DemoState["markets"];
}) {
  return (
    <div className="map-panel">
      <svg
        viewBox="0 0 700 600"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="700" height="600" fill="#EBEFE5" />
        <path
          d="M500 -50 C280 140 670 270 440 400 S400 650 500 650"
          stroke="#C6DDE0"
          strokeWidth="65"
          fill="none"
        />
        <g stroke="#FAF8F2" strokeWidth="22" fill="none">
          <path d="M-10 130 L700 430 M90 -20 L260 620 M-10 420 L750 160 M380 -20 L500 620" />
          <path d="M-10 280 L720 540 M-10 550 L600 -10" strokeWidth="10" />
        </g>
        <g fill="#D6E1CC">
          <rect x="60" y="45" width="100" height="70" rx="20" />
          <rect x="285" y="345" width="80" height="100" rx="20" />
          <rect x="550" y="80" width="100" height="70" rx="20" />
        </g>
      </svg>
      <span className="map-disclaimer">
        Illustrative map · not real pickup coordinates
      </span>
      {markets.map((m, i) => (
        <button
          key={m.id}
          className={`map-pin ${m.id === selected ? "active" : ""}`}
          style={{
            left: `${25 + (i % 3) * 23}%`,
            top: `${35 + (i % 2) * 26}%`,
          }}
          onClick={() => onSelect(m.id)}
          aria-label={`Select ${m.name}`}
          aria-pressed={selected === m.id}
        >
          <MapPin size={20} />
          <span>{m.name}</span>
        </button>
      ))}
      <span className="map-key">Choose a marker to explore its market</span>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function MarketDate({ day }: { day: string }) {
  return (
    <span className="date-stamp">
      <strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
      <span>{date(day).split(" ")[0]} · Oct</span>
    </span>
  );
}
