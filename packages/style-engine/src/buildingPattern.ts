import { darken, lighten, luminance } from "./colorUtils.js";

/** The image id every buildings3d style references via `fill-extrusion-pattern`. */
export const BUILDING_PATTERN_ID = "topolyne-building-windows";

/**
 * A tiny repeating window-grid facade texture, generated client-side from
 * the map's own building color rather than shipped as a static sprite —
 * a fixed asset can't be recolored to match whatever hex a preset or user
 * picks, and this app's whole point is that color is config, not a baked-in
 * style. Callers register the result via `map.addImage()`/`updateImage()`;
 * regenerate and re-register whenever `colors.buildings` changes.
 */
export function buildWindowPatternImage(buildingColor: string): { width: number; height: number; data: Uint8ClampedArray } {
  const cell = 16;
  const empty = { width: cell, height: cell, data: new Uint8ClampedArray(cell * cell * 4) };
  if (typeof document === "undefined") return empty; // server-side/build context — never actually called there

  const canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return empty;

  const isLight = luminance(buildingColor) > 0.5;
  const mortar = isLight ? darken(buildingColor, 0.15) : lighten(buildingColor, 0.15);
  const glass = isLight ? darken(buildingColor, 0.4) : lighten(buildingColor, 0.45);

  ctx.fillStyle = buildingColor;
  ctx.fillRect(0, 0, cell, cell);
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, cell, 1);
  ctx.fillRect(0, 0, 1, cell);
  ctx.fillStyle = glass;
  ctx.fillRect(3, 3, cell - 6, cell - 6);

  const { data } = ctx.getImageData(0, 0, cell, cell);
  return { width: cell, height: cell, data };
}

/** Adds or updates the pattern image on a live map instance — safe to call
 * repeatedly (e.g. after every style reload, and whenever the building
 * color changes) since it no-ops into an update once the image exists. */
export function registerWindowPattern(map: { hasImage(id: string): boolean; addImage(id: string, image: unknown): void; updateImage(id: string, image: unknown): void }, buildingColor: string): void {
  const image = buildWindowPatternImage(buildingColor);
  if (map.hasImage(BUILDING_PATTERN_ID)) {
    map.updateImage(BUILDING_PATTERN_ID, image);
  } else {
    map.addImage(BUILDING_PATTERN_ID, image);
  }
}
