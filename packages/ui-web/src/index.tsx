"use client";
import React, { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "react-qr-code";
import { CareIcon } from "./care-icons";
import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { type Calendar, type Locale, type MessageKey, isCalendar, isLocale, languages, translate } from "@dandanlink/locales";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const authClient = createAuthClient({
  baseURL: api,
  fetchOptions: { credentials: "include" },
  plugins: [twoFactorClient()]
});
type Me = {
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
  locale: Locale;
  calendar: Calendar;
  isPlatformAdmin: boolean;
  adminMfaVerified: boolean;
};
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(api + path, { credentials: "include", cache: "no-store", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { code?: string };
    throw Object.assign(new Error("Request failed"), { code: body.code || "UNAVAILABLE", status: response.status });
  }
  return response.json() as Promise<T>;
}
type Prefs = {
  locale: Locale; calendar: Calendar; setLocale: (value: Locale) => void;
  setCalendar: (value: Calendar) => void; t: (key: MessageKey) => string;
};
const PreferencesContext = createContext<Prefs | null>(null);
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("Wrap your app in PreferencesProvider");
  return context;
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fa-AF");
  const [calendar, setCalendarState] = useState<Calendar>("solar_hijri");
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const storedLocale = localStorage.getItem("dandan.locale");
    const storedCalendar = localStorage.getItem("dandan.calendar");
    if (isLocale(storedLocale)) setLocaleState(storedLocale);
    if (isCalendar(storedCalendar)) setCalendarState(storedCalendar);
    request<Me>("/v1/me").then(me => {
      setAuthenticated(true);
      // User settings are authoritative once signed in.
      if (isLocale(me.locale)) setLocaleState(me.locale);
      if (isCalendar(me.calendar)) setCalendarState(me.calendar);
    }).catch(() => { /* Guests retain safe local preferences. */ });
  }, []);
  useEffect(() => {
    const language = languages.find(item => item.id === locale)!;
    document.documentElement.dir = language.dir;
    document.documentElement.lang = locale;
    localStorage.setItem("dandan.locale", locale);
  }, [locale]);
  useEffect(() => { localStorage.setItem("dandan.calendar", calendar); }, [calendar]);
  const persist = useCallback((nextLocale: Locale, nextCalendar: Calendar) => {
    if (!authenticated) return;
    request("/v1/me/preferences", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale, calendar: nextCalendar })
    }).catch(() => { /* Local selection remains; server failure can be retried next time. */ });
  }, [authenticated]);
  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value); persist(value, calendar);
  }, [calendar, persist]);
  const setCalendar = useCallback((value: Calendar) => {
    setCalendarState(value); persist(locale, value);
  }, [locale, persist]);
  const t = useCallback((key: MessageKey) => translate(locale, key), [locale]);
  return <PreferencesContext.Provider value={{ locale, calendar, setLocale, setCalendar, t }}>{children}</PreferencesContext.Provider>;
}
export function LocaleControls() {
  const { locale, calendar, setLocale, setCalendar, t } = usePreferences();
  return <div className="preferences">
    <label className="select-group">
      <span>{t("language")}</span>
      <select aria-label={t("language")} value={locale} onChange={event => setLocale(event.target.value as Locale)}>
        {languages.map(language => <option key={language.id} value={language.id}>{language.name}</option>)}
      </select>
    </label>
    <label className="select-group">
      <span>{t("calendar")}</span>
      <select aria-label={t("calendar")} value={calendar} onChange={event => setCalendar(event.target.value as Calendar)}>
        <option value="solar_hijri">{t("solar")}</option>
        <option value="gregorian">{t("gregorian")}</option>
      </select>
    </label>
  </div>;
}
export function TodayLabel() {
  const { locale, calendar } = usePreferences();
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kabul", calendar: calendar === "solar_hijri" ? "persian" : "gregory",
    year: "numeric", month: "long", day: "numeric", weekday: "long"
  }).format(new Date());
  return <span>{formatted}</span>;
}
function PatientAccountNavLink({active=false,closeMenu}:{active?:boolean;closeMenu?:()=>void}){
 const {t}=usePreferences();
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 useEffect(()=>{let active=true;request<Me>("/v1/me").then(()=>{
  if(active)setAuthenticated(true)}).catch(()=>{if(active)setAuthenticated(false)});
  return ()=>{active=false};
 },[]);
 const label=authenticated?t("patientAccountLink"):t("patientSignInLink");
 return <a className="header-account-link" href={authenticated?"/account":"/login"}
  onClick={closeMenu} aria-current={active?"page":undefined}>
  <CareIcon name="account" size={18}/><span>{label}</span>
 </a>;
}
export function SiteLayout({ children, audience }: { children: ReactNode; audience: "clinic" | "admin" | "patient" }) {
 const {t}=usePreferences();
 const [open,setOpen]=useState(false);
 const [path,setPath]=useState("");
 const home=audience==="clinic"?"/clinic":audience==="admin"?"/admin":"/";
 useEffect(()=>setPath(window.location.pathname),[]);
 const active=(href:string)=>href===home
  ? path===home || (home!=="/" && path===home+"/")
  :path===href||(href!=="/"&&path.startsWith(href+"/"));
 const closeMenu=()=>setOpen(false);
 return <div className={"shell shell-"+audience}>
  <a className="skip-link" href="#main">{t("skipToContent")}</a>
  {/* Global header intentionally contains navigation only. Locale/calendar controls belong in workspace/account settings. */}
  <header className={"site-header"+(audience==="patient"?" p13-site-header":"")}>
   <div className="site-header-inner">
    <a href={home} onClick={closeMenu} className="brand" aria-label={t("brand")+" — "+t("home")}>
     <span aria-hidden="true" className="brand-symbol"><CareIcon name="sparkle" size={24}/></span>
     <span className="brand-name">Dandan<span>Link</span></span>
     <span className="brand-portal">{audience==="patient"?t("patientPortal"):
       audience==="clinic"?t("clinicPortal"):t("adminPortal")}</span>
    </a>
    <button className="header-menu-toggle" type="button" aria-expanded={open}
     aria-controls="primary-header-nav" aria-label={open?t("closeMenu"):t("openMenu")}
     onClick={()=>setOpen(value=>!value)}>
     <CareIcon name={open?"close":"menu"} size={23}/>
    </button>
    <div id="primary-header-nav" className={"header-nav"+(open?" header-nav-open":"")}>
     <nav aria-label={t("home")}>
      <a className="nav-link" href={home} aria-current={active(home)?"page":undefined}
       onClick={closeMenu}><CareIcon name="home" size={17}/>
       <span>{audience==="clinic"?t("clinicPortal"):audience==="admin"?t("adminPortal"):t("home")}</span></a>
      {audience==="patient"&&<>
       <a className="nav-link" href="/search" aria-current={active("/search")?"page":undefined}
        onClick={closeMenu}><CareIcon name="search" size={17}/><span>{t("findCare")}</span></a>
       <a className="nav-link" href="/about" aria-current={active("/about")?"page":undefined}
        onClick={closeMenu}><CareIcon name="about" size={17}/><span>{t("aboutDandanLink")}</span></a>
       <PatientAccountNavLink active={active("/account")} closeMenu={closeMenu}/>
      </>}
      {audience==="clinic"&&<a className="nav-link" href="/pricing"
       aria-current={active("/pricing")?"page":undefined} onClick={closeMenu}>
       <CareIcon name="file" size={17}/><span>{t("pricing")}</span></a>}
      {audience!=="patient"&&<a className="nav-link" href="/privacy"
       aria-current={active("/privacy")?"page":undefined} onClick={closeMenu}>
       <CareIcon name="shield" size={17}/><span>{t("privacy")}</span></a>}
     </nav>
    </div>
   </div>
  </header>
  <main id="main" className="site-main">{children}</main>
  <footer className="footer"><span>{t("brand")} · <TodayLabel /></span><div className="footer-links">
    <a href="/privacy" className="text-link">{t("privacy")}</a>
    <a href="/terms" className="text-link">{t("terms")}</a>
  </div></footer>
 </div>;
}
export function InlineAlert({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "error" | "success" | "warning" }) {
  return <div role={kind === "error" ? "alert" : "status"} className={"notice" + (kind === "info" ? "" : " notice-" + kind)}>{children}</div>;
}
function Field({ title, type = "text", value, onChange, autoComplete, hint }: {
  title: string; type?: string; value: string; onChange: (value: string) => void; autoComplete?: string; hint?: string;
}) {
  return <label className="field"><span>{title}</span>
    <input value={value} onChange={event => onChange(event.target.value)} type={type}
      required autoComplete={autoComplete} minLength={type === "password" ? 10 : undefined}
      dir={type === "email" ? "ltr" : undefined} />
    {hint && <small>{hint}</small>}
  </label>;
}
export function AuthPanel({ mode, audience }: { mode: "login" | "signup" | "forgot" | "reset" | "verify"; audience: "clinic" | "admin" }) {
  const { t } = usePreferences();
  const base = audience === "clinic" ? "/clinic" : "/admin";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devNoEmail, setDevNoEmail] = useState(false);
  useEffect(() => {
    request<{ emailVerificationRequired?: boolean }>("/v1/public/status")
      .then(data => setDevNoEmail(data.emailVerificationRequired === false))
      .catch(() => { /* Network failures retain verification-required messaging. */ });
  }, []);
  const title = mode === "login" ? t("login") : mode === "signup" ? t("signup") :
    mode === "forgot" ? t("resetRequest") : mode === "reset" ? t("resetPassword") : t("verifyTitle");
  const isVerificationError = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("error");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim(), email: email.trim().toLowerCase(), password,
          callbackURL: window.location.origin + base + "/verify" +
            (new URLSearchParams(window.location.search).has("next")
              ? "?next=" + encodeURIComponent(new URLSearchParams(window.location.search).get("next") || "") : "")
        });
        if (result.error) throw result.error;
        const policy = await request<{ emailVerificationRequired?: boolean }>("/v1/public/status").catch(() => null);
        setMessage(policy?.emailVerificationRequired === false ? t("devEmailSignupReady") : t("duplicateSafe"));
      } else if (mode === "login") {
        const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
        if (result.error) throw result.error;
        const data = result.data as { twoFactorRedirect?: boolean } | null;
        const nextValue = new URLSearchParams(window.location.search).get("next");
        const next = nextValue && nextValue.startsWith("/clinic/") && !nextValue.startsWith("//")
          ? nextValue : base;
        window.location.assign(data?.twoFactorRedirect
          ? (audience === "admin" ? "/admin/2fa" : "/clinic/2fa") + "?next=" + encodeURIComponent(next)
          : audience === "admin" ? base : next);
      } else if (mode === "forgot") {
        await authClient.requestPasswordReset({
          email: email.trim().toLowerCase(), redirectTo: window.location.origin + base + "/reset-password"
        });
        setMessage(t("passwordResetEmail"));
      } else if (mode === "reset") {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) throw new Error("INVALID_TOKEN");
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error) throw result.error;
        setMessage(t("saved"));
      }
    } catch {
      setError(mode === "login" ? t("wrongPassword") : mode === "reset" ? t("invalidToken") : t("generalError"));
    } finally { setBusy(false); }
  }
  return <section className="auth-wrap" aria-labelledby="auth-title">
    <div className="card auth-card">
      <div className="pill">{audience === "admin" ? t("adminPortal") : t("clinicPortal")}</div>
      <h1 id="auth-title" style={{ fontSize: 29, marginBlock: "20px 10px" }}>{title}</h1>
      {mode === "verify" ? <>
        <p className="lead" style={{ fontSize: 16 }}>{t("verifyMessage")}</p>
        <InlineAlert kind={isVerificationError ? "error" : "info"}>{isVerificationError ? t("invalidToken") : t("verifyDone")}</InlineAlert>
        <p style={{ marginBlockStart: 20 }}><a className="btn btn-primary" href={base + "/login" +
          (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("next")
            ? "?next=" + encodeURIComponent(new URLSearchParams(window.location.search).get("next") || "") : "")}>{t("login")}</a></p>
      </> : <>
        <p className="muted">{audience === "admin" ? t("adminSummary") : t("clinicSummary")}</p>
        <form className="form-stack" onSubmit={submit}>
          {mode === "signup" && <Field title={t("name")} value={name} onChange={setName} autoComplete="name" />}
          {mode !== "reset" && <Field title={t("email")} type="email" value={email} onChange={setEmail} autoComplete="email" hint={devNoEmail ? t("devEmailHelp") : t("emailHelp")} />}
          {(mode === "login" || mode === "signup" || mode === "reset") &&
            <Field title={t("password")} type="password" value={password} onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"} hint={t("passwordHint")} />}
          <button disabled={busy} className="btn btn-primary btn-wide" type="submit">
            {busy ? t("loading") : title}
          </button>
        </form>
        {message && <div style={{ marginBlockStart: 18 }}><InlineAlert kind="success">{message}</InlineAlert></div>}
        {error && <div style={{ marginBlockStart: 18 }}><InlineAlert kind="error">{error}</InlineAlert></div>}
        <div className="inline-links">
          {mode !== "login" && <a href={base + "/login"} className="text-link">{t("login")}</a>}
          {mode === "login" && <a href={base + "/reset-password"} className="text-link">{t("forgot")}</a>}
          {mode === "login" && audience === "clinic" && <a href={base + "/signup"} className="text-link">{t("signup")}</a>}
        </div>
      </>}
    </div>
  </section>;
}

export function PublicHome() {
  const { t } = usePreferences();
  return <div className="layout-two">
    <div className="hero-copy">
      <div className="pill">{t("phaseBadge")}</div>
      <h1 style={{ marginBlockStart: 22 }}>{t("patientTitle")}</h1>
      <p className="lead">{t("patientSummary")}</p>
      <p><InlineAlert kind="info">{t("noListings")}</InlineAlert></p>
      <a href="/privacy" className="btn btn-primary">{t("privacy")}</a>
    </div>
    <div className="card panel">
      <h2>{t("tagline")}</h2>
      <div className="feature-stack">
        <Feature icon="✓" title={t("futureBadge")} body={t("noListings")} />
        <Feature icon="✧" title={t("legal")} body={t("privacyIntro")} />
      </div>
    </div>
  </div>;
}
function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <div className="feature-row">
    <span className="feature-icon" aria-hidden="true">{icon}</span>
    <div><strong>{title}</strong><p>{body}</p></div>
  </div>;
}
export function ClinicEntry() {
  const { t } = usePreferences();
  return <div className="layout-two">
    <div className="hero-copy">
      <span className="pill">{t("phaseBadge")}</span>
      <h1 style={{ marginBlockStart: 22 }}>{t("clinicTitle")}</h1>
      <p className="lead">{t("clinicSummary")}</p>
      <p className="muted">{t("setupSubtitle")}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/clinic/signup" className="btn btn-primary">{t("signup")}</a>
        <a href="/clinic/login" className="btn btn-secondary">{t("login")}</a>
      </div>
    </div>
    <div className="card panel">
      <h2>{t("tagline")}</h2>
      <div className="feature-stack">
        <Feature icon="✓" title={t("accessState")} body={t("safeNext")} />
        <Feature icon="○" title={t("notLaunched")} body={t("noBilling")} />
      </div>
    </div>
  </div>;
}
export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const { t } = usePreferences();
  const keys: MessageKey[] = type === "privacy" ?
    ["privacyOne", "privacyTwo", "privacyThree", "privacyFour"] :
    ["termsOne", "termsTwo", "termsThree"];
  return <div className="page-narrow"><article className="card">
    <span className="pill">{t("phaseBadge")}</span>
    <h1 style={{ fontSize: 34, marginBlockStart: 16 }}>{t(type)}</h1>
    <p className="lead" style={{ fontSize: 16 }}>{t(type === "privacy" ? "privacyIntro" : "termsIntro")}</p>
    {keys.map(key => <p key={key}>{t(key)}</p>)}
    <InlineAlert kind="warning">{t("clearStatus")}</InlineAlert>
  </article></div>;
}
export function ErrorState({ type, home }: { type: "403" | "404" | "offline"; home: string }) {
  const { t } = usePreferences();
  const title = type === "403" ? "denied" : type === "404" ? "notFound" : "offline";
  const detail = type === "403" ? "deniedText" : type === "404" ? "notFoundText" : "offlineText";
  return <div className="page-narrow"><div className="card panel">
    <h1>{t(title)}</h1><p className="lead">{t(detail)}</p>
    <a href={home} className="btn btn-primary">{t("returnHome")}</a>
  </div></div>;
}
export function AccountStatus({ audience }: { audience: "clinic" | "admin" }) {
  const { t } = usePreferences();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    request<Me>("/v1/me").then(data => {
      setMe(data);
      if (audience === "clinic" && data.isPlatformAdmin) setError("FORBIDDEN");
      if (audience === "admin" && !data.isPlatformAdmin) setError("FORBIDDEN");
    }).catch(err => setError(err.status === 401 ? "LOGIN" : "NETWORK")).finally(() => setLoading(false));
  }, [audience]);
  const signin = audience === "clinic" ? "/clinic/login" : "/admin/login";
  const home = audience === "clinic" ? "/clinic" : "/admin";
  if (loading) return <div className="page-narrow"><InlineAlert>{t("loading")}</InlineAlert></div>;
  if (error === "LOGIN") return <div className="page-narrow"><InlineAlert kind="warning">{t("errorLoginRequired")}</InlineAlert><p><a className="btn btn-primary" href={signin}>{t("login")}</a></p></div>;
  if (error === "FORBIDDEN") return <ErrorState type="403" home={home} />;
  if (error || !me) return <div className="page-narrow"><InlineAlert kind="error">{t("offlineText")}</InlineAlert><p><button className="btn btn-secondary" onClick={() => location.reload()}>{t("retry")}</button></p></div>;
  if (audience === "admin" && !me.adminMfaVerified) return <AdminMfaSetup />;
  return <div className="work-layout">
    <aside className="card side-panel">
      <div className="pill">{audience === "clinic" ? t("clinicPortal") : t("adminPortal")}</div>
      <nav aria-label={t("pageTitle")} className="side-nav" style={{ marginBlockStart: 17 }}>
        <a href={home} aria-current="page">⌂ {t("home")}</a>
        <a href="#preferences">⚙ {t("preferences")}</a>
      </nav>
    </aside>
    <div className="work-content">
      <div className="work-heading">
        <div><span className="pill">{t("phaseBadge")}</span>
          <h1>{audience === "clinic" ? t("clinicReady") : t("adminReady")}</h1>
          <span className="muted">{me.user.name} · <bdi dir="ltr">{me.user.email}</bdi></span>
        </div>
        <button className="btn btn-secondary" onClick={async () => {
          await authClient.signOut(); window.location.assign(signin);
        }}>{t("signout")}</button>
      </div>
      <section className="card panel">
        <h2>{t("pageTitle")}</h2>
        <p className="lead" style={{ fontSize: 16 }}>{t("setupSubtitle")}</p>
        <div className="data-grid">
          <div className="value-box"><strong><span className="status-dot" />{t("accessState")}</strong><p>{t("active")}</p></div>
          <div className="value-box"><strong>{t("notLaunched")}</strong><p>{audience === "clinic" ? t("noBilling") : t("clearStatus")}</p></div>
        </div>
      </section>
      <section id="preferences" className="card panel" aria-labelledby="pref-title">
        <h2 id="pref-title">{t("preferences")}</h2>
        <p className="muted">{t("settingsHint")}</p>
        <LocaleControls />
      </section>
    </div>
  </div>;
}
export function AdminMfaSetup({ home = "/admin" }: { home?: string } = {}) {
  const { t } = usePreferences();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [uri, setUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function begin(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await authClient.twoFactor.enable({ password, method: "totp" });
      if (response.error || !response.data) throw new Error("enable");
      const data = response.data as { totpURI?: string; backupCodes?: string[] };
      if (!data.totpURI) throw new Error("Missing authenticator URI");
      setUri(data.totpURI);
      setBackupCodes(data.backupCodes || []);
      setPassword("");
    } catch { setError(t("generalError")); } finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await authClient.twoFactor.verifyTotp({ code });
      if (response.error) throw response.error;
      window.location.assign(home);
    } catch { setError(t("generalError")); } finally { setBusy(false); }
  }
  return <section className="auth-wrap"><div className="card auth-card">
    <span className="pill">{t("security")}</span><h1 style={{ fontSize: 29, marginBlockStart: 18 }}>{t("secureTitle")}</h1>
    <p className="muted">{t("secureSummary")}</p>
    {!uri ? <form className="form-stack" onSubmit={begin}>
      <Field title={t("mfaPassword")} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      <button className="btn btn-primary" disabled={busy}>{t("setupMfa")}</button>
    </form> : <>
      <p>{t("totpHint")}</p>
      <div className="qr-card"><QRCode value={uri} size={156} /></div>
      <details><summary>{t("totpSecret")}</summary><pre className="pre-wrap">{uri}</pre></details>
      {backupCodes.length > 0 && <details><summary>{t("security")} — backup codes</summary>
        <pre className="pre-wrap">{backupCodes.join("\n")}</pre></details>}
      <form className="form-stack" style={{ marginBlockStart: 18 }} onSubmit={verify}>
        <Field title={t("mfaCode")} value={code} onChange={setCode} autoComplete="one-time-code" />
        <button disabled={busy || code.trim().length !== 6} className="btn btn-primary">{t("verifyMfa")}</button>
      </form>
    </>}
    {error && <div style={{ marginBlockStart: 18 }}><InlineAlert kind="error">{error}</InlineAlert></div>}
  </div></section>;
}
export function MfaChallenge({ home = "/admin" }: { home?: string } = {}) {
  const { t } = usePreferences();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await authClient.twoFactor.verifyTotp({ code });
      if (response.error) throw response.error;
      const nextValue = new URLSearchParams(window.location.search).get("next");
      const next = nextValue && nextValue.startsWith("/clinic/") && !nextValue.startsWith("//")
        ? nextValue : home;
      window.location.assign(home === "/admin" ? "/admin" : next);
    } catch { setError(t("generalError")); setBusy(false); }
  }
  return <div className="auth-wrap"><div className="card auth-card">
    <span className="pill">{t("security")}</span>
    <h1 style={{ fontSize: 29, marginBlockStart: 18 }}>{t("mfaChallenge")}</h1>
    <form className="form-stack" onSubmit={submit}>
      <Field title={t("mfaCode")} value={code} onChange={setCode} autoComplete="one-time-code" />
      <button disabled={busy || code.trim().length !== 6} className="btn btn-primary">{busy ? t("loading") : t("verifyMfa")}</button>
    </form>
    {error && <InlineAlert kind="error">{error}</InlineAlert>}
    <div className="inline-links"><a className="text-link" href="/admin/login">{t("back")}</a></div>
  </div></div>;
}

/** Route-level selection keeps password-reset tokens out of public page props. */
export function PasswordResetRoute({ audience }: { audience: "clinic" | "admin" }) {
  const [mode, setMode] = useState<"forgot" | "reset">("forgot");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("token") || params.has("error")) setMode("reset");
  }, []);
  return <AuthPanel mode={mode} audience={audience} />;
}
