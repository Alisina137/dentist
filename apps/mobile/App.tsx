import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// Expo statically replaces EXPO_PUBLIC_ env keys in the Metro bundle.
declare const process: { readonly env: { readonly EXPO_PUBLIC_API_URL?: string } };

type Language="fa-AF"|"ps-AF"|"en";
type Calendar="solar_hijri"|"gregorian";
type Tab="home"|"appointments"|"saved"|"account";
type ApiStatus="checking"|"connected"|"disconnected"|"not_configured";
const KEY="dandanlink.patient.preferences.v1";
const API=(process.env.EXPO_PUBLIC_API_URL||"").trim().replace(/\/+$/,"");
const cities=["Kabul","Herat","Mazar-i-Sharif","Kandahar","Jalalabad"] as const;
const palette={
  bg:"#F4F8F9",white:"#FFFFFF",ink:"#183347",muted:"#6B7F8C",
  accent:"#087F91",dark:"#0F5264",soft:"#E8F5F6",border:"#E3EBEE",
  amber:"#A66515",amberSoft:"#FEF6E8"
};

const copy={
  en:{
    welcome:"Your dental care, made simpler",eyebrow:"DANDANLINK · PATIENT",
    tagline:"Find trusted care close to home",searchLabel:"Find a dentist or clinic",
    searchPlaceholder:"Dentist, clinic, or treatment",search:"Search",
    location:"Your city",find:"Find dental care",
    notLaunched:"The verified dentist directory is not live yet.",
    noResults:"No participating dentist profiles are available right now.",
    noResultsQuery:"No published clinics match this search yet.",
    upcoming:"Coming in a later release",
    noInvented:"We only show real, verified clinics and available appointments once booking is launched.",
    explore:"Explore care",local:"Search by city",verified:"Verified professionals",
    onlineBooking:"Appointment booking",free:"Free for patients",
    stepsTitle:"Dental care in three steps",step1:"Discover",
    step1Text:"Find approved clinics and dentists in your city.",
    step2:"Choose",step2Text:"Review services and real availability.",
    step3:"Visit",step3Text:"Manage your confirmed appointment.",
    soonNote:"Discovery, booking, and patient accounts will be enabled in later phases.",
    appointments:"Appointments",appointmentTitle:"Your appointments",
    appointmentEmpty:"No appointments yet",appointmentExplanation:
      "Online booking will appear here when verified clinics begin accepting requests.",
    saved:"Saved",savedTitle:"Saved clinics",savedEmpty:"No saved clinics yet",
    savedExplanation:"After the directory launches, save dentists and clinics you want to revisit.",
    account:"Account",accountTitle:"Preferences",guest:"Browsing as a guest",
    guestMessage:"You can browse for free. Patient registration will arrive before booking is enabled.",
    signInLater:"Patient sign-in is not available yet.",
    language:"Language",calendar:"Calendar",solar:"Solar Hijri",gregorian:"Gregorian",
    network:"Service connection",checking:"Checking the connection…",
    connected:"Connected to the DandanLink API",disconnected:"Cannot reach the API",
    not_configured:"Backend API URL not configured",
    apiHint:"Expo Go on your phone cannot reach http://localhost:4000. Set EXPO_PUBLIC_API_URL to a reachable LAN IP or HTTPS tunnel if you need live API requests.",
    refresh:"Check again",offline:"Service is currently unavailable. The app remains usable for its informational screens.",
    region:"Afghanistan",freeLabel:"Patient access is free",
    city:"City",clear:"Clear",chooseCity:"Choose a city",
    home:"Home",directoryStatus:"Directory status",yes:"Available",no:"Not yet launched",
    about:"About DandanLink",aboutMessage:"A patient-first dental discovery and appointment platform for Afghanistan.",
    noPatientData:"No real patient appointments, ratings or medical records are shown in this development release.",
    getStarted:"Get started",launchTitle:"Your next healthy smile starts here",
    launchText:"Discover verified dental offices and book real appointments when the service launches."
  },
  "fa-AF":{
    welcome:"مراقبت دندان، ساده‌تر از همیشه",eyebrow:"دندان‌لینک · مریضان",
    tagline:"خدمات مطمئن دندان را در نزدیکی خود پیدا کنید",
    searchLabel:"جستجوی داکتر یا کلینیک",searchPlaceholder:"داکتر، کلینیک یا تداوی",
    search:"جستجو",location:"شهر شما",find:"پیدا کردن خدمات دندان",
    notLaunched:"فهرست داکتران تأییدشده هنوز فعال نشده است.",
    noResults:"فعلاً پروفایل داکتران و کلینیک‌های اشتراک‌کننده موجود نیست.",
    noResultsQuery:"هنوز کلینیک نشرشده برای این جستجو موجود نیست.",
    upcoming:"در مراحل بعدی فعال می‌شود",
    noInvented:"فقط کلینیک‌های واقعی، تأییدشده و وقت‌های معتبر پس از فعال‌شدن رزرو نمایش داده می‌شوند.",
    explore:"جستجوی خدمات",local:"جستجو بر اساس شهر",verified:"داکتران تأییدشده",
    onlineBooking:"رزرو وقت ملاقات",free:"رایگان برای مریضان",
    stepsTitle:"مراقبت دندان در سه مرحله",step1:"پیدا کنید",
    step1Text:"کلینیک‌ها و داکتران تأییدشده را در شهر خود پیدا کنید.",
    step2:"انتخاب کنید",step2Text:"خدمات و وقت‌های واقعی را بررسی کنید.",
    step3:"مراجعه کنید",step3Text:"وقت ملاقات تأییدشده خود را مدیریت کنید.",
    soonNote:"جستجو، رزرو و حساب مریضان در مراحل بعدی فعال خواهند شد.",
    appointments:"وقت‌ها",appointmentTitle:"وقت‌های ملاقات شما",
    appointmentEmpty:"هنوز وقت ملاقات ندارید",
    appointmentExplanation:"وقتی کلینیک‌های تأییدشده رزرو را آغاز کنند، وقت‌های شما اینجا نمایش داده می‌شود.",
    saved:"ذخیره‌شده",savedTitle:"کلینیک‌های ذخیره‌شده",
    savedEmpty:"هنوز کلینیکی ذخیره نکرده‌اید",
    savedExplanation:"پس از فعال‌شدن فهرست، می‌توانید داکتران و کلینیک‌های دلخواه را ذخیره کنید.",
    account:"حساب",accountTitle:"تنظیمات شخصی",
    guest:"شما به حیث مهمان وارد شده‌اید",
    guestMessage:"جستجو رایگان است. ثبت حساب مریض پیش از فعال‌شدن رزرو اضافه می‌شود.",
    signInLater:"ورود مریضان هنوز فعال نیست.",
    language:"زبان",calendar:"تقویم",solar:"هجری خورشیدی",gregorian:"میلادی",
    network:"ارتباط با سرور",checking:"در حال بررسی ارتباط…",
    connected:"ارتباط با سرور دندان‌لینک برقرار است",disconnected:"ارتباط با سرور برقرار نشد",
    not_configured:"آدرس سرور تنظیم نشده است",
    apiHint:"در موبایل، localhost:4000 به کمپیوتر شما وصل نمی‌شود. برای درخواست‌های آنلاین، EXPO_PUBLIC_API_URL را به آدرس قابل دسترس تنظیم کنید.",
    refresh:"بررسی دوباره",offline:"سرور در دسترس نیست. بخش‌های معلوماتی هنوز قابل استفاده‌اند.",
    region:"افغانستان",freeLabel:"استفاده برای مریضان رایگان است",
    city:"شهر",clear:"پاک کردن",chooseCity:"یک شهر انتخاب کنید",
    home:"خانه",directoryStatus:"وضعیت فهرست",yes:"فعال",no:"هنوز فعال نیست",
    about:"درباره دندان‌لینک",aboutMessage:"خدمات جستجو و رزرو دندان برای مردم افغانستان.",
    noPatientData:"در این نسخه معلومات طبی، نظرهای ساختگی یا وقت‌های غیرواقعی نمایش داده نمی‌شود.",
    getStarted:"شروع",launchTitle:"لبخند سالم شما از همین‌جا آغاز می‌شود",
    launchText:"پس از فعال‌شدن خدمات، کلینیک‌های تأییدشده را پیدا کنید و وقت واقعی بگیرید."
  },
  "ps-AF":{
    welcome:"د غاښونو پاملرنه اوس لا اسانه ده",eyebrow:"دندان‌لینک · ناروغان",
    tagline:"باوري د غاښونو خدمتونه خپل شاوخوا ومومئ",
    searchLabel:"ډاکټر یا کلینیک ولټوئ",searchPlaceholder:"ډاکټر، کلینیک یا درملنه",
    search:"لټون",location:"ستاسې ښار",find:"د غاښونو خدمتونه ومومئ",
    notLaunched:"د تایید شوو ډاکټرانو لړلیک لا نه دی فعال شوی.",
    noResults:"اوس مهال ګډون کوونکي کلینیکونه نه دي خپاره شوي.",
    noResultsQuery:"د دې لټون لپاره تر اوسه خپور شوی کلینیک نشته.",
    upcoming:"په راتلونکو پړاوونو کې",noInvented:
      "د تایید شویو کلینیکونو او رښتینو وختونو معلومات به د خدمت له فعالېدو وروسته ښکاري.",
    explore:"خدمتونه ولټوئ",local:"د ښار له مخې لټون",verified:"تایید شوي ډاکټران",
    onlineBooking:"وخت اخیستل",free:"د ناروغانو لپاره وړیا",
    stepsTitle:"په دریو پړاوونو کې د غاښونو پاملرنه",step1:"ومومئ",
    step1Text:"په خپل ښار کې تایید شوي ډاکټران او کلینیکونه پیدا کړئ.",
    step2:"غوره کړئ",step2Text:"خدمتونه او رښتیني خالي وختونه وګورئ.",
    step3:"ورښکاره شئ",step3Text:"خپل تایید شوی وخت سمبال کړئ.",
    soonNote:"لټون، د وخت اخیستل او د ناروغ حسابونه به وروسته فعال شي.",
    appointments:"وختونه",appointmentTitle:"ستاسې وختونه",
    appointmentEmpty:"تر اوسه وخت نه لرئ",appointmentExplanation:
      "کله چې کلینیکونه وخت ورکول پیل کړي، ستاسې وختونه دلته ښکاري.",
    saved:"خوندي شوي",savedTitle:"خوندي شوي کلینیکونه",savedEmpty:"تر اوسه کلینیک نه دی خوندي شوی",
    savedExplanation:"د لړلیک له فعالېدو وروسته کولی شئ کلینیکونه خوندي کړئ.",
    account:"حساب",accountTitle:"غوره توبونه",
    guest:"د مېلمه په توګه ګورئ",guestMessage:
      "لټون وړیا دی. د ناروغ حساب به د وخت اخیستلو له پیل وړاندې فعال شي.",
    signInLater:"د ناروغانو ننوتل لا نه دي فعال.",
    language:"ژبه",calendar:"کلیز",solar:"لمریز هجري",gregorian:"میلادي",
    network:"له سرور سره اړیکه",checking:"اړیکه کتل کېږي…",
    connected:"له دندان‌لینک سرور سره اړیکه شته",disconnected:"له سرور سره اړیکه نشته",
    not_configured:"د سرور پته نه ده ټاکل شوې",
    apiHint:"په موبایل کې localhost:4000 ستاسې کمپیوټر نه دی. د آنلاین غوښتنو لپاره EXPO_PUBLIC_API_URL د لاسرسي وړ IP یا تونل ته واړوئ.",
    refresh:"بیا وګورئ",offline:"سرور نشته؛ معلوماتي برخې لا کار کوي.",
    region:"افغانستان",freeLabel:"د ناروغانو لپاره وړیا",
    city:"ښار",clear:"پاکول",chooseCity:"ښار غوره کړئ",
    home:"کور",directoryStatus:"د لړلیک حالت",yes:"فعال",no:"لا نه دی فعال",
    about:"د دندان‌لینک په اړه",aboutMessage:"د افغانستان د خلکو لپاره د غاښونو د ډاکټرانو لټون او وخت اخیستل.",
    noPatientData:"په دې نسخه کې جعلي وختونه، نظرونه او طبي معلومات نشته.",
    getStarted:"پیل",launchTitle:"روغه موسکا له دې ځایه پیلېږي",
    launchText:"له فعالېدو وروسته تایید شوي کلینیکونه ومومئ او وخت واخلئ."
  }
} as const;
const languages:{value:Language,label:string}[]=[
  {value:"fa-AF",label:"دری"},{value:"ps-AF",label:"پښتو"},{value:"en",label:"English"}
];
const directions:Record<Language,"rtl"|"ltr">={"fa-AF":"rtl","ps-AF":"rtl",en:"ltr"};
const cityNames:Record<string,Record<Language,string>>={
 Kabul:{"fa-AF":"کابل","ps-AF":"کابل",en:"Kabul"},
 Herat:{"fa-AF":"هرات","ps-AF":"هرات",en:"Herat"},
 "Mazar-i-Sharif":{"fa-AF":"مزار شریف","ps-AF":"مزار شریف",en:"Mazar-i-Sharif"},
 Kandahar:{"fa-AF":"کندهار","ps-AF":"کندهار",en:"Kandahar"},
 Jalalabad:{"fa-AF":"جلال‌آباد","ps-AF":"جلال اباد",en:"Jalalabad"}
};

function PatientApp(){
  const [locale,setLocale]=useState<Language>("fa-AF");
  const [calendar,setCalendar]=useState<Calendar>("solar_hijri");
  const [city,setCity]=useState<string>("Kabul");
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState<Tab>("home");
  const [query,setQuery]=useState("");
  const [searched,setSearched]=useState("");
  const [showCities,setShowCities]=useState(false);
  const [status,setStatus]=useState<ApiStatus>("not_configured");
  const [marketplace,setMarketplace]=useState(false);
  const [checking,setChecking]=useState(false);
  const dir=directions[locale];
  const rtl=dir==="rtl";
  const t=useCallback((name:keyof typeof copy.en):string=>copy[locale][name], [locale]);
  const align=rtl?"right":"left";
  const flow=rtl?"row-reverse":"row";

  useEffect(()=>{
    let active=true;
    AsyncStorage.getItem(KEY).then(value=>{
      if(!active)return;
      if(value){
        try{
          const preferences=JSON.parse(value) as {locale?:Language;calendar?:Calendar;city?:string};
          if(preferences.locale && directions[preferences.locale])setLocale(preferences.locale);
          if(preferences.calendar && ["solar_hijri","gregorian"].includes(preferences.calendar))setCalendar(preferences.calendar);
          if(preferences.city && cities.some(item=>item===preferences.city))setCity(preferences.city);
        }catch{ /* Corrupt non-sensitive preferences are ignored. */ }
      }
    }).catch(()=>{}).finally(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(ready)AsyncStorage.setItem(KEY,JSON.stringify({locale,calendar,city})).catch(()=>{});
  },[ready,locale,calendar,city]);

  const checkApi=useCallback(async()=>{
    if(!API){setStatus("not_configured");setMarketplace(false);return;}
    setChecking(true);setStatus("checking");
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),6500);
    try{
      const response=await fetch(API+"/v1/public/status",{signal:abort.signal});
      if(!response.ok)throw new Error("API_HTTP_"+response.status);
      const value=await response.json() as {marketplaceAvailable?:boolean};
      setMarketplace(value.marketplaceAvailable===true);
      setStatus("connected");
    }catch{setMarketplace(false);setStatus("disconnected");}
    finally{clearTimeout(timeout);setChecking(false);}
  },[]);
  useEffect(()=>{void checkApi();},[checkApi]);

  const select=(next:Tab)=>{setTab(next);setShowCities(false);};
  const search=()=>{
    setSearched(query.trim());
    setShowCities(false);
  };
  const text=(value:string,style?:object)=><Text style={[styles.body,{textAlign:align},style]}>{value}</Text>;

  const Summary=({symbol,title,description}:{symbol:string;title:string;description:string})=><View style={styles.infoCard}>
    <View style={[styles.infoHead,{flexDirection:flow}]}><Text style={styles.infoEmoji}>{symbol}</Text>
      <Text style={[styles.cardTitle,{textAlign:align}]}>{title}</Text></View>
    <Text style={[styles.body,{textAlign:align}]}>{description}</Text>
  </View>;

  const Header=<View style={[styles.header,{flexDirection:flow}]}>
    <View style={[styles.brandGroup,{flexDirection:flow}]}>
      <View style={styles.logo}><Text style={styles.logoText}>✦</Text></View>
      <View><Text style={[styles.brandName,{textAlign:align}]}>DandanLink</Text>
        <Text style={[styles.brandSubtitle,{textAlign:align}]}>{t("eyebrow")}</Text></View>
    </View>
    <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>AF</Text></View>
  </View>;

  const Bottom=<View style={[styles.bottomNav,{flexDirection:flow}]}>
    {([
      ["home","⌂"],["appointments","▤"],["saved","♡"],["account","◉"]
    ] as [Tab,string][]).map(([key,icon])=><Pressable key={key}
      onPress={()=>select(key)} accessibilityRole="tab" accessibilityState={{selected:tab===key}}
      accessibilityLabel={t(key)}
      style={[styles.bottomItem,tab===key&&styles.bottomItemActive]}>
      <Text style={[styles.bottomIcon,tab===key&&styles.bottomIconActive]}>{icon}</Text>
      <Text style={[styles.bottomLabel,tab===key&&styles.bottomLabelActive]} numberOfLines={1}>{t(key)}</Text>
    </Pressable>)}
  </View>;

  const Home=<>
    <View style={styles.hero}>
      <View style={styles.orbOne}/><View style={styles.orbTwo}/>
      <Text style={[styles.heroEyebrow,{textAlign:align}]}>{t("freeLabel")}</Text>
      <Text style={[styles.heroTitle,{textAlign:align}]}>{t("welcome")}</Text>
      <Text style={[styles.heroDescription,{textAlign:align}]}>{t("tagline")}</Text>
      <View style={[styles.heroPills,{flexDirection:flow}]}>
        <View style={styles.heroPill}><Text style={styles.heroPillText}>✓ {t("region")}</Text></View>
        <View style={styles.heroPill}><Text style={styles.heroPillText}>✓ {t("free")}</Text></View>
      </View>
    </View>

    <View style={styles.searchCard}>
      <Text style={[styles.sectionSmall,{textAlign:align}]}>{t("location")}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t("chooseCity")}
        onPress={()=>setShowCities(!showCities)}
        style={[styles.cityButton,{flexDirection:flow}]}>
        <Text style={styles.pin}>⌾</Text>
        <Text style={[styles.cityText,{textAlign:align}]}>{cityNames[city][locale]}</Text>
        <Text style={styles.chevron}>{showCities?"⌃":"⌄"}</Text>
      </Pressable>
      {showCities&&<View style={styles.cityOptions}>
        {cities.map(name=><Pressable key={name} accessibilityRole="button"
          onPress={()=>{setCity(name);setSearched("");setShowCities(false);}}
          style={[styles.cityOption,{flexDirection:flow}]}>
          <Text style={[styles.body,{textAlign:align,color:city===name?palette.accent:palette.ink}]}>
            {cityNames[name][locale]}</Text><Text>{city===name?"✓":""}</Text>
        </Pressable>)}
      </View>}
      <Text style={[styles.sectionSmall,{textAlign:align,marginTop:15}]}>{t("searchLabel")}</Text>
      <View style={[styles.inputRow,{flexDirection:flow}]}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput style={[styles.input,{textAlign:align}]} value={query}
          placeholder={t("searchPlaceholder")} placeholderTextColor="#93A6B0"
          autoCorrect={false} returnKeyType="search" onSubmitEditing={search} onChangeText={setQuery}
          accessibilityLabel={t("searchLabel")}/>
        {!!query&&<Pressable accessibilityRole="button" onPress={()=>{setQuery("");setSearched("");}}>
          <Text style={styles.clear}>×</Text>
        </Pressable>}
      </View>
      <Pressable onPress={search} accessibilityRole="button" style={styles.primaryButton}>
        <Text style={styles.primaryText}>{t("search")}  →</Text>
      </Pressable>
    </View>

    <View style={[styles.sectionHeader,{flexDirection:flow}]}>
      <View><Text style={[styles.sectionTitle,{textAlign:align}]}>{t("explore")}</Text>
        <Text style={[styles.sectionSub,{textAlign:align}]}>{cityNames[city][locale]} · {t("region")}</Text></View>
      <View style={styles.softBadge}><Text style={styles.softBadgeText}>{t("upcoming")}</Text></View>
    </View>
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}><Text style={styles.emptyIcon}>⌕</Text></View>
      <Text style={[styles.emptyTitle,{textAlign:"center"}]}>{searched?t("noResultsQuery"):t("notLaunched")}</Text>
      <Text style={[styles.emptyDescription,{textAlign:"center"}]}>{t("noInvented")}</Text>
      {searched.length>0&&<View style={styles.searchSummary}>
        <Text style={styles.searchSummaryText}>{t("search")}: {searched} · {cityNames[city][locale]}</Text>
      </View>}
      {status==="disconnected"&&text(t("offline"),{textAlign:"center",fontSize:12,marginTop:8})}
    </View>
    <Text style={[styles.sectionTitle,{marginTop:28,marginBottom:15,textAlign:align}]}>{t("stepsTitle")}</Text>
    <View style={styles.steps}>
      {([["01",t("step1"),t("step1Text")],["02",t("step2"),t("step2Text")],
        ["03",t("step3"),t("step3Text")]] as const).map(([n,title,sub])=>
        <View key={n} style={[styles.stepRow,{flexDirection:flow}]}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{n}</Text></View>
          <View style={{flex:1}}><Text style={[styles.stepTitle,{textAlign:align}]}>{title}</Text>
            <Text style={[styles.body,{textAlign:align,fontSize:13}]}>{sub}</Text></View>
        </View>)}
    </View>
    <Text style={[styles.footNote,{textAlign:align}]}>{t("soonNote")}</Text>
  </>;

  const Blank=({kind}:{kind:"appointments"|"saved"})=><>
    <Text style={[styles.pageTitle,{textAlign:align}]}>{kind==="appointments"?t("appointmentTitle"):t("savedTitle")}</Text>
    <View style={styles.blankLarge}>
      <View style={styles.blankIcon}><Text style={styles.blankIconText}>{kind==="appointments"?"▤":"♡"}</Text></View>
      <Text style={styles.blankHeading}>{t(kind==="appointments"?"appointmentEmpty":"savedEmpty")}</Text>
      <Text style={styles.blankText}>{t(kind==="appointments"?"appointmentExplanation":"savedExplanation")}</Text>
      <Pressable onPress={()=>select("home")} accessibilityRole="button" style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>{t("explore")}  →</Text>
      </Pressable>
    </View>
    <Summary symbol="✓" title={t("free")} description={t("noInvented")}/>
  </>;

  const Toggle=({name,selected,onPress}:{name:string;selected:boolean;onPress:()=>void})=>
    <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress}
      style={[styles.toggle,selected&&styles.toggleSelected]}>
      <Text style={[styles.toggleText,selected&&styles.toggleTextSelected]}>{name}</Text>
    </Pressable>;

  const Account=<>
    <Text style={[styles.pageTitle,{textAlign:align}]}>{t("accountTitle")}</Text>
    <View style={styles.guestCard}>
      <View style={[styles.infoHead,{flexDirection:flow}]}>
        <View style={styles.guestAvatar}><Text style={styles.guestAvatarText}>◉</Text></View>
        <View style={{flex:1}}><Text style={[styles.guestTitle,{textAlign:align}]}>{t("guest")}</Text>
          <Text style={[styles.body,{textAlign:align,fontSize:13}]}>{t("guestMessage")}</Text></View>
      </View>
    </View>
    <View style={styles.settingsCard}>
      <Text style={[styles.settingLabel,{textAlign:align}]}>{t("language")}</Text>
      <View style={[styles.toggleRow,{flexDirection:flow}]}>
        {languages.map(item=><Toggle key={item.value} name={item.label}
          selected={item.value===locale} onPress={()=>setLocale(item.value)}/>)}
      </View>
      <View style={styles.divider}/>
      <Text style={[styles.settingLabel,{textAlign:align}]}>{t("calendar")}</Text>
      <View style={[styles.toggleRow,{flexDirection:flow}]}>
        <Toggle name={t("solar")} selected={calendar==="solar_hijri"} onPress={()=>setCalendar("solar_hijri")}/>
        <Toggle name={t("gregorian")} selected={calendar==="gregorian"} onPress={()=>setCalendar("gregorian")}/>
      </View>
    </View>
    <View style={styles.settingsCard}>
      <Text style={[styles.settingLabel,{textAlign:align}]}>{t("network")}</Text>
      <View style={[styles.statusLine,{flexDirection:flow}]}>
        <View style={[styles.statusDot,{backgroundColor:status==="connected"?"#18A879":"#D69A4C"}]}/>
        <Text style={[styles.body,{textAlign:align,flex:1}]}>{t(status)}</Text>
      </View>
      {(status==="not_configured"||status==="disconnected")&&
        <Text style={[styles.body,{fontSize:12,textAlign:align}]}>{t(status==="disconnected"?"offline":"apiHint")}</Text>}
      <Pressable accessibilityRole="button" onPress={()=>{void checkApi();}} disabled={checking}
        style={[styles.secondaryButton,{marginTop:16}]}>
        {checking?<ActivityIndicator color={palette.accent}/>:<Text style={styles.secondaryText}>{t("refresh")}</Text>}
      </Pressable>
    </View>
    <Summary symbol="✦" title={t("about")} description={t("aboutMessage")}/>
    <Text style={[styles.footNote,{textAlign:align}]}>{t("noPatientData")}</Text>
  </>;

  return <SafeAreaView style={styles.root} edges={["top","bottom","left","right"]}>
    <StatusBar barStyle="dark-content" backgroundColor={palette.white}/>
    {Header}
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      refreshControl={tab==="home"?<RefreshControl refreshing={checking}
        onRefresh={()=>{void checkApi();}} tintColor={palette.accent}/>:undefined}>
      {tab==="home"?Home:tab==="appointments"?<Blank kind="appointments"/>:
        tab==="saved"?<Blank kind="saved"/>:Account}
    </ScrollView>
    {Bottom}
  </SafeAreaView>;
}
export default function App(){
 return <SafeAreaProvider><PatientApp/></SafeAreaProvider>;
}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:palette.bg},
 header:{backgroundColor:palette.white,paddingHorizontal:20,paddingVertical:13,
   alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:palette.border},
 brandGroup:{alignItems:"center",gap:10},
 logo:{height:43,width:43,borderRadius:13,backgroundColor:palette.dark,alignItems:"center",justifyContent:"center"},
 logoText:{fontSize:28,color:"#DEF7EF",fontWeight:"700"},
 brandName:{fontWeight:"800",fontSize:18,color:palette.ink,letterSpacing:0.25},
 brandSubtitle:{fontSize:9,color:palette.muted,fontWeight:"800",letterSpacing:1.1,marginTop:2},
 headerBadge:{paddingHorizontal:13,paddingVertical:8,backgroundColor:palette.soft,borderRadius:30},
 headerBadgeText:{fontSize:12,color:palette.dark,fontWeight:"800"},
 scroll:{flex:1},content:{paddingHorizontal:18,paddingTop:20,paddingBottom:30},
 hero:{backgroundColor:palette.dark,borderRadius:25,paddingHorizontal:23,paddingVertical:28,overflow:"hidden",minHeight:200},
 orbOne:{position:"absolute",width:175,height:175,borderRadius:90,backgroundColor:"#1D7680",opacity:0.45,
  top:-100,right:-58},
 orbTwo:{position:"absolute",width:105,height:105,borderRadius:60,backgroundColor:"#36A4A8",opacity:0.2,
  bottom:-62,left:-30},
 heroEyebrow:{fontWeight:"800",color:"#B5E2E3",fontSize:12,letterSpacing:0.5,marginBottom:12},
 heroTitle:{fontSize:26,fontWeight:"800",color:palette.white,lineHeight:40,maxWidth:290},
 heroDescription:{color:"#D7EFF0",fontSize:14,lineHeight:24,maxWidth:300,marginTop:8},
 heroPills:{flexWrap:"wrap",gap:9,marginTop:20},
 heroPill:{backgroundColor:"#286777",paddingHorizontal:13,paddingVertical:7,borderRadius:30},
 heroPillText:{color:"#E5F7F7",fontSize:12,fontWeight:"700"},
 searchCard:{backgroundColor:palette.white,borderRadius:22,marginTop:16,padding:18,borderWidth:1,
  borderColor:palette.border,shadowOpacity:0.025,shadowRadius:12,elevation:1},
 sectionSmall:{fontSize:13,fontWeight:"800",color:palette.ink,marginBottom:7},
 cityButton:{borderWidth:1,borderColor:palette.border,borderRadius:12,
  minHeight:50,paddingHorizontal:14,alignItems:"center",gap:12},
 pin:{fontSize:23,color:palette.accent},
 cityText:{flex:1,fontSize:15,fontWeight:"700",color:palette.ink},
 chevron:{fontSize:19,fontWeight:"700",color:palette.muted},
 cityOptions:{marginTop:6,borderRadius:12,borderWidth:1,borderColor:palette.border,overflow:"hidden"},
 cityOption:{minHeight:46,paddingHorizontal:14,paddingVertical:11,alignItems:"center",justifyContent:"space-between",
  borderBottomWidth:1,borderColor:palette.border},
 inputRow:{minHeight:53,alignItems:"center",borderWidth:1,borderColor:palette.border,borderRadius:12,
  paddingHorizontal:12,gap:10},
 searchGlyph:{fontSize:25,color:palette.accent,fontWeight:"700"},
 input:{flex:1,fontSize:15,color:palette.ink,minHeight:50},
 clear:{fontSize:26,color:palette.muted,paddingHorizontal:6},
 primaryButton:{backgroundColor:palette.accent,borderRadius:12,minHeight:51,
  alignItems:"center",justifyContent:"center",marginTop:14},
 primaryText:{color:palette.white,fontWeight:"800",fontSize:15},
 sectionHeader:{justifyContent:"space-between",alignItems:"center",marginVertical:24,gap:10},
 sectionTitle:{fontSize:19,fontWeight:"800",color:palette.ink,lineHeight:29},
 sectionSub:{fontSize:12,color:palette.muted,marginTop:4},
 softBadge:{padding:9,backgroundColor:palette.amberSoft,borderRadius:20,maxWidth:170},
 softBadgeText:{color:palette.amber,fontSize:10,fontWeight:"800",textAlign:"center"},
 emptyCard:{backgroundColor:palette.white,borderWidth:1,borderColor:palette.border,
  paddingHorizontal:22,paddingVertical:30,borderRadius:20,alignItems:"center"},
 emptyIconWrap:{width:74,height:74,borderRadius:40,backgroundColor:palette.soft,
  justifyContent:"center",alignItems:"center",marginBottom:16},
 emptyIcon:{fontSize:43,color:palette.accent},
 emptyTitle:{fontSize:17,color:palette.ink,fontWeight:"800",lineHeight:26},
 emptyDescription:{fontSize:13,color:palette.muted,lineHeight:23,marginTop:9},
 searchSummary:{marginTop:17,paddingHorizontal:14,paddingVertical:9,backgroundColor:palette.bg,borderRadius:12},
 searchSummaryText:{color:palette.accent,fontSize:12},
 steps:{backgroundColor:palette.white,borderRadius:18,borderWidth:1,borderColor:palette.border,
  padding:18,gap:18},
 stepRow:{alignItems:"flex-start",gap:14},
 stepNumber:{backgroundColor:palette.soft,width:40,height:40,borderRadius:12,justifyContent:"center",alignItems:"center"},
 stepNumberText:{fontWeight:"800",fontSize:14,color:palette.accent},
 stepTitle:{fontWeight:"800",fontSize:15,color:palette.ink,marginBottom:5},
 body:{fontSize:14,color:palette.muted,lineHeight:23},
 footNote:{fontSize:12,color:palette.muted,lineHeight:21,marginTop:18},
 bottomNav:{flexDirection:"row",backgroundColor:palette.white,borderTopWidth:1,borderColor:palette.border,
  justifyContent:"space-around",paddingHorizontal:10,paddingTop:8,paddingBottom:6},
 bottomItem:{alignItems:"center",justifyContent:"center",minHeight:54,flex:1,borderRadius:11,marginHorizontal:3},
 bottomItemActive:{backgroundColor:palette.soft},
 bottomIcon:{fontSize:25,color:"#8299A4",fontWeight:"700",lineHeight:29},
 bottomIconActive:{color:palette.accent},
 bottomLabel:{fontSize:10,fontWeight:"700",color:palette.muted,marginTop:1},
 bottomLabelActive:{color:palette.dark},
 pageTitle:{fontSize:25,fontWeight:"800",color:palette.ink,marginBottom:20},
 blankLarge:{borderRadius:21,backgroundColor:palette.white,alignItems:"center",justifyContent:"center",
  paddingVertical:44,paddingHorizontal:22,borderColor:palette.border,borderWidth:1},
 blankIcon:{width:88,height:88,borderRadius:46,backgroundColor:palette.soft,alignItems:"center",
   justifyContent:"center",marginBottom:20},
 blankIconText:{fontSize:42,color:palette.accent},
 blankHeading:{fontSize:18,fontWeight:"800",color:palette.ink,textAlign:"center"},
 blankText:{fontSize:14,color:palette.muted,textAlign:"center",lineHeight:24,marginTop:9},
 secondaryButton:{borderColor:palette.accent,borderWidth:1.3,borderRadius:11,minHeight:45,
  paddingHorizontal:19,alignItems:"center",justifyContent:"center",marginTop:21,alignSelf:"center"},
 secondaryText:{color:palette.accent,fontWeight:"800",fontSize:14},
 infoCard:{backgroundColor:palette.white,borderColor:palette.border,borderWidth:1,borderRadius:18,
  padding:19,marginTop:20},
 infoHead:{alignItems:"center",gap:12,marginBottom:8},
 infoEmoji:{fontSize:25,color:palette.accent},
 cardTitle:{fontSize:16,fontWeight:"800",color:palette.ink,flex:1},
 guestCard:{backgroundColor:palette.dark,padding:20,borderRadius:20,marginBottom:17},
 guestAvatar:{backgroundColor:"#2B8090",borderRadius:24,width:50,height:50,alignItems:"center",justifyContent:"center"},
 guestAvatarText:{color:palette.white,fontSize:24},
 guestTitle:{fontSize:16,fontWeight:"800",color:palette.white,marginBottom:6},
 settingsCard:{backgroundColor:palette.white,borderColor:palette.border,borderWidth:1,borderRadius:18,
  padding:19,marginBottom:15},
 settingLabel:{fontSize:15,color:palette.ink,fontWeight:"800",marginBottom:13},
 toggleRow:{flexWrap:"wrap",gap:9},
 toggle:{paddingHorizontal:14,minHeight:43,justifyContent:"center",borderRadius:11,
  backgroundColor:palette.bg,borderWidth:1,borderColor:palette.border},
 toggleSelected:{backgroundColor:palette.soft,borderColor:palette.accent},
 toggleText:{fontSize:13,color:palette.muted,fontWeight:"700"},
 toggleTextSelected:{color:palette.accent},
 divider:{height:1,backgroundColor:palette.border,marginVertical:20},
 statusLine:{gap:10,alignItems:"center",marginBottom:10},
 statusDot:{width:9,height:9,borderRadius:5}
});
