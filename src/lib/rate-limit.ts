import type { NextRequest } from "next/server";

/**
 * Fixed-window rate limit, kept in memory.
 *
 * Proxy headers are only trusted when TRUST_PROXY=1; otherwise the socket IP is
 * used. Local/socket clients get a larger per-IP budget (30/min) than proxied
 * clients (10/min), and there is no shared "unknown" bucket.
 */
export const RATE_LIMIT = {
  windowMs: 60_000,
  maxAttempts: 10,
  localMaxAttempts: 30,
} as const;

interface Bucket {
  count: number;
  resetAt: number;
}

// Same singleton reasoning as the token store: one bucket map per process, even
// though each route handler gets its own copy of this module.
const globalStore = globalThis as unknown as {
  __igcRateBuckets?: Map<string, Bucket>;
  __igcRatePurge?: number;
};
const buckets: Map<string, Bucket> =
  globalStore.__igcRateBuckets ?? (globalStore.__igcRateBuckets = new Map());
let lastPurge = globalStore.__igcRatePurge ?? 0;

function purgeExpired(now: number): void {
  if (now - lastPurge < RATE_LIMIT.windowMs) return;
  lastPurge = now;
  globalStore.__igcRatePurge = now;
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) buckets.delete(key);
  });
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;

function sanitiseIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!candidate) return null;
  if (IPV4.test(candidate)) return candidate;
  if (candidate.includes(":") && IPV6.test(candidate)) return candidate;
  return null;
}

const TRUST_PROXY = process.env.TRUST_PROXY === "1";

/** Socket IP by default; proxy headers only when explicitly trusted. */
export function clientIp(req: NextRequest): string {
  const socketIp = sanitiseIp(req.ip);
  if (!TRUST_PROXY) return socketIp ?? "local";
  return (
    sanitiseIp(req.headers.get("x-real-ip")) ??
    sanitiseIp(req.headers.get("x-forwarded-for")?.split(",")[0]) ??
    socketIp ??
    "local"
  );
}

/** Attempts allowed per bucket in this deployment (local clients get 30/min). */
export function attemptLimit(): number {
  return TRUST_PROXY ? RATE_LIMIT.maxAttempts : RATE_LIMIT.localMaxAttempts;
}

/** Registers one attempt for `key`. Returns false once the window is exhausted. */
export function checkRateLimit(key: string, maxAttempts: number = RATE_LIMIT.maxAttempts): boolean {
  const now = Date.now();
  purgeExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }

  if (bucket.count >= maxAttempts) return false;

  bucket.count += 1;
  return true;
}
