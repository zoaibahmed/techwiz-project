import { IllustrativeMap } from "./IllustrativeMap";
import type { ComponentType } from "react";
import type { Market } from "../data/market";
import { InteractiveMap } from "./LivingMap";

export interface MarketMapViewProps {
  markets: Market[];
  selected: string;
  onSelect: (id: string) => void;
}
// UI renderer boundary only, not an API DTO. A real map adapter must map approved
// coordinates into these selected IDs and preserve accessible list navigation.
export function MarketMap({
  geographicRenderer: Geographic,
  ...props
}: MarketMapViewProps & {
  geographicRenderer?: ComponentType<MarketMapViewProps>;
}) {
  const illustrative = props.markets.every((m) => m.id.startsWith("demo-"));
  return (
    <div
      className="market-map-boundary"
      data-map-mode={
        Geographic
          ? "geographic"
          : illustrative
            ? "illustrative"
            : "interactive"
      }
    >
      {Geographic ? (
        <Geographic {...props} />
      ) : illustrative ? (
        <>
          <div className="map-integration-note">
            Temporary illustrative view · real map integration pending
          </div>
          <IllustrativeMap {...props} />
        </>
      ) : (
        <InteractiveMap {...props} />
      )}
    </div>
  );
}
