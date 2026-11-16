import React,{useEffect,useState} from "react";
import {ActivityIndicator,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useNativeAuth} from "./native-auth";
import {patientError} from "./patient-errors";
import {patientTheme as theme} from "./patient-theme";
import {PatientIcon} from "./patient-icons";

declare const process:{readonly env:{readonly EXPO_PUBLIC_API_URL?:string}};
type Lang="en"|"fa-AF"|"ps-AF";
type Category={code:string;label_en:string;label_fa:string;label_ps:string};
type Question={key:string;en:string;fa:string;ps:string;answerEn:string;answerFa:string;answerPs:string};
type Help={faq:Question[];categories:Category[];privacyNotice:string};
type Ticket={id:string;reference:string;title:string;category_code:string;status:string;
 created_at:string;updated_at:string};
type Message={id:string;author_role:string;body:string;created_at:string};
type TicketDetail={ticket:Ticket;messages:Message[]};
type Snapshot={user:string|null;help:Help|null;tickets:Ticket[];error:string;loading:boolean};
const label={
 en:{title:"Help and support",sub:"Find answers or contact support about your DandanLink account and bookings.",
  faq:"Frequently asked questions",tickets:"My support requests",new:"New support request",
  category:"Select a topic",titleField:"Subject",message:"Message",send:"Send request",reply:"Send reply",
  sent:"Your request was submitted.",replied:"Reply sent.",reference:"Reference",status:"Status",
  noTickets:"You have no support requests yet.",privacy:"Never include diagnoses, health records, phone numbers, email addresses or ID numbers in support messages.",
  load:"Loading support information…",retry:"Try again",refresh:"Refresh",
  signIn:"Sign in to send and track support requests.",empty:"No help articles are available.",
  back:"Back to requests",open:"Open request",done:"Submitted",select:"Choose topic",
  close:"Close",continue:"View conversation",loadingTicket:"Loading conversation…",
  problem:"Unable to load support.",length:"Subject must be 5–120 characters and message 10–2000 characters.",
  disabled:"This conversation is closed. Existing messages remain visible.",
  requester:"You",support:"Support team"},
 "fa-AF":{title:"کمک و پشتیبانی",sub:"راهنمایی در باره حساب و نوبت‌های دندان‌لینک.",
  faq:"پرسش‌های معمول",tickets:"درخواست‌های من",new:"درخواست جدید",
  category:"انتخاب موضوع",titleField:"عنوان",message:"پیام",send:"ارسال درخواست",reply:"ارسال پاسخ",
  sent:"درخواست شما ثبت شد.",replied:"پاسخ فرستاده شد.",reference:"شماره پیگیری",status:"حالت",
  noTickets:"هنوز درخواست پشتیبانی ندارید.",privacy:"تشخیص، اسناد صحی، شماره تماس، ایمیل یا شماره تذکره را در پیام پشتیبانی نفرستید.",
  load:"معلومات پشتیبانی دریافت می‌شود…",retry:"دوباره کوشش",refresh:"تازه‌سازی",
  signIn:"برای ثبت و پیگیری درخواست وارد شوید.",empty:"هنوز راهنمایی ثبت نشده است.",
  back:"بازگشت به درخواست‌ها",open:"بازکردن درخواست",done:"ثبت‌شده",select:"موضوع را انتخاب کنید",
  close:"بستن",continue:"مشاهده گفتگو",loadingTicket:"گفتگو دریافت می‌شود…",
  problem:"پشتیبانی در دسترس نیست.",length:"عنوان باید ۵ تا ۱۲۰ و پیام ۱۰ تا ۲۰۰۰ نویسه باشد.",
  disabled:"این گفتگو بسته است. پیام‌های گذشته قابل دیدن‌اند.",
  requester:"شما",support:"گروه پشتیبانی"},
 "ps-AF":{title:"مرسته او ملاتړ",sub:"د ډنډان‌لېنک د حساب او ملاقاتونو په اړه مرسته.",
  faq:"ډېرې پوښتل شوې پوښتنې",tickets:"زما غوښتنې",new:"نوې غوښتنه",
  category:"موضوع غوره کړئ",titleField:"سرلیک",message:"پیغام",send:"غوښتنه ولېږئ",reply:"ځواب واستوئ",
  sent:"ستاسو غوښتنه ثبت شوه.",replied:"ځواب واستول شو.",reference:"د تعقیب شمېره",status:"حالت",
  noTickets:"تر اوسه د ملاتړ غوښتنه نشته.",privacy:"په پیغام کې تشخیص، طبي ریکارډ، تلیفون، ایمیل یا د پېژندنې شمېره مه استوئ.",
  load:"د ملاتړ معلومات لوستل کېږي…",retry:"بیا هڅه",refresh:"تازه کول",
  signIn:"د ملاتړ غوښتنې لپاره خپل حساب ته ننوځئ.",empty:"تر اوسه د مرستې لیکنې نشته.",
  back:"غوښتنو ته ستنېدل",open:"غوښتنه پرانیزئ",done:"ثبت شوې",select:"موضوع وټاکئ",
  close:"بندول",continue:"خبرې وګورئ",loadingTicket:"خبرې لوستل کېږي…",
  problem:"ملاتړ نه شي لوستل کېدای.",length:"سرلیک باید ۵–۱۲۰ او پیغام ۱۰–۲۰۰۰ نښې ولري.",
  disabled:"دا خبرې تړلې دي. پخواني پیغامونه ښکاري.",
  requester:"تاسو",support:"د ملاتړ ډله"}
} as const;
const css=StyleSheet.create({
 card:{backgroundColor:theme.colors.surface,borderColor:theme.colors.stroke,
  borderWidth:1,borderRadius:theme.radius.card,padding:theme.spacing.card,gap:13,...theme.shadow},
 h:{fontSize:theme.type.section,color:theme.colors.ink,fontWeight:"800"},
 title:{fontSize:theme.type.cardTitle,fontWeight:"800",color:theme.colors.ink},
 text:{fontSize:theme.type.body,lineHeight:23,color:theme.colors.inkSecondary},
 sub:{fontSize:theme.type.secondary,lineHeight:21,color:theme.colors.muted},
 label:{fontSize:theme.type.label,fontWeight:"700",color:theme.colors.ink},
 input:{fontSize:theme.type.body,color:theme.colors.ink,
  borderWidth:1,borderColor:theme.colors.stroke,borderRadius:theme.radius.control,
  padding:13,minHeight:theme.controlHeight,backgroundColor:"#fff"},
 button:{minHeight:theme.controlHeight,padding:12,borderRadius:theme.radius.control,
  backgroundColor:theme.colors.brand,justifyContent:"center",alignItems:"center"},
 btnText:{color:"#fff",fontSize:theme.type.body,fontWeight:"800"},
 secondary:{backgroundColor:theme.colors.brandSoft},secondaryText:{color:theme.colors.brandDark},
 selected:{borderColor:theme.colors.brand,backgroundColor:theme.colors.brandSoft,borderWidth:2},
 choice:{padding:13,borderColor:theme.colors.stroke,borderWidth:1,borderRadius:12,minHeight:theme.controlHeight},
 problem:{fontSize:theme.type.body,color:theme.colors.danger,padding:12,
  borderRadius:12,backgroundColor:theme.colors.dangerSoft},
 success:{fontSize:theme.type.body,color:theme.colors.green},
 separator:{borderBottomWidth:1,borderBottomColor:theme.colors.stroke,paddingBottom:12},
 status:{fontSize:theme.type.caption,color:theme.colors.brandDark,
  backgroundColor:theme.colors.brandSoft,padding:9,borderRadius:10,alignSelf:"flex-start"}
});
function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;
 disabled?:boolean;secondary?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={({pressed})=>[css.button,secondary&&css.secondary,
   disabled&&{opacity:.45},pressed&&!disabled&&{opacity:.9}]}>
  <Text style={[css.btnText,secondary&&css.secondaryText]}>{title}</Text>
 </Pressable>;
}
const name=(category:Category,lang:Lang)=>lang==="en"?category.label_en:
 lang==="fa-AF"?category.label_fa:category.label_ps;
const question=(faq:Question,lang:Lang)=>lang==="en"?faq.en:lang==="fa-AF"?faq.fa:faq.ps;
const answer=(faq:Question,lang:Lang)=>lang==="en"?faq.answerEn:lang==="fa-AF"?faq.answerFa:faq.answerPs;
export function NativePatientSupport({locale}:{locale:Lang}){
 const t=label[locale],auth=useNativeAuth();
 const user=auth.account?.registered?auth.account.user.id:null;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[revision,setRevision]=useState(0);
 const [form,setForm]=useState(false),[category,setCategory]=useState(""),
  [subject,setSubject]=useState(""),[message,setMessage]=useState("");
 const [ticketId,setTicketId]=useState<string|null>(null);
 const [detail,setDetail]=useState<{user:string;id:string;data:TicketDetail|null;error:string}|null>(null);
 const [detailRefresh,setDetailRefresh]=useState(0),[answerVisible,setAnswerVisible]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{
  setForm(false);setCategory("");setSubject("");setMessage("");
  setTicketId(null);setDetail(null);setError("");setSuccess("");
 },[user]);
 useEffect(()=>{
  let live=true;setSnapshot(null);
  // FAQ remains public. Ticket lists are fetched only after native identity validation.
  const api=(process.env.EXPO_PUBLIC_API_URL||"").replace(/\/+$/,"");
  Promise.all([
   (async()=>{if(!api||(!__DEV__&&!/^https:\/\//.test(api)))throw Error("unavailable");
    const response=await fetch(api+"/v1/support/public/help",{
     headers:{Accept:"application/json"},cache:"no-store"});
    if(!response.ok)throw Error("unavailable");
    return await response.json() as Help})(),
   user?auth.request<{tickets:Ticket[]}>("/v1/support/tickets/mine"):Promise.resolve({tickets:[]})
  ]).then(([help,mine])=>{
   if(live)setSnapshot({user,help,tickets:mine.tickets||[],error:"",loading:false});
  }).catch(e=>{if(live)setSnapshot({user,help:null,tickets:[],
   error:patientError(e,locale),loading:false})});
  return()=>{live=false};
 },[user,auth.request,revision]);
 useEffect(()=>{
  if(!user||!ticketId){setDetail(null);return;}
  let live=true;setDetail(null);
  auth.request<TicketDetail>("/v1/support/tickets/"+encodeURIComponent(ticketId))
   .then(data=>{if(live)setDetail({user,id:ticketId,data,error:""})})
   .catch(e=>{if(live)setDetail({user,id:ticketId,data:null,error:patientError(e,locale)})});
  return()=>{live=false};
 },[user,auth.request,ticketId,detailRefresh]);
 const current=snapshot?.user===user?snapshot:null;
 const conversation=detail?.user===user&&detail?.id===ticketId?detail:null;
 const work=async(fn:()=>Promise<void>,notification:string)=>{
  setBusy(true);setError("");setSuccess("");
  try{await fn();setSuccess(notification);refresh();}
  catch(e){setError(patientError(e,locale));}
  finally{setBusy(false);}
 };
 function create(){
  if(!user||busy||!category||subject.trim().length<5||message.trim().length<10)return;
  void work(async()=>{
   const made=await auth.request<{id:string;reference:string}>("/v1/support/tickets","POST",{
    category,title:subject.trim(),message:message.trim()});
   setTicketId(made.id);setForm(false);setMessage("");setSubject("");
   setDetailRefresh(v=>v+1);
  },t.sent);
 }
 function reply(){
  if(!ticketId||!user||message.trim().length<5||busy)return;
  const id=ticketId;
  void work(async()=>{
   await auth.request("/v1/support/tickets/"+encodeURIComponent(id)+"/messages","POST",{
    message:message.trim()});
   setMessage("");setDetailRefresh(x=>x+1);
  },t.replied);
 }
 return <View style={{gap:14,direction:locale==="en"?"ltr":"rtl"}}>
  <View style={css.card}>
   <View style={{flexDirection:locale==="en"?"row":"row-reverse",gap:10,alignItems:"center"}}>
    <PatientIcon name="help" size={24} color={theme.colors.brand}/>
    <Text accessibilityRole="header" style={css.h}>{t.title}</Text>
   </View>
   <Text style={css.text}>{t.sub}</Text>
   <Text style={css.sub}>{t.privacy}</Text>
   <Button secondary title={t.refresh} disabled={busy} onPress={refresh}/>
  </View>
  {!current?<View style={css.card}><ActivityIndicator color={theme.colors.brand}/>
   <Text style={css.sub}>{t.load}</Text></View>:
   current.error?<View style={css.card}><Text accessibilityRole="alert" style={css.problem}>{current.error}</Text>
    <Button title={t.retry} onPress={refresh}/></View>:
   <>
    <View style={css.card}>
     <Text accessibilityRole="header" style={css.h}>{t.faq}</Text>
     {!current.help?.faq.length&&<Text style={css.sub}>{t.empty}</Text>}
     {current.help?.faq.map(row=><Pressable key={row.key}
      accessibilityRole="button" accessibilityState={{expanded:answerVisible===row.key}}
      onPress={()=>setAnswerVisible(v=>v===row.key?null:row.key)} style={{gap:7,paddingVertical:10}}>
      <Text style={css.title}>{question(row,locale)}</Text>
      {answerVisible===row.key&&<Text style={css.text}>{answer(row,locale)}</Text>}
     </Pressable>)}
    </View>
    {user&&<>
     <View style={css.card}>
      <Text accessibilityRole="header" style={css.h}>{t.tickets}</Text>
      {!current.tickets.length&&<Text style={css.sub}>{t.noTickets}</Text>}
      {current.tickets.map(row=><Pressable key={row.id}
       onPress={()=>{setTicketId(row.id);setForm(false);setMessage("");setError("")}}
       accessibilityRole="button" style={[css.separator,{gap:8,paddingVertical:10}]}>
       <Text style={css.title}>{row.title}</Text>
       <Text style={css.status}>{row.status}</Text>
       <Text style={css.sub}>{t.reference}: {row.reference}</Text>
       <Text style={css.label}>{t.open} ›</Text>
      </Pressable>)}
      <Button title={t.new} onPress={()=>{setForm(true);setTicketId(null);
       setMessage("");setError("")}}/>
     </View>
     {form&&<View style={css.card}>
      <Text accessibilityRole="header" style={css.h}>{t.new}</Text>
      <Text style={css.label}>{t.category}</Text>
      {current.help?.categories.map(row=><Pressable key={row.code}
       accessibilityRole="radio" accessibilityState={{checked:category===row.code}}
       onPress={()=>setCategory(row.code)}
       style={[css.choice,category===row.code&&css.selected]}>
       <Text style={css.text}>{name(row,locale)}</Text>
      </Pressable>)}
      <Text style={css.label}>{t.titleField}</Text>
      <TextInput value={subject} onChangeText={setSubject} maxLength={120}
       accessibilityLabel={t.titleField} style={css.input}/>
      <Text style={css.label}>{t.message}</Text>
      <TextInput value={message} onChangeText={setMessage} multiline maxLength={2000}
       style={[css.input,{minHeight:112,textAlignVertical:"top"}]}
       accessibilityLabel={t.message}/>
      <Text style={css.sub}>{t.privacy}</Text>
      <Button title={t.send} disabled={busy||!category||subject.trim().length<5||
       message.trim().length<10} onPress={create}/>
      <Button secondary title={t.close} onPress={()=>setForm(false)}/>
     </View>}
     {ticketId&&<View style={css.card}>
      <Text accessibilityRole="header" style={css.h}>{t.continue}</Text>
      {!conversation?<><ActivityIndicator color={theme.colors.brand}/>
       <Text style={css.sub}>{t.loadingTicket}</Text></>:
       conversation.error?<><Text style={css.problem}>{conversation.error}</Text>
        <Button secondary title={t.retry} onPress={()=>setDetailRefresh(x=>x+1)}/></>:
       <>
        <Text style={css.title}>{conversation.data?.ticket.title}</Text>
        <Text style={css.status}>{t.status}: {conversation.data?.ticket.status}</Text>
        {conversation.data?.messages.map(row=><View key={row.id} style={[css.separator,{gap:6}]}>
         <Text style={css.label}>{row.author_role==="requester"?t.requester:t.support}</Text>
         <Text selectable style={css.text}>{row.body}</Text>
        </View>)}
        {["closed","resolved"].includes(conversation.data?.ticket.status||"")?
         <Text style={css.sub}>{t.disabled}</Text>:
         <><Text style={css.label}>{t.message}</Text>
          <TextInput accessibilityLabel={t.message} value={message} onChangeText={setMessage}
           multiline maxLength={2000} style={[css.input,{minHeight:104,textAlignVertical:"top"}]}/>
          <Button title={t.reply} disabled={busy||message.trim().length<5} onPress={reply}/></>}
       </>}
      <Button secondary title={t.back} onPress={()=>{setTicketId(null);setMessage("")}}/>
     </View>}
    </>}
    {!user&&<View style={css.card}><Text style={css.sub}>{t.signIn}</Text></View>}
   </>}
  {!!error&&<Text accessibilityRole="alert" style={css.problem}>{error}</Text>}
  {!!success&&<Text style={css.success}>{success}</Text>}
 </View>;
}
