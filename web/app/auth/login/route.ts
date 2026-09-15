import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectPath = (formData.get("redirect") as string) ?? "/dashboard";

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "E-mail ou senha inválidos.");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Redireciona para página logada
  return NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
}