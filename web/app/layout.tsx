import type { Metadata } from "next";
import { Fraunces, Gabarito } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let themeClass = ""; // defaults to system (handled by tailwind or just light)
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("theme_preference").eq("id", user.id).single();
    if (profile?.theme_preference === "dark") themeClass = "dark";
    if (profile?.theme_preference === "light") themeClass = "light";
  }

  return (
    <html lang="pt-BR" className={`${gabarito.variable} ${fraunces.variable} ${themeClass}`}>
      <body className="font-sans bg-warm-50 text-stone-800 antialiased selection:bg-brand-200 dark:bg-stone-950 dark:text-stone-100">
        {children}
      </body>
    </html>
  );
}