import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {OpsFault,opsIdentity,opsTask,opsAdmin,privateOps} from "./ops-access.js";
import {getPilotReadiness} from "./pilot-gate.js";

/** PHF: metadata-only security posture. Requires a real MFA-verified platform admin.
 * Aggregated status is operational visibility, NEVER an independent security certification.
 * No principal emails/IDs, IP addresses, patient records, auth secrets or session tokens are returned.
 */
export function adminSecurityRouter(){
 const router=Router();
 router.use(opsIdentity);
 router.get("/posture",opsTask(async(req,res)=>{
  opsAdmin(req);
  const [admins,support,sessions,events,decisions]=await Promise.all([
   sqlClient`SELECT count(*)::int AS active,
    count(*) FILTER (WHERE u.two_factor_enabled=true AND f.verified=true)::int AS mfa_ready,
    count(*) FILTER (WHERE u.email_verified=false)::int AS email_unverified
    FROM platform_admins a JOIN auth_users u ON u.id=a.user_id
    LEFT JOIN auth_two_factors f ON f.user_id=u.id WHERE a.revoked_at IS NULL`,
   sqlClient`SELECT count(*)::int AS active,
    count(*) FILTER (WHERE u.two_factor_enabled=true AND f.verified=true)::int AS mfa_ready,
    count(*) FILTER (WHERE u.email_verified=false)::int AS email_unverified,
    count(*) FILTER (WHERE s.granted_at>=now()-interval '30 days')::int AS grants_last30
    FROM platform_support_agents s JOIN auth_users u ON u.id=s.user_id
    LEFT JOIN auth_two_factors f ON f.user_id=u.id WHERE s.revoked_at IS NULL`,
   sqlClient`SELECT count(*)::int AS active
    FROM auth_sessions x WHERE x.expires_at>now() AND (
     EXISTS(SELECT 1 FROM platform_admins p WHERE p.user_id=x.user_id AND p.revoked_at IS NULL)
     OR EXISTS(SELECT 1 FROM platform_support_agents a
      WHERE a.user_id=x.user_id AND a.revoked_at IS NULL))`,
   sqlClient`SELECT
    count(*) FILTER (WHERE outcome<>'success')::int AS unsuccessful_last30,
    count(*) FILTER (WHERE created_at>=now()-interval '24 hours'
     AND outcome<>'success')::int AS unsuccessful_last24,
    count(*) FILTER (WHERE action='support.agent.revoke'
     AND created_at>=now()-interval '30 days')::int AS support_revocations_last30,
    count(*) FILTER (WHERE action='support.agent.grant'
     AND created_at>=now()-interval '30 days')::int AS support_grants_last30
    FROM audit_events WHERE created_at>=now()-interval '30 days'`,
   sqlClient`SELECT action,outcome,count(*)::int AS total
    FROM audit_events
    WHERE created_at>=now()-interval '30 days'
     AND (action LIKE 'support.agent.%' OR action LIKE 'support.category.%'
      OR action LIKE 'support.template.%' OR action LIKE 'subscription.invoice.%'
      OR action LIKE 'clinic.%' OR action LIKE 'review.%')
    GROUP BY action,outcome ORDER BY total DESC,action ASC LIMIT 12`
  ]);
  const a=admins[0],s=support[0],e=events[0];
  const adminActive=Number(a.active),adminMfa=Number(a.mfa_ready);
  const supportActive=Number(s.active),supportMfa=Number(s.mfa_ready);
  const pilot=getPilotReadiness();
  privateOps(res);
  res.json({
   access:{
    admins:{active:adminActive,mfaReady:adminMfa,mfaMissing:adminActive-adminMfa,
     emailUnverified:Number(a.email_unverified)},
    support:{active:supportActive,mfaReady:supportMfa,mfaMissing:supportActive-supportMfa,
     emailUnverified:Number(s.email_unverified)},
    activePrivilegedSessions:Number(sessions[0].active)
   },
   audit:{unsuccessfulLast30:Number(e.unsuccessful_last30),
    unsuccessfulLast24:Number(e.unsuccessful_last24),
    supportGrantsLast30:Number(e.support_grants_last30),
    supportRevocationsLast30:Number(e.support_revocations_last30),
    topActions:decisions.map(x=>({action:x.action,outcome:x.outcome,count:Number(x.total)}))},
   release:{enabled:pilot.releaseEnabled,marked:pilot.passCount,total:pilot.controls.length,
    status:pilot.overall},
   generatedAt:new Date().toISOString(),timezone:"Asia/Kabul",
   notice:"These are recorded application and identity checks, not proof of compliance, independent security approval, or readiness to process protected patient information.",
   privacy:"No principal IDs, emails, session tokens, IPs, clinical notes or patient identifiers returned."
  });
 }));
 router.use((error:unknown,_req:Request,res:Response,next:NextFunction)=>{
  if(error instanceof OpsFault){privateOps(res);res.status(error.status).json({code:error.code});return;}
  next(error);
 });
 return router;
}
