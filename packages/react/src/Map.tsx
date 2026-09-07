"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapConfig } from "@topolyne/config-schema";
import { buildMapStyle, defaultProvider, setupContourSource, type MapProviderConfig } from "@topolyne/style-engine";
import { fetchPublishedMap } from "./fetchPublishedMap.js";
import { TopolyneMapContext } from "./context.js";

function closeAttrib(map: maplibregl.Map) {
  const el = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
  el?.removeAttribute("open");
  el?.classList.remove("maplibregl-compact-show");
}

/**
 * MapLibre's "compact" attribution control actually starts *open* (full
 * "OpenFreeMap | OpenMapTiles | © OpenStreetMap contributors" text visible)
 * despite the name — it only collapses to just the (i) icon after the first
 * mouseout. Worse, it re-opens itself on every "styledata" event fired while
 * sources are still loading (each source's metadata arriving re-triggers its
 * internal _updateCompact()), so closing it once right after construction
 * isn't enough — it silently reopens a moment later. Keep closing it on
 * every "data" event until the map reaches "idle" (initial load settled),
 * then stop so a genuine user click on the (i) icon isn't fought afterward.
 */
function closeCompactAttribution(map: maplibregl.Map) {
  closeAttrib(map);
  const onData = () => closeAttrib(map);
  map.on("data", onData);
  map.once("idle", () => map.off("data", onData));
}

export interface MapProps {
  /** The id you got back from "Publish" in the Topolyne editor, e.g. "map_Nvm9w6Wn9d". */
  mapId: string;
  className?: string;
  style?: CSSProperties;
  /** Override the saved center. [longitude, latitude], same order MapLibre uses. */
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  /** Defaults on — most saved designs are fine to pan/zoom; set false for a static poster-style embed. */
  interactive?: boolean;
  /** Escape hatch for local development against a self-hosted Topolyne instance. Most apps never set this. */
  provider?: MapProviderConfig;
  onLoad?: (map: maplibregl.Map) => void;
  children?: ReactNode;
}

/**
 * Renders the exact design you published at topolyne.com/editor. All the
 * MapLibre/vector-tile/terrain complexity is resolved by `@topolyne/style-engine`
 * from the same config format the editor saves — this component's only job
 * is: fetch the published config, build the style, mount MapLibre, and stay
 * out of the way for markers/overlays via `<MapMarker>`.
 */
export function Map({
  mapId,
  className,
  style,
  center,
  zoom,
  pitch,
  bearing,
  interactive = true,
  provider = defaultProvider,
  onLoad,
  children,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | undefined;

    async function init() {
      try {
        const published = await fetchPublishedMap(mapId);
        if (cancelled || !containerRef.current) return;

        const config: MapConfig = published.config;
        const contourSource = config.terrain.contours
          ? await setupContourSource(provider, maplibregl)
          : undefined;
        if (cancelled || !containerRef.current) return;

        const mapStyle = buildMapStyle(config, provider, { contourSource });

        map = new maplibregl.Map({
          container: containerRef.current,
          style: mapStyle,
          center: center ?? [config.location.longitude, config.location.latitude],
          zoom: zoom ?? config.location.zoom,
          pitch: pitch ?? config.location.pitch,
          bearing: bearing ?? config.location.bearing,
          interactive,
          attributionControl: { compact: true },
        });
        closeCompactAttribution(map);

        mapRef.current = map;
        map.on("load", () => {
          if (cancelled) return;
          setLoaded(true);
          setMapInstance(map ?? null);
          if (map) onLoad?.(map);
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        // eslint-disable-next-line no-console
        console.error("[@topolyne/react]", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      setLoaded(false);
      setMapInstance(null);
    };
    // mapId/provider identity define the map instance. Per-render view
    // overrides (center/zoom/pitch/bearing) are applied reactively below
    // instead of tearing the whole map down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, provider]);

  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    if (center) mapRef.current.setCenter(center);
    if (zoom !== undefined) mapRef.current.setZoom(zoom);
    if (pitch !== undefined) mapRef.current.setPitch(pitch);
    if (bearing !== undefined) mapRef.current.setBearing(bearing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], zoom, pitch, bearing, loaded]);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {error && (
        <div style={errorBannerStyle} role="alert">
          {error}
        </div>
      )}
      <TopolyneMapContext.Provider value={{ map: mapInstance, loaded }}>
        {loaded ? children : null}
      </TopolyneMapContext.Provider>
    </div>
  );
}

const errorBannerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  fontSize: 13,
  fontFamily: "system-ui, sans-serif",
  color: "#7c2d12",
  background: "#fef3ee",
  textAlign: "center",
};
