/// <reference path="../types/next-font-google.d.ts" />
/// <reference path="../types/css.d.ts" />
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "editD · LCS.Dominican",
  description: "Plataforma de creación audiovisual con IA. En colaboración con Logic Code Spot.",
  icons: {
    icon: "/brand/logo-d.png",
    apple: "/brand/logo-d.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C1712",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
