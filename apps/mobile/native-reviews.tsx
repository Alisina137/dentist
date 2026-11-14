import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useNativeAuth} from "./native-auth";

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
 card:{backgroundColor:"white",borderWidth:1,borderColor:"#dae5f7",borderRadius:15,padding:16,gap:9,marginBottom:11},
 title:{fontSize:20,fontWeight:"800",color:"#15315a"},lead:{fontSize:12,color:"#5d708a",lineHeight:20},
 badge:{fontSize:12,color:"#0c7b5a",backgroundColor:"#e6f7ef",padding:5,alignSelf:"flex-start",borderRadius:12},
 tabs:{flexDirection:"row",gap:7,marginVertical:15},tab:{flex:1,backgroundColor:"#edf3fd",padding:10,borderRadius:12,alignItems:"center"},
 selected:{backgroundColor:"#075BF2"},text:{fontSize:12,color:"#244066",fontWeight:"700"},
 selectedText:{color:"white"},input:{borderWidth:1,borderColor:"#c6d8f1",padding:12,borderRadius:12,minHeight:46,
  backgroundColor:"#fff",fontSize:14,color:"#1b3257"},
 area:{minHeight:115,textAlignVertical:"top"},button:{borderRadius:12,backgroundColor:"#075BF2",
  minHeight:44,justifyContent:"center",alignItems:"center",paddingHorizontal:15,marginTop:6},
 buttonText:{fontSize:13,fontWeight:"800",color:"white"},warning:{backgroundColor:"#fff1f1",padding:12,borderRadius:12,color:"#9d273a"},
 stars:{flexDirection:"row",gap:7},star:{fontSize:31,color:"#abb8ca"},starChosen:{color:"#d7a016"}
});
function Button({text,onPress,disabled=false,secondary=false}:{text:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
  style={[style.button,secondary&&{backgroundColor:"#e8f0ff"},disabled&&{opacity:.45}]}>
  <Text style={[style.buttonText,secondary&&{color:"#1558cb"}]}>{text}</Text></Pressable>
}
export function NativeReviews({locale}:{locale:Lang}){
 const t=labels[locale]||labels.en,auth=useNativeAuth();
 const [view,setView]=useState<"eligible"|"mine"|"updates">("eligible");
 const [eligible,setEligible]=useState<Eligibility[]>([]),[mine,setMine]=useState<Review[]>([]);
 const [notices,setNotices]=useState<Notice[]>([]),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [selected,setSelected]=useState<Eligibility|Review|null>(null);
 const [mode,setMode]=useState<"new"|"edit"|"appeal"|null>(null);
 const [rating,setRating]=useState(5),[headline,setHeadline]=useState(""),[feedback,setFeedback]=useState("");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  if(!auth.account?.registered){setLoading(false);return;}
  let mounted=true;setLoading(true);setError("");
  Promise.all([
   auth.request<{eligible:Eligibility[]}>("/v1/reviews/my/eligibility"),
   auth.request<{reviews:Review[]}>("/v1/reviews/my"),
   auth.request<{notices:Notice[]}>("/v1/reviews/my/notices")
  ]).then(([a,b,c])=>{
   if(mounted){setEligible(a.eligible);setMine(b.reviews);setNotices(c.notices);}
  }).catch(e=>{if(mounted)setError(e instanceof Error?e.message:t.error)})
   .finally(()=>{if(mounted)setLoading(false)});
  return()=>{mounted=false};
 },[auth.account?.user.id,auth.account?.registered,refresh]);
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
  }catch(e){setError(e instanceof Error?e.message:t.error)}
  finally{setBusy(false)}
 }
 const withdraw=(review:Review)=>Alert.alert(t.withdraw,t.privacy,[
  {text:t.cancel,style:"cancel"},{text:t.withdraw,style:"destructive",onPress:()=>void(async()=>{
   setBusy(true);try{await auth.request("/v1/reviews/my/"+review.id+"/withdraw","POST",{});
    setRefresh(x=>x+1)}catch(e){setError(e instanceof Error?e.message:t.error)}
   finally{setBusy(false)}
  })()}]);
 return <View>
  <Text style={style.title}>{t.title}</Text><Text style={style.lead}>{t.subtitle}</Text>
  <View style={style.tabs}>{(["eligible","mine","updates"] as const).map(k=><Pressable
   accessibilityRole="tab" accessibilityState={{selected:view===k}}
   key={k} onPress={()=>{setView(k);setMode(null)}} style={[style.tab,view===k&&style.selected]}>
   <Text style={[style.text,view===k&&style.selectedText]}>{t[k]}</Text></Pressable>)}</View>
  {loading&&<ActivityIndicator color="#075BF2"/>}
  {!!error&&<View style={style.card}><Text style={style.warning}>{error}</Text>
   <Button text={t.retry} onPress={()=>setRefresh(x=>x+1)}/></View>}
  {!loading&&view==="eligible"&&eligible.map(row=><View key={row.bookingId} style={style.card}>
   <Text style={style.badge}>✓ {t.report}</Text>
   <Text style={style.title}>{row.clinicName}</Text>
   <Text style={style.lead}>{row.serviceName}</Text>
   {row.canReview?<Button text={t.submit} onPress={()=>chooseNew(row)}/>:
    <Text style={style.lead}>✓ {t.mine}</Text>}
  </View>)}
  {!loading&&view==="mine"&&mine.map(row=><View key={row.id} style={style.card}>
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
  {!loading&&view==="updates"&&notices.map(n=><View key={n.id} style={style.card}>
   <Text style={style.lead}>{n.code}</Text>
   <Text style={style.text}>{new Date(n.created_at).toLocaleDateString(locale)}</Text></View>)}
  {!loading&&view==="eligible"&&!eligible.length&&<Text style={style.lead}>{t.empty}</Text>}
  {!loading&&view==="mine"&&!mine.length&&<Text style={style.lead}>{t.empty}</Text>}
  {!loading&&view==="updates"&&!notices.length&&<Text style={style.lead}>{t.empty}</Text>}
  {!!mode&&<View style={style.card}>
   <Text style={style.title}>{mode==="appeal"?t.appeal:mode==="edit"?t.edit:t.submit}</Text>
   {mode!=="appeal"&&<>
    <Text style={style.text}>{t.stars}</Text>
    <View style={style.stars}>{[1,2,3,4,5].map(value=><Pressable
     accessibilityRole="radio" accessibilityState={{checked:rating===value}}
     key={value} onPress={()=>setRating(value)}>
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
