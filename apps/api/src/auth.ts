import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor, bearer } from "better-auth/plugins";
import { db, schema } from "@dandanlink/db";
import { sendAccountMail } from "./mail.js";
import { devEmailVerificationDisabled } from "./email-policy.js";

const clinic = process.env.CLINIC_WEB_URL || "http://localhost:3000";
const admin = process.env.ADMIN_WEB_URL || "http://localhost:3001";
const patient = process.env.PATIENT_WEB_URL || "http://localhost:3002";
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error("Set BETTER_AUTH_SECRET to a random value at least 32 characters long");
}
export const auth = betterAuth({
  appName: "DandanLink",
  baseURL: process.env.API_BASE_URL || "http://localhost:4000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [clinic, admin, patient],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user, session: schema.session,
      account: schema.account, verification: schema.verification, twoFactor: schema.twoFactor
    }
  }),
  emailAndPassword: {
    enabled: true, requireEmailVerification: !devEmailVerificationDisabled, autoSignIn: false,
    minPasswordLength: 10, revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      sendAccountMail({ to: user.email, subject: "Reset your DandanLink password", url })
  },
  emailVerification: {
    sendOnSignUp: !devEmailVerificationDisabled, sendOnSignIn: !devEmailVerificationDisabled, expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) =>
      sendAccountMail({ to: user.email, subject: "Verify your DandanLink account", url })
  },
  user: {
    additionalFields: {
      locale: { type: "string", defaultValue: "fa-AF", input: false },
      calendar: { type: "string", defaultValue: "solar_hijri", input: false }
    }
  },
  rateLimit: {
    enabled: true, window: 60, max: process.env.NODE_ENV === "test" ? 1000 : 30,
    customRules: {
      "/sign-in/email": { window: 60, max: process.env.NODE_ENV === "test" ? 1000 : 8 },
      "/sign-up/email": { window: 60, max: process.env.NODE_ENV === "test" ? 1000 : 5 },
      "/request-password-reset": { window: 60, max: process.env.NODE_ENV === "test" ? 1000 : 5 },
      ...(process.env.NODE_ENV === "test" ? {
        "/two-factor/*": { window: 60, max: 1000 }
      } : {})
    }
  },
  plugins: [twoFactor({ issuer: "DandanLink", totpOptions: { digits: 6, period: 30 } }), bearer({requireSignature:true})],
  advanced: {
    defaultCookieAttributes: { sameSite: "lax", secure: process.env.NODE_ENV === "production", httpOnly: true }
  }
});
