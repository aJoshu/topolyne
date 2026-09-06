import { createContext, useContext } from "react";
import type maplibregl from "maplibre-gl";

export interface TopolyneMapContextValue {
  map: maplibregl.Map | null;
  loaded: boolean;
}

export const TopolyneMapContext = createContext<TopolyneMapContextValue>({ map: null, loaded: false });

/** Access the underlying MapLibre instance from inside `<Map>` — used by `<MapMarker>` and
 * available to consumers who need an escape hatch for something the config format doesn't cover yet. */
export function useTopolyneMap(): TopolyneMapContextValue {
  return useContext(TopolyneMapContext);
}
