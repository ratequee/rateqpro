import { describe, expect, it } from "vitest";
import { assertSameTenant, companyScope } from "./tenant";

describe("tenant isolation", () => {
  it("scopes queries to the provided company", () => {
    expect(companyScope("company_a")).toEqual({ companyId: "company_a" });
  });

  it("never uses a hardcoded company id", () => {
    const scope = companyScope("company_b");
    expect(scope.companyId).not.toBe("1");
  });

  it("rejects cross-tenant access", () => {
    expect(() => assertSameTenant("company_a", "company_b")).toThrow("TENANT_ISOLATION");
  });
});
