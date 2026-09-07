import type { MapProviderConfig } from "./providers.js";

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
  /** [west, south, east, north] — used to pick a sensible initial zoom */
  boundingBox?: [number, number, number, number];
}

/**
 * Deliberately the only place that knows we're calling Nominatim today.
 * Swapping to Mapbox/Google/Pelias geocoding later means implementing this
 * one function again — nothing in the editor, the config schema, or the
 * style engine mentions a geocoding vendor by name.
 *
 * Nominatim's usage policy requires a descriptive User-Agent and forbids
 * heavy client-side polling, so this should be called from the server (see
 * `apps/web`'s `/api/geocode` route), not directly from the browser.
 */
export async function searchLocation(
  query: string,
  provider: MapProviderConfig,
  opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<GeocodeResult[]> {
  const url = new URL("/search", provider.geocode.baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(opts.limit ?? 5));
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url, {
    headers: { "User-Agent": `${provider.geocode.appName} (map editor location search)` },
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status} ${res.statusText}`);

  const results = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    boundingbox: [string, string, string, string];
  }>;

  return results.map((r) => ({
    label: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    boundingBox: [
      parseFloat(r.boundingbox[2]),
      parseFloat(r.boundingbox[0]),
      parseFloat(r.boundingbox[3]),
      parseFloat(r.boundingbox[1]),
    ],
  }));
}

/** Rough zoom estimate from a Nominatim bounding box, for "fly to search result". */
export function zoomForBoundingBox([west, south, east, north]: [number, number, number, number]): number {
  const span = Math.max(east - west, north - south, 0.001);
  const zoom = Math.log2(360 / span) - 1;
  return Math.max(2, Math.min(16, zoom));
}
