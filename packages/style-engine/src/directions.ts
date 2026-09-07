import type { MapProviderConfig } from "./providers.js";

export type RoutingProfile = "driving-car" | "cycling-regular" | "foot-walking";

export interface RouteResult {
  /** [longitude, latitude] pairs tracing the route, ready for a GeoJSON LineString. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Deliberately the only place that knows we're calling OpenRouteService
 * today. Swapping to Mapbox/Google/GraphHopper later means implementing this
 * one function again — nothing in the editor, the config schema, or the
 * React SDK's `<MapRoute>` mentions a routing vendor by name.
 *
 * OpenRouteService requires a secret API key, so — exactly like geocoding —
 * this must be called from the server (see apps/web's `/api/directions`
 * route), never directly from the browser.
 */
export async function fetchRoute(
  origin: [number, number],
  destination: [number, number],
  provider: MapProviderConfig,
  opts: { apiKey: string; waypoints?: [number, number][]; profile?: RoutingProfile },
): Promise<RouteResult> {
  const baseUrl = provider.directions?.baseUrl ?? "https://api.openrouteservice.org";
  const profile = opts.profile ?? "driving-car";
  const coordinates = [origin, ...(opts.waypoints ?? []), destination];

  const res = await fetch(`${baseUrl}/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: opts.apiKey,
    },
    body: JSON.stringify({ coordinates }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Directions request failed: ${res.status} ${res.statusText} ${body}`.trim());
  }

  const data = (await res.json()) as {
    features: Array<{
      geometry: { coordinates: [number, number][] };
      properties: { summary: { distance: number; duration: number } };
    }>;
  };
  const feature = data.features[0];
  if (!feature) throw new Error("Directions request returned no route.");

  return {
    coordinates: feature.geometry.coordinates,
    distanceMeters: feature.properties.summary.distance,
    durationSeconds: feature.properties.summary.duration,
  };
}
