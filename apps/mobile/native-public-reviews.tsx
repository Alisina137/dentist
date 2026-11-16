import React,{useEffect,useState} from "react";
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from "react-native";
import {patientTheme as theme} from "./patient-theme";
import {PatientIcon} from "./patient-icons";

declare const process:{readonly env:{readonly EXPO_PUBLIC_API_URL?:string}};
type Lang="en"|"fa-AF"|"ps-AF";
type Review={id:string;clinicId:string;dentistId:string|null;stars:number;headline:string;
 feedback:string;publishedAt:string;verifiedVisit:true};
type Data={reviews:Review[];summary:{count:number;average:number|null};
 hasNext:boolean;page:number;source:"verified_completed_visits"};
const words={
 en:{title:"Verified patient reviews",explain:"Published reviews from real completed visits. Moderation is required.",
  empty:"No published verified reviews yet.",count:"published reviews",loading:"Loading approved reviews…",
  retry:"Retry",more:"View more",write:"Write a review",verified:"Verified visit",noFake:"No paid rankings or invented ratings.",
  average:"Average rating",failed:"Reviews could not be loaded. Please try again."},
 "fa-AF":{title:"نظرات تأییدشده مریضان",explain:"نظرهای نشرشده از مراجعه‌های واقعی تکمیل‌شده و بررسی‌شده.",
  empty:"هنوز نظر تأییدشده نشر نشده است.",count:"نظر نشرشده",loading:"نظرات تأییدشده دریافت می‌شود…",
  retry:"کوشش دوباره",more:"نمایش بیشتر",write:"ثبت نظر",verified:"مراجعه تأییدشده",
  noFake:"رتبه‌بندی پولی یا امتیاز ساختگی نمایش داده نمی‌شود.",
  average:"میانگین امتیاز",failed:"نظرات دریافت نشد. دوباره کوشش کنید."},
 "ps-AF":{title:"د ناروغانو تایید شوي نظرونه",explain:"د رښتینو بشپړو لیدنو خپاره شوي او ارزول شوي نظرونه.",
  empty:"تراوسه تایید شوی نظر نه دی خپور شوی.",count:"خپاره شوي نظرونه",
  loading:"تایید شوي نظرونه لوستل کېږي…",retry:"بیا هڅه",more:"نور وګورئ",
  write:"نظر ولیکئ",verified:"تایید شوې لیدنه",
  noFake:"پیسو ورکړل شوې درجې او جوړې شوې ستورې نه ښکاري.",
  average:"اوسط درجه",failed:"نظرونه نه ښکاري. بیا هڅه وکړئ."}
} as const;
const css=StyleSheet.create({
 card:{backgroundColor:theme.colors.surface,borderColor:theme.colors.stroke,borderWidth:1,
  borderRadius:theme.radius.card,padding:theme.spacing.card,gap:12,...theme.shadow},
 title:{color:theme.colors.ink,fontSize:theme.type.section,fontWeight:"800"},
 body:{color:theme.colors.inkSecondary,fontSize:theme.type.body,lineHeight:22},
 sub:{fontSize:theme.type.secondary,lineHeight:21,color:theme.colors.muted},
 badge:{color:theme.colors.green,fontSize:theme.type.caption,fontWeight:"800",
  backgroundColor:theme.colors.greenSoft,padding:8,borderRadius:10,alignSelf:"flex-start"},
 rating:{fontSize:theme.type.cardTitle,fontWeight:"800",color:theme.colors.ink},
 button:{borderRadius:theme.radius.control,minHeight:theme.controlHeight,
  backgroundColor:theme.colors.brandSoft,justifyContent:"center",alignItems:"center",padding:12},
 buttonText:{color:theme.colors.brandDark,fontSize:theme.type.body,fontWeight:"800"},
 row:{gap:10,alignItems:"center",flexDirection:"row"}
});
type Display={path:string;data:Data|null;reviews:Review[];loading:boolean;error:boolean};
export function NativePublishedReviews({clinicId,dentistId,locale,onWrite}:{
 clinicId:string;dentistId?:string;locale:Lang;onWrite:()=>void}){
 const t=words[locale];
 const path="/v1/reviews/public/clinics/"+encodeURIComponent(clinicId)+
  (dentistId?"/dentists/"+encodeURIComponent(dentistId):"");
 const [snapshot,setSnapshot]=useState<Display|null>(null),[page,setPage]=useState(1);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{setPage(1);setSnapshot(null)},[path]);
 useEffect(()=>{
  let live=true;
  const base=(process.env.EXPO_PUBLIC_API_URL||"").trim().replace(/\/+$/,"");
  if(!base||(!__DEV__&&!/^https:\/\//i.test(base))){
   setSnapshot({path,data:null,reviews:[],error:true,loading:false});return;
  }
  setSnapshot(old=>({path,data:old?.path===path?old.data:null,
   reviews:old?.path===path?old.reviews:[],loading:true,error:false}));
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  void fetch(base+path+(dentistId?"":"?page="+page),{
   signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"
  }).then(async response=>{
   if(!response.ok)throw new Error("PUBLIC_REVIEW_UNAVAILABLE");
   const data=await response.json() as Data;
   if(!live)return;
   if(data.source!=="verified_completed_visits")throw new Error("REVIEW_SOURCE_UNVERIFIED");
   setSnapshot(old=>({path,data,
    reviews:page===1?data.reviews:old?.path===path?
     [...old.reviews,...data.reviews.filter(r=>!old.reviews.some(x=>x.id===r.id))]:
     data.reviews,error:false,loading:false}));
  }).catch(()=>{if(live)setSnapshot(old=>({path,
   data:old?.path===path?old.data:null,reviews:old?.path===path?old.reviews:[],
   error:true,loading:false}))}).finally(()=>clearTimeout(timer));
  return()=>{live=false;controller.abort();clearTimeout(timer)};
 },[path,page,retry,dentistId]);
 const state=snapshot?.path===path?snapshot:null;
 const direction=locale==="en"?"row":"row-reverse";
 return <View style={[css.card,{direction:locale==="en"?"ltr":"rtl"}]}>
  <View style={[css.row,{flexDirection:direction}]}>
   <PatientIcon name="star" size={23} color={theme.colors.brand}/>
   <Text accessibilityRole="header" style={css.title}>{t.title}</Text>
  </View>
  <Text style={css.sub}>{t.explain}</Text>
  {!state||state.loading&&!state.data?<ActivityIndicator color={theme.colors.brand}/>:
   <>
    {state.data?.summary.count? <View style={{gap:6}}>
     <Text style={css.rating}>{state.data.summary.average?.toFixed(1)??"—"} / 5</Text>
     <Text style={css.sub}>{state.data.summary.count} {t.count} · {t.average}</Text>
    </View>:!state.error?<Text style={css.sub}>{t.empty}</Text>:null}
    {state.reviews.map(row=><View key={row.id}
     style={{borderTopWidth:1,borderTopColor:theme.colors.stroke,paddingTop:13,gap:7}}>
     <View style={[css.row,{flexDirection:direction}]}>
      <Text style={css.rating}>{"★".repeat(Math.max(0,Math.min(5,row.stars)))}</Text>
      <Text style={css.badge}>✓ {t.verified}</Text></View>
     <Text style={css.body}>{row.headline}</Text>
     <Text style={css.sub}>{row.feedback}</Text>
    </View>)}
    {state.error&&<Text accessibilityRole="alert" style={css.sub}>{t.failed}</Text>}
    {state.error&&<Pressable style={css.button} accessibilityRole="button"
     onPress={()=>setRetry(x=>x+1)}><Text style={css.buttonText}>{t.retry}</Text></Pressable>}
    {state.data?.hasNext&&!dentistId&&!state.loading&&<Pressable accessibilityRole="button"
     style={css.button} onPress={()=>setPage(x=>x+1)}>
     <Text style={css.buttonText}>{t.more}</Text></Pressable>}
   </>}
  <Pressable accessibilityRole="button" style={css.button} onPress={onWrite}>
   <Text style={css.buttonText}>{t.write}</Text></Pressable>
  <Text style={css.sub}>{t.noFake}</Text>
 </View>;
}
