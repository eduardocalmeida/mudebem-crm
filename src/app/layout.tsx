import type { Metadata } from "next";
import { Roboto_Serif } from "next/font/google";
import "./globals.css";

const texto = Roboto_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
  variable: "--font-texto",
  fallback: ["Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Mude Bem CRM", template: "%s · Mude Bem" },
  description: "CRM comercial e operacional da Mude Bem Mudanças e Logística.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/logo-mudebem.png", apple: "/brand/logo-mudebem.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={texto.variable}>{children}</body>
    </html>
  );
}
