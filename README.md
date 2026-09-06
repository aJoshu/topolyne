# Topolyne

Design-first map platform for developers. Design a beautiful, terrain-quality map visually,
publish it, and embed the exact result in a React app with one component:

```tsx
import { Map } from "@topolyne/react";

<Map mapId="map_x7K92dsA" />
```

See [`PLAN.md`](./PLAN.md) for the full research, naming, architecture and risk write-up behind
this. Short version: this is a from-scratch, original product inspired by [Terraink](https://terraink.app)'s
visual quality bar (restrained palettes, road hierarchy, typography), built on the same
open-data stack Terraink itself uses (MapLibre GL JS + OpenFreeMap/OpenMapTiles + Nominatim), with
one deliberate addition Terraink's own output doesn't have: real hillshade and contour relief.

## Project layout

```
apps/web                  Next.js app — marketing homepage, editor, dashboard, docs, /api routes
packages/config-schema    The public map config format (zod schema + TS types)
packages/style-engine     config -> MapLibre style translator, presets, providers, geocoding
packages/react            @topolyne/react — <Map mapId /> + <MapMarker>
```

## Running it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # optional: add a MapTiler key for real terrain
pnpm dev
```

Then open http://localhost:3000, click **Start designing**, search a place, pick a preset, tweak
it, and hit **Publish** to get a `map_...` id. That id is what `<Map mapId="..." />` renders once
you `npm install @topolyne/react` in a consuming app pointed at this dev server:

```ts
import { configureTopolyne } from "@topolyne/react";
configureTopolyne({ apiBaseUrl: "http://localhost:3000" });
```

(In production the SDK defaults to `https://topolyne.com` — no configuration needed once this is
actually deployed there.)

### Terrain relief

Hillshade and contour lines need a terrain-RGB DEM source. Get a free key at
[cloud.maptiler.com](https://cloud.maptiler.com/) and set `NEXT_PUBLIC_MAPTILER_API_KEY` in
`apps/web/.env.local`. It has to be `NEXT_PUBLIC_`-prefixed — `buildMapStyle()` runs client-side
(the editor, the homepage hero map, and any app using `<Map>`), so the key has to reach the
browser bundle to build the tile URL. This is the same trust model MapTiler (and Mapbox) already
design for: their tile keys are meant to be visible client-side, and you restrict abuse by
locking the key to your domain in MapTiler's dashboard rather than by keeping it secret. Without
a key set, everything still renders — the terrain/hillshade/contour toggles just have no
elevation data to draw from, so those layers are skipped rather than breaking anything. This is
the `MapProviderConfig` abstraction in `packages/style-engine/src/providers.ts` at work: swap in
a different DEM host by editing one object, not by touching the editor or the config schema.

### Directions

Roads themselves need no setup — every published map already renders the real road network
straight from the vector tiles. Turn-by-turn *directions* (an actual routed path between two
points) are a separate capability backed by [OpenRouteService](https://openrouteservice.org/).
Get a free key at [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)
and set `ORS_API_KEY` in `apps/web/.env.local`. Without it, `/api/directions` returns a clear
501 and `<MapRoute>` reports that error — nothing else breaks.

```tsx
import { Map, MapRoute } from "@topolyne/react";

<Map mapId="map_x7K92dsA" style={{ width: "100%", height: "500px" }}>
  <MapRoute origin={[-5.9301, 54.5964]} destination={[-5.9081, 54.6031]} />
</Map>;
```

The API key never reaches the browser — the browser calls `apps/web`'s own `/api/directions`
route, which is the only place that calls OpenRouteService directly (same pattern as
`/api/geocode` and Nominatim). Swapping to Mapbox/Google/GraphHopper later means editing
`packages/style-engine/src/directions.ts` once — nothing in the editor, config schema, or
`<MapRoute>` names a routing vendor.

## An honest note on how this was built

This was scaffolded in a sandboxed cloud environment whose network policy doesn't currently allow
reaching the npm registry, so **none of this has been through `pnpm install`, a type-check, or a
dev-server run yet** — it was written carefully against the MapLibre GL JS, Next.js 15, and
maplibre-contour APIs from knowledge, not verified by a compiler here. The most likely rough edges
on a first `pnpm install && pnpm dev`:

- `maplibre-contour`'s exact `DemSource` constructor options / `contourProtocolUrl` signature —
  cross-check `packages/style-engine/src/contours.ts` against whatever version installs.
- Next.js 15's async `params` convention in the API routes and `editor/[id]/page.tsx` — verify
  against the installed `next` version.
- `better-sqlite3` needs a prebuilt binary for your platform; it ships one for Windows x64, which
  is what this was built for, so a plain install should work.

Everything else — the config schema, the style-translation logic, the preset design decisions,
the editor/SDK wiring — is original and complete; these are just the specific spots worth a look
before you trust them blindly.

## MVP scope (see `PLAN.md` for what's deliberately deferred)

Four real presets (`Terrain`, `Midnight Terrain`, `Paper Atlas`, `Slate`), live-editing with no
"Apply" button, save vs. publish as distinct steps, a public `/api/maps/:id` the SDK polls with
short-TTL caching (so published edits reach embeds without a redeploy), and markers via
`<MapMarker>`. No auth, billing, teams, directions, or native SDKs yet — intentionally.
