/**
 * Clinic financial UX guards. All monetary amounts and due statuses are
 * authoritative only when returned by the billing API. These helpers validate
 * form input and safely format local data; they do NOT post payments.
 */
export type ClinicFinanceTab="overview"|"invoices"|"payments"|"balances"|"expenses";

export function clinicFinanceTab(value:string|null,canOverview:boolean):ClinicFinanceTab{
 if(!canOverview)return "invoices";
 return value==="overview"||value==="invoices"||value==="payments"||
  value==="balances"||value==="expenses"?value:"overview";
}

/** Afghanistan has a fixed UTC+04:30 offset (no daylight saving time). */
export function clinicKabulDateTimeInput(date:Date=new Date()):string{
 if(!Number.isFinite(date.getTime()))throw new RangeError("Invalid date");
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",hourCycle:"h23",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"
 }).formatToParts(date).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return parts.year+"-"+parts.month+"-"+parts.day+"T"+parts.hour+":"+parts.minute;
}

export function clinicKabulInputToIso(value:string,now:Date=new Date()):string{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
  throw new RangeError("INVALID_PAYMENT_DATE");
 const when=new Date(value+"+04:30");
 if(!Number.isFinite(when.getTime())||clinicKabulDateTimeInput(when)!==value||
  when.getTime()>now.getTime()+60_000||
  when.getTime()<now.getTime()-366*86_400_000)
  throw new RangeError("INVALID_PAYMENT_DATE");
 return when.toISOString();
}

export type ClinicInvoiceLine={serviceId:string;quantity:number;discountAfn:number};
export type ClinicLineIssue="MISSING_SERVICE"|"DUPLICATE_SERVICE_LINE"|
 "INVALID_QUANTITY"|"INVALID_DISCOUNT"|"DISCOUNT_REQUIRES_OWNER"|
 "DISCOUNT_EXCEEDS_POLICY"|"INVOICE_AMOUNT_LIMIT";

/** Preview uses displayed catalog prices. The API re-prices from performed-care evidence. */
export function clinicInvoiceLineIssue(lines:ClinicInvoiceLine[],
 priceOf:(serviceId:string)=>number|undefined,allowDiscount:boolean):ClinicLineIssue|null{
 if(lines.length<1||lines.length>20)return "INVOICE_AMOUNT_LIMIT";
 const seen=new Set<string>();
 let total=0;
 for(const line of lines){
  if(!line.serviceId||priceOf(line.serviceId)===undefined)return "MISSING_SERVICE";
  if(seen.has(line.serviceId))return "DUPLICATE_SERVICE_LINE";
  seen.add(line.serviceId);
  if(!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>20)
   return "INVALID_QUANTITY";
  const unit=priceOf(line.serviceId)!;
  const subtotal=unit*line.quantity;
  if(!Number.isSafeInteger(unit)||unit<0||subtotal>2_000_000_000)
   return "INVOICE_AMOUNT_LIMIT";
  if(!Number.isSafeInteger(line.discountAfn)||line.discountAfn<0||
   line.discountAfn>10_000_000)return "INVALID_DISCOUNT";
  if(line.discountAfn>0&&!allowDiscount)return "DISCOUNT_REQUIRES_OWNER";
  if(line.discountAfn>subtotal||line.discountAfn*10>subtotal*3)
   return "DISCOUNT_EXCEEDS_POLICY";
  total+=subtotal-line.discountAfn;
  if(!Number.isSafeInteger(total)||total>2_000_000_000)return "INVOICE_AMOUNT_LIMIT";
 }
 return total===0?"INVOICE_AMOUNT_LIMIT":null;
}

export function clinicCsvSafeCell(input:unknown):string{
 const raw=String(input??"");
 // CSV opened in a spreadsheet can interpret attacker-supplied names,
 // references or descriptions as formulae. Escape after any leading whitespace.
 const safe=/^\s*[=+\-@]/u.test(raw)||/^[\t\r\n]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replaceAll('"','""')+'"';
}

export function clinicCsvRows(rows:(readonly unknown[])[]):string{
 return "\uFEFF"+rows.map(row=>row.map(clinicCsvSafeCell).join(",")).join("\r\n");
}

export function clinicFinancialNet(kind:string,amount:number):number{
 return kind==="reversal"?-amount:amount;
}

export function clinicCanEnterPayment(balance:number,value:number):boolean{
 return Number.isSafeInteger(balance)&&balance>0&&Number.isSafeInteger(value)&&
  value>0&&value<=balance;
}
