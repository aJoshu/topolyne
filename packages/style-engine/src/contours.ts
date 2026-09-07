import type { MapProviderConfig } from "./providers.js";

/**
 * Thin wrapper around `maplibre-contour`'s `DemSource`. That library
 * registers a custom `mlcontour://` protocol and runs a Web Worker, so it
 * can only be set up once, client-side, against a live `maplibre-gl`
 * instance — never during plain style generation, which also has to run
 * places a worker can't (server-side share-image rendering, tests).
 *
 * The editor and the React SDK both call `setupContourSource()` once on
 * mount and pass the returned handle into `buildMapStyle`, which asks it for
 * the real `mlcontour://...` tile URL rather than us guessing that scheme's
 * exact query shape by hand.
 */
export interface ContourSourceHandle {
  contourProtocolUrl(options: {
    thresholds: Record<number, number | number[]>;
    contourLayer?: string;
    elevationKey?: string;
    levelKey?: string;
  }): string;
}

let cached: { key: string; handle: ContourSourceHandle } | null = null;

export async function setupContourSource(
  provider: MapProviderConfig,
  maplibregl: unknown,
): Promise<ContourSourceHandle | undefined> {
  if (!provider.demTiles) return undefined;
  const key = provider.demTiles.tiles.join(",");
  if (cached && cached.key === key) return cached.handle;

  // Dynamic import: browser-only (spins up a Web Worker), must never land in
  // a server bundle.
  const mlcontour = await import("maplibre-contour");
  const demSource = new mlcontour.default.DemSource({
    url: provider.demTiles.tiles[0],
    encoding: provider.demTiles.encoding,
    maxzoom: provider.demTiles.maxzoom,
    worker: true,
  });
  demSource.setupMaplibre(maplibregl as never);

  const handle: ContourSourceHandle = {
    contourProtocolUrl: (options) => demSource.contourProtocolUrl(options),
  };
  cached = { key, handle };
  return handle;
}

export const DEFAULT_CONTOUR_THRESHOLDS: Record<number, number | number[]> = {
  9: 500,
  11: 200,
  12: 100,
  14: 50,
  16: 20,
};
