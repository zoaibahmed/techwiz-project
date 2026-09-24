import type { ComponentType } from "react";
import type { Market } from "../data/market";
import { LivingMap } from "./LivingMap";

export interface MarketMapViewProps {
  markets: Market[];
  selected: string;
  onSelect: (id: string) => void;
}
// UI renderer boundary only, not an API DTO. A real map adapter must map approved
// coordinates into these selected IDs and preserve accessible list navigation.
// No production coordinates are fabricated for the fixture records.
export function MarketMap({
  geographicRenderer: Geographic,
  ...props
}: MarketMapViewProps & {
  geographicRenderer?: ComponentType<MarketMapViewProps>;
}) {
  return (
    <div
      className="market-map-boundary"
      data-map-mode={Geographic ? "geographic" : "illustrative"}
    >
      {Geographic ? (
        <Geographic {...props} />
      ) : (
        <>
          <div className="map-integration-note">
            Temporary illustrative view · real map integration pending
          </div>
          <LivingMap {...props} />
        </>
      )}
    </div>
  );
}
