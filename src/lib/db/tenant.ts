export function companyScope(companyId: string): { companyId: string } {
  if (!companyId) {
    throw new Error("Missing tenant context");
  }
  return { companyId };
}

export function assertSameTenant(recordCompanyId: string, actorCompanyId: string): void {
  if (recordCompanyId !== actorCompanyId) {
    throw new Error("TENANT_ISOLATION");
  }
}
