import type { Metadata } from "next";
import { Fraunces, Gabarito } from "next/font/google";
import "./globals.css";

const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: { default: "Inara", template: "%s | Inara" },
  description: "Seu ERP doméstico, do jeitinho de casa.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${gabarito.variable} ${fraunces.variable}`}>
      <body className="font-sans bg-warm-50 text-stone-800 antialiased selection:bg-brand-200">
        {children}
      </body>
    </html>
  );
}