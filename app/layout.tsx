import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav, TabBar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CommandPalette } from "@/components/palette";
import { AuthSheet, CompareTray, Providers, Toaster } from "@/components/overlays";
import { PublicOnly } from "@/components/chrome";
import { Announcement } from "@/components/announcement";
import { Maintenance } from "@/components/maintenance";

export const metadata: Metadata = {
  title: { default: "Naija Auto Market — Everything cars, in Nigeria", template: "%s · Naija Auto Market" },
  description:
    "Buy and sell verified cars, order genuine spare parts, hire vetted mechanics, rent, finance and insure — Nigeria's premium auto marketplace.",
};

export const viewport: Viewport = {
  themeColor: "#fbfbfd",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className="min-h-dvh">
        <Providers>
          <PublicOnly>
            <Nav />
            <Announcement />
          </PublicOnly>
          <main className="min-h-[70vh]">{children}</main>
          <PublicOnly>
            <Footer />
            <TabBar />
            <CompareTray />
            <CommandPalette />
            <AuthSheet />
            <Maintenance />
          </PublicOnly>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
