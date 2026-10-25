/** `:param` placeholders of an endpoint URL (React-free, so the headless entry can use it). */
export function urlParamNames(url: string | undefined): string[] {
  if (!url) return [];
  return [...url.matchAll(/:([A-Za-z_$][A-Za-z0-9_$]*)/g)].map((m) => m[1]);
}
