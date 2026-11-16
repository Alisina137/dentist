import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useNativeAuth} from "./native-auth";
import {patientError} from "./patient-errors";
import {patientTheme} from "./patient-theme";
import {PatientIcon} from "./patient-icons";

/** PH17 native reviews never cache clinical notes, patient names or raw private review data. */
type Lang="en"|"fa-AF"|"ps-AF";
type Eligibility={bookingId:string;clinicId:string;clinicName:string;serviceName:string;
 visitAt?:string;visitedAt:string;reviewId:string|null;canReview:boolean};
type Review={id:string;currentVersion:number;stars:number;headline:string;feedback:string;
 state:"pending"|"published"|"rejected";decisionCategory:string|null;decisionNote:string|null;
 withdrawn:boolean;publishedVersion:number|null};
type Notice={id:string;code:string;created_at:string};
const labels={
 en:{title:"My verified reviews",subtitle:"Only completed visits qualify for one review.",
 eligible:"Completed visits",mine:"My reviews",updates:"Review updates",
 pending:"Waiting for moderation",published:"Published",rejected:"Rejected",
 edit:"Edit",withdraw:"Withdraw",appeal:"Appeal",submit:"Submit review",
 headline:"Headline",details:"Tell us about the experience",stars:"Stars",
 privacy:"Never include names, contact information, diagnoses or medical records.",
 save:"Submit for review",cancel:"Cancel",retry:"Retry",empty:"No eligible visits yet.",
 error:"Unable to load reviews.",denied:"Sign in and complete onboarding to review.",
 report:"Verified completed appointment",feedback:"Your opinion can be critical or positive.",
 appealReason:"Explain why this review should be reconsidered",sent:"Review sent to moderation."},
 "fa-AF":{title:"نظرات تأییدشده من",subtitle:"هر ملاقات تکمیل‌شده فقط یک نظر دارد.",
 eligible:"ملاقات‌های تکمیل‌شده",mine:"نظرات من",updates:"اطلاعیه‌ها",
 pending:"در انتظار بررسی",published:"نشرشده",rejected:"رد شده",
 edit:"ویرایش",withdraw:"پس گرفتن",appeal:"تجدیدنظر",submit:"ثبت نظر",
 headline:"عنوان",details:"تجربه خود را بنویسید",stars:"ستاره",
 privacy:"نام، شماره تماس، تشخیص یا اسناد صحی را درج نکنید.",
 save:"فرستادن برای بررسی",cancel:"لغو",retry:"دوباره کوشش",empty:"هنوز ملاقات واجد شرایط نیست.",
 error:"نظرات دریافت نشد.",denied:"برای ثبت نظر وارد شوید و حساب را تکمیل کنید.",
 report:"ملاقات تکمیل‌شده تأییدشده",feedback:"نظر مثبت یا منفی شما پذیرفته است.",
 appealReason:"علت درخواست تجدیدنظر را بنویسید",sent:"نظر برای بررسی فرستاده شد."},
 "ps-AF":{title:"زما تایید شوي نظرونه",subtitle:"هر بشپړ شوي ملاقات ته یو نظر ورکولای شئ.",
 eligible:"بشپړ شوي ملاقاتونه",mine:"زما نظرونه",updates:"د نظر خبرتیاوې",
 pending:"څېړنې ته منتظر",published:"خپور شوی",rejected:"رد شوی",
 edit:"سمول",withdraw:"بېرته اخیستل",appeal:"بیاکتنه",submit:"نظر ثبت کړه",
 headline:"سرلیک",details:"خپله تجربه ولیکئ",stars:"ستوري",
 privacy:"نوم، اړیکه، تشخیص او طبي اسناد مه لیکئ.",
 save:"د څېړنې لپاره واستوئ",cancel:"لغوه",retry:"بیا هڅه",empty:"تراوسه وړ ملاقات نشته.",
 error:"نظرونه نه ښکاري.",denied:"د نظر لپاره حساب بشپړ کړئ.",
 report:"تایید شوی بشپړ ملاقات",feedback:"مثبت او منفي نظر دواړه منل کېږي.",
 appealReason:"د بیاکتنې دلیل ولیکئ",sent:"نظر څېړنې ته واستول شو."}
} as const;
const style=StyleSheet.create({
 card:{backgroundColor:patientTheme.colors.surface,borderWidth:1,
  borderColor:patientTheme.colors.stroke,borderRadius:patientTheme.radius.card,
  padding:patientTheme.spacing.card,gap:12,marginBottom:14,...patientTheme.shadow},
 title:{fontSize:patientTheme.type.section,fontWeight:"800",color:patientTheme.colors.ink},
 lead:{fontSize:patientTheme.type.body,color:patientTheme.colors.muted,lineHeight:23},
 badge:{fontSize:patientTheme.type.caption,fontWeight:"700",color:patientTheme.colors.green,
  backgroundColor:patientTheme.colors.greenSoft,paddingHorizontal:11,paddingVertical:7,
  alignSelf:"flex-start",borderRadius:16,overflow:"hidden"},
 tabs:{flexDirection:"row",gap:7,marginVertical:16},
 tab:{flex:1,backgroundColor:patientTheme.colors.brandSoft,padding:12,
  minHeight:patientTheme.controlHeight,borderRadius:14,alignItems:"center",justifyContent:"center"},
 selected:{backgroundColor:patientTheme.colors.brand},
 text:{fontSize:patientTheme.type.caption,color:patientTheme.colors.inkSecondary,
  fontWeight:"700",textAlign:"center"},
 selectedText:{color:"white"},
 input:{borderWidth:1,borderColor:"#C8D9EF",padding:14,
  borderRadius:patientTheme.radius.control,minHeight:patientTheme.controlHeight,
  backgroundColor:patientTheme.colors.surface,fontSize:patientTheme.type.body,
  color:patientTheme.colors.ink},
 area:{minHeight:128,textAlignVertical:"top"},
 button:{borderRadius:patientTheme.radius.control,backgroundColor:patientTheme.colors.brand,
  minHeight:patientTheme.controlHeight,justifyContent:"center",alignItems:"center",
  paddingHorizontal:16,paddingVertical:10,marginTop:6},
 buttonText:{fontSize:patientTheme.type.body,fontWeight:"800",color:"white"},
 warning:{backgroundColor:patientTheme.colors.dangerSoft,padding:14,borderRadius:12,
  color:patientTheme.colors.danger,fontSize:patientTheme.type.body},
 stars:{flexDirection:"row",gap:6,flexWrap:"wrap"},
 star:{fontSize:30,color:"#ABB8CA"},starChosen:{color:"#D49A12"}
});
function Button({text,onPress,disabled=false,secondary=false}:{text:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
  style={({pressed})=>[style.button,secondary&&{backgroundColor:patientTheme.colors.brandSoft},
   disabled&&{opacity:.45},pressed&&!disabled&&{opacity:.9,transform:[{scale:.99}]}]}>
  <Text style={[style.buttonText,secondary&&{color:"#1558cb"}]}>{text}</Text></Pressable>
}
export function NativeReviews({locale}:{locale:Lang}){
 const t=labels[locale]||labels.en,auth=useNativeAuth();
 const [view,setView]=useState<"eligible"|"mine"|"updates">("eligible");
 const user=auth.account?.registered?auth.account.user.id:null;
 const [snapshot,setSnapshot]=useState<{user:string;eligible:Eligibility[];
  mine:Review[];notices:Notice[];loading:boolean;error:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const current=snapshot?.user===user?snapshot:null;
 const eligible=current?.eligible||[],mine=current?.mine||[],notices=current?.notices||[];
 const loading=current?.loading??true,loadError=current?.error||"";
 const [selected,setSelected]=useState<Eligibility|Review|null>(null);
 const [mode,setMode]=useState<"new"|"edit"|"appeal"|null>(null);
 const [rating,setRating]=useState(5),[headline,setHeadline]=useState(""),[feedback,setFeedback]=useState("");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  // Clear sensitive editor state on account changes; never retain a prior
  // patient's review text, booking ID or rating while a new session loads.
  setView("eligible");setSelected(null);setMode(null);
  setHeadline("");setFeedback("");setRating(5);setError("");setBusy(false);
 },[user]);
 useEffect(()=>{
  if(!user){setSnapshot(null);return;}
  let mounted=true;
  setSnapshot({user,eligible:[],mine:[],notices:[],loading:true,error:""});
  Promise.all([
   auth.request<{eligible:Eligibility[]}>("/v1/reviews/my/eligibility"),
   auth.request<{reviews:Review[]}>("/v1/reviews/my"),
   auth.request<{notices:Notice[]}>("/v1/reviews/my/notices")
  ]).then(([a,b,c])=>{
   if(mounted)setSnapshot({user,eligible:a.eligible||[],mine:b.reviews||[],
    notices:c.notices||[],loading:false,error:""});
  }).catch(e=>{
   if(mounted)setSnapshot({user,eligible:[],mine:[],notices:[],
    loading:false,error:patientError(e,locale)});
  });
  return()=>{mounted=false};
 },[user,auth.request,refresh]);
 if(!auth.account?.registered)return <View style={style.card}>
  <Text style={style.title}>{t.title}</Text><Text style={style.lead}>{t.denied}</Text></View>;
 const chooseNew=(row:Eligibility)=>{setMode("new");setSelected(row);
  setRating(5);setHeadline("");setFeedback("");setError("")};
 const chooseEdit=(row:Review)=>{setMode("edit");setSelected(row);
  setRating(row.stars);setHeadline(row.headline);setFeedback(row.feedback);setError("")};
 const chooseAppeal=(row:Review)=>{setMode("appeal");setSelected(row);
  setFeedback("");setHeadline("");setError("")};
 async function submit(){
  if(!selected||!mode)return;
  setBusy(true);setError("");
  try{
   if(mode==="new")await auth.request("/v1/reviews/my","POST",{
    bookingId:(selected as Eligibility).bookingId,stars:rating,headline,feedback});
   if(mode==="edit")await auth.request("/v1/reviews/my/"+(selected as Review).id+"/edit","POST",{
    revision:(selected as Review).currentVersion,stars:rating,headline,feedback});
   if(mode==="appeal")await auth.request("/v1/reviews/my/"+(selected as Review).id+"/appeal","POST",{reason:feedback});
   setMode(null);setSelected(null);setRefresh(x=>x+1);
  }catch(e){setError(patientError(e,locale))}
  finally{setBusy(false)}
 }
 const withdraw=(review:Review)=>Alert.alert(t.withdraw,t.privacy,[
  {text:t.cancel,style:"cancel"},{text:t.withdraw,style:"destructive",onPress:()=>void(async()=>{
   setBusy(true);try{await auth.request("/v1/reviews/my/"+review.id+"/withdraw","POST",{});
    setRefresh(x=>x+1)}catch(e){setError(patientError(e,locale))}
   finally{setBusy(false)}
  })()}]);
 return <View>
  <View style={{flexDirection:locale==="en"?"row":"row-reverse",alignItems:"center",gap:10}}>
  <PatientIcon name="star" size={24} color={patientTheme.colors.brand}/>
  <Text style={style.title}>{t.title}</Text></View><Text style={style.lead}>{t.subtitle}</Text>
  <View style={[style.tabs,{flexDirection:locale==="en"?"row":"row-reverse"}]}>{(["eligible","mine","updates"] as const).map(k=><Pressable
   accessibilityRole="tab" accessibilityState={{selected:view===k}}
   key={k} onPress={()=>{setView(k);setMode(null)}} style={[style.tab,view===k&&style.selected]}>
   <Text style={[style.text,view===k&&style.selectedText]}>{t[k]}</Text></Pressable>)}</View>
  {loading&&<ActivityIndicator color="#075BF2"/>}
  {!!loadError&&<View style={style.card}><Text accessibilityRole="alert" style={style.warning}>{loadError}</Text>
   <Button text={t.retry} onPress={()=>setRefresh(x=>x+1)}/></View>}
  {!!error&&<View style={style.card}><Text accessibilityRole="alert" style={style.warning}>{error}</Text></View>}
  {!loading&&!loadError&&view==="eligible"&&eligible.map(row=><View key={row.bookingId} style={style.card}>
   <Text style={style.badge}>✓ {t.report}</Text>
   <Text style={style.title}>{row.clinicName}</Text>
   <Text style={style.lead}>{row.serviceName}</Text>
   {row.canReview?<Button text={t.submit} onPress={()=>chooseNew(row)}/>:
    <Text style={style.lead}>✓ {t.mine}</Text>}
  </View>)}
  {!loading&&!loadError&&view==="mine"&&mine.map(row=><View key={row.id} style={style.card}>
   <Text style={style.badge}>✓ {t.report}</Text><Text style={style.title}>{row.headline}</Text>
   <Text style={style.lead}>{"★".repeat(row.stars)} · {row.state==="published"?t.published:
    row.state==="rejected"?t.rejected:t.pending}</Text>
   <Text style={style.lead}>{row.feedback}</Text>
   {!!row.decisionNote&&<Text style={style.warning}>{row.decisionCategory}: {row.decisionNote}</Text>}
   {!row.withdrawn&&<>
    <Button secondary text={t.edit} onPress={()=>chooseEdit(row)}/>
    {row.state==="rejected"&&<Button secondary text={t.appeal} onPress={()=>chooseAppeal(row)}/>}
    <Button secondary text={t.withdraw} disabled={busy} onPress={()=>withdraw(row)}/>
   </>}
  </View>)}
  {!loading&&!loadError&&view==="updates"&&notices.map(n=><View key={n.id} style={style.card}>
   <Text style={style.lead}>{n.code}</Text>
   <Text style={style.text}>{new Date(n.created_at).toLocaleDateString(locale)}</Text></View>)}
  {!loading&&!loadError&&view==="eligible"&&!eligible.length&&<Text style={style.lead}>{t.empty}</Text>}
  {!loading&&!loadError&&view==="mine"&&!mine.length&&<Text style={style.lead}>{t.empty}</Text>}
  {!loading&&!loadError&&view==="updates"&&!notices.length&&<Text style={style.lead}>{t.empty}</Text>}
  {!!mode&&!loadError&&!loading&&<View style={style.card}>
   <Text style={style.title}>{mode==="appeal"?t.appeal:mode==="edit"?t.edit:t.submit}</Text>
   {mode!=="appeal"&&<>
    <Text style={style.text}>{t.stars}</Text>
    <View style={style.stars}>{[1,2,3,4,5].map(value=><Pressable
     accessibilityRole="radio" accessibilityState={{checked:rating===value}}
     key={value} onPress={()=>setRating(value)}
     accessibilityLabel={locale==="en"?value+" stars":locale==="ps-AF"?value+" ستوري":value+" ستاره"}
     style={{minWidth:44,minHeight:48,justifyContent:"center",alignItems:"center"}}>
      <Text style={[style.star,value<=rating&&style.starChosen]}>★</Text></Pressable>)}</View>
    <Text style={style.text}>{t.headline}</Text>
    <TextInput value={headline} onChangeText={setHeadline} maxLength={100} style={style.input}/>
   </>}
   <Text style={style.text}>{mode==="appeal"?t.appealReason:t.details}</Text>
   <TextInput multiline maxLength={mode==="appeal"?500:1200} value={feedback}
    onChangeText={setFeedback} style={[style.input,style.area]}/>
   <Text style={style.lead}>{t.privacy} {t.feedback}</Text>
   <Button disabled={busy||feedback.trim().length<20||
    (mode!=="appeal"&&headline.trim().length<5)} text={t.save} onPress={()=>void submit()}/>
   <Button secondary text={t.cancel} onPress={()=>setMode(null)}/>
  </View>}
 </View>;
}
