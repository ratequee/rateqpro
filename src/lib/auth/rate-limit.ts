import { AUTH_LOCK_WINDOW_MS, AUTH_MAX_LOGIN_ATTEMPTS } from "./constants";

type Attempt = {
  count: number;
  firstAt: number;
};

const attempts = new Map<string, Attempt>();

export function isLoginRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) {
    return false;
  }
  if (Date.now() - entry.firstAt > AUTH_LOCK_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= AUTH_MAX_LOGIN_ATTEMPTS;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > AUTH_LOCK_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
