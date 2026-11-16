import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useNativeAuth} from "./native-auth";
import {patientError} from "./patient-errors";
import {patientTheme as theme} from "./patient-theme";
import {PatientIcon} from "./patient-icons";

type Lang="en"|"fa-AF"|"ps-AF";
type Member={id:string;displayName:string;memberType:"minor"|"adult";revision:number;
 dateOfBirth:string|null;relationship:string;eligibleForFutureBooking:boolean;
 age:number|null;guardianPolicyVersion?:string;authorizationStatus:string};
type Family={members:Member[];limit:number;policy:{guardianPolicyVersion:string}};
type Request={id:string;guardianName:string;createdAt:string;expiresAt:string};
type Delegate={id:string;guardianName:string;revision:number};
type Snapshot={user:string;family:Family;incoming:Request[];delegations:Delegate[];error:string;loading:boolean};
const labels={
 en:{family:"Family members",members:"My family",requests:"Requests",delegations:"My permissions",
  empty:"No family members have been added.",incomingEmpty:"No pending requests.",
  delegationEmpty:"You have not authorized anyone else to manage your bookings.",
  guardian:"Guardian",minor:"Child",adult:"Authorized adult",dob:"Date of birth (YYYY-MM-DD)",
  name:"Child's full name",add:"Add child",edit:"Edit",save:"Save changes",remove:"Remove",
  removeAsk:"Remove this family authorization? This does not remove any clinic records.",
  invite:"Invite an adult",inviteText:"The adult must independently accept in their own verified account.",
  email:"Adult's email",send:"Send invitation",inviteSent:"If a verified account exists, an invitation may be delivered.",
  consent:"I confirm that I am the child's legal guardian.",
  adultConsent:"I independently agree to grant this person permission to request bookings for me.",
  accept:"Accept",decline:"Decline",revoke:"Revoke permission",expires:"Expires",
  privacy:"Family authorization does not give access to anyone's private clinic record.",
  refresh:"Refresh",retry:"Retry",cancel:"Cancel",saved:"Family information updated.",
  age:"Age",notEligible:"Adult reauthorization is needed for this member.",
  needed:"Fill in the required information and confirm authorization.",
  request:"Authorization request from",guardianVersion:"Guardian attestation is required.",
  limit:"The family member limit has been reached."},
 "fa-AF":{family:"اعضای خانواده",members:"خانواده من",requests:"درخواست‌ها",delegations:"اجازه‌های من",
  empty:"هنوز عضوی اضافه نشده است.",incomingEmpty:"درخواست منتظر ندارید.",
  delegationEmpty:"اجازه مدیریت نوبت به شخص دیگری نداده‌اید.",
  guardian:"سرپرست",minor:"طفل",adult:"بزرگسال مجاز",dob:"تاریخ تولد (YYYY-MM-DD)",
  name:"نام کامل طفل",add:"افزودن طفل",edit:"ویرایش",save:"ذخیره تغییرات",remove:"حذف",
  removeAsk:"این اجازه خانوادگی لغو شود؟ این کار اسناد کلینیک را حذف نمی‌کند.",
  invite:"دعوت بزرگسال",inviteText:"بزرگسال باید با حساب تأییدشده خود مستقلاً اجازه بدهد.",
  email:"ایمیل بزرگسال",send:"فرستادن دعوت",inviteSent:"در صورت موجود بودن حساب تأییدشده، دعوت ارسال می‌شود.",
  consent:"تأیید می‌کنم سرپرست قانونی این طفل هستم.",
  adultConsent:"مستقلاً اجازه می‌دهم این شخص برای من نوبت درخواست کند.",
  accept:"قبول",decline:"رد",revoke:"لغو اجازه",expires:"انقضا",
  privacy:"اجازه خانوادگی به اسناد خصوصی کلینیک دسترسی نمی‌دهد.",
  refresh:"تازه‌سازی",retry:"کوشش دوباره",cancel:"انصراف",saved:"معلومات خانواده به‌روز شد.",
  age:"سن",notEligible:"این شخص نیاز به اجازه جدید بزرگسال دارد.",
  needed:"معلومات ضروری و اجازه‌نامه را تکمیل کنید.",
  request:"درخواست اجازه از",guardianVersion:"تأیید سرپرستی ضروری است.",
  limit:"حد مجاز اعضای خانواده پُر شده است."},
 "ps-AF":{family:"د کورنۍ غړي",members:"زما کورنۍ",requests:"غوښتنې",delegations:"زما اجازې",
  empty:"تر اوسه د کورنۍ غړی نه دی اضافه شوی.",incomingEmpty:"منتظر غوښتنه نشته.",
  delegationEmpty:"تاسو بل چا ته د ملاقاتونو د سمبالولو اجازه نه ده ورکړې.",
  guardian:"سرپرست",minor:"ماشوم",adult:"مجاز بالغ",dob:"د زیږېدو نېټه (YYYY-MM-DD)",
  name:"د ماشوم بشپړ نوم",add:"ماشوم اضافه کړئ",edit:"سمول",save:"بدلونونه خوندي کړئ",remove:"لرې کول",
  removeAsk:"د کورنۍ اجازه لغوه کړئ؟ د کلینیک ریکارډونه نه پاکېږي.",
  invite:"بالغ ته بلنه",inviteText:"بالغ باید په خپل تایید شوي حساب کې په خپله اجازه ورکړي.",
  email:"د بالغ ایمیل",send:"بلنه ولېږئ",inviteSent:"که تایید شوی حساب وي، بلنه استول کېدای شي.",
  consent:"زه د دې ماشوم قانوني سرپرست یم.",
  adultConsent:"زه اجازه ورکوم چې دا شخص زما لپاره د ملاقات غوښتنه وکړي.",
  accept:"منل",decline:"ردول",revoke:"اجازه لغوه کول",expires:"ختمېږي",
  privacy:"د کورنۍ اجازه د کلینیک شخصي ریکارډونو ته لاسرسی نه ورکوي.",
  refresh:"تازه کول",retry:"بیا هڅه",cancel:"لغوه",saved:"د کورنۍ معلومات تازه شول.",
  age:"عمر",notEligible:"دا غړی د بالغ نوې اجازې ته اړتیا لري.",
  needed:"اړین معلومات او اجازه تایید کړئ.",
  request:"له خوا د اجازې غوښتنه",guardianVersion:"د سرپرست تایید اړین دی.",
  limit:"د کورنۍ د غړو حد پوره شوی دی."}
} as const;
const css=StyleSheet.create({
 card:{backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.stroke,
  borderRadius:theme.radius.card,padding:theme.spacing.card,gap:12,...theme.shadow},
 title:{color:theme.colors.ink,fontSize:theme.type.section,fontWeight:"800"},
 name:{color:theme.colors.ink,fontSize:theme.type.body,fontWeight:"800",flexShrink:1},
 sub:{color:theme.colors.muted,fontSize:theme.type.secondary,lineHeight:21},
 row:{flexDirection:"row",gap:11,alignItems:"center"},
 tab:{paddingHorizontal:11,paddingVertical:12,flex:1,minHeight:48,borderRadius:13,
  backgroundColor:theme.colors.brandSoft,alignItems:"center",justifyContent:"center"},
 tabActive:{backgroundColor:theme.colors.brand},
 tabText:{fontSize:theme.type.caption,color:theme.colors.ink,fontWeight:"700",textAlign:"center"},
 tabActiveText:{color:"#fff"},
 input:{borderColor:theme.colors.stroke,borderWidth:1,borderRadius:theme.radius.control,
  minHeight:theme.controlHeight,paddingHorizontal:13,paddingVertical:10,fontSize:theme.type.body,
  color:theme.colors.ink,backgroundColor:"#fff"},
 label:{fontSize:theme.type.label,fontWeight:"700",color:theme.colors.ink},
 btn:{minHeight:theme.controlHeight,padding:11,borderRadius:theme.radius.control,
  backgroundColor:theme.colors.brand,alignItems:"center",justifyContent:"center"},
 btnText:{fontSize:theme.type.body,fontWeight:"800",color:"#fff",textAlign:"center"},
 secondary:{backgroundColor:theme.colors.brandSoft,borderColor:"#BED4F7",borderWidth:1},
 secondaryText:{color:theme.colors.brandDark},
 danger:{backgroundColor:theme.colors.dangerSoft,borderColor:"#E9BAC2",borderWidth:1},
 dangerText:{color:theme.colors.danger},
 error:{color:theme.colors.danger,fontSize:theme.type.body,lineHeight:22,
  backgroundColor:theme.colors.dangerSoft,borderRadius:12,padding:12},
 success:{color:theme.colors.green,fontSize:theme.type.body},
 checkbox:{minHeight:48,justifyContent:"center",borderRadius:12,
  backgroundColor:"#F4F7FC",padding:13}
});
function Button({title,onPress,secondary=false,danger=false,disabled=false}:{
 title:string;onPress:()=>void;secondary?:boolean;danger?:boolean;disabled?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={({pressed})=>[css.btn,secondary&&css.secondary,danger&&css.danger,
   disabled&&{opacity:.45},pressed&&!disabled&&{opacity:.85}]}>
  <Text style={[css.btnText,(secondary||danger)&&css.secondaryText,danger&&css.dangerText]}>{title}</Text>
 </Pressable>;
}
function Line({label,value}:{label:string;value:string}){
 return <View style={{gap:3}}><Text style={css.label}>{label}</Text><Text style={css.sub}>{value}</Text></View>;
}
const formatDate=(value:string,locale:Lang)=>new Date(value).toLocaleDateString(
 locale==="fa-AF"?"fa-AF":locale==="ps-AF"?"ps-AF":"en-GB");

export function NativeFamilyManager({locale}:{locale:Lang}){
 const t=labels[locale],auth=useNativeAuth();
 const user=auth.account?.registered?auth.account.user.id:null;
 const [panel,setPanel]=useState<"members"|"requests"|"delegations">("members");
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[revision,setRevision]=useState(0);
 const [editing,setEditing]=useState<Member|null|undefined>(undefined);
 const [name,setName]=useState(""),[dob,setDob]=useState(""),[consent,setConsent]=useState(false);
 const [email,setEmail]=useState(""),[decisionConsent,setDecisionConsent]=useState<Record<string,boolean>>({});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{
  setEditing(undefined);setName("");setDob("");setConsent(false);
  setEmail("");setDecisionConsent({});setError("");setMessage("");
  if(!user){setSnapshot(null);return;}
  let live=true;setSnapshot(null);
  Promise.all([
   auth.request<Family>("/v1/patients/family"),
   auth.request<{requests:Request[]}>("/v1/patients/family/requests"),
   auth.request<{delegations:Delegate[]}>("/v1/patients/family/delegations")
  ]).then(([family,incoming,permissions])=>{
   if(live)setSnapshot({user,family,incoming:incoming.requests,
    delegations:permissions.delegations,error:"",loading:false});
  }).catch(e=>{if(live)setSnapshot({user,family:{members:[],limit:20,
    policy:{guardianPolicyVersion:""}},incoming:[],delegations:[],
    error:patientError(e,locale),loading:false})});
  return()=>{live=false};
 },[user,auth.request,revision]);
 const live=snapshot?.user===user?snapshot:null;
 const work=async(fn:()=>Promise<void>)=>{
  setBusy(true);setError("");setMessage("");
  try{await fn();setMessage(t.saved);refresh();}
  catch(e){setError(patientError(e,locale))}
  finally{setBusy(false)}
 };
 const edit=(row:Member|null)=>{
  setEditing(row);setName(row?.displayName||"");setDob(row?.dateOfBirth||"");setConsent(false);
  setError("");setMessage("");
 };
 const remove=(m:Member)=>{
  Alert.alert(t.remove,t.removeAsk,[{text:t.cancel,style:"cancel"},
   {text:t.remove,style:"destructive",onPress:()=>void work(async()=>{
    await auth.request("/v1/patients/family/"+encodeURIComponent(m.id),"DELETE",{revision:m.revision});
   })}]);
 };
 if(!user)return <View style={css.card}><Text style={css.sub}>{t.privacy}</Text></View>;
 return <View style={{gap:14,direction:locale==="en"?"ltr":"rtl"}}>
  <View style={css.card}>
   <View style={[css.row,{flexDirection:locale==="en"?"row":"row-reverse"}]}>
    <PatientIcon name="users" size={24} color={theme.colors.brand}/>
    <Text accessibilityRole="header" style={css.title}>{t.family}</Text>
   </View>
   <Text style={css.sub}>{t.privacy}</Text>
   <View style={[css.row,{flexDirection:locale==="en"?"row":"row-reverse"}]}>
    {(["members","requests","delegations"] as const).map(tab=>
     <Pressable accessibilityRole="tab" accessibilityState={{selected:panel===tab}}
      key={tab} onPress={()=>{setPanel(tab);setEditing(undefined)}}
      style={[css.tab,panel===tab&&css.tabActive]}>
      <Text style={[css.tabText,panel===tab&&css.tabActiveText]}>{t[tab]}</Text>
     </Pressable>)}
   </View>
   <Button secondary title={t.refresh} disabled={busy} onPress={refresh}/>
  </View>
  {!live?<View style={css.card}><ActivityIndicator color={theme.colors.brand}/></View>:
  live.error?<View style={css.card}><Text accessibilityRole="alert" style={css.error}>{live.error}</Text>
   <Button title={t.retry} onPress={refresh}/></View>:
  <>
   {panel==="members"&&<View style={{gap:12}}>
    <View style={css.card}>
     {!live.family.members.length&&<Text style={css.sub}>{t.empty}</Text>}
     {live.family.members.map(member=><View key={member.id}
      style={{gap:9,borderBottomWidth:1,borderColor:theme.colors.stroke,paddingBottom:13}}>
      <Text style={css.name}>{member.displayName}</Text>
      <Text style={css.sub}>{member.memberType==="minor"?t.minor:t.adult}
       {member.age!==null?" · "+t.age+": "+member.age:""}</Text>
      {!member.eligibleForFutureBooking&&<Text style={css.error}>{t.notEligible}</Text>}
      {member.memberType==="minor"&&member.eligibleForFutureBooking&&
       <Button secondary title={t.edit} disabled={busy} onPress={()=>edit(member)}/>}
      <Button danger title={t.remove} disabled={busy} onPress={()=>remove(member)}/>
     </View>)}
     {live.family.members.length<live.family.limit&&editing===undefined&&
      <Button title={t.add} onPress={()=>edit(null)}/>}
     {live.family.members.length>=live.family.limit&&<Text style={css.sub}>{t.limit}</Text>}
    </View>
    {editing!==undefined&&<View style={css.card}>
     <Text style={css.title}>{editing?t.edit:t.add}</Text>
     <Text style={css.label}>{t.name}</Text>
     <TextInput accessibilityLabel={t.name} value={name} onChangeText={setName}
      maxLength={120} style={css.input}/>
     <Text style={css.label}>{t.dob}</Text>
     <TextInput accessibilityLabel={t.dob} value={dob} onChangeText={setDob}
      keyboardType="numbers-and-punctuation" maxLength={10}
      placeholder="YYYY-MM-DD" style={css.input}/>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}}
      style={css.checkbox} onPress={()=>setConsent(x=>!x)}>
      <Text style={css.sub}>{consent?"☑":"□"} {t.consent}</Text></Pressable>
     <Button title={t.save} disabled={busy||!consent||name.trim().length<2||
      !/^\d{4}-\d{2}-\d{2}$/.test(dob)}
      onPress={()=>void work(async()=>{
       const payload={displayName:name.trim(),dateOfBirth:dob,
        relationship:editing?.relationship==="legal_guardian"?"legal_guardian":"child",
        authorizationStatement:true,guardianPolicyVersion:live.family.policy.guardianPolicyVersion};
       if(editing)await auth.request("/v1/patients/family/minors/"+encodeURIComponent(editing.id),
        "PUT",{...payload,revision:editing.revision});
       else await auth.request("/v1/patients/family/minors","POST",payload);
       edit(null);setEditing(undefined);
      })}/>
     <Button secondary title={t.cancel} onPress={()=>setEditing(undefined)}/>
    </View>}
    <View style={css.card}>
     <Text style={css.title}>{t.invite}</Text>
     <Text style={css.sub}>{t.inviteText}</Text>
     <Text style={css.label}>{t.email}</Text>
     <TextInput value={email} onChangeText={setEmail} accessibilityLabel={t.email}
      keyboardType="email-address" autoCapitalize="none" maxLength={254} style={css.input}/>
     <Button title={t.send} disabled={busy||!email.includes("@")}
      onPress={()=>void work(async()=>{
       await auth.request("/v1/patients/family/invite-adult","POST",{
        email:email.trim().toLowerCase(),explicitAuthorization:true});
       setEmail("");setMessage(t.inviteSent);
      })}/>
     <Text style={css.sub}>{t.inviteSent}</Text>
    </View>
   </View>}
   {panel==="requests"&&<View style={css.card}>
    {!live.incoming.length&&<Text style={css.sub}>{t.incomingEmpty}</Text>}
    {live.incoming.map(req=><View key={req.id} style={{gap:10,paddingVertical:10}}>
     <Line label={t.request} value={req.guardianName}/>
     <Line label={t.expires} value={formatDate(req.expiresAt,locale)}/>
     <Pressable accessibilityRole="checkbox"
      accessibilityState={{checked:!!decisionConsent[req.id]}}
      style={css.checkbox} onPress={()=>setDecisionConsent(old=>({...old,[req.id]:!old[req.id]}))}>
      <Text style={css.sub}>{decisionConsent[req.id]?"☑":"□"} {t.adultConsent}</Text>
     </Pressable>
     <Button title={t.accept} disabled={busy||!decisionConsent[req.id]}
      onPress={()=>void work(async()=>{await auth.request(
       "/v1/patients/family/requests/"+encodeURIComponent(req.id)+"/decide",
       "POST",{decision:"accept",adultConsent:true})})}/>
     <Button secondary title={t.decline} disabled={busy} onPress={()=>void work(async()=>{
      await auth.request("/v1/patients/family/requests/"+encodeURIComponent(req.id)+"/decide",
       "POST",{decision:"decline",adultConsent:true})})}/>
    </View>)}
   </View>}
   {panel==="delegations"&&<View style={css.card}>
    {!live.delegations.length&&<Text style={css.sub}>{t.delegationEmpty}</Text>}
    {live.delegations.map(item=><View key={item.id} style={{gap:10}}>
     <Text style={css.name}>{item.guardianName}</Text>
     <Button danger title={t.revoke} disabled={busy} onPress={()=>Alert.alert(
      t.revoke,t.removeAsk,[{text:t.cancel,style:"cancel"},
       {text:t.revoke,style:"destructive",onPress:()=>void work(async()=>{
        await auth.request("/v1/patients/family/delegations/"+encodeURIComponent(item.id),"DELETE");
       })}])}/>
    </View>)}
   </View>}
  </>}
  {!!error&&<Text accessibilityRole="alert" style={css.error}>{error}</Text>}
  {!!message&&<Text style={css.success}>{message}</Text>}
 </View>;
}
