import React,{useEffect,useRef,useState} from "react";
import {ActivityIndicator,Pressable,ScrollView,StatusBar,StyleSheet,Text,View,useWindowDimensions} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {SafeAreaView} from "react-native-safe-area-context";
import {PatientIcon} from "./patient-icons";

export type MobileWorkspace="patient"|"clinic";
type Locale="en"|"fa-AF"|"ps-AF";
export const WORKSPACE_STORAGE_KEY="dandanlink.mobile.workspace.v1";
export const knownWorkspace=(value:unknown):value is MobileWorkspace=>
 value==="patient"||value==="clinic";
const words={
 en:{
  eyebrow:"WELCOME TO DANDANLINK",title:"One platform. Two care experiences.",
  intro:"Choose how you want to use DandanLink. You can switch securely later.",
  patient:"I'm a patient",patientSub:"Explore trusted clinics, book an appointment, and manage your care.",
  clinic:"I'm a clinic or dentist",clinicSub:"Set up your dental practice or sign in as an invited team member.",
  patientTag:"BOOK & DISCOVER",clinicTag:"MANAGE YOUR PRACTICE",
  select:"Continue",privacy:"Secure accounts · No patient records on this screen",
  language:"Language",note:"Clinic registration requires independent verification and license evidence."
 },
 "fa-AF":{
  eyebrow:"به دندان‌لینک خوش آمدید",title:"یک پلتفرم، دو فضای خدمات دندان.",
  intro:"انتخاب کنید چگونه از دندان‌لینک استفاده می‌کنید. بعداً می‌توانید تغییر دهید.",
  patient:"من مریض هستم",patientSub:"کلینیک‌ها را جستجو کنید، نوبت بگیرید و مراقبت خود را مدیریت کنید.",
  clinic:"من کلینیک یا داکتر هستم",clinicSub:"کلینیک خود را ثبت کنید یا به عنوان کارمند دعوت‌شده وارد شوید.",
  patientTag:"نوبت و جستجو",clinicTag:"مدیریت کلینیک",
  select:"ادامه",privacy:"حساب‌های مصئون · بدون معلومات مریض در این صفحه",
  language:"زبان",note:"ثبت کلینیک به اسناد جواز و تأیید مستقل نیاز دارد."
 },
 "ps-AF":{
  eyebrow:"دندان‌لینک ته ښه راغلاست",title:"یو پلاتفورم، د غاښونو دوه خدمتونه.",
  intro:"وټاکئ چې څنګه دندان‌لینک کاروئ؛ وروسته یې بدلولای شئ.",
  patient:"زه ناروغ یم",patientSub:"کلینیکونه ولټوئ، د ملاقات وخت واخلئ او خپل روغتیایي کارونه سمبال کړئ.",
  clinic:"زه کلینیک یا ډاکټر یم",clinicSub:"خپل کلینیک ثبت کړئ یا د بلنې له لارې د کارکوونکي په توګه ننوځئ.",
  patientTag:"ملاقات او لټون",clinicTag:"د کلینیک مدیریت",
  select:"دوام",privacy:"خوندي حسابونه · دلته د ناروغانو معلومات نشته",
  language:"ژبه",note:"د کلینیک ثبتول خپلواکې کتنې او د جواز سند ته اړتیا لري."
 }
} as const;
export function WorkspaceChoice({onSelect}:{onSelect:(value:MobileWorkspace)=>void}){
 const [locale,setLocale]=useState<Locale>("fa-AF");
 const [selection,setSelection]=useState<MobileWorkspace|null>(null);
 const {width,fontScale}=useWindowDimensions();
 const enlarged=width<365||fontScale>=1.3;
 const t=words[locale],rtl=locale!=="en";
 return <SafeAreaView style={s.root} edges={["top","bottom","left","right"]}>
  <StatusBar barStyle="light-content" backgroundColor="#102940"/>
  <ScrollView style={s.scroll} contentContainerStyle={s.content}>
   <View style={s.topRow}>
    <View style={s.brand}><PatientIcon name="tooth" size={25} color="#fff"/></View>
    <Text style={s.brandName}>DandanLink</Text>
    <View style={s.langRow} accessibilityLabel={t.language}>
     {(["en","fa-AF","ps-AF"] as const).map(option=>
      <Pressable key={option} accessibilityRole="button"
       accessibilityLabel={t.language+": "+(option==="en"?"English":option==="fa-AF"?"دری":"پښتو")}
       accessibilityState={{selected:locale===option}}
       onPress={()=>setLocale(option)} style={[s.lang,locale===option&&s.langActive]}>
       <Text style={[s.langText,locale===option&&s.langTextActive]}>
        {option==="en"?"EN":option==="fa-AF"?"دری":"پښتو"}
       </Text>
      </Pressable>)}
    </View>
   </View>
   <View style={[s.hero,enlarged&&{minHeight:0}]}>
    <View style={s.eyebrow}><View style={s.eyebrowDot}/>
     <Text style={s.eyebrowText}>{t.eyebrow}</Text>
    </View>
    <Text accessibilityRole="header" style={[s.title,
     enlarged&&{fontSize:28,lineHeight:undefined},
     {textAlign:rtl?"right":"left"}]}>{t.title}</Text>
    <Text style={[s.intro,{textAlign:rtl?"right":"left"}]}>{t.intro}</Text>
    {!enlarged&&<View style={s.heroArt} accessible={false}>
     <View style={s.artRing}><PatientIcon name="tooth" size={48} color="#b9e9fb"/></View>
     <View style={s.artLine}/><View style={s.artMini}>
      <PatientIcon name="shield" size={22} color="#64c1d8"/></View>
    </View>}
   </View>
   <View style={s.choices}>
    <Pressable accessibilityRole="radio"
     accessibilityLabel={t.patient+". "+t.patientSub}
     accessibilityState={{checked:selection==="patient"}}
     onPress={()=>setSelection("patient")}
     style={({pressed})=>[s.card,selection==="patient"&&s.cardSelected,pressed&&s.cardPressed]}>
     <View style={[s.cardTop,{flexDirection:rtl?"row-reverse":"row"}]}>
      <View style={[s.cardIcon,selection==="patient"&&s.cardIconActive]}>
       <PatientIcon name="user" size={27}
        color={selection==="patient"?"#fff":"#1b659c"}/></View>
      <View style={s.cardText}>
       <Text style={[s.cardTag,{textAlign:rtl?"right":"left"}]}>{t.patientTag}</Text>
       <Text style={[s.cardTitle,{textAlign:rtl?"right":"left"}]}>{t.patient}</Text>
       <Text style={[s.cardSub,{textAlign:rtl?"right":"left"}]}>{t.patientSub}</Text>
      </View>
      <View style={[s.radio,selection==="patient"&&s.radioSelected]}>
       {selection==="patient"&&<PatientIcon name="check" size={17} color="#fff"/>}
      </View>
     </View>
    </Pressable>
    <Pressable accessibilityRole="radio"
     accessibilityLabel={t.clinic+". "+t.clinicSub}
     accessibilityState={{checked:selection==="clinic"}}
     onPress={()=>setSelection("clinic")}
     style={({pressed})=>[s.card,selection==="clinic"&&s.cardSelected,pressed&&s.cardPressed]}>
     <View style={[s.cardTop,{flexDirection:rtl?"row-reverse":"row"}]}>
      <View style={[s.cardIcon,selection==="clinic"&&s.cardIconActive]}>
       <PatientIcon name="clinic" size={28}
        color={selection==="clinic"?"#fff":"#1b659c"}/></View>
      <View style={s.cardText}>
       <Text style={[s.cardTag,{textAlign:rtl?"right":"left"}]}>{t.clinicTag}</Text>
       <Text style={[s.cardTitle,{textAlign:rtl?"right":"left"}]}>{t.clinic}</Text>
       <Text style={[s.cardSub,{textAlign:rtl?"right":"left"}]}>{t.clinicSub}</Text>
      </View>
      <View style={[s.radio,selection==="clinic"&&s.radioSelected]}>
       {selection==="clinic"&&<PatientIcon name="check" size={17} color="#fff"/>}
      </View>
     </View>
    </Pressable>
   </View>
   <Pressable disabled={!selection} accessibilityRole="button"
    accessibilityLabel={t.select} accessibilityHint={t.intro}
    accessibilityState={{disabled:!selection}}
    onPress={()=>{if(selection)onSelect(selection)}}
    style={({pressed})=>[s.cta,!selection&&s.ctaDisabled,pressed&&s.ctaPressed]}>
    <Text style={s.ctaText}>{t.select}</Text>
    <PatientIcon name="arrow" size={21} color="#fff"/>
   </Pressable>
   <Text style={s.note}>{t.privacy}</Text>
   <Text style={s.note}>{t.note}</Text>
  </ScrollView>
 </SafeAreaView>;
}
export function WorkspaceRouter({patient,clinic}:{patient:(reset:()=>void)=>React.ReactNode;
 clinic:(reset:()=>void)=>React.ReactNode}){
 const [choice,setChoice]=useState<MobileWorkspace|null>(null);
 const [loading,setLoading]=useState(true);
 // Serialize selector writes so delayed removal cannot erase a new selection.
 const workspaceWrites=useRef<Promise<void>>(Promise.resolve());
 useEffect(()=>{
  let live=true;
  void AsyncStorage.getItem(WORKSPACE_STORAGE_KEY)
   .then(stored=>{if(live&&knownWorkspace(stored))setChoice(stored)})
   .catch(()=>{})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[]);
 function persist(value:MobileWorkspace|null){
  workspaceWrites.current=workspaceWrites.current.catch(()=>{}).then(async()=>{
   if(value)await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY,value);
   else await AsyncStorage.removeItem(WORKSPACE_STORAGE_KEY);
  });
  void workspaceWrites.current.catch(()=>{});
 }
 function select(value:MobileWorkspace){
  // The old clinic/patient screen is already unmounted by this selection.
  setChoice(value);persist(value);
 }
 const reset=()=>{setChoice(null);persist(null)};
 if(loading)return <SafeAreaView style={s.loading}>
  <ActivityIndicator size="large" color="#1e6eaa"/></SafeAreaView>;
 if(!choice)return <WorkspaceChoice onSelect={value=>{void select(value)}}/>;
 return <>{choice==="patient"?patient(reset):clinic(reset)}</>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#102940"},scroll:{flex:1},
 content:{paddingHorizontal:22,paddingTop:24,paddingBottom:32,gap:20,maxWidth:650,alignSelf:"center",width:"100%"},
 topRow:{flexDirection:"row",alignItems:"center",gap:9},
 brand:{width:37,height:37,borderRadius:11,backgroundColor:"#266da8",alignItems:"center",justifyContent:"center"},
 brandName:{color:"#fff",fontSize:16,fontWeight:"900",flex:1},
 langRow:{flexDirection:"row",gap:3,backgroundColor:"#203d58",padding:3,borderRadius:10},
 lang:{minHeight:44,minWidth:44,paddingVertical:9,paddingHorizontal:8,borderRadius:8,justifyContent:"center",alignItems:"center"},
 langActive:{backgroundColor:"#eaf5ff"},
 langText:{fontSize:13,fontWeight:"800",color:"#bbd5ec"},
 langTextActive:{color:"#124b76"},
 hero:{gap:12,paddingTop:21,minHeight:260},
 eyebrow:{flexDirection:"row",alignItems:"center",gap:7},
 eyebrowDot:{width:7,height:7,borderRadius:4,backgroundColor:"#56d5b4"},
 eyebrowText:{fontSize:10,fontWeight:"900",letterSpacing:1,color:"#73d5e2"},
 title:{color:"#fff",fontSize:33,fontWeight:"900",lineHeight:42,letterSpacing:-.65,maxWidth:390},
 intro:{color:"#b9d4e8",fontSize:15,lineHeight:24,maxWidth:400},
 heroArt:{position:"absolute",right:0,top:45,opacity:.26,width:125,height:150},
 artRing:{width:117,height:117,borderWidth:2,borderColor:"#5bc3e2",borderRadius:60,alignItems:"center",justifyContent:"center"},
 artLine:{position:"absolute",top:83,left:-18,width:90,height:2,backgroundColor:"#5bc3e2",transform:[{rotate:"-42deg"}]},
 artMini:{width:42,height:42,borderRadius:15,backgroundColor:"#1d6387",
  alignItems:"center",justifyContent:"center",position:"absolute",bottom:0,right:0},
 choices:{gap:13},
 card:{backgroundColor:"#f5f9fd",borderWidth:2,borderColor:"transparent",borderRadius:18,
  padding:16,minHeight:140},
 cardSelected:{backgroundColor:"#fff",borderColor:"#6bd6c2"},
 cardPressed:{opacity:.9},
 cardTop:{alignItems:"flex-start",gap:13},
 cardIcon:{width:49,height:49,borderRadius:14,backgroundColor:"#e3eff8",alignItems:"center",justifyContent:"center"},
 cardIconActive:{backgroundColor:"#1769a4"},
 cardText:{flex:1,gap:5},
 cardTag:{color:"#347b9d",fontWeight:"900",fontSize:12,letterSpacing:.5},
 cardTitle:{color:"#15324e",fontSize:16,fontWeight:"900",lineHeight:23},
 cardSub:{color:"#50677c",fontSize:14,lineHeight:22},
 radio:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:"#b5cadc",alignItems:"center",justifyContent:"center"},
 radioSelected:{backgroundColor:"#118c83",borderColor:"#118c83"},
 cta:{backgroundColor:"#1b7eb2",borderRadius:13,minHeight:55,flexDirection:"row",
  gap:12,alignItems:"center",justifyContent:"center",marginTop:3},
 ctaDisabled:{backgroundColor:"#456479"},ctaPressed:{opacity:.8},
 ctaText:{color:"#fff",fontSize:15,fontWeight:"900"},
 note:{color:"#b7d0e3",fontSize:13,lineHeight:21,textAlign:"center"},
 loading:{flex:1,backgroundColor:"#f4f7fb",alignItems:"center",justifyContent:"center"}
});
