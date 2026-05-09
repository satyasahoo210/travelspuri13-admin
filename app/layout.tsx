import { Providers } from "@/app/providers";
import { BottomNav, Sidebar } from "@/components/layout/navigation";
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
            <PropertyProvider>
              <SyncProvider>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 pb-20 md:pb-0">
                    <SyncIndicator />
                    {children}
                  </main>
                  <BottomNav />
                </div>
              </SyncProvider>
            </PropertyProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
