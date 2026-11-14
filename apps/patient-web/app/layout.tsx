import type { Metadata } from "next";
import { PreferencesProvider, SiteLayout } from "@dandanlink/ui";
import "@dandanlink/ui/styles.css";
import "@dandanlink/ui/polish.css";

export const metadata: Metadata = {
  title: "DandanLink",
  description: "Find independently reviewed dental clinics in Afghanistan, compare real services and view live schedule availability.",
  robots: {index:true,follow:true}
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="fa-AF" dir="rtl"><body><PreferencesProvider>
    <SiteLayout audience="patient">{children}</SiteLayout>
  </PreferencesProvider></body></html>;
}
