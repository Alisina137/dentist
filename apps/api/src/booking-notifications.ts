import {sqlClient} from "@dandanlink/db";
import nodemailer from "nodemailer";

/** SMTP outbox worker. Never sends names, clinical notes, prices or
 * appointment times in email; those are available after secure login.
 * Missing SMTP or consent does not undo the database booking transaction.
 */
function mailAvailable(){
 return Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&
  process.env.SMTP_PASSWORD&&process.env.SMTP_FROM);
}
const MAX_ATTEMPTS=5;
let processing=false;
async function processOne(){
 // PostgreSQL-safe claim; multiple API instances cannot claim same row.
 const jobs=await sqlClient.begin(async tx=>{
  const candidates=await tx`SELECT n.id,n.user_id,n.event_name,n.attempt_count,
    pref.email_booking,pref.email_updates,u.email
    FROM patient_booking_notifications n
    JOIN patient_notification_preferences pref ON pref.user_id=n.user_id
    JOIN auth_users u ON u.id=n.user_id
    WHERE n.status IN ('pending','processing') AND n.available_at<=now()
    ORDER BY n.created_at ASC LIMIT 1 FOR UPDATE OF n SKIP LOCKED`;
  if(!candidates.length)return [];
  const item=candidates[0],opted=item.event_name==="requested"||item.event_name==="confirmed"||
    item.event_name==="accepted" ?item.email_booking:item.email_updates;
  if(!opted){
   await tx`UPDATE patient_booking_notifications SET status='skipped',
    last_error_code='CONSENT_OFF' WHERE id=${item.id}`;
   return [];
  }
  // Leave queue pending until an SMTP provider is actually configured.
  if(!mailAvailable())return [];
  await tx`UPDATE patient_booking_notifications SET status='processing',
    attempt_count=attempt_count+1,available_at=now()+interval '2 minutes'
    WHERE id=${item.id}`;
  return [item];
 });
 if(!jobs.length)return false;
 const item=jobs[0];
 try{
  const transport=nodemailer.createTransport({
   host:process.env.SMTP_HOST,
   port:Number(process.env.SMTP_PORT||"587"),
   secure:process.env.SMTP_SECURE==="true",
   auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},
   connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000
  });
  const portal=process.env.PATIENT_WEB_URL||"http://localhost:3002";
  await transport.sendMail({
   from:process.env.SMTP_FROM,to:item.email,
   subject:"DandanLink appointment update",
   text:"Your appointment status has changed. Sign in to your DandanLink account to review it: "+
    portal+"/appointments\n\nNo medical information is included in this message."
  });
  await sqlClient`UPDATE patient_booking_notifications SET status='sent',
    sent_at=now(),last_error_code=NULL WHERE id=${item.id}`;
 }catch(e){
  const nextAttempt=Number(item.attempt_count)+1;
  const final=nextAttempt>=MAX_ATTEMPTS;
  const delay=Math.min(60*2**nextAttempt,3600);
  await sqlClient`UPDATE patient_booking_notifications SET
    status=${final?"failed":"pending"},
    available_at=now()+${delay}*interval '1 second',
    last_error_code='SMTP_DELIVERY_FAILED' WHERE id=${item.id}`;
  console.error("[booking-notifications] SMTP delivery failed; job retained for retry");
 }
 return true;
}
export function startBookingNotificationWorker(){
 const tick=async()=>{
  if(processing)return;
  processing=true;
  try{
   // Bounded work per tick, so API requests and authentication stay responsive.
   for(let i=0;i<8;i++)if(!await processOne())break;
  }catch(e){
   console.error("[booking-notifications] worker unavailable",
    e instanceof Error?e.name:"unknown");
  }finally{processing=false;}
 };
 const timer=setInterval(()=>{void tick();},30000);
 timer.unref();
 void tick();
 return ()=>clearInterval(timer);
}
