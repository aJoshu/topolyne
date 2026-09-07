import type { PublishedMap } from "@topolyne/config-schema";

let apiBase = "https://topolyne.com";

/**
 * Point the SDK at a different hosted instance — a local dev server while
 * building Topolyne itself, or (later) a self-hosted deployment. Almost no
 * consuming app needs to call this.
 */
export function configureTopolyne(options: { apiBaseUrl: string }) {
  apiBase = options.apiBaseUrl.replace(/\/$/, "");
}

/** Internal — shares the configured host with other same-origin API calls (e.g. `fetchRoute`). */
export function getApiBase(): string {
  return apiBase;
}

/**
 * Fetches the *published* config for a map. Deliberately uncached beyond a
 * short HTTP `stale-while-revalidate` window set by the server response
 * itself — this is what makes "change the design in the dashboard, the
 * embedded map updates without a redeploy" true. We never persist a config
 * across page loads in module state.
 */
export async function fetchPublishedMap(mapId: string): Promise<PublishedMap> {
  // A stray leading/trailing space (copy-pasted from the dashboard, a
  // template literal with accidental whitespace) turns into a literal %20
  // in the URL and 404s with an error that just looks like a wrong id —
  // trimming here means the id you can see is the id that's actually used.
  mapId = mapId.trim();
  const res = await fetch(`${apiBase}/api/maps/${encodeURIComponent(mapId)}`, {
    // Let the browser/HTTP cache do short-lived revalidation; never force a
    // stale build-time snapshot.
    cache: "default",
  });
  if (res.status === 404) {
    throw new Error(`Topolyne: no published map found for mapId "${mapId}".`);
  }
  if (!res.ok) {
    throw new Error(`Topolyne: failed to load map "${mapId}" (${res.status} ${res.statusText}).`);
  }
  return (await res.json()) as PublishedMap;
}
