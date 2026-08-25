import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a matching password and rejects a wrong one", async () => {
    const hash = await hashPassword("RateQPro!Demo");
    expect(await verifyPassword("RateQPro!Demo", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
