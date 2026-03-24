export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/[^\d+]/g, "");

  if (normalized.startsWith("+")) {
    return `+${normalized.slice(1).replace(/\+/g, "")}`;
  }

  return normalized.replace(/\+/g, "");
}

export function isValidInternationalPhoneNumber(value: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(normalizePhoneNumber(value));
}
