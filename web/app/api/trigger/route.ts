import { NextResponse } from "next/server";

// Rota desativada — todas as operações de trigger agora passam pela
// Server Action triggerRoutine() em actions.ts, que valida auth + admin.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use Server Actions instead." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is deprecated." },
    { status: 410 }
  );
}
