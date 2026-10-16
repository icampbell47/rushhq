const BASE = "http://rushhq.invalid";

/**
 * Returns a same-origin path to redirect to after login, or the fallback.
 *
 * A prefix check like `startsWith("/") && !startsWith("//")` is not enough:
 * browsers treat `/\evil.example` as `//evil.example`. Resolving against a
 * placeholder origin and checking the origin survives those tricks.
 */
export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
