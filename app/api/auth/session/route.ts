import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ user: null });
    const username = String(data.user.user_metadata?.username || "");
    if (!username) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { username } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
