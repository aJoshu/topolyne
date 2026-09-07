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

// Sun/stars/grain are fabricated purely in CSS - MapLibre's sky spec has no
// celestial rendering (no sun position, no stars, unlike Mapbox's atmosphere
// system), and grain is a texture no vector-tile layer could produce anyway.
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
const STAR_DOTS = [
  "6px 12px", "34px 40px", "70px 8px", "98px 55px", "130px 20px", "160px 60px", "190px 15px", "210px 75px",
  "18px 90px", "55px 120px", "88px 100px", "120px 140px", "150px 105px", "180px 130px", "205px 150px",
].map((pos) => `radial-gradient(1.4px 1.4px at ${pos}, white, transparent)`).join(", ");

function SkyOverlays({
  showStars,
  showSun,
  bearing = 0,
}: {
  showStars: boolean;
  showSun: boolean;
  bearing?: number;
}) {
  return (
    <>
      {showStars && (
        // Clipped to a smaller top slice and overflow:hidden on an oversized
        // rotated inner layer, so spinning the map never reveals an empty
        // corner. Rotating with bearing at least *looks* responsive, since a
        // flat overlay has no real notion of which way the map is pointed;
        // it also can't occlude behind buildings/terrain reaching into frame
        // without a real WebGL layer, which this deliberately isn't.
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            height: "28%",
            overflow: "hidden",
            maskImage: "linear-gradient(to bottom, black, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-50%",
              left: "-50%",
              width: "200%",
              height: "200%",
              backgroundImage: STAR_DOTS,
              backgroundSize: "220px 160px",
              backgroundRepeat: "repeat",
              transform: `rotate(${bearing}deg)`,
              opacity: 0.8,
            }}
          />
        </div>
      )}
      {showSun && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "4%",
            right: "10%",
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,244,214,0.95) 0%, rgba(255,220,150,0.5) 35%, rgba(255,220,150,0) 70%)",
            filter: "blur(1px)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />
    </>
  );
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
  const [sky, setSkyState] = useState({ tilted: false, stars: false, sun: false, bearing: 0 });

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
          // MapLibre's own default maxPitch is 60, not its true 85 ceiling -
          // the editor already saves pitches up to 85, so without this a
          // published design's saved tilt would silently get clamped back
          // down to 60 the moment it's embedded.
          maxPitch: 85,
          attributionControl: { compact: true },
        });
        closeCompactAttribution(map);
        // A style's `terrain`/`sky` fields passed at construction time
        // aren't always picked up on their own - setting both explicitly
        // once the style has actually finished loading is the reliable way
        // to apply either one.
        map.once("style.load", () => {
          map?.setTerrain(mapStyle.terrain ?? null);
          map?.setSky(mapStyle.sky ?? {});
        });
        const effectivePitch = pitch ?? config.location.pitch ?? 0;
        const effectiveBearing = bearing ?? config.location.bearing ?? 0;
        setSkyState({
          tilted: effectivePitch > 0,
          stars: config.sky.starsEnabled,
          sun: config.sky.sunEnabled,
          bearing: effectiveBearing,
        });

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
    if (pitch !== undefined) {
      mapRef.current.setPitch(pitch);
      setSkyState((s) => ({ ...s, tilted: pitch > 0 }));
    }
    if (bearing !== undefined) {
      mapRef.current.setBearing(bearing);
      setSkyState((s) => ({ ...s, bearing }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], zoom, pitch, bearing, loaded]);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <SkyOverlays showStars={sky.tilted && sky.stars} showSun={sky.tilted && sky.sun} bearing={sky.bearing} />
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
