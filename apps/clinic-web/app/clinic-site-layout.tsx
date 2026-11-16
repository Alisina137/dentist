"use client";
import type {ReactNode} from "react";
import {usePathname} from "next/navigation";
import {SiteLayout} from "@dandanlink/ui";

// Keep the public site header/footer on sign-in, signup, invitation and
// onboarding pages. The authenticated /clinic workspace has its own
// persistent sidebar/header and should never display a second site header.
const PUBLIC_CLINIC_PATH=/^\/clinic\/(?:login|signup|verify|invite|onboarding|reset-password|2fa)(?:\/|$)/;
export function ClinicSiteLayout({children}:{children:ReactNode}){
 const pathname=usePathname()||"";
 const clinicWorkspace=(pathname==="/clinic"||pathname.startsWith("/clinic/"))&&
  !PUBLIC_CLINIC_PATH.test(pathname);
 return <SiteLayout audience="clinic" clinicWorkspace={clinicWorkspace}>{children}</SiteLayout>;
}
