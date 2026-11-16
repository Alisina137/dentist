import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useNativeAuth} from "./native-auth";
import {patientError} from "./patient-errors";
import {patientTheme as theme} from "./patient-theme";
import {PatientIcon} from "./patient-icons";
type Lang="en"|"fa-AF"|"ps-AF";
type Calendar="gregorian"|"solar_hijri";
type Link={id:string;clinicId:string;clinicName:string;state:string;requestedAt:string};
type Summary={id:string;clinicName:string;signedAt:string;reason:string;assessment:string;
 procedures:string|null};
type Receipt={id:string;clinicName:string;invoiceNumber:string;totalAfn:number;issuedAt:string};
type Records={summaries:Summary[];receipts:Receipt[];releasedOnly:true};
type Booking={clinicId:string;clinicName:string};
type Snapshot={user:string;links:Link[];records:Records;clinics:Booking[];
 error:string;loading:boolean};
const labels={
 en:{title:"My shared records",intro:"Only records explicitly released by a verified clinic are visible here.",
  link:"Request clinic record link",clinic:"Select clinic",number:"Clinic patient number",
  consent:"I consent to an in-person identity check by this clinic. A number alone does not prove identity or grant access.",
  request:"Request verification",pending:"Pending clinic verification",approved:"Identity link approved",
  revoked:"Revoked",rejected:"Rejected",summary:"Released visit summaries",
  receipts:"Released receipts",emptyLinks:"No clinic verification requests yet.",
  emptySummary:"No clinic-approved visit summaries have been shared.",
  emptyReceipts:"No issued receipts have been shared by a clinic.",
  attention:"Do not enter medical notes or identification documents here. Clinic staff verify you independently.",
  revoke:"Revoke access",revokeAsk:"Revoke this link? Released records will no longer be available through this link.",
  cancel:"Cancel",retry:"Try again",reload:"Refresh",load:"Loading your authorized records…",
  requestSent:"Your request was submitted. The clinic must verify your identity in person.",
  revokedDone:"Access revoked.",error:"Could not complete this action.",
  unavailable:"Sign in and complete your account profile to access your released records.",
  date:"Signed",issued:"Issued",reference:"Receipt",total:"Amount",noClinics:"Book with an approved clinic before requesting a link.",
  patientNumber:"The clinic-issued patient number is used only for your link request.",
  confirm:"Your request is not approved until the clinic confirms your identity."},
 "fa-AF":{title:"اسناد شریک‌شده من",intro:"فقط اسنادی را می‌بینید که کلینیک تأییدشده جداگانه برای شما آزاد کرده است.",
  link:"درخواست ارتباط با کلینیک",clinic:"انتخاب کلینیک",number:"شماره مریض در کلینیک",
  consent:"رضایت دارم کلینیک هویت مرا حضوری بررسی کند. شماره مریض به تنهایی دسترسی نمی‌دهد.",
  request:"درخواست بررسی",pending:"در انتظار بررسی کلینیک",approved:"ارتباط تأییدشده",
  revoked:"لغوشده",rejected:"ردشده",summary:"خلاصه‌های مراجعه آزادشده",
  receipts:"رسیدهای آزادشده",emptyLinks:"هنوز درخواست ارتباط ندارید.",
  emptySummary:"خلاصه مراجعه‌ای از سوی کلینیک برای شما آزاد نشده است.",
  emptyReceipts:"رسیدی از سوی کلینیک شریک نشده است.",
  attention:"یادداشت طبی یا سند هویتی را اینجا نفرستید. کلینیک هویت شما را جداگانه بررسی می‌کند.",
  revoke:"لغو دسترسی",revokeAsk:"این ارتباط لغو شود؟ اسناد آزادشده از این طریق دیگر قابل دیدن نخواهند بود.",
  cancel:"انصراف",retry:"دوباره کوشش",reload:"تازه‌سازی",load:"اسناد مجاز شما دریافت می‌شود…",
  requestSent:"درخواست ثبت شد. کلینیک باید هویت شما را حضوری بررسی کند.",
  revokedDone:"دسترسی لغو شد.",error:"درخواست انجام نشد.",
  unavailable:"برای دیدن اسناد آزادشده، وارد شوید و حساب خود را تکمیل کنید.",
  date:"امضا",issued:"صدور",reference:"رسید",total:"مبلغ",noClinics:"برای درخواست، ابتدا در یک کلینیک تأییدشده نوبت بگیرید.",
  patientNumber:"شماره مریضِ کلینیک فقط برای درخواست ارتباط استفاده می‌شود.",
  confirm:"تا تأیید هویت توسط کلینیک، درخواست شما پذیرفته نمی‌شود."},
 "ps-AF":{title:"زما شریک شوي ریکارډونه",intro:"یوازې هغه ریکارډونه ښکاري چې تایید شوي کلینیک په ځانګړې توګه تاسو ته ورکړي وي.",
  link:"له کلینیک سره د ریکارډ تړلو غوښتنه",clinic:"کلینیک وټاکئ",number:"په کلینیک کې د ناروغ شمېره",
  consent:"زه د کلینیک د حضوري پېژندنې پلټنې اجازه ورکوم. یوازې شمېره لاسرسی نه ورکوي.",
  request:"د تایید غوښتنه",pending:"د کلینیک تایید ته په تمه",approved:"تایید شوې اړیکه",
  revoked:"لغوه شوی",rejected:"رد شوی",summary:"اجازه شوې د لیدنې لنډیزونه",
  receipts:"اجازه شوي رسیدونه",emptyLinks:"لا د تړلو غوښتنه نشته.",
  emptySummary:"کلینیک تراوسه د لیدنې کوم لنډیز نه دی شریک کړی.",
  emptyReceipts:"کلینیک کوم رسید نه دی شریک کړی.",
  attention:"دلته طبي یادښتونه یا د پېژندنې اسناد مه لېږئ. کلینیک مو په جلا توګه پېژني.",
  revoke:"لاسرسی لغوه کړئ",revokeAsk:"دا اړیکه لغوه کړئ؟ د دې لارې ریکارډونه نور نه ښکاري.",
  cancel:"لغوه",retry:"بیا هڅه",reload:"تازه کول",load:"ستاسو مجاز ریکارډونه لوستل کېږي…",
  requestSent:"غوښتنه ثبت شوه. کلینیک باید ستاسو هویت په خپله تایید کړي.",
  revokedDone:"لاسرسی لغوه شو.",error:"غوښتنه بشپړه نشوه.",
  unavailable:"د ریکارډونو لپاره خپل حساب بشپړ او ننوځئ.",
  date:"لاسلیک",issued:"صدور",reference:"رسید",total:"مقدار",noClinics:"لومړی په تایید شوي کلینیک کې ملاقات وکړئ.",
  patientNumber:"د کلینیک ناروغ شمېره یوازې د تړلو غوښتنې لپاره کارېږي.",
  confirm:"ستاسو غوښتنه د کلینیک تر تایید پورې نه منل کېږي."}
} as const;
const css=StyleSheet.create({
 card:{backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.stroke,
  borderRadius:theme.radius.card,padding:theme.spacing.card,gap:12,...theme.shadow},
 heading:{color:theme.colors.ink,fontSize:theme.type.section,fontWeight:"800"},
 name:{color:theme.colors.ink,fontSize:theme.type.cardTitle,fontWeight:"800"},
 body:{fontSize:theme.type.body,color:theme.colors.inkSecondary,lineHeight:23},
 caption:{fontSize:theme.type.caption,color:theme.colors.muted,lineHeight:20},
 label:{fontSize:theme.type.label,color:theme.colors.ink,fontWeight:"700"},
 chip:{backgroundColor:theme.colors.brandSoft,paddingHorizontal:12,
  paddingVertical:8,borderRadius:99,alignSelf:"flex-start"},
 input:{minHeight:theme.controlHeight,borderColor:theme.colors.stroke,borderWidth:1,
  borderRadius:theme.radius.control,paddingHorizontal:13,fontSize:theme.type.body,
  color:theme.colors.ink,backgroundColor:"#fff"},
 btn:{backgroundColor:theme.colors.brand,minHeight:theme.controlHeight,
  borderRadius:theme.radius.control,alignItems:"center",justifyContent:"center",padding:13},
 btnText:{fontSize:theme.type.body,fontWeight:"800",color:"#fff",textAlign:"center"},
 secondary:{backgroundColor:theme.colors.brandSoft},secondaryText:{color:theme.colors.brandDark},
 danger:{backgroundColor:theme.colors.dangerSoft},dangerText:{color:theme.colors.danger},
 error:{fontSize:theme.type.body,color:theme.colors.danger,
  padding:12,backgroundColor:theme.colors.dangerSoft,borderRadius:12},
 selected:{borderColor:theme.colors.brand,backgroundColor:theme.colors.brandSoft,borderWidth:2},
 choice:{padding:13,borderWidth:1,borderColor:theme.colors.stroke,borderRadius:12},
 check:{padding:13,backgroundColor:theme.colors.background,minHeight:48,borderRadius:12},
 row:{gap:10,flexDirection:"row",alignItems:"center"}
});
function Button({title,onPress,secondary=false,danger=false,disabled=false}:{
 title:string;onPress:()=>void;secondary?:boolean;danger?:boolean;disabled?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
  style={({pressed})=>[css.btn,secondary&&css.secondary,danger&&css.danger,
   disabled&&{opacity:.4},pressed&&!disabled&&{opacity:.9}]}>
  <Text style={[css.btnText,secondary&&css.secondaryText,danger&&css.dangerText]}>{title}</Text>
 </Pressable>;
}
const displayDate=(iso:string,locale:Lang,calendar:Calendar)=>{
 const when=Date.parse(iso);
 return Number.isFinite(when)?new Intl.DateTimeFormat(locale==="en"?"en-GB":locale,{
  timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory",
  day:"numeric",month:"short",year:"numeric"}).format(new Date(when)):"—";
};
export function NativeReleasedRecords({locale,calendar}:{locale:Lang;calendar:Calendar}){
 const t=labels[locale],auth=useNativeAuth(),user=auth.account?.registered?auth.account.user.id:null;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[revision,setRevision]=useState(0);
 const [clinic,setClinic]=useState(""),[number,setNumber]=useState(""),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{
  setClinic("");setNumber("");setConsent(false);setError("");setNotice("");
 },[user]);
 useEffect(()=>{
  if(!user){setSnapshot(null);return;}
  let live=true;setSnapshot(null);
  Promise.all([
   auth.request<{links:Link[]}>("/v1/booking/record-links"),
   auth.request<Records>("/v1/booking/records"),
   auth.request<{appointments:Booking[]}>("/v1/booking/my")
  ]).then(([links,records,bookings])=>{
   if(!live)return;
   const unique=[...new Map((bookings.appointments||[]).map(b=>[b.clinicId,{
    clinicId:b.clinicId,clinicName:b.clinicName}])).values()];
   setSnapshot({user,links:links.links||[],records,clinics:unique,error:"",loading:false});
  }).catch(e=>{
   if(live)setSnapshot({user,links:[],records:{summaries:[],receipts:[],releasedOnly:true},
    clinics:[],error:patientError(e,locale),loading:false});
  });
  return()=>{live=false};
 },[user,auth.request,revision]);
 const view=snapshot?.user===user?snapshot:null;
 const work=async(fn:()=>Promise<void>,message:string)=>{
  setBusy(true);setError("");setNotice("");
  try{await fn();setNotice(message);refresh();}
  catch(e){setError(patientError(e,locale))}
  finally{setBusy(false)}
 };
 const request=()=>void work(async()=>{
  await auth.request("/v1/booking/record-links","POST",{
   clinicId:clinic,patientNumber:number.trim(),explicitConsent:true,
   identityProofAcknowledged:true});
  setNumber("");setConsent(false);
 },t.requestSent);
 const revoke=(row:Link)=>Alert.alert(t.revoke,t.revokeAsk,[
  {text:t.cancel,style:"cancel"},
  {text:t.revoke,style:"destructive",onPress:()=>void work(async()=>{
   await auth.request("/v1/booking/record-links/"+encodeURIComponent(row.id)+"/revoke","POST",{});
  },t.revokedDone)}]);
 if(!user)return <View style={css.card}><Text style={css.body}>{t.unavailable}</Text></View>;
 return <View style={{gap:15,direction:locale==="en"?"ltr":"rtl"}}>
  <View style={css.card}>
   <View style={[css.row,{flexDirection:locale==="en"?"row":"row-reverse"}]}>
    <PatientIcon name="file" size={24} color={theme.colors.brand}/>
    <Text accessibilityRole="header" style={css.heading}>{t.title}</Text>
   </View>
   <Text style={css.body}>{t.intro}</Text>
   <Text style={css.caption}>{t.attention}</Text>
   <Button secondary title={t.reload} onPress={refresh} disabled={busy}/>
  </View>
  {!view?<View style={css.card}><ActivityIndicator color={theme.colors.brand}/><Text style={css.caption}>{t.load}</Text></View>:
   view.error?<View style={css.card}><Text accessibilityRole="alert" style={css.error}>{view.error}</Text>
    <Button title={t.retry} onPress={refresh}/></View>:
   <>
    <View style={css.card}>
     <Text accessibilityRole="header" style={css.heading}>{t.link}</Text>
     <Text style={css.caption}>{t.confirm}</Text>
     <Text style={css.label}>{t.clinic}</Text>
     {!view.clinics.length&&<Text style={css.caption}>{t.noClinics}</Text>}
     {view.clinics.map(row=><Pressable key={row.clinicId}
      accessibilityRole="radio" accessibilityState={{checked:clinic===row.clinicId}}
      style={[css.choice,clinic===row.clinicId&&css.selected]} onPress={()=>setClinic(row.clinicId)}>
      <Text style={css.body}>{clinic===row.clinicId?"◉ ":"○ "}{row.clinicName}</Text>
     </Pressable>)}
     <Text style={css.label}>{t.number}</Text>
     <TextInput accessibilityLabel={t.number} value={number} onChangeText={setNumber}
      maxLength={40} autoCapitalize="none" style={css.input}/>
     <Text style={css.caption}>{t.patientNumber}</Text>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}}
      style={css.check} onPress={()=>setConsent(x=>!x)}>
      <Text style={css.body}>{consent?"☑":"□"} {t.consent}</Text>
     </Pressable>
     <Button title={t.request} disabled={busy||!clinic||number.trim().length<2||!consent}
      onPress={request}/>
    </View>
    <View style={css.card}>
     <Text accessibilityRole="header" style={css.heading}>{t.link}</Text>
     {!view.links.length&&<Text style={css.body}>{t.emptyLinks}</Text>}
     {view.links.map(row=><View key={row.id} style={{gap:9,paddingVertical:11,
      borderBottomColor:theme.colors.stroke,borderBottomWidth:1}}>
      <Text style={css.name}>{row.clinicName}</Text>
      <Text style={css.caption}>{displayDate(row.requestedAt,locale,calendar)}</Text>
      <View style={css.chip}><Text style={css.label}>{row.state==="pending"?t.pending:
       row.state==="approved"?t.approved:row.state==="revoked"?t.revoked:t.rejected}</Text></View>
      {["pending","approved"].includes(row.state)&&
       <Button danger title={t.revoke} disabled={busy} onPress={()=>revoke(row)}/>}
     </View>)}
    </View>
    <View style={css.card}>
     <Text accessibilityRole="header" style={css.heading}>{t.summary}</Text>
     {!view.records.summaries.length&&<Text style={css.body}>{t.emptySummary}</Text>}
     {view.records.summaries.map(row=><View key={row.id} style={{gap:9,paddingVertical:12,
      borderBottomColor:theme.colors.stroke,borderBottomWidth:1}}>
      <Text style={css.name}>{row.clinicName}</Text>
      <Text style={css.caption}>{t.date}: {displayDate(row.signedAt,locale,calendar)}</Text>
      <Text selectable style={css.body}>{row.reason}</Text>
      <Text selectable style={css.body}>{row.assessment}</Text>
     </View>)}
    </View>
    <View style={css.card}>
     <Text accessibilityRole="header" style={css.heading}>{t.receipts}</Text>
     {!view.records.receipts.length&&<Text style={css.body}>{t.emptyReceipts}</Text>}
     {view.records.receipts.map(row=><View key={row.id} style={{gap:8,paddingVertical:11}}>
      <Text style={css.name}>{row.clinicName}</Text>
      <Text style={css.caption}>{t.reference}: {row.invoiceNumber}</Text>
      <Text style={css.caption}>{t.issued}: {displayDate(row.issuedAt,locale,calendar)}</Text>
      <Text style={css.body}>{t.total}: {row.totalAfn.toLocaleString("en-GB")} AFN</Text>
     </View>)}
    </View>
   </>}
  {!!error&&<Text accessibilityRole="alert" style={css.error}>{error}</Text>}
  {!!notice&&<Text style={css.body}>{notice}</Text>}
 </View>;
}
