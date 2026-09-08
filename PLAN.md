# Topolyne — Technical & Product Plan

## Name

**Topolyne** (`@topolyne/*` on npm, topolyne.com/.dev/.io/.app all unregistered at time of writing).
`topo-` (topography) + `-lyne` (stylised "line", i.e. isoline/contour) — reads as an invented,
ownable brand in the Vercel/Figma/Linear register rather than a generic literal compound.
Verified: no conflicting product/company, no npm package, no trademark hit. (`Isoline`, `Mapstack`,
`Geolume`, `Terralume`, `GeoDesk`, `Topolith`, `Kontur`/`Contur`, `Mapfold`, `Hachure` were all
checked and rejected — each collides with a real, live product or company in the geo/mapping space.)

## What Terraink actually does (researched via the live app + its public AGPL-3.0 source,
`github.com/rw3-io/terraink`, `github.com/yousifamanuel/terraink`)

- Stack: **React + MapLibre GL JS**, vector tiles = **OpenMapTiles schema served by OpenFreeMap**,
  geocoding = **Nominatim**. Bun/Vite tooling, Cloudflare deploy. Poster/wallpaper focused, not a
  developer embed product.
- Visual quality comes from **restrained colour theory + road-width hierarchy + glow on major
  roads + generous negative space + strong condensed/tracked typography**, applied through ~19
  named themes (Midnight Blue, Carrara, Sandstone, Blueprint, Noir, …), each a genuinely different
  palette+treatment, not a background-colour swap.
- Layer toggles are simple and semantic: landcover, buildings, water, parks, roads, rail, aeroway,
  plus a "map details" zoom-detail slider.
- **Important finding:** despite the name, Terraink does **not** render real elevation — no
  hillshade, no contour lines, no DEM. Tested directly at Zermatt (a mountain town): flat navy
  background, only road linework, zero relief. Its "terrain" feel is entirely typographic/colour,
  not topographic.
- This is our opening: we can hit Terraink's colour/typography/restraint bar **and** add genuine
  elevation depth (hillshade + contours), which is a real, honest visual upgrade, not just a clone.

## Mapping stack (MVP)

| Concern | Choice | Why |
|---|---|---|
| Vector base tiles | OpenFreeMap (OpenMapTiles schema) | Free, no key, same schema Terraink uses, self-hostable later |
| Renderer | MapLibre GL JS | Open source, no usage fees, full style-spec control |
| Terrain / hillshade | MapTiler Terrain-RGB (raster-dem) via MapLibre's built-in `hillshade`/`terrain` | Generous free tier; swappable — abstracted behind our provider config |
| Contour lines | `maplibre-contour` (client-side, generated from the same terrain-RGB tiles, no extra server) | No separate contour tile provider/cost; genuinely differentiates us from Terraink |
| Geocoding | Nominatim (MVP), abstracted behind a `GeocodeProvider` interface | Same as Terraink for MVP; swappable to Mapbox/Google/Pelias later without touching the editor |

All providers are read through a `MapProvider` config object — never hard-coded into the style
engine — so we can change tile/terrain/geocoding vendors without touching presets or the config
schema.

## Architecture

This repo (the public SDK) is one half of a two-repo split:

```
packages/config-schema   TypeScript types + zod schema for the public map config format
packages/style-engine    config -> MapLibre style JSON translator + preset definitions
packages/react           @topolyne/react — <Map mapId /> + <MapMarker>, framework-agnostic core in style-engine
```

The hosted editor/dashboard (Next.js app — marketing/hero, auth, editor, dashboard, /api routes)
lives in a separate private repo (`topolyne-app`) and depends on these packages like any other
consumer.

The **map config format** is our own JSON (location, terrain, colors, roads, water, buildings,
parks, borders, labels, markers) — never raw MapLibre style JSON over the wire. `style-engine` is
the only thing that knows MapLibre/OpenMapTiles layer names; both the hosted editor and the React
SDK import it, so "the config means the same thing everywhere" and we can swap providers later.

Storage: SQLite via Prisma for the MVP (zero-ops, file-based), schema written so swapping
`DATABASE_URL` to Postgres is the only change needed later. A map has a `draft` config (edited
live) and a `published` config + `version` (what `<Map mapId />` fetches). Publishing bumps the
version; the SDK always fetches `/api/maps/:id` fresh (short `stale-while-revalidate` cache), so a
redeploy-free style change is inherent, not bolted on.

## MVP journey (what "done" means)

Open site → search Belfast → see a genuinely good-looking preset → switch preset → adjust terrain/water/roads/POIs/labels live (no Apply button) → save → publish → get `map_xxxxxxxx` → `npm install @topolyne/react` → `<Map mapId="map_xxxxxxxx" />` renders the same design → edit design again → refresh the consuming app → it updates, no redeploy.

## Explicitly deferred (per brief)

Auth is a stub (single implicit dev user), no billing, no team permissions, no directions/traffic/
street view, no native SDKs, no AI generation. 3–4 presets built well beats 15 built shallow for
the MVP; more presets are just more entries in `style-engine/presets`, not new architecture.

## Biggest technical risks

1. **Terrain/hillshade/contour visual quality** — free DEM sources are lower resolution than
   Terraink's flat vector data; hillshade can look muddy at poster-like zoom levels if the
   `exaggeration`/lighting isn't tuned per preset. Mitigated by treating hillshade intensity and
   contour opacity as first-class per-preset design values, not one global slider.
2. **Tile/DEM provider licensing at scale** — OpenFreeMap's hosted tier and MapTiler's free tier
   both have fair-use/attribution terms that a paid SaaS will eventually outgrow. Mitigated by the
   `MapProvider` abstraction: swapping to self-hosted OpenFreeMap or a paid MapTiler/Stadia plan
   later is a config change, not a rewrite.
3. **"No redeploy" live updates** — the SDK must never hard-cache a config client-side in a way
   that survives a publish. Mitigated with short HTTP cache TTL + version number in the response,
   not a build-time fetch.
4. **Style-engine as the real product surface** — the semantic config -> many MapLibre layers
   translation is where all the design quality actually lives; it's the thing worth the most
   engineering care, not the editor chrome.
