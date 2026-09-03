import type { CurrentUser } from "./current-user";

const SESSION_CACHE_TTL_MS = 45_000;

type SessionCacheEntry = {
  until: number;
  valid: boolean;
  user?: CurrentUser;
};

const sessionCache = new Map<string, SessionCacheEntry>();

function pruneExpired(now: number) {
  if (sessionCache.size < 64) return;
  for (const [key, entry] of sessionCache) {
    if (entry.until <= now) sessionCache.delete(key);
  }
}

export function readSessionCache(tokenHash: string): SessionCacheEntry | undefined {
  const now = Date.now();
  const entry = sessionCache.get(tokenHash);
  if (!entry || entry.until <= now) {
    sessionCache.delete(tokenHash);
    return undefined;
  }
  return entry;
}

export function writeSessionValidity(tokenHash: string, valid: boolean) {
  const now = Date.now();
  pruneExpired(now);
  const current = sessionCache.get(tokenHash);
  sessionCache.set(tokenHash, {
    until: now + SESSION_CACHE_TTL_MS,
    valid,
    user: valid ? current?.user : undefined,
  });
}

export function writeSessionUser(tokenHash: string, user: CurrentUser | null) {
  const now = Date.now();
  pruneExpired(now);
  sessionCache.set(tokenHash, {
    until: now + SESSION_CACHE_TTL_MS,
    valid: Boolean(user),
    user: user ?? undefined,
  });
}

export function clearSessionCache(tokenHash?: string) {
  if (tokenHash) {
    sessionCache.delete(tokenHash);
    return;
  }
  sessionCache.clear();
}
