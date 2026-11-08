
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const SESSION_COOKIE = "clanhub_discord_session";

type DiscordGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
};

export async function GET(request: NextRequest) {
  try {
    // 1. Verify the logged-in ClanHub user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to continue." },
        { status: 401 }
      );
    }

    // 2. Read the temporary Discord session cookie.
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "No Discord connection session found. Please connect Discord again.",
        },
        { status: 401 }
      );
    }

    // 3. Retrieve the session using the server-only admin client.
    const admin = createAdminClient();

    const { data: session, error: sessionError } = await admin
      .from("discord_connection_sessions")
      .select("auth_user_id, guilds, expires_at, used_at")
      .eq("id", sessionId)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        {
          error:
            "Discord session not found. Please connect Discord again.",
        },
        { status: 404 }
      );
    }

    // 4. Reject expired sessions.
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error:
            "Your Discord session has expired. Please connect again.",
        },
        { status: 410 }
      );
    }

    // 5. Reject sessions that have already been used.
    if (session.used_at) {
      return NextResponse.json(
        {
          error:
            "This Discord session has already been used.",
        },
        { status: 409 }
      );
    }

    // 6. Validate the saved Discord server list.
    if (!Array.isArray(session.guilds)) {
      return NextResponse.json(
        { error: "The Discord server list is invalid." },
        { status: 500 }
      );
    }

    const guilds = session.guilds as DiscordGuild[];

    // Keep every server with a valid ID and name.
    // Owner and permissions are optional display information.
    const validGuilds = guilds
      .filter(
        (guild) =>
          guild &&
          typeof guild.id === "string" &&
          typeof guild.name === "string"
      )
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ?? null,
        owner: guild.owner === true,
        permissions:
          typeof guild.permissions === "string"
            ? guild.permissions
            : "0",
      }));

    // 7. Return all valid Discord servers to the frontend.
    return NextResponse.json({
      success: true,
      guilds: validGuilds,
    });
  } catch (error) {
    console.error("Discord servers API error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve your Discord servers." },
      { status: 500 }
    );
  }
}
