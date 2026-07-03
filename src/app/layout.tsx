import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "PIXL Internet Service",
    template: "%s | PIXL Internet Service",
  },
  description:
    "Fiber internet client portal — plans, billing, and payments for PIXL Internet Service.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col circuit-bg">
        <DemoModeBanner />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
