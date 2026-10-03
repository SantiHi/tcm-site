import type { Metadata, Viewport } from "next";
import { Inter, Jost, Montserrat } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";
import { authMode } from "@/lib/env";
import { isSignedIn } from "@/lib/auth/session";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DemoBanner } from "@/components/DemoBanner";
import { AuthProvider } from "@/components/AuthProvider";

const jost = Jost({ subsets: ["latin"], weight: ["700"], variable: "--font-jost", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600"], variable: "--font-montserrat", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name} Members`, template: `%s | ${site.name}` },
  description: `Alumni member portal for ${site.name}.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = authMode();
  const signedIn = await isSignedIn();

  return (
    <html lang="en" className={`${jost.variable} ${montserrat.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white">
        <AuthProvider mode={mode}>
          {mode === "demo" && <DemoBanner />}
          <Nav mode={mode} signedIn={signedIn} />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
