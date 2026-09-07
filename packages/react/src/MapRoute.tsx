"use client";

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { useTopolyneMap } from "./context.js";
import { fetchRoute, type RoutingProfile } from "./fetchRoute.js";

export interface MapRouteProps {
  /** [longitude, latitude] */
  origin: [number, number];
  /** [longitude, latitude] */
  destination: [number, number];
  /** Extra stops the route should pass through, in order, between origin and destination. */
  waypoints?: [number, number][];
  /** Defaults to "driving-car". */
  profile?: RoutingProfile;
  /** Line color. Defaults to a neutral blue. */
  color?: string;
  /** Line width in pixels. Defaults to 4. */
  width?: number;
  /** Called once the route is fetched, with distance (meters) and duration (seconds). */
  onRoute?: (summary: { distanceMeters: number; durationSeconds: number }) => void;
  /** Called if the route request fails (e.g. directions aren't configured on the backend). */
  onError?: (error: Error) => void;
}

/**
 * Draws a routed path between two points, fetched from Topolyne's directions
 * backend (OpenRouteService by default — see the server's `/api/directions`
 * route). Must be rendered inside `<Map>`. Re-fetches and redraws whenever
 * origin/destination/waypoints change.
 */
export function MapRoute({
  origin,
  destination,
  waypoints,
  profile,
  color = "#2563eb",
  width = 4,
  onRoute,
  onError,
}: MapRouteProps) {
  const { map, loaded } = useTopolyneMap();
  const idRef = useRef(`topolyne-route-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!map || !loaded) return;
    let cancelled = false;
    const sourceId = idRef.current;
    const layerId = `${sourceId}-line`;

    fetchRoute(origin, destination, { waypoints, profile })
      .then((route) => {
        if (cancelled) return;
        const geojson = {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "LineString" as const, coordinates: route.coordinates },
        };
        const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existing) {
          existing.setData(geojson as Parameters<maplibregl.GeoJSONSource["setData"]>[0]);
        } else {
          map.addSource(sourceId, {
            type: "geojson",
            data: geojson as Parameters<maplibregl.GeoJSONSource["setData"]>[0],
          });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": color, "line-width": width },
          });
        }
        onRoute?.({ distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        // eslint-disable-next-line no-console
        console.error("[@topolyne/react] MapRoute:", error);
        onError?.(error);
      });

    return () => {
      cancelled = true;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, loaded, origin[0], origin[1], destination[0], destination[1], JSON.stringify(waypoints), profile, color, width]);

  return null;
}
