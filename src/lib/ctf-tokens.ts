// Shared in-memory token store for CTF evidence access.
//
// A token is scoped to a list of evidence ids and every (token, id) pair can be
// served exactly once: serving an id removes it from the token, and the token
// itself is dropped once it has no id left.
export const TOKEN_TTL_MS = 5 * 60_000; // 5 minutes

interface TokenRecord {
  expiresAt: number;
  ids: Set<number>;
}

// Next bundles each route handler separately; a plain module-level Map would give
// every route its own copy. Hanging the store off globalThis keeps one instance
// per server process (the usual Next singleton pattern).
const globalStore = globalThis as unknown as { __igcEvidenceTokens?: Map<string, TokenRecord> };
const tokens: Map<string, TokenRecord> =
  globalStore.__igcEvidenceTokens ?? (globalStore.__igcEvidenceTokens = new Map());

function purgeExpired(now: number): void {
  tokens.forEach((record, token) => {
    if (now > record.expiresAt) tokens.delete(token);
  });
}

/** Creates a token that may be consumed once per listed evidence id. */
export function storeToken(token: string, ids: number[]): void {
  const now = Date.now();
  purgeExpired(now);
  tokens.set(token, { expiresAt: now + TOKEN_TTL_MS, ids: new Set(ids) });
}

/**
 * Validates the token for `id` and consumes that id.
 * Returns false when the token is unknown, expired, or already used for `id`.
 */
export function consumeToken(token: string, id: number): boolean {
  const record = tokens.get(token);
  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    tokens.delete(token);
    return false;
  }

  if (!record.ids.has(id)) return false;

  record.ids.delete(id);
  if (record.ids.size === 0) tokens.delete(token);
  return true;
}
