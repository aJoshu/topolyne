/** Small dependency-free hex color helpers used to derive secondary tones
 * (hillshade shadow/highlight, border ink, label color) from the handful of
 * colors a preset/config actually exposes, so we don't need a dozen more
 * config fields just to keep a map internally coherent. */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function mix(hexA: string, hexB: string, weight: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex([
    a[0] * (1 - w) + b[0] * w,
    a[1] * (1 - w) + b[1] * w,
    a[2] * (1 - w) + b[2] * w,
  ]);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

/** Relative luminance, 0 (black) – 1 (white), used to pick readable label ink. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** A readable ink color (near-black or near-white) for text/borders against `background`. */
export function readableInk(background: string): { text: string; halo: string } {
  const isLight = luminance(background) > 0.45;
  return {
    text: isLight ? darken(background, 0.82) : lighten(background, 0.92),
    halo: background,
  };
}
