
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    // Require an authenticated ClanHub user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          connected: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    // Keep the bot token on the server only.
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          connected: false,
          message: "Discord bot token is not configured.",
        },
        { status: 500 }
      );
    }

    // Ask Discord to identify the bot.
    const response = await fetch(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          message: "Discord rejected the bot token.",
        },
        { status: 502 }
      );
    }

    const bot = await response.json();

    return NextResponse.json({
      connected: true,
      message: "ClanHub bot connected successfully!",
      bot: {
        id: bot.id,
        username: bot.username,
      },
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        message: "Unable to connect to Discord.",
      },
      { status: 500 }
    );
  }
}
