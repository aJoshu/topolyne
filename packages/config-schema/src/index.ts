import { z } from "zod";

/**
 * The Topolyne map config format.
 *
 * This is the ONLY thing that crosses the wire between the editor, the hosted
 * map storage, and the React SDK. It never exposes MapLibre layer IDs, source
 * names, or raw style-spec JSON — that translation lives entirely inside
 * `@topolyne/style-engine`, so we can change tile/terrain providers or the
 * underlying renderer without breaking a single saved map or a single
 * `<Map mapId="..." />` embed.
 */

export const CONFIG_FORMAT_VERSION = 1 as const;

export const locationSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-85).max(85),
  zoom: z.number().min(0).max(22),
  pitch: z.number().min(0).max(85).default(0),
  bearing: z.number().min(-180).max(180).default(0),
});

export const terrainSchema = z.object({
  enabled: z.boolean().default(true),
  hillshade: z.boolean().default(true),
  contours: z.boolean().default(false),
  /** 0 = flat/off-feeling, 1 = maximum relief for the active preset's lighting design */
  intensity: z.number().min(0).max(1).default(0.6),
  /** Real aerial/satellite imagery as the base layer instead of styled vector colors — roads/borders/labels/buildings still render on top. Needs the same terrain-RGB provider key as elevation. */
  satellite: z.boolean().default(false),
});

export const colorsSchema = z.object({
  background: z.string(),
  land: z.string(),
  water: z.string(),
  parks: z.string(),
  buildings: z.string(),
});

export const roadsSchema = z.object({
  visible: z.boolean().default(true),
  motorway: z.string(),
  primary: z.string(),
  secondary: z.string(),
  local: z.string(),
  /** stylistic road treatment a preset can lean on, independent of raw color */
  glow: z.boolean().default(false),
  /** width multiplier applied on top of each class's base zoom-interpolated width — 1 = as designed */
  scale: z.number().min(0.5).max(2).default(1),
});

export const bordersSchema = z.object({
  country: z.boolean().default(true),
  region: z.boolean().default(false),
});

export const labelsSchema = z.object({
  cities: z.boolean().default(true),
  roads: z.boolean().default(false),
  poi: z.boolean().default(false),
  /** text-size multiplier applied across every label layer — 1 = as designed */
  scale: z.number().min(0.7).max(1.5).default(1),
});

export const layersSchema = z.object({
  buildings: z.boolean().default(true),
  parks: z.boolean().default(true),
  water: z.boolean().default(true),
  /** extrude buildings by real height instead of a flat fill — most striking with pitch > 0 */
  buildings3d: z.boolean().default(false),
});

/**
 * Only visible once the map is tilted (MapLibre's own sky/fog system doesn't
 * render at pitch 0, looking straight down) — same rule 3D terrain follows.
 * Sun and stars aren't a real MapLibre capability (no atmosphere/celestial
 * rendering in its sky spec, unlike Mapbox's), so those are fabricated as a
 * CSS overlay in the app rather than real 3D-rendered geometry.
 */
export const skySchema = z.object({
  color: z.string().default("#87CEEB"),
  horizonColor: z.string().default("#FFFFFF"),
  grainEnabled: z.boolean().default(false),
});

export const mapConfigSchema = z.object({
  version: z.literal(CONFIG_FORMAT_VERSION).default(CONFIG_FORMAT_VERSION),
  /** id of the preset this design started from — kept even after edits, for provenance/UI */
  presetId: z.string(),
  name: z.string().min(1).max(120).default("Untitled map"),
  location: locationSchema,
  terrain: terrainSchema,
  colors: colorsSchema,
  roads: roadsSchema,
  borders: bordersSchema,
  labels: labelsSchema,
  layers: layersSchema,
  sky: skySchema.default({}),
});

export type Location = z.infer<typeof locationSchema>;
export type Terrain = z.infer<typeof terrainSchema>;
export type Colors = z.infer<typeof colorsSchema>;
export type Roads = z.infer<typeof roadsSchema>;
export type Borders = z.infer<typeof bordersSchema>;
export type Labels = z.infer<typeof labelsSchema>;
export type Layers = z.infer<typeof layersSchema>;
export type Sky = z.infer<typeof skySchema>;
export type MapConfig = z.infer<typeof mapConfigSchema>;

/** What the public `/api/maps/:id` (and therefore the React SDK) actually returns. */
export interface PublishedMap {
  mapId: string;
  version: number;
  config: MapConfig;
  updatedAt: string;
}

export function parseMapConfig(input: unknown): MapConfig {
  return mapConfigSchema.parse(input);
}

export function safeParseMapConfig(input: unknown) {
  return mapConfigSchema.safeParse(input);
}
