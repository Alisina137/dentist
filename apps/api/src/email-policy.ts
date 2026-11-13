/**
 * Only a deliberately opted-in local development server may omit email proof.
 * Production and automated test environments keep real email verification enforced.
 * Never mark an unverified address as verified just to bypass sign-in in development.
 */
export const devEmailVerificationDisabled =
  process.env.NODE_ENV === "development" &&
  process.env.DEV_SKIP_EMAIL_VERIFICATION === "true";

export function permitsUnverifiedEmail(isVerified: boolean | null | undefined): boolean {
  return isVerified === true || devEmailVerificationDisabled;
}
