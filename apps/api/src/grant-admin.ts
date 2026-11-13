import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema, sqlClient } from "@dandanlink/db";
import { devEmailVerificationDisabled, permitsUnverifiedEmail } from "./email-policy.js";

const email = process.argv[2]?.trim().toLowerCase();
if (process.env.ALLOW_ADMIN_BOOTSTRAP !== "true" || !email ||
  process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() !== email) {
  console.error("Denied: configure ALLOW_ADMIN_BOOTSTRAP=true and matching ADMIN_BOOTSTRAP_EMAIL in local .env.");
  process.exit(1);
}
try {
  const record = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
  if (!record || !permitsUnverifiedEmail(record.emailVerified)) {
    throw new Error("Only an existing, verified account can be granted admin membership (unless explicit development-only email bypass is enabled)");
  }
  await db.transaction(async tx => {
    await tx.insert(schema.platformAdmin).values({
      userId: record.id, grantedBy: "explicit_owner_bootstrap"
    }).onConflictDoUpdate({
      target: schema.platformAdmin.userId,
      set: { revokedAt: null, grantedBy: "explicit_owner_bootstrap" }
    });
    await tx.insert(schema.auditEvent).values({
      id: randomUUID(), actorId: record.id, action: "admin.grant",
      subjectType: "platform_admin", subjectId: record.id, outcome: "success"
    });
  });
  if (devEmailVerificationDisabled && !record.emailVerified)
    console.warn("DEVELOPMENT ONLY: admin account email ownership was not verified.");
  console.log("Admin membership granted. This user MUST enroll and verify TOTP to access admin.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin grant failed");
  process.exitCode = 1;
} finally {
  await sqlClient.end();
}
