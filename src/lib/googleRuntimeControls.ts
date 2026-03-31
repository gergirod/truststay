function parseBoolean(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null) return defaultValue;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return defaultValue;
}

function parseInteger(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function isGoogleRealtimeEnabled(): boolean {
  return parseBoolean(process.env.GOOGLE_REALTIME_ENABLED, true);
}

export function isGoogleBudgetMode(): boolean {
  return parseBoolean(process.env.GOOGLE_BUDGET_MODE, false);
}

export function getEnrichmentMaxAgeMs(defaultDays = 90): number {
  const parsed = parseInteger(process.env.ENRICHMENT_MAX_AGE_DAYS);
  const safeDays = parsed == null ? defaultDays : Math.min(Math.max(parsed, 1), 365);
  return safeDays * 24 * 60 * 60 * 1000;
}

