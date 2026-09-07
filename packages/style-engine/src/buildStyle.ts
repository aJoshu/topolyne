import type { LayerSpecification, SourceSpecification, StyleSpecification } from "maplibre-gl";
import type { MapConfig } from "@topolyne/config-schema";
import type { MapProviderConfig } from "./providers.js";
import { darken, lighten, mix, readableInk, withAlpha } from "./colorUtils.js";
import { DEFAULT_CONTOUR_THRESHOLDS, type ContourSourceHandle } from "./contours.js";

export interface BuildStyleOptions {
  /**
   * Result of `setupContourSource()`, created once client-side. Omit (e.g.
   * during a server-side render or a build without terrain configured) and
   * contour layers are simply left out, even if `config.terrain.contours`
   * is true — degrade gracefully rather than throw.
   */
  contourSource?: ContourSourceHandle;
}

/**
 * The single function that turns a Topolyne MapConfig into a real MapLibre
 * style. This is the whole product, architecturally speaking: the config
 * schema and the editor UI only ever describe intent ("roads should look
 * like this", "show hillshade at 0.6 intensity") — every OpenMapTiles
 * source-layer name, every zoom-interpolated width, every derived shadow
 * tone lives here and only here. Change tile providers, add a layer, tune a
 * preset's relief — this file, nothing upstream of it.
 */
export function buildMapStyle(
  config: MapConfig,
  provider: MapProviderConfig,
  options: BuildStyleOptions = {},
): StyleSpecification {
  const sources: Record<string, SourceSpecification> = {
    openmaptiles: {
      type: "vector",
      ...("url" in provider.vectorTiles
        ? { url: provider.vectorTiles.url }
        : { tiles: provider.vectorTiles.tiles, maxzoom: provider.vectorTiles.maxzoom ?? 14 }),
    },
  };

  const wantsTerrainSources = config.terrain.enabled && !!provider.demTiles;
  if (wantsTerrainSources && provider.demTiles) {
    sources.dem = {
      type: "raster-dem",
      tiles: provider.demTiles.tiles,
      tileSize: 256,
      maxzoom: provider.demTiles.maxzoom,
      encoding: provider.demTiles.encoding,
    };
  }

  const wantsContours = wantsTerrainSources && config.terrain.contours && !!options.contourSource;
  if (wantsContours && options.contourSource) {
    sources.contours = {
      type: "vector",
      tiles: [
        options.contourSource.contourProtocolUrl({
          thresholds: DEFAULT_CONTOUR_THRESHOLDS,
          contourLayer: "contours",
          elevationKey: "ele",
          levelKey: "level",
        }),
      ],
      maxzoom: 15,
    };
  }

  const layers: LayerSpecification[] = [
    ...backgroundLayers(config),
    ...(wantsTerrainSources ? hillshadeLayers(config) : []),
    ...areaLayers(config),
    ...(wantsContours ? contourLayers(config) : []),
    ...buildingLayers(config),
    ...roadLayers(config),
    ...borderLayers(config),
    ...labelLayers(config),
  ];

  // Real 3D terrain (MapLibre deforming the mesh itself, not just a shaded
  // flat texture) only when there's actually a tilt to see it from — at
  // pitch 0 you're looking straight down, where deformed terrain and flat
  // terrain with the same hillshade look identical, so there's no reason to
  // pay the extra render cost. `hillshadeLayers` above still draws its
  // shaded texture regardless; it lays over the deformed mesh perfectly
  // fine when terrain is also on.
  const wantsRealTerrain = wantsTerrainSources && (config.location.pitch ?? 0) > 0;
  // Sky is just a color gradient — unlike terrain it needs no DEM data, so
  // it's available even without a MapTiler key. Still only worth including
  // once tilted: at pitch 0 you're looking straight down and MapLibre never
  // shows any sky at all, whatever this says.
  const wantsSky = (config.location.pitch ?? 0) > 0;

  return {
    version: 8,
    name: `Topolyne — ${config.name}`,
    glyphs: provider.glyphsUrl,
    // MapLibre's style validator wants this key entirely absent when there's
    // no sprite, not present-with-value-undefined — hence the conditional
    // spread rather than `sprite: provider.spriteUrl`.
    ...(provider.spriteUrl ? { sprite: provider.spriteUrl } : {}),
    sources,
    layers,
    center: [config.location.longitude, config.location.latitude],
    zoom: config.location.zoom,
    pitch: config.location.pitch ?? 0,
    bearing: config.location.bearing ?? 0,
    // 1x is true-to-scale; anything past ~1.8x starts looking like spikes
    // rather than real mountains, so intensity only stretches into that
    // moderate range instead of all the way to 3x.
    ...(wantsRealTerrain ? { terrain: { source: "dem", exaggeration: 1 + config.terrain.intensity * 0.8 } } : {}),
    ...(wantsSky ? { sky: { "sky-color": config.sky.color, "horizon-color": config.sky.horizonColor } } : {}),
  };
}

function backgroundLayers(config: MapConfig): LayerSpecification[] {
  return [
    {
      id: "background",
      type: "background",
      paint: { "background-color": config.colors.background },
    },
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      paint: { "fill-color": config.colors.land, "fill-opacity": 1 },
    },
    {
      id: "landuse",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      paint: { "fill-color": mix(config.colors.land, config.colors.background, 0.3), "fill-opacity": 0.6 },
    },
  ];
}

function hillshadeLayers(config: MapConfig): LayerSpecification[] {
  const shadow = darken(config.colors.land, 0.45);
  const highlight = lighten(config.colors.land, 0.35);
  const intensity = config.terrain.hillshade ? config.terrain.intensity : 0;
  return [
    {
      id: "hillshade",
      type: "hillshade",
      source: "dem",
      paint: {
        "hillshade-exaggeration": 0.3 + intensity * 0.7,
        "hillshade-shadow-color": shadow,
        "hillshade-highlight-color": highlight,
        "hillshade-accent-color": mix(shadow, config.colors.background, 0.5),
        "hillshade-illumination-direction": 315,
      },
      layout: { visibility: config.terrain.hillshade ? "visible" : "none" },
    },
  ];
}

function contourLayers(config: MapConfig): LayerSpecification[] {
  const ink = mix(config.colors.land, config.roads.local, 0.55);
  const baseOpacity = 0.25 + config.terrain.intensity * 0.35;
  return [
    {
      id: "contours-minor",
      type: "line",
      source: "contours",
      "source-layer": "contours",
      filter: ["==", ["get", "level"], 0],
      paint: {
        "line-color": ink,
        "line-width": 0.6,
        "line-opacity": baseOpacity,
      },
    },
    {
      id: "contours-major",
      type: "line",
      source: "contours",
      "source-layer": "contours",
      filter: ["==", ["get", "level"], 1],
      paint: {
        "line-color": ink,
        "line-width": 1,
        "line-opacity": Math.min(1, baseOpacity + 0.25),
      },
    },
    {
      id: "contours-label",
      type: "symbol",
      source: "contours",
      "source-layer": "contours",
      filter: ["==", ["get", "level"], 1],
      layout: {
        "symbol-placement": "line",
        "text-field": ["concat", ["to-string", ["get", "ele"]], "m"],
        "text-size": 10,
        "text-font": ["Noto Sans Regular"],
      },
      paint: {
        "text-color": ink,
        "text-halo-color": config.colors.background,
        "text-halo-width": 1,
      },
      minzoom: 12,
    },
  ];
}

function areaLayers(config: MapConfig): LayerSpecification[] {
  const layers: LayerSpecification[] = [];
  if (config.layers.parks) {
    layers.push({
      id: "parks",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": config.colors.parks, "fill-opacity": 0.85 },
    });
  }
  if (config.layers.water) {
    layers.push(
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": config.colors.water },
      },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        filter: ["!=", ["get", "brunnel"], "tunnel"],
        paint: {
          "line-color": config.colors.water,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 16, 3],
        },
      },
    );
  }
  return layers;
}

function buildingLayers(config: MapConfig): LayerSpecification[] {
  if (!config.layers.buildings) return [];

  if (config.layers.buildings3d) {
    return [
      {
        id: "buildings",
        type: "fill-extrusion",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": config.colors.buildings,
          // OpenMapTiles' `render_height` is in meters and absent for a
          // fraction of buildings in most regions — coalesce to a modest
          // fallback so those don't render as flat (height 0) extrusions.
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.92],
        },
      },
    ];
  }

  return [
    {
      id: "buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-color": config.colors.buildings,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.9],
        "fill-outline-color": mix(config.colors.buildings, "#000000", 0.15),
      },
    },
  ];
}

interface RoadClassSpec {
  id: string;
  classes: string[];
  color: string;
  crispWidth: [number, number, number, number]; // z1,w1,z2,w2 interpolation stops
  minzoom?: number;
}

function roadLayers(config: MapConfig): LayerSpecification[] {
  if (!config.roads.visible) return [];

  const specs: RoadClassSpec[] = [
    { id: "motorway", classes: ["motorway", "trunk"], color: config.roads.motorway, crispWidth: [5, 0.6, 16, 5] },
    { id: "primary", classes: ["primary"], color: config.roads.primary, crispWidth: [8, 0.5, 16, 4], minzoom: 6 },
    {
      id: "secondary",
      classes: ["secondary", "tertiary"],
      color: config.roads.secondary,
      crispWidth: [9, 0.4, 16, 3],
      minzoom: 8,
    },
    {
      id: "local",
      classes: ["minor", "service", "track"],
      color: config.roads.local,
      crispWidth: [13, 0.3, 18, 2],
      minzoom: 13,
    },
  ];

  const layers: LayerSpecification[] = [];
  for (const spec of specs) {
    // `minzoom: undefined` fails MapLibre's style validator (it wants the
    // key entirely absent, not present-with-undefined), so spread it in
    // conditionally rather than assigning it directly.
    const minzoomProp = spec.minzoom !== undefined ? { minzoom: spec.minzoom } : {};

    if (config.roads.glow) {
      layers.push({
        id: `road-${spec.id}-glow`,
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", spec.classes]],
        ...minzoomProp,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": spec.color,
          // A zoom expression (inside `interpolate`) can only be the
          // top-level paint value — it can't be nested inside another
          // expression like `["*", interpolateExpr, 3]`. So the "glow" width
          // is its own interpolate with pre-multiplied stops, not the crisp
          // width wrapped in a multiply. `config.roads.scale` (the editor's
          // "Road width" slider) is folded into that same pre-multiplication.
          "line-width": widthExpression(spec.crispWidth, 3 * config.roads.scale),
          "line-blur": 6,
          "line-opacity": 0.35,
        },
      });
    }

    layers.push({
      id: `road-${spec.id}`,
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", spec.classes]],
      ...minzoomProp,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": spec.color,
        "line-width": widthExpression(spec.crispWidth, config.roads.scale),
      },
    });
  }
  return layers;
}

/** A zoom-interpolated line width, e.g. thin at low zoom, thicker up close. */
function widthExpression(stops: [number, number, number, number], multiplier = 1) {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    stops[0],
    stops[1] * multiplier,
    stops[2],
    stops[3] * multiplier,
  ] as unknown as number;
}

function borderLayers(config: MapConfig): LayerSpecification[] {
  const layers: LayerSpecification[] = [];
  const ink = mix(config.roads.local, config.colors.buildings, 0.4);
  if (config.borders.country) {
    layers.push({
      id: "border-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 2],
      layout: { "line-join": "round" },
      paint: {
        "line-color": ink,
        "line-width": 1.2,
        "line-dasharray": [3, 2],
      },
    });
  }
  if (config.borders.region) {
    layers.push({
      id: "border-region",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 4],
      layout: { "line-join": "round" },
      paint: {
        "line-color": withAlpha(ink, 0.5),
        "line-width": 0.8,
        "line-dasharray": [1, 2],
      },
    });
  }
  return layers;
}

/**
 * Scales a static text-size, or the output stops of a zoom-interpolated one,
 * by the editor's "Text size" slider. Cast to `number` at call sites since
 * MapLibre's `text-size` accepts either a plain number or an expression
 * array, and the expression-builder types don't model that union cleanly.
 */
function scaledTextSize(base: number | unknown[], scale: number): number {
  if (typeof base === "number") return (base * scale) as number;
  const [op, interp, input, ...stops] = base as [string, unknown, unknown, ...number[]];
  const scaledStops = stops.map((v, i) => (i % 2 === 1 ? v * scale : v));
  return [op, interp, input, ...scaledStops] as unknown as number;
}

function labelLayers(config: MapConfig): LayerSpecification[] {
  const { text, halo } = readableInk(config.colors.background);
  const scale = config.labels.scale;
  const layers: LayerSpecification[] = [];

  if (config.labels.poi) {
    layers.push({
      id: "poi-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "poi",
      minzoom: 15,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": scaledTextSize(10, scale) as number,
        "text-anchor": "top",
        "text-offset": [0, 0.6],
      },
      paint: { "text-color": mix(text, config.colors.background, 0.2), "text-halo-color": halo, "text-halo-width": 1 },
    });
  }

  if (config.labels.roads) {
    layers.push({
      id: "road-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": scaledTextSize(10, scale) as number,
      },
      paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1 },
    });
  }

  if (config.labels.cities) {
    layers.push(
      {
        id: "place-label-city",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": scaledTextSize(["interpolate", ["linear"], ["zoom"], 4, 11, 12, 18], scale) as number,
          "text-letter-spacing": 0.05,
        },
        paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.4 },
      },
      {
        id: "place-label-village",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["village", "suburb"]]],
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": scaledTextSize(11, scale) as number,
        },
        paint: { "text-color": mix(text, config.colors.background, 0.25), "text-halo-color": halo, "text-halo-width": 1 },
      },
    );
  }

  return layers;
}
