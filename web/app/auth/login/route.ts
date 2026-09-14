import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const redirectPath = (formData.get("redirect") as string) ?? "/dashboard";

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect=${redirectPath}`,
    },
  });

  if (error) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "Falha ao enviar o link. Verifique o e-mail e tente novamente.");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Redireciona para página de confirmação
  return NextResponse.redirect(new URL("/login?sent=true", request.url), { status: 303 });
}
