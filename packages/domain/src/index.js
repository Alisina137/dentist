export const SUPPORTED_LOCALES = Object.freeze(["fa-AF", "ps-AF", "en"]);
export const SUPPORTED_CALENDARS = Object.freeze(["solar_hijri", "gregorian"]);
export function normalizePreference(locale, calendar) {
  if (!SUPPORTED_LOCALES.includes(locale) || !SUPPORTED_CALENDARS.includes(calendar)) {
    return { ok: false, code: "INVALID_PREFERENCE" };
  }
  return { ok: true, locale, calendar };
}
export function requireTenantScope(assignedClinicId, requestedClinicId) {
  if (!assignedClinicId || !requestedClinicId || assignedClinicId !== requestedClinicId) {
    return { allowed: false, code: "CLINIC_SCOPE_DENIED" };
  }
  return { allowed: true };
}
export function hasAdminAccess(adminMembership, emailVerified, enrolledMfa) {
  return Boolean(adminMembership && !adminMembership.revokedAt && emailVerified && enrolledMfa);
}
export function safeRedirectPath(value, fallback = "/clinic") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return fallback;
  return value;
}
