import {randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {OpsFault,opsIdentity,opsTask,opsStaff,opsAdmin,opsFail,
 privateOps,opsText,safeSupportText,opsAudit,type OpsRequest} from "./ops-access.js";

const statusList=["open","in_progress","waiting_user","resolved","closed"] as const;
const status=(value:unknown)=>{
 if(typeof value!=="string"||!statusList.includes(value as any))opsFail(422,"INVALID_STATUS");
 return value as string;
};
const code=(value:unknown)=>{const text=opsText(value,3,32,"CODE");
 if(!/^[a-z][a-z0-9_]{2,31}$/.test(text))opsFail(422,"INVALID_CODE");
 return text;
};
const textId=(value:unknown)=>{
 if(typeof value!=="string"||!/^[\w-]{8,100}$/.test(value))opsFail(422,"INVALID_ID");
 return value;
};
async function ticketAccess(req:OpsRequest,id:string){
 const [ticket]=await sqlClient`SELECT id,reference,requester_id,clinic_id,category_code,title,source,
  status,priority,assignee_id,created_at,updated_at,resolved_at
  FROM support_tickets WHERE id=${id}`;
 if(!ticket)opsFail(404,"TICKET_NOT_FOUND");
 if(ticket.requester_id!==req.opsActor!.id){
  opsStaff(req);
 }
 return ticket;
}
const faq=[
 {key:"booking",en:"How do I manage an appointment?",fa:"چطور وقت ملاقات را مدیریت کنم؟",ps:"لیدنه څنګه اداره کړم؟",
  answerEn:"Open Appointments to check status, cancel or request a new time. A pending request is not a confirmed booking.",
  answerFa:"به بخش ملاقات‌ها بروید تا حالت را ببینید، لغو کنید یا وقت جدید بخواهید. درخواست معلق هنوز تأیید نشده است.",
  answerPs:"د لیدنو برخه کې حالت وګورئ، لغوه کړئ یا بل وخت وغواړئ. منتظره غوښتنه تایید شوې لیدنه نه ده."},
 {key:"privacy",en:"Can support see my dental record?",fa:"آیا پشتیبانی سوابق صحی من را می‌بیند؟",ps:"ایا ملاتړ زما طبي ریکارډ لیدلای شي؟",
  answerEn:"No. The support console does not provide access to clinical charts, notes or records. Never include them in a ticket.",
  answerFa:"نخیر. بخش پشتیبانی به چارت، یادداشت یا پرونده صحی دسترسی ندارد. آن‌ها را در درخواست نفرستید.",
  answerPs:"نه. د ملاتړ برخه طبي چارټونو او ریکارډونو ته لاسرسی نه لري. په غوښتنه کې یې مه لېږئ."},
 {key:"payments",en:"Where can I find a payment receipt?",fa:"رسید پرداخت را از کجا پیدا کنم؟",ps:"د تادیې رسید چیرته ومومم؟",
  answerEn:"A receipt is available only after the clinic issues it and explicitly releases it to your verified account.",
  answerFa:"رسید فقط وقتی قابل دیدن است که کلینیک آن را صادر و برای حساب تأییدشده شما آزاد کند.",
  answerPs:"رسید هله ښکاري چې کلینیک یې صادر او ستاسو تایید شوي حساب ته یې ورکړي."}
];

/** No clinical data joins or searches anywhere in this router. */
export function supportRouter(){
 const router=Router();
 // PH18 support mutations require an allowlisted browser Origin (defense in depth with SameSite cookies).
 router.use((req,res,next)=>{
  if(["GET","HEAD","OPTIONS"].includes(req.method))return next();
  const origin=req.headers.origin;
  const allowed=[process.env.CLINIC_WEB_URL||"http://localhost:3001",
   process.env.ADMIN_WEB_URL||"http://localhost:3000",
   process.env.PATIENT_WEB_URL||"http://localhost:3002"];
  if(!origin||!allowed.includes(origin)){res.status(403).json({code:"ORIGIN_DENIED"});return;}
  next();
 });
 router.get("/public/help",opsTask(async(_req,res)=>{
  const categories=await sqlClient`SELECT code,label_en,label_fa,label_ps
   FROM support_categories WHERE active=true ORDER BY sort_order,code`;
  res.setHeader("Cache-Control","public, max-age=45");
  res.json({faq,categories,privacyNotice:"Do not send contact details, diagnoses, clinical records or health information in support messages."});
 }));
 router.use(opsIdentity);
 router.get("/me",opsTask(async(req,res)=>{
  const actor=req.opsActor!;privateOps(res);
  res.json({role:actor.role,mfaRequired:actor.role!=="user"&&!actor.mfa,
   displayName:actor.name});
 }));
 router.post("/tickets",opsTask(async(req,res)=>{
  if(req.opsActor!.role!=="user")opsFail(403,"SUPPORT_STAFF_CANNOT_OPEN");
  const category=code(req.body?.category);
  const title=safeSupportText(req.body?.title,5,120,"TITLE");
  const body=safeSupportText(req.body?.message,10,2000,"MESSAGE");
  const clinicId=req.body?.clinicId==null?null:textId(req.body.clinicId);
  if(clinicId){
   const [member]=await sqlClient`SELECT 1 FROM clinic_memberships
    WHERE clinic_id=${clinicId} AND user_id=${req.opsActor!.id} AND status='active'`;
   if(!member)opsFail(403,"CLINIC_TICKET_DENIED");
  }
  const [taxonomy]=await sqlClient`SELECT code FROM support_categories
   WHERE code=${category} AND active=true`;
  if(!taxonomy)opsFail(422,"INVALID_CATEGORY");
  const id=randomUUID(),messageId=randomUUID(),eventId=randomUUID();
  const reference="DL-"+id.slice(0,8).toUpperCase()+"-"+id.slice(9,13).toUpperCase();
  await sqlClient.begin(async tx=>{
   await tx`INSERT INTO support_tickets(id,reference,requester_id,clinic_id,category_code,title,source)
    VALUES(${id},${reference},${req.opsActor!.id},${clinicId},${category},${title},
      ${clinicId?"clinic":"patient"})`;
   await tx`INSERT INTO support_ticket_messages(id,ticket_id,author_id,author_role,body)
    VALUES(${messageId},${id},${req.opsActor!.id},'requester',${body})`;
   await tx`INSERT INTO support_ticket_events(id,ticket_id,actor_id,action,new_state)
    VALUES(${eventId},${id},${req.opsActor!.id},'opened','open')`;
  });
  privateOps(res);res.status(201).json({id,reference,status:"open"});
 }));
 router.get("/tickets/mine",opsTask(async(req,res)=>{
  const rows=await sqlClient`SELECT id,reference,title,category_code,status,created_at,updated_at
   FROM support_tickets WHERE requester_id=${req.opsActor!.id}
   ORDER BY updated_at DESC LIMIT 100`;
  privateOps(res);res.json({tickets:rows});
 }));
 router.get("/admin/tickets",opsTask(async(req,res)=>{
  opsStaff(req);
  const filter=String(req.query.status||"open");
  if(filter!=="all")status(filter);
  const category=String(req.query.category||"all");
  if(category!=="all")code(category);
  const assigned=String(req.query.assigned||"all");
  if(!["all","mine","unassigned"].includes(assigned))opsFail(422,"INVALID_ASSIGNEE_FILTER");
  const age=Number(req.query.ageDays??0);
  if(![0,3,7,30].includes(age))opsFail(422,"INVALID_AGE_FILTER");
  const rows=await sqlClient`SELECT t.id,t.reference,t.title,t.category_code,t.status,t.source,
    t.priority,t.created_at,t.updated_at,t.assignee_id,
    u.name AS assignee_name,
    round(extract(epoch FROM (now()-t.created_at))/3600)::int AS age_hours,
    (t.status IN ('open','in_progress') AND t.created_at < now()-interval '48 hours')
      AS overdue_for_triage
    FROM support_tickets t LEFT JOIN auth_users u ON u.id=t.assignee_id
    WHERE (${filter}='all' OR t.status=${filter})
     AND (${category}='all' OR t.category_code=${category})
     AND (${assigned}='all' OR (${assigned}='unassigned' AND t.assignee_id IS NULL)
      OR (${assigned}='mine' AND t.assignee_id=${req.opsActor!.id}))
     AND (${age}=0 OR t.created_at<now()-(${age} * interval '1 day'))
    ORDER BY CASE WHEN t.priority='high' THEN 0 ELSE 1 END,t.updated_at DESC LIMIT 100`;
  privateOps(res);res.json({tickets:rows,filter});
 }));
 router.get("/admin/agents",opsTask(async(req,res)=>{
  opsStaff(req);
  const agents=await sqlClient`SELECT a.user_id AS id,u.name
   FROM platform_support_agents a JOIN auth_users u ON u.id=a.user_id
   WHERE a.revoked_at IS NULL
   ORDER BY u.name LIMIT 100`;
  privateOps(res);res.json({agents:agents.concat([{id:req.opsActor!.id,name:req.opsActor!.name}])
   .filter((entry,index,arr)=>arr.findIndex(x=>x.id===entry.id)===index)});
 }));
 router.post("/admin/tickets/:ticketId/assign",opsTask(async(req,res)=>{
  opsStaff(req);
  const ticket=await ticketAccess(req,textId(req.params.ticketId));
  if(ticket.status==="closed")opsFail(409,"TICKET_CLOSED");
  const assigned=req.body?.agentId==null?null:textId(req.body.agentId);
  if(req.opsActor!.role==="support"&&assigned!==req.opsActor!.id)
   opsFail(403,"SUPPORT_CAN_ONLY_SELF_ASSIGN");
  if(assigned){
   if(assigned!==req.opsActor!.id||req.opsActor!.role!=="admin"){
    const [agent]=await sqlClient`SELECT 1 FROM platform_support_agents
     WHERE user_id=${assigned} AND revoked_at IS NULL`;
    if(!agent)opsFail(404,"SUPPORT_AGENT_NOT_FOUND");
   }
  }
  if(ticket.assignee_id===assigned)opsFail(409,"ASSIGNEE_UNCHANGED");
  await sqlClient.begin(async tx=>{
   const changed=await tx`UPDATE support_tickets
    SET assignee_id=${assigned},updated_at=now()
    WHERE id=${ticket.id} AND assignee_id IS NOT DISTINCT FROM ${ticket.assignee_id}
    RETURNING id`;
   if(!changed.length)opsFail(409,"STALE_TICKET");
   await tx`INSERT INTO support_ticket_events(id,ticket_id,actor_id,action,previous_state,new_state)
    VALUES(${randomUUID()},${ticket.id},${req.opsActor!.id},'assign',
     ${ticket.assignee_id},${assigned})`;
  });
  privateOps(res);res.json({assignedTo:assigned});
 }));
 router.post("/admin/tickets/:ticketId/escalate",opsTask(async(req,res)=>{
  opsStaff(req);
  const ticket=await ticketAccess(req,textId(req.params.ticketId));
  if(ticket.priority==="high"||ticket.status==="closed")opsFail(409,"ESCALATION_UNAVAILABLE");
  await sqlClient.begin(async tx=>{
   const changed=await tx`UPDATE support_tickets
    SET priority='high',updated_at=now() WHERE id=${ticket.id} AND priority='normal'
    RETURNING id`;
   if(!changed.length)opsFail(409,"STALE_TICKET");
   await tx`INSERT INTO support_ticket_events(id,ticket_id,actor_id,action,previous_state,new_state)
    VALUES(${randomUUID()},${ticket.id},${req.opsActor!.id},'escalate','normal','high')`;
  });
  privateOps(res);res.json({priority:"high"});
 }));
 router.get("/admin/tickets/:ticketId/notes",opsTask(async(req,res)=>{
  opsStaff(req);
  const ticket=await ticketAccess(req,textId(req.params.ticketId));
  if(req.opsActor!.role==="support"&&ticket.assignee_id!==req.opsActor!.id)
   opsFail(403,"ASSIGNED_SUPPORT_ONLY");
  const notes=await sqlClient`SELECT n.id,n.body,n.created_at,u.name AS author_name
    FROM support_ticket_internal_notes n JOIN auth_users u ON u.id=n.author_id
    WHERE n.ticket_id=${ticket.id} ORDER BY n.created_at,n.id LIMIT 100`;
  privateOps(res);res.json({notes});
 }));
 router.post("/admin/tickets/:ticketId/notes",opsTask(async(req,res)=>{
  opsStaff(req);
  const ticket=await ticketAccess(req,textId(req.params.ticketId));
  if(req.opsActor!.role==="support"&&ticket.assignee_id!==req.opsActor!.id)
   opsFail(403,"ASSIGNED_SUPPORT_ONLY");
  const message=safeSupportText(req.body?.message,5,1000,"INTERNAL_NOTE");
  const id=randomUUID();
  await sqlClient`INSERT INTO support_ticket_internal_notes(id,ticket_id,author_id,body)
   VALUES(${id},${ticket.id},${req.opsActor!.id},${message})`;
  await opsAudit(req.opsActor!.id,"support.internal_note.created","support_ticket",ticket.id);
  privateOps(res);res.status(201).json({id});
 }));
 router.get("/tickets/:ticketId",opsTask(async(req,res)=>{
  const ticket=await ticketAccess(req,textId(req.params.ticketId));
  const messages=await sqlClient`SELECT id,author_role,body,created_at FROM support_ticket_messages
   WHERE ticket_id=${ticket.id} ORDER BY created_at,id LIMIT 300`;
  privateOps(res);
  const {requester_id:_omit,assignee_id:_assignee,...safe}=ticket;
  res.json({ticket:safe,messages});
 }));
 router.post("/tickets/:ticketId/messages",opsTask(async(req,res)=>{
  const ticket=await ticketAccess(req,textId(req.params.ticketId));
  const message=safeSupportText(req.body?.message,5,2000,"MESSAGE");
  if(["closed","resolved"].includes(ticket.status))opsFail(409,"TICKET_NOT_WRITABLE");
  const staff=req.opsActor!.role!=="user";
  if(staff){
   opsStaff(req);
   if(req.opsActor!.role==="support"&&ticket.assignee_id!==req.opsActor!.id)
    opsFail(403,"ASSIGNED_SUPPORT_ONLY");
  }
  // Requesters reply only to their own tickets, staff reply exclusively through the support principal.
  const next=staff?"waiting_user":"in_progress",id=randomUUID();
  await sqlClient.begin(async tx=>{
   const changed=await tx`UPDATE support_tickets SET status=${next},updated_at=now()
    WHERE id=${ticket.id} AND status NOT IN ('resolved','closed') RETURNING id`;
   if(!changed.length)opsFail(409,"TICKET_NOT_WRITABLE");
   await tx`INSERT INTO support_ticket_messages(id,ticket_id,author_id,author_role,body)
    VALUES(${id},${ticket.id},${req.opsActor!.id},${staff?"support":"requester"},${message})`;
   await tx`INSERT INTO support_ticket_events(id,ticket_id,actor_id,action,previous_state,new_state)
    VALUES(${randomUUID()},${ticket.id},${req.opsActor!.id},'reply',${ticket.status},${next})`;
  });
  privateOps(res);res.status(201).json({id,status:next});
 }));
 router.post("/admin/tickets/:ticketId/status",opsTask(async(req,res)=>{
  opsStaff(req);
  const ticket=await ticketAccess(req,textId(req.params.ticketId)),next=status(req.body?.status);
  if(req.opsActor!.role==="support"&&ticket.assignee_id!==req.opsActor!.id)
   opsFail(403,"ASSIGNED_SUPPORT_ONLY");
  if(ticket.status===next)opsFail(409,"STATUS_UNCHANGED");
  // Closed is terminal; resolved can be reopened for follow-up by a staff member.
  if(ticket.status==="closed")opsFail(409,"TICKET_CLOSED");
  await sqlClient.begin(async tx=>{
   const changed=await tx`UPDATE support_tickets
    SET status=${next},updated_at=now(),
      resolved_at=CASE WHEN ${next} IN ('resolved','closed') THEN now() ELSE NULL END
    WHERE id=${ticket.id} AND status=${ticket.status} RETURNING id`;
   if(!changed.length)opsFail(409,"STALE_TICKET");
   await tx`INSERT INTO support_ticket_events(id,ticket_id,actor_id,action,previous_state,new_state)
    VALUES(${randomUUID()},${ticket.id},${req.opsActor!.id},'status',${ticket.status},${next})`;
  });
  privateOps(res);res.json({status:next});
 }));
 router.get("/admin/settings",opsTask(async(req,res)=>{
  opsAdmin(req);
  const [categories,templates,agents]=await Promise.all([
   sqlClient`SELECT * FROM support_categories ORDER BY sort_order,code`,
   sqlClient`SELECT * FROM support_templates ORDER BY id`,
   sqlClient`SELECT s.user_id,u.name,s.granted_at,s.revoked_at
    FROM platform_support_agents s JOIN auth_users u ON u.id=s.user_id
    ORDER BY s.granted_at DESC LIMIT 100`
  ]);
  privateOps(res);res.json({categories,templates,agents});
 }));
 router.put("/admin/categories/:code",opsTask(async(req,res)=>{
  opsAdmin(req);
  const c=code(req.params.code);
  const en=opsText(req.body?.en,2,80,"LABEL"),fa=opsText(req.body?.fa,2,80,"LABEL"),
   ps=opsText(req.body?.ps,2,80,"LABEL");
  const active=req.body?.active;
  if(typeof active!=="boolean")opsFail(422,"INVALID_ACTIVE");
  await sqlClient`INSERT INTO support_categories(code,label_en,label_fa,label_ps,active)
   VALUES(${c},${en},${fa},${ps},${active})
   ON CONFLICT(code) DO UPDATE SET label_en=EXCLUDED.label_en,label_fa=EXCLUDED.label_fa,
    label_ps=EXCLUDED.label_ps,active=EXCLUDED.active`;
  await opsAudit(req.opsActor!.id,"support.category.update","support_category",c);
  privateOps(res);res.json({saved:true});
 }));
 router.put("/admin/templates/:id",opsTask(async(req,res)=>{
  opsAdmin(req);
  const c=code(req.params.id),titles=["en","fa","ps"].map(lang=>
   opsText(req.body?.["title_"+lang],3,120,"TITLE"));
  const bodies=["en","fa","ps"].map(lang=>
   safeSupportText(req.body?.["body_"+lang],10,1000,"BODY"));
  if(typeof req.body?.active!=="boolean")opsFail(422,"INVALID_ACTIVE");
  await sqlClient`INSERT INTO support_templates
   (id,title_en,title_fa,title_ps,body_en,body_fa,body_ps,active)
   VALUES(${c},${titles[0]},${titles[1]},${titles[2]},${bodies[0]},${bodies[1]},${bodies[2]},${req.body.active})
   ON CONFLICT(id) DO UPDATE SET title_en=EXCLUDED.title_en,title_fa=EXCLUDED.title_fa,
    title_ps=EXCLUDED.title_ps,body_en=EXCLUDED.body_en,body_fa=EXCLUDED.body_fa,
    body_ps=EXCLUDED.body_ps,active=EXCLUDED.active`;
  await opsAudit(req.opsActor!.id,"support.template.update","support_template",c);
  privateOps(res);res.json({saved:true});
 }));
 router.post("/admin/agents",opsTask(async(req,res)=>{
  opsAdmin(req);
  const email=opsText(req.body?.email,5,160,"EMAIL").toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))opsFail(422,"INVALID_EMAIL");
  const [user]=await sqlClient`SELECT u.id FROM auth_users u
   WHERE lower(u.email)=${email} AND u.email_verified=true
   AND NOT EXISTS(SELECT 1 FROM platform_admins a WHERE a.user_id=u.id AND a.revoked_at IS NULL)
   AND NOT EXISTS(SELECT 1 FROM clinic_memberships m WHERE m.user_id=u.id AND m.status='active')`;
  if(!user)opsFail(404,"ELIGIBLE_VERIFIED_USER_NOT_FOUND");
  await sqlClient`INSERT INTO platform_support_agents(user_id,granted_by,revoked_at)
   VALUES(${user.id},${req.opsActor!.id},NULL)
   ON CONFLICT(user_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,granted_at=now(),revoked_at=NULL`;
  await opsAudit(req.opsActor!.id,"support.agent.grant","support_agent",user.id);
  privateOps(res);res.status(201).json({granted:true});
 }));
 router.post("/admin/agents/:userId/revoke",opsTask(async(req,res)=>{
  opsAdmin(req);
  const id=textId(req.params.userId);
  const rows=await sqlClient`UPDATE platform_support_agents SET revoked_at=now()
   WHERE user_id=${id} AND revoked_at IS NULL RETURNING user_id`;
  if(!rows.length)opsFail(404,"AGENT_NOT_FOUND");
  await opsAudit(req.opsActor!.id,"support.agent.revoke","support_agent",id);
  privateOps(res);res.json({revoked:true});
 }));
 router.use((error:unknown,_req:Request,res:Response,next:NextFunction)=>{
  if(error instanceof OpsFault){privateOps(res);res.status(error.status).json({code:error.code});return;}
  next(error);
 });
 return router;
}
