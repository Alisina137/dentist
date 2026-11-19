import React,{useEffect,useState} from "react";
import {ActivityIndicator,AppState,Linking,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useNativeAuth} from "./native-auth";
import {challengeValid,normalizeMfaCode,type NativeMfaMethod} from "./native-clinic-mfa";
type Lang="en"|"fa-AF"|"ps-AF";
declare const process:{readonly env:{readonly EXPO_PUBLIC_PATIENT_WEB_URL?:string}};
const words={
 en:{title:"Two-factor verification",intro:"Enter the current code from your authenticator app.",
  totp:"Authenticator",backup:"Recovery code",code:"Six-digit code",
  recovery:"Single-use recovery code",verify:"Verify and sign in",
  cancel:"Cancel sign-in",expire:"The challenge expired. Sign in again.",
  error:"Code not verified. Check your code or use a recovery code.",
  privacy:"Your code is never stored on this device or included in analytics.",
  seconds:"Seconds remaining",web:"Open secure patient web",network:"Unable to verify. Check your connection before trying again."},
 "fa-AF":{title:"تأیید دومرحله‌ای",intro:"کود فعلی برنامه تصدیق‌کننده را وارد کنید.",
  totp:"تصدیق‌کننده",backup:"کود بازیابی",code:"کود شش‌رقمی",
  recovery:"کود بازیابی یک‌بار مصرف",verify:"تأیید و ورود",
  cancel:"لغو ورود",expire:"وقت تمام شد؛ دوباره وارد شوید.",
  error:"کود تأیید نشد؛ کود یا زمان دستگاه را بررسی کنید.",
  privacy:"کود در دستگاه یا تحلیل برنامه ذخیره نمی‌شود.",
  seconds:"ثانیه باقی",web:"وب مصئون مریض",network:"تأیید نشد؛ اتصال را بررسی کنید."},
 "ps-AF":{title:"دوه پړاوه تایید",intro:"د تصدیقوونکي اوسنی کوډ ولیکئ.",
  totp:"تصدیقوونکی",backup:"د بیا رغونې کوډ",code:"شپږ رقمي کوډ",
  recovery:"یوځل کارېدونکی کوډ",verify:"تایید او ننوتل",
  cancel:"ننوتل لغوه کړئ",expire:"وخت پای ته ورسېد؛ بیا ننوځئ.",
  error:"کوډ تایید نه شو؛ کوډ او د موبایل ساعت وګورئ.",
  privacy:"کوډ په موبایل کې نه ساتل کېږي.",
  seconds:"پاتې ثانیې",web:"خوندي د ناروغ وېب",network:"تایید ونه شو؛ انټرنېټ وګورئ."}
} as const;
export function NativePatientMfa({locale}:{locale:Lang}){
 const auth=useNativeAuth();
 const copy=words[locale];
 const [method,setMethod]=useState<NativeMfaMethod>("totp");
 const [code,setCode]=useState("");
 const [now,setNow]=useState(Date.now());
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const challenge=auth.mfaPending;
 const WEB=(process.env.EXPO_PUBLIC_PATIENT_WEB_URL||"").trim().replace(/\/+$/,"");
 useEffect(()=>{
  if(!challenge){setCode("");setError("");return}
  setCode("");setError("");setNow(Date.now());
  const interval=setInterval(()=>setNow(Date.now()),1000);
  // The authenticator may be a separate app: keep the short-lived
  // unverified challenge but erase typed secrets when backgrounded.
  const listener=AppState.addEventListener("change",()=>{setCode("");setNow(Date.now())});
  return()=>{clearInterval(interval);listener.remove()};
 },[challenge]);
 if(!challenge)return null;
 const valid=challengeValid(challenge,now);
 const remaining=Math.max(0,Math.ceil((challenge.expiresAt-now)/1000));
 const toggle=(next:NativeMfaMethod)=>{
  if(busy)return;setMethod(next);setCode("");setError("");
 };
 async function verify(){
  if(busy||!valid||normalizeMfaCode(method,code)===null)return;
  setBusy(true);setError("");
  const candidate=code;setCode("");
  try{await auth.verifyMfa(method,candidate)}
  catch(e){
   setError(e&&typeof e==="object"&&"status" in e&&
    (e as {status?:unknown}).status===0?copy.network:copy.error);
  }finally{setBusy(false)}
 }
 async function cancel(){
  if(busy)return;
  setBusy(true);setCode("");
  try{await auth.cancelMfa()}finally{setBusy(false)}
 }
 return <View style={s.card}>
  <View style={s.hero}>
   <Text style={s.eyebrow}>DANDANLINK · SECURE LOGIN</Text>
   <Text style={s.title}>{copy.title}</Text>
   <Text style={s.intro}>{copy.intro}</Text>
  </View>
  <View style={s.timeBox}>
   <Text style={s.timeLabel}>{copy.seconds}</Text>
   <Text style={s.countdown}>{remaining}s</Text>
  </View>
  <View style={s.buttons}>
   {(["totp","backup"] as const).map(item=>
    <Pressable key={item} accessibilityRole="button"
     accessibilityState={{selected:method===item,disabled:busy}}
     disabled={busy} onPress={()=>toggle(item)}
     style={[s.toggle,method===item&&s.toggleOn]}>
     <Text style={[s.toggleText,method===item&&s.toggleTextOn]}>
      {item==="totp"?copy.totp:copy.backup}</Text>
    </Pressable>)}
  </View>
  <Text style={s.label}>{method==="totp"?copy.code:copy.recovery}</Text>
  <TextInput accessibilityLabel={method==="totp"?copy.code:copy.recovery}
   value={code} onChangeText={setCode}
   autoCapitalize="none" autoCorrect={false} secureTextEntry
   maxLength={method==="totp"?6:64}
   keyboardType={method==="totp"?"number-pad":"default"}
   autoComplete={method==="totp"?"one-time-code":"off"}
   style={s.input}/>
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!valid&&<Text accessibilityRole="alert" style={s.error}>{copy.expire}</Text>}
  <Text style={s.privacy}>{copy.privacy}</Text>
  <Pressable accessibilityRole="button" accessibilityState={{disabled:busy||!valid}}
   disabled={busy||!valid||normalizeMfaCode(method,code)===null}
   style={[s.action,(busy||!valid||normalizeMfaCode(method,code)===null)&&s.disabled]}
   onPress={()=>{void verify()}}>
   {busy?<ActivityIndicator color="#fff"/>:<Text style={s.actionText}>{copy.verify}</Text>}
  </Pressable>
  <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void cancel()}}
   style={s.secondary}><Text style={s.secondaryText}>{copy.cancel}</Text></Pressable>
  {!!WEB&&/^https:\/\//i.test(WEB)&&
   <Pressable accessibilityRole="link" onPress={()=>{void Linking.openURL(WEB+"/login")}}
    style={s.web}><Text style={s.webText}>{copy.web}</Text></Pressable>}
 </View>;
}
const s=StyleSheet.create({
 card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#dce6ef",borderRadius:18,
  padding:18,gap:14},
 hero:{gap:9,backgroundColor:"#193a56",padding:17,borderRadius:13},
 eyebrow:{fontSize:10,letterSpacing:.8,fontWeight:"900",color:"#77d2cc"},
 title:{fontSize:22,lineHeight:31,fontWeight:"900",color:"#fff"},
 intro:{fontSize:12,lineHeight:20,color:"#bed7e7"},
 timeBox:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",
  backgroundColor:"#eaf4fb",borderRadius:11,paddingHorizontal:14,paddingVertical:10},
 timeLabel:{fontSize:11,fontWeight:"800",color:"#587d99"},
 countdown:{fontSize:16,fontWeight:"900",color:"#1d6599"},
 buttons:{flexDirection:"row",gap:9},
 toggle:{flex:1,minHeight:45,alignItems:"center",justifyContent:"center",
  backgroundColor:"#eef3f8",borderRadius:10,paddingHorizontal:8},
 toggleOn:{backgroundColor:"#1b679f"},
 toggleText:{fontSize:11,fontWeight:"800",color:"#59768a",textAlign:"center"},
 toggleTextOn:{color:"#fff"},
 label:{color:"#2a546f",fontSize:12,fontWeight:"900"},
 input:{borderColor:"#bcd8e8",borderWidth:1,borderRadius:12,
  minHeight:53,fontSize:19,fontWeight:"900",color:"#214b65",
  backgroundColor:"#f8fcff",paddingHorizontal:13,letterSpacing:2},
 privacy:{fontSize:11,lineHeight:19,color:"#71879c"},
 error:{fontSize:12,lineHeight:19,color:"#a83c52",padding:12,
  backgroundColor:"#fff2f4",borderRadius:10},
 action:{minHeight:48,borderRadius:11,backgroundColor:"#1f6ba2",
  alignItems:"center",justifyContent:"center"},
 actionText:{color:"#fff",fontSize:13,fontWeight:"900"},
 secondary:{minHeight:44,backgroundColor:"#e8f3fb",borderRadius:10,
  alignItems:"center",justifyContent:"center"},
 secondaryText:{color:"#215c85",fontWeight:"900",fontSize:12},
 web:{paddingVertical:12,alignItems:"center"},
 webText:{color:"#2c7599",fontSize:11,fontWeight:"800"},
 disabled:{opacity:.48}
});
