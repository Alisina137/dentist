import { InvitationAccept } from "@dandanlink/ui/phase03";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Clinic staff invitation · DandanLink",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};
export default function Page(){return <InvitationAccept/>;}
