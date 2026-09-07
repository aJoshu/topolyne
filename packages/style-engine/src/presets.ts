import type { Colors, Layers, MapConfig, Roads, Sky, Terrain } from "@topolyne/config-schema";
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
  sky: Sky;
}

/**
 * Eight presets, each a genuinely different design decision across every
 * dimension (palette, road treatment, whether terrain relief is even part of
 * the look, border/label density, and now 3D buildings + road/label scale) —
 * not a single template with the background colour swapped. `Terrain`,
 * `Midnight Terrain`, `Forest Canopy` and `Arctic` lean on real hillshade +
 * contour relief, which is the concrete capability Terraink's own output
 * does not have. `Neon Grid` leans on real 3D building extrusion instead.
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
    sky: { color: "#A8D5E8", horizonColor: "#F5EFE0", sunEnabled: false, starsEnabled: false },
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
    sky: { color: "#050914", horizonColor: "#1A2740", sunEnabled: false, starsEnabled: true },
  },
  {
    id: "paper-atlas",
    name: "Paper Atlas",
    description: "Cream paper and ink linework, contour lines only — no shading, the way a printed atlas plate reads.",
    swatches: ["#F7F2E7", "#CFE0DE", "#3B3226"],
    colors: {
      background: "#F7F2E7",
      land: "#F1EAD8",
      water: "#CFE0DE",
      parks: "#DCE3C8",
      buildings: "#E7DCC0",
    },
    roads: {
      visible: true,
      motorway: "#3B3226",
      primary: "#4F4536",
      secondary: "#8B7F68",
      local: "#B8AD97",
      glow: false,
      scale: 1,
    },
    terrain: { enabled: true, hillshade: false, contours: true, intensity: 0.35 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: true },
    labels: { cities: true, roads: false, poi: false, scale: 1 },
    sky: { color: "#DCE8E6", horizonColor: "#F7F2E7", sunEnabled: false, starsEnabled: false },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool monochrome, flat by design — for dashboards and product UI where the map should stay quiet.",
    swatches: ["#F5F6F7", "#D7DEE3", "#2B3440"],
    colors: {
      background: "#F5F6F7",
      land: "#EDEFF1",
      water: "#D7DEE3",
      parks: "#E3E7E1",
      buildings: "#E1E4E7",
    },
    roads: {
      visible: true,
      motorway: "#2B3440",
      primary: "#4B5563",
      secondary: "#94A0AC",
      local: "#C4CBD2",
      glow: false,
      scale: 1,
    },
    terrain: { enabled: false, hillshade: false, contours: false, intensity: 0 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: false },
    labels: { cities: true, roads: false, poi: false, scale: 1 },
    sky: { color: "#D7DEE3", horizonColor: "#F5F6F7", sunEnabled: false, starsEnabled: false },
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
    sky: { color: "#F5D9A8", horizonColor: "#F2E2C8", sunEnabled: true, starsEnabled: false },
  },
  {
    id: "arctic",
    name: "Arctic",
    description: "Near-white ice tones with the faintest relief — built for cold, high-latitude places.",
    swatches: ["#F4FAFC", "#BFE0EC", "#3A6EA5"],
    colors: {
      background: "#F4FAFC",
      land: "#E7F2F6",
      water: "#BFE0EC",
      parks: "#DCEDE7",
      buildings: "#D7E6EC",
    },
    roads: {
      visible: true,
      motorway: "#3A6EA5",
      primary: "#5A87B5",
      secondary: "#8FAFC9",
      local: "#C3D6E2",
      glow: false,
      scale: 0.85,
    },
    terrain: { enabled: true, hillshade: true, contours: true, intensity: 0.3 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: false },
    labels: { cities: true, roads: false, poi: false, scale: 0.95 },
    sky: { color: "#DCEEF7", horizonColor: "#F4FAFC", sunEnabled: false, starsEnabled: false },
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    description: "Near-black with glowing neon roads and real 3D buildings — a city map for after dark.",
    swatches: ["#05040A", "#00E5FF", "#FF2ED1"],
    colors: {
      background: "#05040A",
      land: "#0D0B1A",
      water: "#0A0818",
      parks: "#0F1A14",
      buildings: "#171330",
    },
    roads: {
      visible: true,
      motorway: "#FF2ED1",
      primary: "#00E5FF",
      secondary: "#7B61FF",
      local: "#3A3560",
      glow: true,
      scale: 1.1,
    },
    terrain: { enabled: false, hillshade: false, contours: false, intensity: 0 },
    layers: { buildings: true, parks: true, water: true, buildings3d: true },
    borders: { country: false, region: false },
    labels: { cities: true, roads: false, poi: true, scale: 1.05 },
    sky: { color: "#050208", horizonColor: "#0D0B1A", sunEnabled: false, starsEnabled: true },
  },
  {
    id: "forest-canopy",
    name: "Forest Canopy",
    description: "Deep canopy greens with strong mountain relief — for wooded, mountainous terrain.",
    swatches: ["#1B2B1E", "#2E4A2A", "#D9A441"],
    colors: {
      background: "#1B2B1E",
      land: "#213823",
      water: "#16302E",
      parks: "#2E4A2A",
      buildings: "#3A3226",
    },
    roads: {
      visible: true,
      motorway: "#D9A441",
      primary: "#C68A38",
      secondary: "#8F6B34",
      local: "#4F4530",
      glow: false,
      scale: 1,
    },
    terrain: { enabled: true, hillshade: true, contours: true, intensity: 0.7 },
    layers: { buildings: true, parks: true, water: true, buildings3d: false },
    borders: { country: true, region: true },
    labels: { cities: true, roads: false, poi: false, scale: 1 },
    sky: { color: "#3A5A45", horizonColor: "#213823", sunEnabled: false, starsEnabled: false },
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
    sky: preset.sky,
  };
}
