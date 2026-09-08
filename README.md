# Topolyne

Design-first map platform for developers. Design a beautiful, terrain-quality map visually at
[topolyne.com](https://topolyne.com), publish it, and embed the exact result in a React app with
one component:

```tsx
import { Map } from "@topolyne/react";

<Map mapId="map_Nvm9w6Wn9d" />
```

See [`PLAN.md`](./PLAN.md) for the full research, naming, architecture and risk write-up behind
this. Short version: this is a from-scratch, original product inspired by [Terraink](https://terraink.app)'s
visual quality bar (restrained palettes, road hierarchy, typography), built on the same
open-data stack Terraink itself uses (MapLibre GL JS + OpenMapTiles + Nominatim), with
one deliberate addition Terraink's own output doesn't have: real hillshade and contour relief.

This repo is the **open-source SDK** — the packages you `npm install` to render a published map in
your own app. The hosted editor/dashboard at topolyne.com (where maps are designed and published)
lives in a separate private repo.

## Project layout

```
packages/config-schema    The public map config format (zod schema + TS types)
packages/style-engine     config -> MapLibre style translator, presets, providers, geocoding
packages/react            @topolyne/react — <Map mapId /> + <MapMarker> + <MapRoute>
```

## Installing

```bash
npm install @topolyne/react
```

```tsx
import { Map } from "@topolyne/react";

<Map mapId="map_xxxxxxxx" style={{ width: "100%", height: "500px" }} />;
```

Get a `map_...` id by designing and publishing a map at [topolyne.com](https://topolyne.com). By
default the SDK talks to `https://topolyne.com` — no configuration needed. Published edits reach
every embed without a redeploy (the SDK polls `/api/maps/:id` with short-TTL caching).

### Directions

```tsx
import { Map, MapRoute } from "@topolyne/react";

<Map mapId="map_Nvm9w6Wn9d" style={{ width: "100%", height: "500px" }}>
  <MapRoute origin={[-5.9301, 54.5964]} destination={[-5.9081, 54.6031]} />
</Map>;
```

## Developing on this repo

```bash
pnpm install
pnpm build
pnpm typecheck
```

This is a pnpm workspace containing the three packages above; there's no app here to run —
`packages/react` is developed and tested against the hosted editor's dev server, which lives in
the private `topolyne-app` repo.

## Architecture notes

- The **map config format** (`packages/config-schema`) is Topolyne's own JSON shape (location,
  terrain, colors, roads, water, buildings, parks, borders, labels, markers) — never raw MapLibre
  style JSON over the wire.
- `packages/style-engine` is the only thing that knows MapLibre/OpenMapTiles layer names; it
  translates config -> MapLibre style, and is the only thing the hosted editor and this SDK share.
- Tile/DEM/geocoding providers are all read through a `MapProviderConfig` object
  (`packages/style-engine/src/providers.ts`) — never hard-coded — so vendors can be swapped
  without touching the config schema or consuming apps.

## MVP scope (see `PLAN.md` for what's deliberately deferred)

Three real presets (`Terrain`, `Midnight Terrain`, `Sandstone`), a public `/api/maps/:id` the SDK
polls with short-TTL caching, and markers via `<MapMarker>`. No auth, billing, teams, or native
SDKs in this repo — that's the hosted app's concern.
