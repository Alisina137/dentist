import React from "react";
import {View,Text} from "react-native";

/**
 * Lightweight native stroke icons, drawn entirely with React Native Views.
 * No platform-dependent symbol font, network requests or extra icon package.
 * Shapes use the same 24-unit geometry, stroke width and optical proportions.
 */
export type PatientIconName="home"|"search"|"calendar"|"bookmark"|"user"|
 "arrow"|"chevron"|"clinic"|"clock"|"phone"|"map"|"shield"|"users"|
 "file"|"bell"|"settings"|"help"|"star"|"check"|"tooth"|"plus"|"close";

export function PatientIcon({name,size=24,color="#1467E9",filled=false}:{
 name:PatientIconName;size?:number;color?:string;filled?:boolean}){
 const sc=size/24,stroke=Math.max(1.5,1.75*sc);
 const shape:React.ReactNode[]=[];
 const line=(key:string,x:number,y:number,xx:number,yy:number)=>{
  const w=Math.hypot(xx-x,yy-y),angle=Math.atan2(yy-y,xx-x)*180/Math.PI;
  shape.push(<View key={key} style={{position:"absolute",
   left:((x+xx-w)/2)*sc,top:((y+yy)/2)*sc-stroke/2,
   width:w*sc,height:stroke,borderRadius:stroke/2,backgroundColor:color,
   transform:[{rotate:`${angle}deg` as const}]}}/>);
 };
 const outline=(key:string,x:number,y:number,w:number,h:number,r=3)=>{
  shape.push(<View key={key} style={{position:"absolute",left:x*sc,top:y*sc,
   width:w*sc,height:h*sc,borderRadius:r*sc,borderColor:color,
   borderWidth:stroke,backgroundColor:"transparent"}}/>);
 };
 const dot=(key:string,x:number,y:number,diameter=3)=>{
  shape.push(<View key={key} style={{position:"absolute",left:x*sc,top:y*sc,
   width:diameter*sc,height:diameter*sc,borderRadius:diameter*sc/2,
   backgroundColor:color}}/>);
 };
 switch(name){
 case "home":
  line("roof1",2.5,11,12,3);line("roof2",12,3,21.5,11);
  line("wall1",5,10,5,21);line("base",5,21,19,21);line("wall2",19,21,19,10);
  line("door1",10,21,10,15);line("door2",10,15,14,15);line("door3",14,15,14,21);
  break;
 case "search":
  outline("ring",3,3,14,14,8);line("handle",15.5,15.5,22,22);
  break;
 case "calendar":
  outline("box",3,5,18,16,3);line("top",3,11,21,11);
  line("clip1",8,2,8,8);line("clip2",16,2,16,8);
  dot("date1",7,14);dot("date2",13,14);dot("date3",7,18);break;
 case "bookmark":
  line("top",6,3,18,3);line("right",18,3,18,21);
  line("tail1",18,21,12,17);line("tail2",12,17,6,21);line("left",6,21,6,3);break;
 case "user":
  outline("head",8.2,2.5,7.6,7.6,5);
  outline("body",4,13,16,9,8);break;
 case "arrow":
  line("stem",4,12,21,12);line("up",4,12,11,5);line("down",4,12,11,19);break;
 case "chevron":
  line("top",9,5,16,12);line("bottom",16,12,9,19);break;
 case "clinic":
  outline("building",4,5,16,17,2);
  line("crossV",12,7,12,13);line("crossH",9,10,15,10);
  outline("door",10,16,4,6,0);break;
 case "clock":
  outline("clock",2.5,2.5,19,19,10);line("hour",12,12,12,7);
  line("minute",12,12,16,14);break;
 case "phone":
  outline("device",7,2,10,20,3);line("speaker",10,5,14,5);
  dot("home",11,18,2);break;
 case "map":
  outline("maphead",5,2.5,14,14,7);dot("center",10,7.5,4);
  line("pin1",5.8,14.2,12,22);line("pin2",12,22,18.2,14.2);break;
 case "shield":
  line("s1",12,2,21,6);line("s2",21,6,20,15);
  line("s3",20,15,12,22);line("s4",12,22,4,15);
  line("s5",4,15,3,6);line("s6",3,6,12,2);
  line("check1",8,12,11,15);line("check2",11,15,16,9);break;
 case "users":
  outline("head1",5,4,7,7,5);outline("head2",14,5,6,6,5);
  outline("torso1",2,14,13,8,6);outline("torso2",15,14,7,8,5);break;
 case "file":
  outline("sheet",5,2,14,20,2);line("l1",8,9,16,9);
  line("l2",8,13,16,13);line("l3",8,17,14,17);break;
 case "bell":
  outline("dome",5,4,14,15,7);line("rim",3,19,21,19);dot("ring",10.5,21,3);break;
 case "settings":
  line("s1",3,6,21,6);line("s2",3,12,21,12);line("s3",3,18,21,18);
  outline("knob1",7,3,5,6,3);outline("knob2",14,9,5,6,3);
  outline("knob3",6,15,5,6,3);break;
 case "help":
  outline("ring",2.5,2.5,19,19,10);
  shape.push(<Text key="question" allowFontScaling={false} style={{
   position:"absolute",left:0,top:1*sc,width:size,height:size,
   textAlign:"center",textAlignVertical:"center",color,
   fontWeight:"800",fontSize:size*.68}}>?</Text>);break;
 case "star":{
  const pts=Array.from({length:10},(_,i)=>{
   const a=(i*36-90)*Math.PI/180,r=i%2?4.5:10;
   return {x:12+Math.cos(a)*r,y:12+Math.sin(a)*r};
  });
  pts.forEach((v,i)=>line("p"+i,v.x,v.y,pts[(i+1)%10].x,pts[(i+1)%10].y));break;
 }
 case "check":
  outline("circle",2.5,2.5,19,19,10);
  line("tick1",7,12,11,16);line("tick2",11,16,18,8);break;
 case "tooth":
  line("l1",5,6,8,3);line("top",8,3,12,5);line("top2",12,5,16,3);
  line("r1",16,3,19,6);line("r2",19,6,18,13);
  line("r3",18,13,15,21);line("r4",15,21,12,16);
  line("l4",12,16,9,21);line("l3",9,21,6,13);
  line("l2",6,13,5,6);break;
 case "plus":
  line("h",4,12,20,12);line("v",12,4,12,20);break;
 case "close":
  line("a",5,5,19,19);line("b",19,5,5,19);break;
 }
 return <View accessible={false} importantForAccessibility="no-hide-descendants"
  style={{width:size,height:size,alignItems:"center",justifyContent:"center",
   opacity:filled?1:.92}}>{shape}</View>;
}
