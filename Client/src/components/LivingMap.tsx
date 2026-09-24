import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Plus, Minus, ArrowUpRight, Compass } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Market } from "../data/market";
import { sampleMapPositions } from "../data/living-selectors";

export function LivingMap({
  markets,
  selected,
  onSelect,
}: {
  markets: Market[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const reduce = useReducedMotion();
  const current = markets.find((m) => m.id === selected);
  return (
    <div className="living-map" aria-label="Illustrative market map">
      <div className="map-cartography" style={{ transform: `scale(${zoom})` }}>
        <svg
          viewBox="0 0 800 480"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect width="800" height="480" fill="#e9eadc" />
          <g fill="#d8e0c7" stroke="#cbd6b9" strokeWidth="1">
            <path d="M32 24H180V137H48Z" />
            <path d="M315 32H434L474 131H332Z" />
            <path d="M100 322H260L239 455H63Z" />
            <path d="M615 17H783V139H650Z" />
            <path d="M590 323H789V466H612Z" />
          </g>
          <path
            d="M470 -30C384 90 592 175 476 263S489 410 548 510"
            fill="none"
            stroke="#afc9ca"
            strokeWidth="57"
          />
          <path
            d="M470 -30C384 90 592 175 476 263S489 410 548 510"
            fill="none"
            stroke="#c4dad8"
            strokeWidth="45"
          />
          <g stroke="#faf8ef" fill="none" strokeWidth="19">
            <path d="M-30 175L820 123M-20 323L820 259M237 -30L172 510M635 -20L676 510" />
            <path d="M-30 432L817 352M66 -10L382 490" strokeWidth="10" />
            <path
              d="M315 -20L400 500M740 -20L735 490M-20 74L820 213"
              strokeWidth="8"
            />
          </g>
          <g fill="#d0d1c2">
            <path d="M254 190H299V245H249Z" />
            <path d="M317 181H356V239H328Z" />
            <path d="M81 203H130V253H92Z" />
            <path d="M554 181H604V218H560Z" />
            <path d="M285 365H347V401H280Z" />
            <path d="M710 286H765V321H708Z" />
          </g>
          <g fill="#9baa84">
            <circle cx="108" cy="62" r="8" />
            <circle cx="136" cy="87" r="6" />
            <circle cx="98" cy="105" r="7" />
            <circle cx="374" cy="74" r="10" />
            <circle cx="403" cy="103" r="7" />
            <circle cx="140" cy="383" r="9" />
            <circle cx="174" cy="398" r="7" />
            <circle cx="696" cy="403" r="9" />
          </g>
          <g
            fill="#68725b"
            fontSize="12"
            fontFamily="Public Sans, sans-serif"
            letterSpacing="2"
          >
            <text x="55" y="155">
              ORCHARD QUARTER
            </text>
            <text x="525" y="450">
              RIVERSIDE
            </text>
            <text x="614" y="58">
              THE GROVE
            </text>
          </g>
        </svg>
        {markets.map((m, i) => {
          const pos = sampleMapPositions[m.id] ?? [
            25 + (i % 3) * 22,
            40 + (i % 2) * 24,
          ];
          return (
            <motion.button
              key={m.id}
              className={`living-pin ${selected === m.id ? "is-selected" : ""}`}
              style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
              aria-label={`Select ${m.name}`}
              aria-pressed={selected === m.id}
              onClick={() => onSelect(m.id)}
              animate={{ scale: selected === m.id ? 1.12 : 1 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
            >
              <MapPin size={20} />
              <span>{m.name}</span>
            </motion.button>
          );
        })}
      </div>
      <span className="living-map-label">
        <Compass size={15} /> Living Market Map
      </span>
      <div className="living-map-zoom">
        <button
          aria-label="Zoom in map"
          disabled={zoom >= 1.4}
          onClick={() => setZoom(1.4)}
        >
          <Plus size={16} />
        </button>
        <button
          aria-label="Zoom out map"
          disabled={zoom === 1}
          onClick={() => setZoom(1)}
        >
          <Minus size={16} />
        </button>
      </div>
      {current && (
        <div className="living-map-selection" aria-live="polite">
          <span>
            <strong>{current.name}</strong>
            <small>{current.hours} · sample market</small>
          </span>
          <Link
            to={`/markets/${current.id}`}
            aria-label={`Explore ${current.name}`}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      )}
      <small className="living-map-disclaimer">
        Illustrative map · not real pickup coordinates
      </small>
    </div>
  );
}
