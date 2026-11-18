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
  __igcMemberBuckets?: Map<string, MemberBucket>;
};
const buckets: Map<string, Bucket> =
  globalStore.__igcRateBuckets ?? (globalStore.__igcRateBuckets = new Map());
let lastPurge = globalStore.__igcRatePurge ?? 0;

function purgeExpired(now: number): void {
  if (now - lastPurge < RATE_LIMIT.windowMs) return;
  lastPurge = now;
  globalStore.__igcRatePurge = lastPurge;
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

// ---------------------------------------------------------------------------
// Strict, escalating limit for the member-identification challenge.
// ---------------------------------------------------------------------------

/** Delays in seconds applied after N consecutive failures (index = failures so far). */
const MEMBER_BACKOFF_SECONDS = [0, 0, 0, 0, 30, 60, 120, 300, 600] as const;
const MEMBER_DECAY_MS = 15 * 60_000;

interface MemberBucket {
  failures: number;
  updatedAt: number;
  blockedUntil: number;
}

const memberBuckets: Map<string, MemberBucket> =
  globalStore.__igcMemberBuckets ?? (globalStore.__igcMemberBuckets = new Map());

function memberKey(ip: string): string {
  return `${ip}:member_identification`;
}

/**
 * Registers one identification attempt. Returns the remaining cooldown in
 * seconds when the attempt is refused, so the route can send `Retry-After`.
 */
export function checkMemberRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const key = memberKey(ip);
  const bucket = memberBuckets.get(key) ?? { failures: 0, updatedAt: now, blockedUntil: 0 };

  if (now < bucket.blockedUntil) {
    memberBuckets.set(key, bucket);
    return { allowed: false, retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }

  if (now - bucket.updatedAt > MEMBER_DECAY_MS) bucket.failures = 0;

  const delay = MEMBER_BACKOFF_SECONDS[
    Math.min(bucket.failures, MEMBER_BACKOFF_SECONDS.length - 1)
  ];
  bucket.failures += 1;
  bucket.updatedAt = now;
  memberBuckets.set(key, bucket);

  if (delay > 0) {
    bucket.blockedUntil = now + delay * 1000;
    return { allowed: false, retryAfter: delay };
  }

  return { allowed: true, retryAfter: 0 };
}

/** A correct answer clears the escalating penalty for this client. */
export function clearMemberRateLimit(ip: string): void {
  memberBuckets.delete(memberKey(ip));
}
