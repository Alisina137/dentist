import React from "react";

/** Small, coherent stroke-based icon set shared by portal navigation and patient care pages. */
export type CareIconName =
  | "home" | "search" | "about" | "account" | "clinic" | "shield"
  | "menu" | "close" | "overview" | "profile" | "family" | "settings"
  | "privacy" | "security" | "logout" | "arrow" | "check" | "calendar"
  | "clock" | "edit" | "download" | "plus" | "mail" | "bell"
  | "file" | "heart" | "chevron" | "sparkle" | "users";

type Props={name:CareIconName;size?:number;className?:string};
export function CareIcon({name,size=20,className}:Props){
 const elements:Record<CareIconName,React.ReactNode>={
  home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
  search:<><circle cx="11" cy="11" r="7.5"/><path d="m16.5 16.5 5 5"/></>,
  about:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/></>,
  account:<><circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.3 3-6.5 7.5-6.5s7.5 2.2 7.5 6.5"/></>,
  clinic:<><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M9 21v-6h6v6M12 3v7M8.5 6.5h7"/></>,
  shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close:<><path d="M5 5 19 19M19 5 5 19"/></>,
  overview:<><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>,
  profile:<><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1M7 2.5 4 5.5M17 2.5 20 5.5"/></>,
  family:<><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20v-2a5.5 5.5 0 0 1 11 0v2M15 15a4.5 4.5 0 0 1 6 4v1"/></>,
  settings:<><path d="M9.5 3h5l.65 2.1 1.85 1.05 2.15-.6 2.4 4.3-1.5 1.6v2.1l1.5 1.6-2.4 4.3-2.15-.6-1.85 1.05L14.5 22h-5l-.65-2.1L7 18.85l-2.15.6-2.4-4.3 1.5-1.6v-2.1l-1.5-1.6 2.4-4.3 2.15.6 1.85-1.05Z"/><circle cx="12" cy="12.5" r="3"/></>,
  privacy:<><path d="M5 5.5h14v15H5zM8 3h8M8 9h8M8 13h8M8 17h5"/><path d="M17 17.5h2"/></>,
  security:<><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1"/></>,
  logout:<><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10"/></>,
  arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
  check:<><path d="m4.5 12.5 5 5 10-11"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  edit:<><path d="m4 17-.5 3.5L7 20l12.5-12.5-3.5-3.5L4 17Z"/><path d="m14.8 5.2 3.5 3.5"/></>,
  download:<><path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/></>,
  plus:<><path d="M12 5v14M5 12h14"/></>,
  mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 21h4"/></>,
  file:<><path d="M5 3h9l5 5v13H5V3ZM14 3v5h5M8 12h8M8 16h8"/></>,
  heart:<><path d="M20.4 9.2c0 4.2-8.4 10-8.4 10S3.6 13.4 3.6 9.2a4.6 4.6 0 0 1 8.4-2.5 4.6 4.6 0 0 1 8.4 2.5Z"/></>,
  chevron:<><path d="m9 5 7 7-7 7"/></>,
  sparkle:<><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/><path d="M20 2v4M18 4h4"/></>,
  users:<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0M17 5.5a3.5 3.5 0 0 1 0 7M18 16a5.5 5.5 0 0 1 3.5 5"/></>
 };
 return <svg aria-hidden="true" focusable="false" className={className} width={size} height={size}
  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
  strokeLinecap="round" strokeLinejoin="round">{elements[name]}</svg>;
}
