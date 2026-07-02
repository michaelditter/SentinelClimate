// Shared HTTP plumbing for the OSINT source modules. Every government API
// call goes through fetchJson so the User-Agent header, res.ok checks, and
// abort handling stay consistent across sources.

export const USER_AGENT = "SentinelClimate/1.0 (info@michaelditter.com)";

export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} from ${new URL(url).host}`);
  }
  return res.json();
}

// Government API payloads drift, so parsers coerce every field defensively
// instead of trusting the documented shape.

export function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
