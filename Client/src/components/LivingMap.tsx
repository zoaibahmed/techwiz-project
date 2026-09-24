/**
 * MarketLink — Real interactive map using Leaflet
 * Replaces the illustrative SVG with actual OpenStreetMap tiles
 * and real market coordinates from the backend or demo fixtures.
 */
import { useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Market } from '../data/market';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issue with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// MarketLink brand marker — forest green
const defaultPin = L.divIcon({
  className: 'ml-map-marker',
  html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#1b3a2d"/>
    <circle cx="14" cy="13" r="5.5" fill="#faf8ef"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

const selectedPin = L.divIcon({
  className: 'ml-map-marker ml-map-marker--active',
  html: `<svg width="34" height="48" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#d4a853"/>
    <circle cx="14" cy="13" r="5.5" fill="#1b3a2d"/>
  </svg>`,
  iconSize: [34, 48],
  iconAnchor: [17, 48],
  popupAnchor: [0, -44],
});

// Real Lahore coordinates for demo markets (actual recognisable locations)
const DEMO_COORDS: Record<string, [number, number]> = {
  'demo-m1': [31.4834, 74.3225],   // Model Town, Lahore
  'demo-m2': [31.5204, 74.3487],   // Gulberg III / Liberty, Lahore
  'demo-m3': [31.4697, 74.3761],   // DHA Phase 5, Lahore
};

export interface MapMarket {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area?: string;
  hours?: string;
  farmerCount?: number;
}

function getCoords(m: Market): [number, number] | null {
  // Prefer live coordinates from API-enriched market objects
  const any = m as any;
  if (any.coordinates?.latitude && any.coordinates?.longitude) {
    return [any.coordinates.latitude, any.coordinates.longitude];
  }
  // Fall back to demo coordinates
  return DEMO_COORDS[m.id] || null;
}

export function InteractiveMap({
  markets,
  selected,
  onSelect,
}: {
  markets: Market[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const reduce = useReducedMotion();

  const current = markets.find((m) => m.id === selected);

  // Compute map markets with coordinates
  const mapMarkets = useMemo(() => {
    return markets
      .map((m) => {
        const coords = getCoords(m);
        if (!coords) return null;
        return { market: m, coords };
      })
      .filter(Boolean) as { market: Market; coords: [number, number] }[];
  }, [markets]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center on Lahore by default; adjust dynamically based on data
    const center: L.LatLngExpression = mapMarkets.length
      ? [
          mapMarkets.reduce((s, m) => s + m.coords[0], 0) / mapMarkets.length,
          mapMarkets.reduce((s, m) => s + m.coords[1], 0) / mapMarkets.length,
        ]
      : [31.5204, 74.3587]; // Lahore default

    const map = L.map(containerRef.current, {
      center,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    // OpenStreetMap tiles — free, no API key required
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Attribution in bottom-right, subtle
    L.control.attribution({
      position: 'bottomright',
      prefix: false,
    }).addTo(map).addAttribution(
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    );

    // Zoom control on right side
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when markets change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add markers for each market with coordinates
    mapMarkets.forEach(({ market, coords }) => {
      const isSelected = market.id === selected;
      const marker = L.marker(coords, {
        icon: isSelected ? selectedPin : defaultPin,
        title: market.name,
        alt: market.name,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.on('click', () => onSelect(market.id));

      marker.bindTooltip(market.name, {
        direction: 'top',
        offset: [0, -42],
        className: 'ml-map-tooltip',
      });

      marker.addTo(map);
      markersRef.current.set(market.id, marker);
    });

    // Fit bounds if multiple markets
    if (mapMarkets.length > 1) {
      const bounds = L.latLngBounds(mapMarkets.map((m) => m.coords));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (mapMarkets.length === 1) {
      map.setView(mapMarkets[0].coords, 14);
    }
  }, [mapMarkets, selected, onSelect]);

  // Pan to selected market
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;

    const entry = mapMarkets.find((m) => m.market.id === selected);
    if (entry) {
      map.panTo(entry.coords, { animate: !reduce, duration: 0.4 });
    }

    // Update marker icons for selection state
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(id === selected ? selectedPin : defaultPin);
      marker.setZIndexOffset(id === selected ? 1000 : 0);
    });
  }, [selected, mapMarkets, reduce]);

  const hasCoords = mapMarkets.length > 0;

  return (
    <div className="living-map living-map--real" aria-label="Market discovery map">
      <div ref={containerRef} className="map-leaflet-container" />

      {!hasCoords && (
        <div className="map-empty-overlay">
          <Compass size={32} />
          <p>No mapped markets in this area yet.</p>
          <p className="small muted">
            Markets require approved coordinates before appearing on the map.
          </p>
        </div>
      )}

      {current && (
        <motion.div
          className="living-map-selection"
          aria-live="polite"
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          <span>
            <strong>{current.name}</strong>
            <small>
              {current.area}
              {current.hours ? ` · ${current.hours}` : ''}
            </small>
          </span>
          <Link
            to={`/markets/${current.id}`}
            aria-label={`Explore ${current.name}`}
          >
            <ArrowUpRight size={20} />
          </Link>
        </motion.div>
      )}

      <small className="living-map-disclaimer">
        {hasCoords
          ? 'Map tiles © OpenStreetMap contributors'
          : 'Awaiting real market coordinates'}
      </small>
    </div>
  );
}
