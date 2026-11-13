export type Preference = { ok: true; locale: "fa-AF" | "ps-AF" | "en"; calendar: "solar_hijri" | "gregorian" } | { ok: false; code: "INVALID_PREFERENCE" };
export declare const SUPPORTED_LOCALES: readonly string[];
export declare const SUPPORTED_CALENDARS: readonly string[];
export declare function normalizePreference(locale: unknown, calendar: unknown): Preference;
export declare function requireTenantScope(assignedClinicId: string | null | undefined, requestedClinicId: string | null | undefined): { allowed: boolean; code?: string };
export declare function hasAdminAccess(adminMembership: { revokedAt?: Date | null } | null | undefined, emailVerified: boolean, enrolledMfa: boolean): boolean;
export declare function safeRedirectPath(value: unknown, fallback?: string): string;
