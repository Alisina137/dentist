import { createHash } from "node:crypto";

export class PatientError extends Error {
  constructor(readonly statusCode:number,readonly code:string,readonly extra?:Record<string,unknown>){
    super(code);
  }
}
export function fail(statusCode:number,code:string,extra?:Record<string,unknown>):never {
  throw new PatientError(statusCode,code,extra);
}
export function str(value:unknown,min:number,max:number,code:string):string{
  if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)
    fail(422,"INVALID_"+code);
  return (value as string).trim();
}
export const maybe=(value:unknown,max:number,code:string)=>
  value===undefined||value===null||value===""?null:str(value,1,max,code);
export const normalizedName=(value:string)=>value.normalize("NFKC").replace(/\s+/g," ").trim().toLocaleLowerCase("en");
export function phone(value:unknown):string|null{
  if(value===undefined||value===null||value==="")return null;
  const valueText=str(value,9,24,"PHONE").replace(/[\s()-]/g,"");
  const number=/^0\d{9}$/.test(valueText)?"+93"+valueText.slice(1):
    /^93\d{9}$/.test(valueText)?"+"+valueText:valueText;
  if(!/^\+[1-9]\d{7,14}$/.test(number))fail(422,"INVALID_PHONE");
  return number;
}
export function isoDate(value:unknown,optional=true):string|null{
  if(value===null||value===undefined||value===""){
    if(optional)return null;fail(422,"DATE_REQUIRED");
  }
  const s=str(value,10,10,"DATE");
  if(!/^\d{4}-\d\d-\d\d$/.test(s))fail(422,"INVALID_DATE");
  const d=new Date(s+"T00:00:00Z");
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s||s>new Date().toISOString().slice(0,10))
    fail(422,"INVALID_DATE");
  return s;
}
export function demographicInput(b:any,source:"frontdesk"|"import"="frontdesk"){
  if(!b || typeof b!=="object" || Array.isArray(b))fail(422,"INVALID_BODY");
  const preferredName=str(b.preferredName,2,120,"PREFERRED_NAME");
  const familyName=maybe(b.familyName,120,"FAMILY_NAME");
  const dateOfBirth=isoDate(b.dateOfBirth);
  let ageEstimate:null|number=null;
  if(b.ageEstimate!==undefined&&b.ageEstimate!==null&&b.ageEstimate!==""){
    const value=Number(b.ageEstimate);
    if(!Number.isInteger(value)||value<0||value>120)fail(422,"INVALID_AGE");
    ageEstimate=value;
  }
  if(dateOfBirth!==null&&ageEstimate!==null)fail(422,"DOB_AND_ESTIMATE_MUTUALLY_EXCLUSIVE");
  if(source==="frontdesk"&&b.noticeAcknowledged!==true)fail(422,"NOTICE_ACKNOWLEDGEMENT_REQUIRED");
  return {
    preferredName,familyName,
    normalizedName:normalizedName([preferredName,familyName].filter(Boolean).join(" ")),
    phone:phone(b.phone),alternateContact:maybe(b.alternateContact,120,"ALTERNATE_CONTACT"),
    dateOfBirth,ageEstimate,dobIsEstimated:ageEstimate!==null,
    province:maybe(b.province,80,"PROVINCE"),city:maybe(b.city,80,"CITY"),
    address:maybe(b.address,250,"ADDRESS"),emergencyContact:maybe(b.emergencyContact,160,"EMERGENCY_CONTACT"),
    importSourceId:source==="import"?maybe(b.importSourceId,80,"SOURCE_ID"):null,
    noticeAcknowledged:source==="frontdesk"
  };
}
export function intakeInput(b:any){
  if(!b||typeof b!=="object")fail(422,"INVALID_BODY");
  const statuses=["unknown","none_reported","reported"];
  const fields:Record<string,any>={};
  for(const section of ["allergies","medications","conditions"]){
    const state=b[section+"Status"];
    if(!statuses.includes(state))fail(422,"INVALID_INTAKE_STATUS");
    const notes=maybe(b[section+"Notes"],1500,"INTAKE_NOTES");
    if(state==="reported" && !notes)fail(422,"REPORTED_INTAKE_NEEDS_NOTES");
    if(state!=="reported" && notes)fail(422,"NOTES_REQUIRE_REPORTED_STATUS");
    fields[section+"Status"]=state;
    fields[section+"Notes"]=notes;
  }
  const sourceKind=str(b.sourceKind,3,32,"INTAKE_SOURCE");
  if(!["patient_reported","clinician_observed","transcribed"].includes(sourceKind))
    fail(422,"INVALID_INTAKE_SOURCE");
  const sourceDate=isoDate(b.sourceDate,false);
  return {...fields,sourceKind,sourceDate};
}
export const csvTemplateHeader=["preferred_name","family_name","phone","source_id","date_of_birth",
  "age_estimate","province","city","address","alternate_contact","emergency_contact"];

/** RFC 4180-style parser with embedded commas, quotes and LF/CRLF; rejects malformed quoting. */
export function parseCsv(textValue:string):string[][]{
  if(typeof textValue!=="string"||Buffer.byteLength(textValue,"utf8")>1_048_576)
    fail(413,"CSV_TOO_LARGE");
  if(!textValue.trim())fail(422,"CSV_EMPTY");
  const source=textValue.charCodeAt(0)===0xfeff?textValue.slice(1):textValue;
  const rows:string[][]=[];let row:string[]=[],cell="",inside=false,closed=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(inside){
      if(char==='"'&&source[i+1]==='"'){cell+='"';i++;}
      else if(char==='"'){inside=false;closed=true;}
      else cell+=char;
    }else{
      if(char==='"'){
        if(cell.length>0||closed)fail(422,"CSV_INVALID_QUOTE");
        inside=true;
      }else if(char===","){row.push(cell);cell="";closed=false;}
      else if(char==="\n"||char==="\r"){
        if(char==="\r"&&source[i+1]==="\n")i++;
        row.push(cell);cell="";closed=false;
        if(row.some(x=>x.length>0))rows.push(row);
        row=[];if(rows.length>501)fail(413,"CSV_ROW_LIMIT");
      }else{
        if(closed&&!/\s/.test(char))fail(422,"CSV_INVALID_QUOTE");
        if(!closed)cell+=char;
      }
    }
  }
  if(inside)fail(422,"CSV_UNCLOSED_QUOTE");
  row.push(cell);
  if(row.some(x=>x.length>0))rows.push(row);
  if(rows.length<2)fail(422,"CSV_NO_ROWS");
  if(rows.length>501)fail(413,"CSV_ROW_LIMIT");
  if(rows[0].length>40)fail(422,"CSV_TOO_MANY_COLUMNS");
  return rows;
}
export type CsvMapping={
  preferredName:string;familyName?:string;phone?:string;importSourceId?:string;
  dateOfBirth?:string;ageEstimate?:string;province?:string;city?:string;
  address?:string;alternateContact?:string;emergencyContact?:string
};
export function readMapping(headers:string[],supplied:any):CsvMapping{
  const standard:Record<keyof CsvMapping,string>={
    preferredName:"preferred_name",familyName:"family_name",phone:"phone",
    importSourceId:"source_id",dateOfBirth:"date_of_birth",ageEstimate:"age_estimate",
    province:"province",city:"city",address:"address",alternateContact:"alternate_contact",
    emergencyContact:"emergency_contact"
  };
  const mapping:any={};
  for(const field of Object.keys(standard) as (keyof CsvMapping)[]){
    const assigned=typeof supplied?.[field]==="string" ? supplied[field]:standard[field];
    if(!assigned && field==="preferredName")fail(422,"MAPPING_NAME_REQUIRED");
    if(assigned && !headers.includes(assigned) && (field==="preferredName"||supplied?.[field]))
      fail(422,"MAPPING_UNKNOWN_HEADER");
    if(assigned && headers.includes(assigned))mapping[field]=assigned;
  }
  if(!mapping.preferredName)fail(422,"MAPPING_NAME_REQUIRED");
  if(new Set(Object.values(mapping)).size!==Object.values(mapping).length)fail(422,"MAPPING_COLLISION");
  return mapping as CsvMapping;
}
export function csvRecords(csv:string,supplied?:unknown){
  const rows=parseCsv(csv);
  const headers=rows[0].map(x=>x.trim().toLocaleLowerCase("en"));
  if(new Set(headers).size!==headers.length)fail(422,"CSV_DUPLICATE_HEADER");
  const mapping=readMapping(headers,supplied);
  const records=rows.slice(1).map((row,i)=>{
    const values:any={};
    for(const field of Object.keys(mapping) as (keyof CsvMapping)[]){
      values[field]=row[headers.indexOf(mapping[field]!) ]?.trim()||null;
    }
    values.noticeAcknowledged=true;
    return {rowNumber:i+2,values};
  });
  return {headers,mapping,records};
}
export const fingerprint=(csv:string,mapping:CsvMapping,actions?:unknown)=>
  createHash("sha256").update(JSON.stringify({csv,mapping,...(actions===undefined?{}:{actions})})).digest("hex");
