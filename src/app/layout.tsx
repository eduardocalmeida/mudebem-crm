import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mude Bem CRM", template: "%s · Mude Bem" },
  description: "CRM comercial e operacional da Mude Bem Mudanças e Logística.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/logo-mudebem.png", apple: "/brand/logo-mudebem.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${outfit.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
