export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "•";
  }
  if (parts.length === 1) {
    return Array.from(parts[0] ?? "").slice(0, 1).join("") || "•";
  }
  const first = Array.from(parts[0] ?? "").slice(0, 1).join("");
  const last = Array.from(parts[parts.length - 1] ?? "").slice(0, 1).join("");
  return `${first}${last}`;
}

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? name;
}
