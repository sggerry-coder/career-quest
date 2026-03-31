import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Node.js runtime for PDF generation later
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement report generation with Claude API (Phase 4)
  return NextResponse.json({ message: "Report endpoint ready" });
}
