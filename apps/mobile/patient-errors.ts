import {ApiError} from "./native-auth";

/** Patient-safe native messages: never surface HTTP internals, tokens or raw backend diagnostics. */
type Language="en"|"fa-AF"|"ps-AF";
type MessageKey="network"|"signIn"|"verification"|"changed"|"rateLimit"|"invalid"|
 "slotTaken"|"bookingChanged"|"deadline"|"publicationChanged"|"missingWeb"|"mfaWeb"|
 "localSignOut"|"generic"|"resetSent"|"verifySent"|"uncertain";
const messages:Record<Language,Record<MessageKey,string>>={
 en:{
  network:"Cannot connect right now. Check your connection and try again.",
  signIn:"Your session has expired. Sign in again to continue.",
  verification:"Verify your email address using the latest link, then sign in.",
  changed:"The signed-in account changed. Open this page again to continue safely.",
  rateLimit:"Too many attempts. Please try again later.",
  invalid:"Check the information you entered and try again.",
  slotTaken:"That time is no longer available. We refreshed the schedule; choose another time.",
  bookingChanged:"This appointment has changed. Return to My appointments and open the latest details.",
  deadline:"This appointment is past the clinic's change/cancellation deadline.",
  publicationChanged:"The clinic has changed the service or price. Please contact the clinic before rescheduling.",
  missingWeb:"Password reset needs the secure patient website, which is not configured on this device. Contact support.",
  mfaWeb:"This account requires two-step verification. Sign in through the secure patient website.",
  localSignOut:"Signed out on this device. Server sign-out could not be confirmed; reconnect to revoke other sessions.",
  generic:"We could not complete this request. Please try again.",
  resetSent:"If this address is registered, a reset link will be emailed. Open it to set a new password.",
  verifySent:"If this address is eligible, a new verification link will be emailed.",
  uncertain:"Connection lost while booking. Check My appointments before retrying. Do not submit a second request with different details."
 },
 "fa-AF":{
  network:"ارتباط برقرار نشد. اتصال اینترنت را بررسی کرده و دوباره کوشش کنید.",
  signIn:"نشست شما پایان یافته است. دوباره وارد شوید.",
  verification:"ایمیل خود را از طریق آخرین لینک تأیید کرده، سپس وارد شوید.",
  changed:"حساب واردشده تغییر کرده است. این صفحه را دوباره باز کنید.",
  rateLimit:"کوشش‌ها بیش از حد است. بعداً دوباره امتحان کنید.",
  invalid:"معلومات واردشده را بررسی کنید.",
  slotTaken:"این وقت دیگر آزاد نیست. تقسیم اوقات تازه شد؛ وقت دیگری انتخاب کنید.",
  bookingChanged:"معلومات نوبت تغییر کرده است. به نوبت‌های من برگردید و معلومات تازه را ببینید.",
  deadline:"مهلت لغو یا تغییر این نوبت طبق مقررات کلینیک گذشته است.",
  publicationChanged:"خدمت یا قیمت کلینیک تغییر کرده است. برای تغییر نوبت با کلینیک تماس بگیرید.",
  missingWeb:"برای بازیابی رمز، وبسایت مصون مریضان لازم است که در این دستگاه تنظیم نشده. با پشتیبانی تماس بگیرید.",
  mfaWeb:"این حساب به تأیید دو مرحله‌ای نیاز دارد. از وبسایت مصون مریضان وارد شوید.",
  localSignOut:"از این دستگاه خارج شدید؛ خروج از سرور تأیید نشد. پس از وصل‌شدن، نشست‌های دیگر را لغو کنید.",
  generic:"این درخواست انجام نشد. دوباره کوشش کنید.",
  resetSent:"اگر این ایمیل ثبت باشد، لینک بازیابی ارسال می‌شود. برای تعیین رمز جدید آن را باز کنید.",
  verifySent:"در صورت واجد شرایط بودن، لینک تأیید تازه به ایمیل ارسال می‌شود.",
  uncertain:"هنگام رزرو ارتباط قطع شد. پیش از کوشش دوباره، نوبت‌های من را بررسی کنید و درخواست متفاوت نفرستید."
 },
 "ps-AF":{
  network:"اړیکه نشته. خپل انټرنېټ وګورئ او بیا هڅه وکړئ.",
  signIn:"ستاسو ناسته پای ته رسېدلې. بیا ننوځئ.",
  verification:"خپل ایمیل د وروستي لینک په وسیله تایید او بیا ننوځئ.",
  changed:"ننوتلی حساب بدل شو. دا پاڼه بیا پرانیزئ.",
  rateLimit:"ډېرې هڅې شوې دي. وروسته بیا هڅه وکړئ.",
  invalid:"ورکړل شوي معلومات وګورئ.",
  slotTaken:"دا وخت نور خالي نه دی. مهال‌وېش تازه شو؛ بل وخت وټاکئ.",
  bookingChanged:"دا ملاقات بدل شوی دی. زما ملاقاتونو ته ورشئ او تازه معلومات وګورئ.",
  deadline:"د کلینیک له اصولو سره سم د بدلولو یا لغوه کولو وخت تېر دی.",
  publicationChanged:"کلینیک خدمت یا بیه بدله کړې ده. له کلینیک سره اړیکه ونیسئ.",
  missingWeb:"د پټنوم بیا ترلاسه کولو لپاره خوندي وېبپاڼه اړینه ده، خو دلته نه ده تنظیم شوې. له ملاتړ سره اړیکه ونیسئ.",
  mfaWeb:"دا حساب دوه پړاوه تایید غواړي. د ناروغانو خوندي وېبپاڼې ته ننوځئ.",
  localSignOut:"په دې وسیله ووتئ؛ په سرور کې وتل نه دي تایید شوي. له بېرته نښلېدو وروسته نورې ناستې لغوه کړئ.",
  generic:"غوښتنه بشپړه نه شوه. بیا هڅه وکړئ.",
  resetSent:"که دا ایمیل ثبت وي، د پټنوم لینک به واستول شي. له هغه څخه نوی پټنوم وټاکئ.",
  verifySent:"که ایمیل وړ وي، نوی تایید لینک به واستول شي.",
  uncertain:"د رزرو پر مهال اړیکه پرې شوه. له بیا هڅې مخکې زما ملاقاتونه وګورئ او بېله غوښتنه مه لېږئ."
 }
};
export function patientText(locale:Language,key:MessageKey):string{
 return messages[locale][key];
}
export function patientError(error:unknown,locale:Language):string{
 if(!(error instanceof ApiError))return messages[locale].generic;
 const code=error.code;
 if(["NETWORK_UNAVAILABLE","API_NOT_CONFIGURED","HTTPS_REQUIRED"].includes(code))return messages[locale].network;
 if(["SESSION_CHANGED"].includes(code))return messages[locale].changed;
 if(error.status===401||["AUTH_REQUIRED","INVALID_SESSION","SESSION_EXPIRED"].includes(code))return messages[locale].signIn;
 if(["EMAIL_VERIFICATION_REQUIRED","EMAIL_VERIFICATION_OR_SESSION_REQUIRED","EMAIL_NOT_VERIFIED"].includes(code))
  return messages[locale].verification;
 if(["TOO_MANY_REQUESTS","RATE_LIMIT_EXCEEDED"].includes(code)||error.status===429)
  return messages[locale].rateLimit;
 if(["BOOKING_SLOT_CONFLICT","BOOKING_SLOT_UNAVAILABLE","APPOINTMENT_SLOT_UNAVAILABLE"].includes(code))
  return messages[locale].slotTaken;
 if(["BOOKING_CANNOT_RESCHEDULE","BOOKING_CANNOT_CANCEL","REVISION_CONFLICT","BOOKING_NOT_FOUND"].includes(code))
  return messages[locale].bookingChanged;
 if(["RESCHEDULE_DEADLINE_PASSED","CANCELLATION_DEADLINE_PASSED"].includes(code))
  return messages[locale].deadline;
 if(code==="SERVICE_PUBLICATION_CHANGED")return messages[locale].publicationChanged;
 if(code==="PATIENT_WEB_REQUIRED")return messages[locale].missingWeb;
 if(code==="MFA_WEB_REQUIRED")return messages[locale].mfaWeb;
 if(code==="LOCAL_SIGN_OUT_ONLY")return messages[locale].localSignOut;
 if(error.status===400||error.status===422)return messages[locale].invalid;
 return messages[locale].generic;
}
export function isSlotConflict(error:unknown):boolean{
 return error instanceof ApiError&&error.status===409&&
  ["BOOKING_SLOT_CONFLICT","BOOKING_SLOT_UNAVAILABLE","APPOINTMENT_SLOT_UNAVAILABLE"].includes(error.code);
}
