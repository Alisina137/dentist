import type { Metadata } from "next";
import { PreferencesProvider, SiteLayout } from "@dandanlink/ui";
import "@dandanlink/ui/styles.css";
import "@dandanlink/ui/polish.css";

export const metadata: Metadata = {
  title: "DandanLink Administration",
  description: "DandanLink dental services foundation"
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="fa-AF" dir="rtl"><body><PreferencesProvider>
    <SiteLayout audience="admin">{children}</SiteLayout>
  </PreferencesProvider></body></html>;
}
