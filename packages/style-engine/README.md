# @topolyne/style-engine

Translates a Topolyne [`MapConfig`](https://www.npmjs.com/package/@topolyne/config-schema)
into a real [MapLibre GL](https://maplibre.org/maplibre-gl-js/docs/) style, plus the presets,
provider config, geocoding, directions, and color helpers behind the Topolyne editor and
`@topolyne/react`.

Most apps just embedding a published map never need this package — `@topolyne/react` calls
into it for you. Reach for `@topolyne/style-engine` directly if you're building your own editor
or renderer against the Topolyne config format, self-hosting the tile/terrain/geocoding/routing
providers, or want the standalone color utilities.

```bash
npm install @topolyne/style-engine
```

## Building a style

```ts
import { buildMapStyle, defaultProvider } from "@topolyne/style-engine";
import type { MapConfig } from "@topolyne/config-schema";

const style = buildMapStyle(config as MapConfig, defaultProvider);
// style is a real maplibre-gl StyleSpecification — hand it straight to `new maplibregl.Map({ style, ... })`
```

`buildMapStyle(config, provider, options?)` is the single function that turns semantic config
("roads should look like this", "show hillshade at 0.6 intensity") into concrete MapLibre
sources and layers — every OpenMapTiles source-layer name and zoom-interpolated width lives
here. Pass a `contourSource` (see below) in `options` to include contour lines when
`config.terrain.contours` is on; omitted, terrain/contour features degrade gracefully instead
of throwing.

## Presets

```ts
import { presets, getPreset, configFromPreset } from "@topolyne/style-engine";

presets;                 // Preset[] — all 8 built-in presets, for a theme picker
getPreset("terrain");    // Preset — throws if the id is unknown
configFromPreset("terrain", location, "My trip");  // MapConfig
```

Eight built-in presets ship today — `terrain`, `midnight-terrain`, `paper-atlas`, `slate`,
`sandstone`, `arctic`, `neon-grid`, `forest-canopy` — each a distinct design decision across
palette, road treatment, terrain relief, and border/label density, not one template with the
background color swapped. A `Preset` carries `id`, `name`, `description`, three `swatches` for
a thumbnail, and the same `colors`/`roads`/`terrain`/`layers`/`borders`/`labels` shape a
`MapConfig` uses. `configFromPreset(presetId, location, name?)` builds a full `MapConfig` by
applying a preset to a searched-to location.

## Providers

```ts
import { defaultProvider, withProviderOverrides } from "@topolyne/style-engine";

const provider = withProviderOverrides({
  vectorTiles: { url: "https://tiles.example.com/planet" },
});
```

`MapProviderConfig` is the one place that names outside tile/data vendors — presets and the
rest of the style engine only ever talk about semantic config. `defaultProvider` points at
OpenFreeMap for vector tiles, MapTiler terrain-RGB for elevation (only when
`NEXT_PUBLIC_MAPTILER_API_KEY` is set in the environment — otherwise `demTiles` is left
`undefined` and terrain layers are skipped), Nominatim for geocoding, and OpenRouteService for
directions. Note the `NEXT_PUBLIC_` prefix: `buildMapStyle()` runs client-side wherever
`defaultProvider` is used, so the key needs to reach the browser bundle — this is the same
trust model MapTiler (and Mapbox) already design their keys for, restricting abuse by domain
rather than by secrecy. `withProviderOverrides`
shallow-merges your overrides onto the default, so swapping one provider (say, a self-hosted
OpenMapTiles server) means passing one field, not reconstructing the whole object. Routing and
geocoding API keys are never part of this object since it ships into the browser bundle — see
Directions and Geocoding below.

## Terrain contours

```ts
import { setupContourSource, DEFAULT_CONTOUR_THRESHOLDS } from "@topolyne/style-engine";
import maplibregl from "maplibre-gl";

const contourSource = await setupContourSource(provider, maplibregl);
const style = buildMapStyle(config, provider, { contourSource });
```

`setupContourSource` wraps [`maplibre-contour`](https://github.com/onthegomap/maplibre-contour):
it registers a `mlcontour://` protocol and spins up a Web Worker, so it's browser-only and must
run once, client-side, against a live `maplibre-gl` module — never during server-side style
generation. Returns `undefined` when `provider.demTiles` isn't configured. `DEFAULT_CONTOUR_THRESHOLDS`
is the zoom-to-interval map (`{ 9: 500, 11: 200, 12: 100, 14: 50, 16: 20 }`) `buildMapStyle`
uses when drawing contour lines.

## Geocoding

```ts
import { searchLocation, zoomForBoundingBox } from "@topolyne/style-engine";

const results = await searchLocation("Belfast", provider, { limit: 5 });
// [{ label, latitude, longitude, boundingBox? }, ...]

zoomForBoundingBox(results[0].boundingBox!); // rough zoom for "fly to this result"
```

`searchLocation` calls the Nominatim-compatible endpoint in `provider.geocode`. Nominatim's
usage policy requires a descriptive `User-Agent` and forbids heavy client-side polling, so call
this from a server route, not directly from the browser (mirrored by `apps/web`'s
`/api/geocode`).

## Directions

```ts
import { fetchRoute, defaultProvider } from "@topolyne/style-engine";

const route = await fetchRoute(
  [-5.9301, 54.5964],
  [-5.9081, 54.6031],
  defaultProvider,
  { apiKey: process.env.ORS_API_KEY!, profile: "driving-car" },
);
// { coordinates: [number, number][], distanceMeters, durationSeconds }
```

`fetchRoute(origin, destination, provider, opts)` calls
[OpenRouteService](https://openrouteservice.org/)'s directions API and returns a route ready to
draw as a GeoJSON line. `opts.profile` defaults to `"driving-car"` — also accepts
`"cycling-regular"` and `"foot-walking"`. `opts.waypoints` adds stops in between. OpenRouteService
needs a secret API key, so — exactly like geocoding — this must be called from a server route,
never from the browser (mirrored by `apps/web`'s `/api/directions`, which is what
`@topolyne/react`'s `<MapRoute>` actually calls).

## Color utilities

Small, dependency-free hex color helpers used to derive secondary tones (hillshade
shadow/highlight, border ink, label color) from the handful of colors a config exposes:

```ts
import { mix, lighten, darken, luminance, withAlpha, readableInk } from "@topolyne/style-engine";

mix("#ffffff", "#000000", 0.5);   // "#808080"
lighten("#336699", 0.2);          // blend toward white
darken("#336699", 0.2);           // blend toward black
luminance("#336699");             // 0 (black) - 1 (white)
withAlpha("#336699", 0.5);        // "rgba(51, 102, 153, 0.5)"
readableInk("#336699");           // { text, halo } - readable label ink for this background
```

## Requirements

- [`maplibre-gl`](https://maplibre.org/maplibre-gl-js/) ^4.7.1 (peer dependency)
- `@topolyne/config-schema` (installed automatically)

## License

MIT
