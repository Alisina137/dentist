import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { db, sqlClient, schema } from "@dandanlink/db";
import { hasAdminAccess, normalizePreference } from "@dandanlink/domain";
import { auth } from "./auth.js";
import { devEmailVerificationDisabled, permitsUnverifiedEmail } from "./email-policy.js";
import { phase02Router } from "./phase02.js";
import { phase03Router } from "./phase03.js";
import { patientRegistryRouter } from "./patient-registry.js";
import { operationsRouter } from "./operations-router.js";
import { appointmentsRouter } from "./appointments-router.js";
import { clinicalRouter } from "./clinical-router.js";
import { chartRouter } from "./chart-router.js";
import { treatmentRouter } from "./treatment-router.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
const trusted = [
  process.env.CLINIC_WEB_URL || "http://localhost:3000",
  process.env.ADMIN_WEB_URL || "http://localhost:3001",
  process.env.PATIENT_WEB_URL || "http://localhost:3002"
];
app.use(cors({ origin: trusted, credentials: true }));
app.use((_req, res, next) => {
  res.locals.requestId = randomUUID();
  res.setHeader("X-Request-ID", res.locals.requestId);
  next();
});
// Better Auth needs the original raw request, before the JSON parser.
app.all("/api/auth/*", toNodeHandler(auth));
// Only guarded registry imports accept CSV-sized JSON bodies.
// All other endpoints keep the 16 KiB body limit.
app.use("/v1/registry", express.json({limit:"1.5mb"}), patientRegistryRouter());
app.use(express.json({ limit: "16kb" }));
app.use("/v1/operations", operationsRouter());
app.use("/v1/appointments", appointmentsRouter());
// PH07 private clinical files have their own strictly bounded body parser.
app.use("/v1/clinical", express.json({limit:"3.5mb"}), clinicalRouter());
app.use("/v1/chart", chartRouter());
app.use("/v1/treatments", treatmentRouter());
app.get("/health", (_req, res) => res.json({ status: "up" }));
app.get("/ready", async (_req, res) => {
  try {
    await sqlClient.unsafe("SELECT 1");
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ code: "DB_UNAVAILABLE", messageKey: "errors.unavailable" });
  }
});
app.get("/v1/public/status", (_req, res) => res.json({
  product: "DandanLink", release: "PH09", marketplaceAvailable: false,
  emailVerificationRequired: !devEmailVerificationDisabled
}));

type Identity = { id: string; name: string; email: string; emailVerified: boolean; twoFactorEnabled?: boolean };
type Context = { identity: Identity; isPlatformAdmin: boolean; adminMfaVerified: boolean };
type AuthenticatedRequest = Request & { identityContext?: Context };

async function loadIdentity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const current = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!current?.user || !permitsUnverifiedEmail(current.user.emailVerified)) {
      res.status(401).json({ code: "AUTH_REQUIRED", messageKey: "errors.loginRequired" });
      return;
    }
    const membership = await db.query.platformAdmin.findFirst({
      where: eq(schema.platformAdmin.userId, current.user.id)
    });
    const factor = membership
      ? await db.query.twoFactor.findFirst({ where: eq(schema.twoFactor.userId, current.user.id) })
      : null;
    const mfa = hasAdminAccess(membership, true, Boolean(current.user.twoFactorEnabled && factor?.verified));
    req.identityContext = {
      identity: {
        id: current.user.id, name: current.user.name, email: current.user.email,
        emailVerified: current.user.emailVerified, twoFactorEnabled: Boolean(current.user.twoFactorEnabled)
      },
      isPlatformAdmin: Boolean(membership && !membership.revokedAt),
      adminMfaVerified: mfa
    };
    next();
  } catch (error) {
    next(error);
  }
}

app.get("/v1/me", loadIdentity, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await db.query.user.findFirst({
      columns: { locale: true, calendar: true },
      where: eq(schema.user.id, req.identityContext!.identity.id)
    });
    res.json({
      user: req.identityContext!.identity,
      locale: user?.locale || "fa-AF", calendar: user?.calendar || "solar_hijri",
      isPlatformAdmin: req.identityContext!.isPlatformAdmin,
      adminMfaVerified: req.identityContext!.adminMfaVerified
    });
  } catch (error) { next(error); }
});

app.put("/v1/me/preferences", loadIdentity, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = normalizePreference(req.body?.locale, req.body?.calendar);
    if (!validated.ok) {
      res.status(422).json({ code: "INVALID_PREFERENCE", messageKey: "errors.invalidPreference" });
      return;
    }
    await db.update(schema.user).set({
      locale: validated.locale, calendar: validated.calendar, updatedAt: new Date()
    }).where(eq(schema.user.id, req.identityContext!.identity.id));
    res.json({ locale: validated.locale, calendar: validated.calendar });
  } catch (error) { next(error); }
});

app.get("/v1/clinic/home", loadIdentity, (req: AuthenticatedRequest, res) => {
  if (req.identityContext!.isPlatformAdmin) {
    res.status(403).json({ code: "WRONG_WORKSPACE", messageKey: "errors.denied" });
    return;
  }
  res.json({
    greetingName: req.identityContext!.identity.name,
    phase: "clinic_onboarding", nextAction: "create_or_review_clinic",
    enabledModules: ["account", "preferences", "clinic_onboarding", "subscription"]
  });
});

app.get("/v1/admin/home", loadIdentity, async (req: AuthenticatedRequest, res, next) => {
  const ctx = req.identityContext!;
  if (!ctx.isPlatformAdmin || !ctx.adminMfaVerified) {
    res.status(403).json({
      code: ctx.isPlatformAdmin ? "MFA_REQUIRED" : "ADMIN_DENIED",
      messageKey: ctx.isPlatformAdmin ? "errors.mfaRequired" : "errors.denied"
    });
    return;
  }
  try {
    await db.insert(schema.auditEvent).values({
      id: randomUUID(), actorId: ctx.identity.id, action: "admin.home.view",
      subjectType: "platform", outcome: "success"
    });
    res.json({ name: ctx.identity.name, release: "PH02", modules: ["account", "security", "verification", "plans", "subscriptions"] });
  } catch (error) { next(error); }
});
app.use("/v1/team", phase03Router());
app.use("/v1", phase02Router());
app.use("/v1", (_req, res) => res.status(404).json({ code: "NOT_FOUND", messageKey: "errors.notFound" }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Never return stack traces, tokens, medical information, or user identifiers.
  console.error("API error", error instanceof Error ? error.name : "unknown");
  res.status(500).json({ code: "INTERNAL_ERROR", messageKey: "errors.unavailable", requestId: res.locals.requestId });
});

const port = Number(process.env.PORT || "4000");
const server = app.listen(port, "0.0.0.0", () => {
  console.info("DandanLink API listening on port " + port);
});
const shutdown = async () => {
  server.close();
  await sqlClient.end();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
