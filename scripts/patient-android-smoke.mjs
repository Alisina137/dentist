#!/usr/bin/env node
/**
 * Non-destructive DandanLink Expo Go Android smoke using Android Platform Tools.
 * It reads the live Android accessibility hierarchy into MEMORY ONLY, taps
 * the five bottom tabs, and checks their visibility and screen-direction order.
 *
 * No sign-in, booking, consent, record, support or clinical action is performed.
 * Do not confuse this with full physical-device acceptance (E01-E24).
 */
import {spawnSync} from "node:child_process";
import {writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const labels={
 en:["Home","Explore","Appointments","Saved","Account"],
 "fa-AF":["خانه","جستجو","نوبت‌ها","ذخیره‌ها","حساب"],
 "ps-AF":["کور","لټون","ملاقاتونه","ساتل شوي","حساب"]
};
const argv=process.argv.slice(2),arg=(key)=>{
 const i=argv.indexOf("--"+key);return i<0?null:argv[i+1]??null;
};
function adb(serial,parts,timeout=12000){
 const cmd=serial?["-s",serial,...parts]:parts;
 const x=spawnSync("adb",cmd,{encoding:"utf8",timeout,maxBuffer:6*1024*1024});
 if(x.error)throw Error(x.error.code==="ENOENT"?
  "adb not found. Install Android SDK Platform Tools and add adb to PATH.":x.error.message);
 if(x.status!==0)throw Error("adb command failed; check USB debugging, screen unlock and app foreground");
 return x.stdout;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const unescapeXml=s=>String(s||"").replace(/&quot;/g,'"').replace(/&apos;/g,"'")
 .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&")
 .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,code)=>String.fromCodePoint(
  code[0].toLowerCase()==="x"?parseInt(code.slice(1),16):Number(code)));
function parse(raw){
 const result=[];
 for(const m of raw.matchAll(/<node\b([^>]*?)\/?>/g)){
  const attrs=m[1],get=key=>{
   const found=attrs.match(new RegExp("(?:^|\\s)"+key+'="([^"]*)"'));
   return found?unescapeXml(found[1]):"";
  };
  const bound=get("bounds").match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
  if(!bound)continue;
  const [x1,y1,x2,y2]=bound.slice(1).map(Number);
  if(x2<=x1||y2<=y1)continue;
  result.push({text:get("text"),desc:get("content-desc"),clickable:get("clickable")==="true",
   x:(x1+x2)/2,y:(y1+y2)/2,left:x1,top:y1,right:x2,bottom:y2});
 }
 return result;
}
function visibleTabs(nodes,titles,screenHeight){
 const out=[];
 for(const text of titles){
  const found=nodes.filter(n=>(n.desc===text||n.text===text)&&n.y>=screenHeight*.58)
   .sort((a,b)=>(b.desc===text?1:0)-(a.desc===text?1:0)||
    (b.clickable?1:0)-(a.clickable?1:0)||b.y-a.y)[0];
  if(!found)return null;
  out.push(found);
 }
 return out;
}
function inferLanguage(nodes,screenHeight){
 for(const [key,names] of Object.entries(labels))
  if(visibleTabs(nodes,names,screenHeight))return key;
 return null;
}
function deviceList(){
 const result=adb(null,["devices"]).split(/\r?\n/).slice(1).map(line=>line.trim())
  .filter(Boolean).map(line=>line.split(/\s+/)).filter(parts=>parts[1]==="device");
 return result.map(parts=>parts[0]);
}
function readUi(serial){
 // Android's UIAutomator only supports writing to a device file. Delete it
 // immediately in finally; never persist the XML locally or print its contents.
 const remote="/sdcard/dandanlink_acceptance_tmp.xml";
 try{
  adb(serial,["shell","uiautomator","dump",remote],22000);
  const xml=adb(serial,["exec-out","cat",remote],12000);
  if(!xml.includes("<hierarchy"))throw Error("Android accessibility hierarchy unavailable");
  return parse(xml);
 }finally{
  try{adb(serial,["shell","rm","-f",remote],8000)}catch{}
 }
}
function findSize(serial){
 const value=adb(serial,["shell","wm","size"]).match(/(?:Physical|Override) size:\s*(\d+)x(\d+)/i);
 if(!value)throw Error("Android physical screen size unavailable");
 return {width:Number(value[1]),height:Number(value[2])};
}
function saveResult(result){
 const dir=resolve(root,".patient-acceptance");
 mkdirSync(dir,{recursive:true});
 const tag=new Date().toISOString().replace(/[:.]/g,"-");
 const path=resolve(dir,"guest-navigation-"+tag+".json");
 writeFileSync(path,JSON.stringify(result,null,2)+"\n",{mode:0o600});
 console.log("Local evidence: .patient-acceptance/guest-navigation-"+tag+".json");
}
async function main(){
 if(argv.includes("--help")||argv.includes("-h")){
  console.log("Usage: node scripts/patient-android-smoke.mjs [--locale en|fa-AF|ps-AF] [--serial adb-device]");
  console.log("Requirements: Android Platform Tools (adb), unlocked Android device with Expo Go/DandanLink open.");
  console.log("No screenshots or UI XML are retained. Tests only bottom-tab navigation and RTL direction.");
  return;
 }
 const available=deviceList(),serial=arg("serial")||available[0];
 if(!serial||!available.includes(serial))throw Error("No authorized Android device. Enable USB debugging, approve the prompt, then run 'adb devices'.");
 if(available.length>1&&!arg("serial"))throw Error("Multiple Android devices; select one with --serial.");
 const size=findSize(serial),model=adb(serial,["shell","getprop","ro.product.model"]).trim().slice(0,70);
 const android=adb(serial,["shell","getprop","ro.build.version.release"]).trim().slice(0,20);
 const scale=adb(serial,["shell","settings","get","system","font_scale"]).trim().slice(0,20);
 const result={tool:"DandanLink guest navigation device smoke",runAt:new Date().toISOString(),
  device:{model,android,size,fontScale:scale},locale:null,checks:[],note:
  "Only navigation tested automatically; none of the Phase E physical clinical acceptance cases were marked PASS."};
 console.log("Android "+android+" — "+model+" — "+size.width+"×"+size.height+"; no patient data stored.");
 const initial=readUi(serial);
 const detected=inferLanguage(initial,size.height);
 const locale=arg("locale")||detected;
 if(!Object.hasOwn(labels,locale))
  throw Error("DandanLink tabs not detected. Open patient app in Expo Go, unlock phone, set locale and rerun.");
 if(!visibleTabs(initial,labels[locale],size.height))
  throw Error("DandanLink bottom tabs not visible for "+locale+". Close Expo developer overlay and open the patient Home screen.");
 result.locale=locale;
 const titles=labels[locale],startTabs=visibleTabs(initial,titles,size.height);
 const order=startTabs.map(x=>x.x);
 const orderCorrect=locale==="en"?order.every((x,i)=>i===0||x>order[i-1]):
  order.every((x,i)=>i===0||x<order[i-1]);
 result.checks.push({id:"S00",test:"Five bottom tabs and layout direction",status:orderCorrect?"PASS":"FAIL",
  observation:orderCorrect?"Expected visual order ("+locale+")":
   "Unexpected left-to-right/RTL tab order. Verify phone direction and font scaling."});
 for(let i=0;i<titles.length;i++){
  const names=titles;
  const nodes=readUi(serial),tabs=visibleTabs(nodes,names,size.height);
  if(!tabs){
   result.checks.push({id:"S0"+(i+1),test:names[i],status:"BLOCKED",
    observation:"Bottom tabs no longer visible; app may have crashed or an overlay is open."});
   break;
  }
  adb(serial,["shell","input","tap",String(Math.round(tabs[i].x)),String(Math.round(tabs[i].y))],8500);
  await sleep(900);
  let after=readUi(serial),current=visibleTabs(after,names,size.height);
  if(!current){await sleep(1000);after=readUi(serial);current=visibleTabs(after,names,size.height)}
  const ok=!!current;
  result.checks.push({id:"S0"+(i+1),test:names[i],status:ok?"PASS":"FAIL",
   observation:ok?"Bottom navigation remains mounted after tap.":
    "Bottom tabs disappeared after tap; inspect screen manually."});
  console.log("S0"+(i+1)+" "+names[i]+" "+(ok?"PASS":"FAIL"));
 }
 try{
  const nodes=readUi(serial),tabs=visibleTabs(nodes,titles,size.height);
  if(tabs)adb(serial,["shell","input","tap",
   String(Math.round(tabs[0].x)),String(Math.round(tabs[0].y))]);
 }catch{}
 saveResult(result);
 const bad=result.checks.filter(x=>x.status!=="PASS");
 console.log(bad.length?"Device smoke has "+bad.length+" failed/blocked checks.":
  "Bottom navigation device smoke passed. Full human E01–E24 acceptance remains NOT RUN.");
 if(bad.length)process.exitCode=1;
}
main().catch(error=>{
 console.error("Device smoke BLOCKED: "+error.message);
 console.error("Next: connect/unlock Android, open DandanLink in Expo Go and rerun. No patient data captured.");
 process.exitCode=2;
});
