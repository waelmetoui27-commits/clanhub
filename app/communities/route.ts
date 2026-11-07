
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("servers")
      .select(
        "id, discord_guild_id, name, icon_hash, description, created_at"
      )
      .eq("visibility", "public")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Public communities query failed:", error);

      return NextResponse.json(
        { error: "Unable to load communities." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { communities: data ?? [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Public communities API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
