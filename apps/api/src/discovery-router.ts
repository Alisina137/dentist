import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {availabilityPreview} from "./operations-availability.js";
import {publicListing} from "./listing-router.js";

/** PH13 public search: no sessions, no tenant patient tables, no actual bookings. */
type ClinicProfile=Awaited<ReturnType<typeof publicListing>>;
type PublicDentist=ClinicProfile["profile"]["dentists"][number];
type PublicService=ClinicProfile["profile"]["services"][number];
type Slot={startAt:string;endAt:string;dentistId:string;serviceId:string;
 dentistName:string;serviceName:string;priceAfn:number;durationMinutes:number};
type DiscoveryRequest=Request&{query:Request["query"]};
class DiscoveryFault extends Error{
 constructor(public status:number,public code:string){super(code);}
}
function fail(status:number,code:string):never{throw new DiscoveryFault(status,code);}
const task=(fn:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction)=>{fn(req,res).catch(next)};
const t=(v:unknown,max=90)=>typeof v==="string"?v.trim().slice(0,max):"";
const id=(v:unknown)=>{if(typeof v!=="string"||v.length<8||v.length>100||
 !/^[a-zA-Z0-9-]+$/.test(v))fail(404,"NOT_FOUND");return v};
const number=(v:unknown,name:string,min:number,max:number,def:number)=>{
 if(v==null||v==="")return def;
 const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail(422,"INVALID_"+name);
 return n;
};
const decimal=(v:unknown,name:string,min:number,max:number)=>{
 if(v==null||v==="")return null;
 const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)fail(422,"INVALID_"+name);
 return n;
};
function localDay(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"})
  .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
}
function exactDate(raw:unknown){
 const s=t(raw,15);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+"T12:00:00Z"))||
  new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)
  fail(422,"INVALID_DATE");
 const now=Date.parse(localDay()+"T12:00:00Z"),
  delta=(Date.parse(s+"T12:00:00Z")-now)/86400000;
 if(delta<0||delta>90)fail(422,"DATE_OUT_OF_RANGE");
 return s;
}
const addDays=(s:string,offset:number)=>
 new Date(Date.parse(s+"T12:00:00Z")+offset*86400000).toISOString().slice(0,10);
const safeWildcard=(s:string)=>s.replace(/[\\%_]/g,x=>"\\"+x);
const cache=new Map<string,{at:number;result:Slot|null}>();
function clinicId(req:Request){return id(req.params.clinicId);}
function dentistId(req:Request){return id(req.params.dentistId);}
function publicHeader(res:Response){
 // Short, publicly cacheable response; a revoked credential can expire all listing visibility.
 res.setHeader("Cache-Control","public, max-age=10, must-revalidate");
 res.setHeader("X-Content-Type-Options","nosniff");
}
function getTodaySlots(listing:ClinicProfile,day:string,slots:Slot[],serviceId?:string,dentistId?:string){
 // Thin metadata only; actual appointments are never included.
 return slots.filter(s=>(!serviceId||s.serviceId===serviceId)&&(!dentistId||s.dentistId===dentistId))
  .sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.dentistId.localeCompare(b.dentistId));
}
function publicServices(listing:ClinicProfile,service?:string){
 return listing.profile.services.filter(x=>!service||x.id===service);
}
function publicDentists(listing:ClinicProfile,dentist?:string){
 return listing.profile.dentists.filter(x=>!dentist||x.id===dentist);
}
async function slotsForDate(listing:ClinicProfile,day:string,options:{serviceId?:string;dentistId?:string;
 maxSlots?:number}={}):Promise<Slot[]>{
 const cid=listing.clinic.id;
 const services=publicServices(listing,options.serviceId),dentists=publicDentists(listing,options.dentistId);
 if(!services.length||!dentists.length)return [];
 const booking=listing.profile.bookingRules;
 const horizon=Math.min(booking.horizonDays,90);
 const delta=Math.round((Date.parse(day+"T12:00:00Z")-Date.parse(localDay()+"T12:00:00Z"))/86400000);
 if(delta<0||delta>=horizon)return [];
 const earliest=Date.now()+booking.minNoticeHours*3600000;
 const output:Slot[]=[];
 for(const dentist of dentists){
  for(const service of services){
   try{
    const view=await availabilityPreview(cid,{date:day,providerId:dentist.id,serviceId:service.id});
    // A future PH15 booking operation must revalidate under a DB transaction.
    if(view.service.version!==service.version||view.service.basePriceAfn!==service.priceAfn)
     continue;
    for(const s of view.slots){
     if(Date.parse(s.startAt)<=earliest)continue;
     output.push({startAt:s.startAt,endAt:s.endAt,dentistId:dentist.id,
      serviceId:service.id,dentistName:dentist.displayName,
      serviceName:service.name,priceAfn:service.priceAfn,
      durationMinutes:service.durationMinutes});
    }
   }catch{/* Out-of-schedule or invalidated service; never claim availability. */}
  }
 }
 const distinct=new Map<string,Slot>();
 for(const slot of output)distinct.set(slot.dentistId+":"+slot.serviceId+":"+slot.startAt,slot);
 return [...distinct.values()].sort((a,b)=>a.startAt.localeCompare(b.startAt)||
  a.dentistName.localeCompare(b.dentistName)).slice(0,options.maxSlots??30);
}
async function nextSlot(listing:ClinicProfile,day?:string,opts?:{serviceId?:string;dentistId?:string}){
 const cacheKey=listing.clinic.id+":"+listing.version+":"+(day||"next")+":"+
  (opts?.serviceId||"*")+":"+(opts?.dentistId||"*");
 const cached=cache.get(cacheKey);
 if(cached&&Date.now()-cached.at<12000)return cached.result;
 const from=day||localDay(),days=day?1:Math.min(listing.profile.bookingRules.horizonDays,14);
 let candidate:Slot|null=null;
 for(let i=0;i<days&&!candidate;i++){
  const found=await slotsForDate(listing,addDays(from,i),{
   serviceId:opts?.serviceId,dentistId:opts?.dentistId,maxSlots:1});
  candidate=found[0]||null;
 }
 if(cache.size>300)cache.clear();
 cache.set(cacheKey,{at:Date.now(),result:candidate});
 return candidate;
}
async function load(id:string):Promise<ClinicProfile>{
 try{return await publicListing(id)}
 catch(err){
  if((err as Error&{status?:number})?.status===404)fail(404,"CLINIC_UNAVAILABLE");
  throw err;
 }
}
async function openingHours(cid:string){
 const rows=await sqlClient`SELECT weekday,is_open,start_minute,end_minute
 FROM clinic_weekly_hours WHERE clinic_id=${cid} ORDER BY weekday`;
 const time=new Intl.DateTimeFormat("en-US",{
  timeZone:"Asia/Kabul",hour12:false,hour:"2-digit",minute:"2-digit",weekday:"short"
 }).formatToParts(new Date());
 const w=(time.find(x=>x.type==="weekday")?.value||"Mon");
 const minutes=Number(time.find(x=>x.type==="hour")?.value||0)*60+
  Number(time.find(x=>x.type==="minute")?.value||0);
 const dayMap:Record<string,number>={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
 const current=rows.find(x=>x.weekday===dayMap[w]);
 const isOpen=Boolean(current?.is_open&&minutes>=current.start_minute&&minutes<current.end_minute);
 return {weekly:rows.map(x=>({weekday:x.weekday,isOpen:x.is_open,
  startMinute:x.start_minute,endMinute:x.end_minute})),
  now:{weekday:dayMap[w],isWithinPublishedHours:isOpen,
   // Actual holiday/resource exceptions and appointment availability may override.
   disclaimer:"Opening hours are scheduled hours, not a promise of an appointment."}};
}
type Query={q:string;city:string;specialty:string;service:string;
 maxFee:number|null;date:string|null;verifiedOnly:boolean;page:number;limit:number;
 sort:"relevance"|"name"|"soonest"|"distance";latitude:number|null;longitude:number|null};
function parseQuery(q:Request["query"]):Query{
 const city=t(q.city,80),specialty=t(q.specialty,100),service=t(q.service,130);
 const sort=t(q.sort,20)||"relevance";
 if(!["relevance","name","soonest","distance"].includes(sort))fail(422,"INVALID_SORT");
 const latitude=decimal(q.latitude,"LATITUDE",-90,90),longitude=decimal(q.longitude,"LONGITUDE",-180,180);
 if((latitude===null)!==(longitude===null))fail(422,"COORDINATES_REQUIRED");
 if(sort==="distance"&&latitude===null)fail(422,"LOCATION_CONSENT_REQUIRED");
 const verified=t(q.verified,8);
 if(verified&&verified!=="true"&&verified!=="false")fail(422,"INVALID_VERIFIED_FILTER");
 return {q:t(q.q,100),city:city==="all"?"":city,specialty,service,
  maxFee:q.maxFee==null||q.maxFee===""?null:number(q.maxFee,"MAX_FEE",0,100000000,0),
  date:q.date==null||q.date===""?null:exactDate(q.date),
  verifiedOnly:verified!=="false",page:number(q.page,"PAGE",1,10000,1),
  limit:number(q.limit,"LIMIT",1,20,8),sort:sort as Query["sort"],latitude,longitude};
}
function geoDistance(lat1:number,lon1:number,lat2:number,lon2:number){
 const rad=(v:number)=>v*Math.PI/180;
 const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
 const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*
  Math.sin(dLon/2)**2;
 return Math.round(6371*2*Math.asin(Math.min(1,Math.sqrt(a)))*10)/10;
}
async function candidates(opts:Query,offset:number,max:number){
 const wild="%"+safeWildcard(opts.q.toLowerCase())+"%";
 const city=opts.city,spec=opts.specialty,service=opts.service;
 const fee=opts.maxFee;
 const sort=opts.sort;
 // Escaped ILIKE preserves underscores and percent signs as literal search content.
 // The search index contains only vetted public copy; eligibility view checks CURRENT revocation.
 return sqlClient`SELECT i.clinic_id,i.approved_version,i.clinic_name,i.city,i.province,
 i.min_fee_afn,i.latitude,i.longitude,i.published_at,
 CASE WHEN ${opts.q}='' THEN 0 WHEN lower(i.clinic_name)=lower(${opts.q}) THEN 9
      WHEN i.clinic_name ILIKE ${wild} ESCAPE '\\' THEN 6
      ELSE 1 END AS score
 FROM eligible_clinic_public_search i
 WHERE (${opts.q}='' OR i.search_text ILIKE ${wild} ESCAPE '\\')
 AND (${city}='' OR lower(i.city)=lower(${city}))
 AND (${spec}='' OR EXISTS(SELECT 1 FROM unnest(i.specialties) x
   WHERE lower(x)=lower(${spec})))
 AND (${service}='' OR EXISTS(SELECT 1 FROM unnest(i.services) x
   WHERE lower(x)=lower(${service})))
 AND (${fee}::integer IS NULL OR i.min_fee_afn<=${fee}::integer)
 ORDER BY
   CASE WHEN ${sort}='name' THEN lower(i.clinic_name) END ASC NULLS LAST,
   CASE WHEN ${sort}='distance' THEN
     power((i.latitude-${opts.latitude}::double precision)*111.32,2)+
     power((i.longitude-${opts.longitude}::double precision)*111.32*
       cos(radians(${opts.latitude}::double precision)),2)
   END ASC NULLS LAST,
   CASE WHEN ${sort}='relevance' OR ${sort}='soonest' THEN
     (CASE WHEN ${opts.q}='' THEN 0 WHEN lower(i.clinic_name)=lower(${opts.q}) THEN 9
       WHEN i.clinic_name ILIKE ${wild} ESCAPE '\\' THEN 6 ELSE 1 END)
   END DESC NULLS LAST,
   lower(i.clinic_name),i.clinic_id LIMIT ${max} OFFSET ${offset}`;
}
async function candidateCount(opts:Query){
 const wild="%"+safeWildcard(opts.q.toLowerCase())+"%";
 const [result]=await sqlClient`SELECT count(*)::integer AS total
 FROM eligible_clinic_public_search i
 WHERE (${opts.q}='' OR i.search_text ILIKE ${wild} ESCAPE '\\')
 AND (${opts.city}='' OR lower(i.city)=lower(${opts.city}))
 AND (${opts.specialty}='' OR EXISTS(SELECT 1 FROM unnest(i.specialties) x
    WHERE lower(x)=lower(${opts.specialty})))
 AND (${opts.service}='' OR EXISTS(SELECT 1 FROM unnest(i.services) x
    WHERE lower(x)=lower(${opts.service})))
 AND (${opts.maxFee}::integer IS NULL OR i.min_fee_afn<=${opts.maxFee}::integer)`;
 return Number(result?.total||0);
}
async function compactCard(row:any,opts:Query,calculateSlot:boolean){
 const listing=await load(String(row.clinic_id));
 const result={
  clinic:{id:listing.clinic.id,name:listing.clinic.name,city:listing.clinic.city,
   province:listing.clinic.province,address:listing.clinic.address,phone:listing.clinic.phone},
  description:listing.profile.description.slice(0,260),
  specialties:listing.profile.specialties,
  photo:listing.profile.photos[0]||null,
  dentists:listing.profile.dentists.map(x=>({id:x.id,name:x.displayName,
   specialty:x.specialty,verified:true})),
  services:listing.profile.services.map(x=>({id:x.id,name:x.name,category:x.category,
   priceAfn:x.priceAfn,durationMinutes:x.durationMinutes})),
  minFeeAfn:Math.min(...listing.profile.services.map(x=>x.priceAfn)),
  location:{latitude:listing.profile.latitude,longitude:listing.profile.longitude},
  distanceKm:opts.latitude!==null&&opts.longitude!==null?
    geoDistance(opts.latitude,opts.longitude,listing.profile.latitude,listing.profile.longitude):null,
  verifiedClinic:true,verifiedDentistsOnly:true,publicBookingsEnabled:false,
  nextSlot:null as Slot|null
 };
 if(calculateSlot)result.nextSlot=await nextSlot(listing,opts.date||undefined);
 return result;
}
export function discoveryRouter(){
 const api=Router();
 api.get("/facets",task(async(_req,res)=>{
  const [cities,specialties,services,total]=await Promise.all([
   sqlClient`SELECT city,province,count(*)::integer AS clinics FROM eligible_clinic_public_search
    GROUP BY city,province ORDER BY clinics DESC,city ASC LIMIT 120`,
   sqlClient`SELECT x AS name,count(*)::integer AS clinics FROM eligible_clinic_public_search i
    CROSS JOIN LATERAL unnest(i.specialties) AS x GROUP BY x ORDER BY clinics DESC,x LIMIT 100`,
   sqlClient`SELECT x AS name,count(*)::integer AS clinics FROM eligible_clinic_public_search i
    CROSS JOIN LATERAL unnest(i.services) AS x GROUP BY x ORDER BY clinics DESC,x LIMIT 120`,
   sqlClient`SELECT count(*)::integer AS total FROM eligible_clinic_public_search`
  ]);
  publicHeader(res);res.json({cities,specialties,services,
   verifiedClinics:Number(total[0]?.total||0),defaultCity:"Kabul",
   publicBookingsEnabled:false,searchRequiresAccount:false});
 }));
 api.get("/search",task(async(req,res)=>{
  const opts=parseQuery(req.query);
  // A dynamic date or soonest sort needs live schedule checks, not invented precomputed times.
  const evaluateAll=opts.date!==null||opts.sort==="soonest";
  const totalEligible=await candidateCount(opts);
  const maxScan=240;
  const records=await candidates(opts,evaluateAll?0:(opts.page-1)*opts.limit,
   evaluateAll?Math.min(maxScan,totalEligible):opts.limit);
  const cards:any[]=[];
  for(const row of records){
   try{
    const card=await compactCard(row,opts,evaluateAll);
    if(opts.date&&!card.nextSlot)continue; // Date truly filters confirmed availability.
    cards.push(card);
   }catch(err){
    if((err as Error&{status?:number}).status===404)continue;
    throw err;
   }
  }
  if(opts.sort==="soonest")cards.sort((a,b)=>{
   if(a.nextSlot&&!b.nextSlot)return -1;
   if(!a.nextSlot&&b.nextSlot)return 1;
   return (a.nextSlot?.startAt||"").localeCompare(b.nextSlot?.startAt||"")||
    a.clinic.name.localeCompare(b.clinic.name);
  });
  const truncated=evaluateAll&&totalEligible>maxScan;
  const selected=evaluateAll?cards.slice((opts.page-1)*opts.limit,opts.page*opts.limit):cards;
  if(!evaluateAll){
   // Live next slots are checked only for the visible page; static indexed search remains fast.
   await Promise.all(selected.map(async card=>{
    try{const listing=await load(card.clinic.id);card.nextSlot=await nextSlot(listing)}
    catch{/* Never show a fictional slot. */}
   }));
  }
  const total=evaluateAll?cards.length:totalEligible;
  publicHeader(res);res.json({items:selected,pagination:{
   page:opts.page,limit:opts.limit,total,totalExact:!truncated,
   hasNext:opts.page*opts.limit<total||truncated},filters:{
    q:opts.q,city:opts.city,specialty:opts.specialty,service:opts.service,
    date:opts.date,maxFee:opts.maxFee,verifiedOnly:true,
    sort:opts.sort,latitude:opts.latitude,longitude:opts.longitude},
   dateFilteredByLiveSlots:opts.date!==null,resultsTruncated:truncated,
   disclaimer:truncated?"Live availability evaluation is limited to 240 verified clinic candidates. Refine search or city.":null,
   publicBookingsEnabled:false,reviewedOnly:true});
 }));
 api.get("/clinics/:clinicId",task(async(req,res)=>{
  const listing=await load(clinicId(req));
  const [hours]=await Promise.all([openingHours(listing.clinic.id)]);
  publicHeader(res);
  res.json({...listing,searchable:true,hours,
   nextSlot:null,verifiedDentistsOnly:true,
   discoverable:true,publicBookingsEnabled:false,onlineBookingReleased:false});
 }));
 api.get("/clinics/:clinicId/availability",task(async(req,res)=>{
  const listing=await load(clinicId(req));
  const date=exactDate(req.query.date);
  const svc=req.query.serviceId==null?"":id(req.query.serviceId),
   dent=req.query.dentistId==null?"":id(req.query.dentistId);
  if(svc&&!listing.profile.services.some(x=>x.id===svc))fail(404,"PUBLIC_SERVICE_NOT_FOUND");
  if(dent&&!listing.profile.dentists.some(x=>x.id===dent))fail(404,"VERIFIED_DENTIST_NOT_FOUND");
  const slots=await slotsForDate(listing,date,{serviceId:svc||undefined,
   dentistId:dent||undefined,maxSlots:60});
  publicHeader(res);res.json({clinicId:listing.clinic.id,date,timezone:"Asia/Kabul",
   serviceId:svc||null,dentistId:dent||null,slots,
   status:slots.length?"available":"no_slots",checkedAt:new Date().toISOString(),
   source:"live_clinic_schedule",previewOnly:true,publicBookingsEnabled:false,
   disclaimer:"Candidate times reflect live clinic capacity but cannot be reserved on this site until Phase 15."});
 }));
 api.get("/clinics/:clinicId/dentists/:dentistId",task(async(req,res)=>{
  const listing=await load(clinicId(req));
  const dentist=listing.profile.dentists.find(x=>x.id===dentistId(req));
  if(!dentist)fail(404,"VERIFIED_DENTIST_NOT_FOUND");
  // Only these reviewer-allowlisted profile fields can be public. Never send credential numbers/files.
  const [credential]=await sqlClient`SELECT verified_snapshot,approved_draft_version
    FROM clinic_dentist_credential_cases WHERE clinic_id=${listing.clinic.id}
      AND membership_id=${dentist.id} AND status='verified'`;
  const snapshot=credential?.verified_snapshot||{};
  const hours=await openingHours(listing.clinic.id);
  publicHeader(res);res.json({
   clinic:listing.clinic,
   dentist:{id:dentist.id,displayName:dentist.displayName,
    specialty:dentist.specialty,qualifications:dentist.qualifications,
    biography:typeof snapshot.biography==="string"?snapshot.biography:null,
    verified:true,affiliationVerified:true,professionalVerificationSource:"platform_document_review",
    // Show expiry but never the identifier or supporting document.
    validUntil:dentist.validUntil},
   services:listing.profile.services.map(x=>({id:x.id,name:x.name,
    category:x.category,durationMinutes:x.durationMinutes,priceAfn:x.priceAfn})),
   specialties:listing.profile.specialties,photo:listing.profile.photos[0]||null,
   bookingRules:listing.profile.bookingRules,hours,timezone:"Asia/Kabul",
   publicBookingsEnabled:false,onlineBookingReleased:false});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof DiscoveryFault)return void res.status(error.status).json({code:error.code});
  if((error as any)?.status===404)return void res.status(404).json({code:"CLINIC_UNAVAILABLE"});
  console.error("PH13 public discovery failure",error instanceof Error?error.name:"unknown",
   "sqlState",(error as any)?.code||"none");
  res.status(500).json({code:"DISCOVERY_UNAVAILABLE"});
 });
 return api;
}
