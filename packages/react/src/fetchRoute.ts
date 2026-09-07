import { getApiBase } from "./fetchPublishedMap.js";

export type RoutingProfile = "driving-car" | "cycling-regular" | "foot-walking";

export interface RouteResult {
  /** [longitude, latitude] pairs tracing the route. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Fetches a routed path between two points from Topolyne's directions
 * backend (the same host `configureTopolyne`/`fetchPublishedMap` use). The
 * routing vendor and its API key stay entirely server-side — this call never
 * touches a third party directly.
 */
export async function fetchRoute(
  origin: [number, number],
  destination: [number, number],
  opts: { waypoints?: [number, number][]; profile?: RoutingProfile } = {},
): Promise<RouteResult> {
  const res = await fetch(`${getApiBase()}/api/directions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, waypoints: opts.waypoints, profile: opts.profile }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      `Topolyne: failed to fetch route (${res.status} ${res.statusText})${body?.error ? `: ${body.error}` : ""}.`,
    );
  }
  return (await res.json()) as RouteResult;
}
