/**
 * Everything that names an outside tile/data vendor lives in this one file.
 * Presets and the rest of the style engine only ever talk about semantic
 * config (colors, road classes, terrain intensity) — never about which
 * company is serving the bytes. Swapping OpenFreeMap for a self-hosted
 * OpenMapTiles server, or MapTiler's terrain-RGB for another DEM host, is a
 * one-file change.
 */
export interface MapProviderConfig {
  /**
   * A vector tile source in either form MapLibre accepts:
   *  - `url`: a TileJSON endpoint (what OpenFreeMap publishes)
   *  - `tiles`: an explicit XYZ tile URL template
   * Must use the OpenMapTiles schema (source-layers: water, waterway,
   * landcover, landuse, park, boundary, aeroway, transportation,
   * transportation_name, building, place, poi, housenumber, water_name).
   */
  vectorTiles: { url: string } | { tiles: string[]; maxzoom?: number };
  /**
   * Terrain-RGB (Mapbox/MapTiler encoding) raster-dem tiles, used for both
   * hillshade and client-side contour generation. When absent, terrain and
   * contour features degrade gracefully (flat map, no crash).
   */
  demTiles?: { tiles: string[]; encoding: "mapbox" | "terrarium"; maxzoom: number };
  /**
   * Raster satellite/aerial imagery, as a TileJSON endpoint — MapLibre fetches
   * it to discover the actual tile URL template/extension/maxzoom itself,
   * so this doesn't need to hardcode a specific tileset version. Reuses
   * whatever key already unlocks `demTiles`, not a separate paid provider.
   */
  satelliteTiles?: { url: string };
  /** Nominatim-compatible geocoding endpoint, kept separate from the map/DEM providers. */
  geocode: { baseUrl: string; appName: string };
  /**
   * Directions/routing endpoint. Unlike the other providers here, routing
   * needs a secret API key — so only the (safe-to-ship) `baseUrl` lives in
   * this shared config object. The key itself stays server-side, read from
   * `ORS_API_KEY` inside apps/web's `/api/directions` route, and is never
   * part of `MapProviderConfig` since this object ships into the browser
   * bundle via `@topolyne/react`.
   */
  directions?: { baseUrl: string };
  glyphsUrl: string;
  spriteUrl?: string;
  attribution: string;
}

// NEXT_PUBLIC_-prefixed deliberately: this module runs client-side (every
// consumer of `defaultProvider` — the editor, the homepage hero map, and any
// third-party app's <Map> — calls buildMapStyle() in the browser), and
// bundlers like Next.js only inline env vars into client code when they're
// marked public. A plain, unprefixed MAPTILER_API_KEY here would silently
// evaluate to `undefined` in the browser, breaking terrain with no error.
// This is the same trust model MapTiler (and Mapbox) already designs for:
// their tile keys are meant to be visible client-side and are restricted by
// HTTP referrer/domain in the provider's dashboard, not kept secret.
const MAPTILER_KEY = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPTILER_API_KEY : undefined;

/**
 * MVP default: OpenFreeMap's free hosted "planet" vector tiles (same
 * OpenMapTiles schema Terraink itself renders from), MapTiler terrain-RGB for
 * elevation when an API key is configured, Nominatim for geocoding, and
 * OpenRouteService for directions. Every field here is overridable — this is
 * a default, not a hard-coded vendor.
 */
export const defaultProvider: MapProviderConfig = {
  vectorTiles: { url: "https://tiles.openfreemap.org/planet" },
  demTiles: MAPTILER_KEY
    ? {
        tiles: [`https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`],
        encoding: "mapbox",
        maxzoom: 12,
      }
    : undefined,
  satelliteTiles: MAPTILER_KEY
    ? { url: `https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=${MAPTILER_KEY}` }
    : undefined,
  geocode: {
    baseUrl: "https://nominatim.openstreetmap.org",
    appName: "topolyne.com",
  },
  directions: {
    baseUrl: "https://api.openrouteservice.org",
  },
  glyphsUrl: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  spriteUrl: undefined,
  // "OpenFreeMap" (the tile host) is explicitly optional to display per
  // their own attribution docs — only OpenMapTiles and OpenStreetMap credit
  // is actually required, since OSM's data license (ODbL) mandates it
  // wherever the data is shown. Swap the host's name for ours instead.
  attribution:
    '© <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors ' +
    '· <a href="https://topolyne.com" target="_blank">Topolyne</a>',
};

export function withProviderOverrides(overrides: Partial<MapProviderConfig>): MapProviderConfig {
  return { ...defaultProvider, ...overrides };
}
