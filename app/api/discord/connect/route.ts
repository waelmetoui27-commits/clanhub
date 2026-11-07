
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const DISCORD_REDIRECT_URI =
  "https://theclanhub.vercel.app/api/discord/callback";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(
        "https://theclanhub.vercel.app/?error=authentication-required"
      );
    }

    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "Discord OAuth is not configured." },
        { status: 500 }
      );
    }

    const state = randomBytes(32).toString("hex");

    const discordUrl = new URL(
      "https://discord.com/oauth2/authorize"
    );

    discordUrl.searchParams.set("client_id", clientId);
    discordUrl.searchParams.set("redirect_uri", DISCORD_REDIRECT_URI);
    discordUrl.searchParams.set("response_type", "code");
    discordUrl.searchParams.set("scope", "identify guilds");
    discordUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(discordUrl);

    response.cookies.set("clanhub_discord_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/discord",
      maxAge: 600,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to start Discord authorization." },
      { status: 500 }
    );
  }
}
