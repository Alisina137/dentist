import type { Metadata } from "next";
import { PreferencesProvider, SiteLayout } from "@dandanlink/ui";
import "@dandanlink/ui/styles.css";
import "@dandanlink/ui/polish.css";
import "@dandanlink/ui/clinic-onboarding.css";

export const metadata: Metadata = {
  title: "DandanLink Clinic",
  description: "DandanLink dental services foundation"
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="fa-AF" dir="rtl"><body><PreferencesProvider>
    <SiteLayout audience="clinic">{children}</SiteLayout>
  </PreferencesProvider></body></html>;
}
