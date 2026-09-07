"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import { useTopolyneMap } from "./context.js";

export interface MapMarkerProps {
  latitude: number;
  longitude: number;
  /** Anchor point on your custom marker element, MapLibre's terms. Defaults to "bottom" (pin-style). */
  anchor?: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  onClick?: () => void;
  /** Your own marker content — an icon, an avatar, a price tag. Falls back to MapLibre's default pin if omitted. */
  children?: ReactNode;
}

/** A marker anchored to the map. Must be rendered inside `<Map>`. */
export function MapMarker({ latitude, longitude, anchor = "bottom", onClick, children }: MapMarkerProps) {
  const { map } = useTopolyneMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const hasCustomContent = Boolean(children);

  useEffect(() => {
    if (!map) return;

    const el = hasCustomContent ? document.createElement("div") : undefined;
    if (el) setPortalEl(el);

    const marker = new maplibregl.Marker(el ? { element: el, anchor } : { anchor })
      .setLngLat([longitude, latitude])
      .addTo(map);

    if (onClick) {
      const handler = () => onClick();
      marker.getElement().addEventListener("click", handler);
      markerRef.current = marker;
      return () => {
        marker.getElement().removeEventListener("click", handler);
        marker.remove();
      };
    }

    markerRef.current = marker;
    return () => {
      marker.remove();
      setPortalEl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, anchor, hasCustomContent]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  if (children && portalEl) {
    return createPortal(children, portalEl);
  }
  return null;
}
