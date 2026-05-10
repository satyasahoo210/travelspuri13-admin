import { Providers } from "@/app/providers";
import { BottomNav, Sidebar } from "@/components/layout/navigation";
import { NavWrapper } from "@/components/layout/nav-wrapper";
import { PWAProvider } from "@/components/layout/pwa-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PropertyProvider } from "@/components/providers/property-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travels Puri 13 | Modern Hotel Management",
  description: "Best Hotel Aggregator & Travel Guide in Puri",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${sans.variable} ${heading.variable} font-sans antialiased`}>
        <Providers>
          <AuthProvider>
            <PWAProvider>
              <PropertyProvider>
                <SyncProvider>
                  <NavWrapper>
                    <SyncIndicator />
                    {children}
                  </NavWrapper>
                </SyncProvider>
              </PropertyProvider>
            </PWAProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
