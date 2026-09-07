import type { Colors, Layers, MapConfig, Roads, Terrain } from "@topolyne/config-schema";
import { CONFIG_FORMAT_VERSION } from "@topolyne/config-schema";

export interface Preset {
  id: string;
  name: string;
  /** shown under the theme name in the picker, same spirit as Terraink's one-liners */
  description: string;
  /** 3 swatches for the theme-picker thumbnail: [background, land/water, road accent] */
  swatches: [string, string, string];
  colors: Colors;
  roads: Roads;
  terrain: Terrain;
  layers: Layers;
  borders: MapConfig["borders"];
  labels: MapConfig["labels"];
}

/**
 * Three presets, each a genuinely different design decision across every
 * dimension (palette, road treatment, whether terrain relief is even part of
 * the look, border/label density) — not a single template with the
 * background colour swapped. `Terrain` and `Midnight Terrain` lean on real
 * hillshade + contour relief, which is the concrete capability Terraink's
 * own output does not have.
 */
export const presets: Preset[] = [
  {
    id: "terrain",
    name: "Terrain",
    description: "Parchment tones with real hillshade and contour relief — a working topographic map, not a poster.",
    swatches: ["#EDE6D6", "#A9C6C0", "#B5651D"],
    colors: {
      background: "#EDE6D6",
      land: "#E4DCC5",
      water: "#A9C6C0",
      parks: "#C9D4B0",
      buildings: "#D8CBAE",
    },
    roads: {
      visible: true,
      motorway: "#B5651D",
      primary: "#C17F4A",
      secondary: "#CBA579",
      local: "#D9C9A8",
      glow: false,
      scale: 1,
    },
    terrain: { enabled: true, hillshade: true, contours: true, intensity: 0.75 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: false },
    labels: { cities: true, roads: false, poi: false, scale: 1 },
  },
  {
    id: "midnight-terrain",
    name: "Midnight Terrain",
    description: "Near-black navy with gold glowing roads and moonlit relief — luxury atlas mood, real elevation underneath.",
    swatches: ["#0B1220", "#081019", "#E8B04B"],
    colors: {
      background: "#0B1220",
      land: "#0F1B2E",
      water: "#081019",
      parks: "#122A22",
      buildings: "#16233A",
    },
    roads: {
      visible: true,
      motorway: "#E8B04B",
      primary: "#C98F3B",
      secondary: "#8C6A35",
      local: "#4A4128",
      glow: true,
      scale: 1,
    },
    terrain: { enabled: true, hillshade: true, contours: true, intensity: 0.5 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: false },
    labels: { cities: true, roads: false, poi: false, scale: 1 },
  },
  {
    id: "sandstone",
    name: "Sandstone",
    description: "Warm ochre and rust across dry terrain — canyon country, sun-baked and quiet.",
    swatches: ["#F2E2C8", "#C9B48A", "#B23A1C"],
    colors: {
      background: "#F2E2C8",
      land: "#EAD5AA",
      water: "#C9B48A",
      parks: "#D9C48F",
      buildings: "#E0C08E",
    },
    roads: {
      visible: true,
      motorway: "#B23A1C",
      primary: "#C4602E",
      secondary: "#CE8A52",
      local: "#DDB27E",
      glow: false,
      scale: 1,
    },
    terrain: { enabled: true, hillshade: true, contours: false, intensity: 0.6 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: false },
    labels: { cities: true, roads: false, poi: false, scale: 1 },
  },
];

export function getPreset(id: string): Preset {
  const preset = presets.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset "${id}"`);
  return preset;
}

/** Build a full MapConfig by applying a preset to a searched-to location. */
export function configFromPreset(
  presetId: string,
  location: MapConfig["location"],
  name = "Untitled map",
): MapConfig {
  const preset = getPreset(presetId);
  return {
    version: CONFIG_FORMAT_VERSION,
    presetId: preset.id,
    name,
    location,
    terrain: preset.terrain,
    colors: preset.colors,
    roads: preset.roads,
    borders: preset.borders,
    labels: preset.labels,
    layers: preset.layers,
  };
}
