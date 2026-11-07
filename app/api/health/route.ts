
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          connected: false,
          message: "Supabase responded, but the database query failed.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connected: true,
      message: "ClanHub successfully connected to Supabase!",
      test: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
