import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionCache,
  readSessionCache,
  writeSessionUser,
  writeSessionValidity,
} from "./session-cache";
import type { CurrentUser } from "./current-user";

const user = {
  id: "u1",
  email: "a@b.co",
  name: "Ada",
  role: "ADMIN",
  status: "ACTIVE",
  companyId: "c1",
  companyName: "RateQ",
  currencyCode: "QAR",
  dateFormat: "dd/MM/yyyy",
  image: null,
} as CurrentUser;

afterEach(() => {
  clearSessionCache();
  vi.useRealTimers();
});

describe("session cache", () => {
  it("returns a cached valid user", () => {
    writeSessionUser("hash-1", user);
    expect(readSessionCache("hash-1")?.user?.email).toBe("a@b.co");
    expect(readSessionCache("hash-1")?.valid).toBe(true);
  });

  it("stores an invalid session so later lookups skip the database", () => {
    writeSessionValidity("hash-2", false);
    expect(readSessionCache("hash-2")?.valid).toBe(false);
  });

  it("expires entries after the ttl", () => {
    vi.useFakeTimers();
    writeSessionValidity("hash-3", true);
    vi.advanceTimersByTime(46_000);
    expect(readSessionCache("hash-3")).toBeUndefined();
  });
});
