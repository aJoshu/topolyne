# @topolyne/config-schema

The Topolyne map config format — a [zod](https://zod.dev) schema plus the TypeScript types
inferred from it. This is the only thing that crosses the wire between the Topolyne editor,
the hosted map storage, and `@topolyne/react`. It never mentions MapLibre layer IDs, source
names, or raw style-spec JSON — that translation lives in `@topolyne/style-engine`, so the
underlying tile provider or renderer can change without ever breaking a saved map or an embed.

Most apps consuming a published map never need this package directly — `@topolyne/react`
handles fetching and validating configs for you. Reach for `@topolyne/config-schema` when
you're validating or constructing a `MapConfig` yourself: building an alternate editor,
writing a script against the `/api/maps` storage format, or type-checking config you generate
programmatically.

```bash
npm install @topolyne/config-schema
```

## Parsing a config

```ts
import { parseMapConfig, safeParseMapConfig } from "@topolyne/config-schema";

// Throws a ZodError if `input` doesn't match the schema.
const config = parseMapConfig(input);

// Never throws — returns { success: true, data } or { success: false, error }.
const result = safeParseMapConfig(input);
if (result.success) {
  console.log(result.data.name);
}
```

## The `MapConfig` shape

```ts
interface MapConfig {
  version: 1;
  presetId: string;       // id of the preset this design started from
  name: string;           // 1-120 chars, defaults to "Untitled map"
  location: Location;
  terrain: Terrain;
  colors: Colors;
  roads: Roads;
  borders: Borders;
  labels: Labels;
  layers: Layers;
  sky: Sky;
  markers: Marker[];      // max 20, see MAX_MARKERS
}
```

Every nested piece is exported both as a zod schema (`locationSchema`, `terrainSchema`, etc.)
and as its inferred TypeScript type (`Location`, `Terrain`, etc.), so you can validate raw
input and/or annotate your own code with the same shape:

| Type | Fields |
| --- | --- |
| `Location` | `longitude` (-180 to 180), `latitude` (-85 to 85), `zoom` (0-22), `pitch` (0-85, default 0), `bearing` (-180 to 180, default 0) |
| `Terrain` | `enabled`, `hillshade` (booleans, default true/true), `contours` (default false), `intensity` (0-1, default 0.6), `satellite` (default false — real aerial imagery as the base layer instead of styled colors) |
| `Colors` | `background`, `land`, `water`, `parks`, `buildings` — hex color strings |
| `Roads` | `visible` (default true), `motorway`, `primary`, `secondary`, `local` (hex colors), `glow` (default false), `scale` (0.5-2, default 1) |
| `Borders` | `country` (default true), `region` (default false) |
| `Labels` | `cities` (default true), `roads` (default false), `poi` (default false), `scale` (0.7-1.5, default 1) |
| `Layers` | `buildings` (default true), `parks` (default true), `water` (default true), `buildings3d` (default false) |
| `Sky` | `color` (default `#87CEEB`), `horizonColor` (default `#FFFFFF`), `grainEnabled` (default false) — only visible once the map is tilted |
| `Marker` | `id`, `longitude` (-180 to 180), `latitude` (-85 to 85), `label` (max 80 chars, default `""`) |

`MAX_MARKERS` (currently `20`) is the cap `mapConfigSchema` enforces on `markers.length`.

`CONFIG_FORMAT_VERSION` (currently `1`) is the literal value `MapConfig["version"]` is pinned
to — bump it if the schema ever needs a breaking change, so old and new configs can be told
apart.

## `PublishedMap`

What the public `/api/maps/:id` endpoint (and therefore `@topolyne/react`) actually returns —
a `MapConfig` wrapped with the id and metadata a consuming app needs:

```ts
interface PublishedMap {
  mapId: string;
  version: number;
  config: MapConfig;
  updatedAt: string;
}
```

## Requirements

- [zod](https://zod.dev) 3.x (a direct dependency, installed automatically)

## License

MIT
