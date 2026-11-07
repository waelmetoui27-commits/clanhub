
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the logged-in ClanHub user.
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "You must be logged in to connect a community." },
        { status: 401 }
      );
    }

    // 2. Read and validate the selected Discord server ID.
    const body = await request.json().catch(() => null);
    const guildId = body?.guildId;

    if (
      typeof guildId !== "string" ||
      !/^\d{17,20}$/.test(guildId)
    ) {
      return NextResponse.json(
        { error: "Invalid Discord server ID." },
        { status: 400 }
      );
    }

    // 3. Read the temporary Discord connection session.
    const sessionId = request.cookies.get(
      "clanhub_discord_session"
    )?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "Your Discord connection session is missing. Please connect your Discord account again.",
        },
        { status: 401 }
      );
    }

    // 4. Create the server-side admin client.
    const admin = createAdminClient();

    // 5. Verify that ClanHub's bot can access the selected server.
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      throw new Error("Discord bot configuration is missing.");
    }

    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    if (discordResponse.status === 403 || discordResponse.status === 404) {
      return NextResponse.json(
        {
          error:
            "ClanHub's Discord bot is not installed in this server or does not have access. Invite the bot and try again.",
        },
        { status: 403 }
      );
    }

    if (!discordResponse.ok) {
      console.error(
        "Discord guild verification failed:",
        discordResponse.status
      );

      return NextResponse.json(
        { error: "Could not verify the Discord server. Please try again." },
        { status: 502 }
      );
    }

    // 6. Create the community and all related records atomically.
    const { data: serverId, error: connectError } = await admin.rpc(
      "connect_discord_server",
      {
        p_session_id: sessionId,
        p_auth_user_id: authUser.id,
        p_guild_id: guildId,
      }
    );

    if (connectError) {
      console.error("Community connection failed:", connectError);

      const message = connectError.message || "";

      if (message.includes("already connected")) {
        return NextResponse.json(
          { error: "This Discord server is already connected to ClanHub." },
          { status: 409 }
        );
      }

      if (
        message.includes("expired") ||
        message.includes("already used") ||
        message.includes("Invalid Discord connection session")
      ) {
        return NextResponse.json(
          {
            error:
              "Your Discord connection session has expired or was already used. Please connect Discord again.",
          },
          { status: 401 }
        );
      }

      if (message.includes("not authorized")) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to connect this Discord server.",
          },
          { status: 403 }
        );
      }

      if (message.includes("user profile not found")) {
        return NextResponse.json(
          {
            error:
              "Your ClanHub profile could not be found. Please sign in again.",
          },
          { status: 404 }
        );
      }

      throw new Error("Could not create the community.");
    }

    // 7. Clear the temporary session cookie after successful creation.
    const response = NextResponse.json(
      {
        success: true,
        message: "Your Discord community has been connected successfully.",
        serverId,
      },
      { status: 201 }
    );

    response.cookies.set("clanhub_discord_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/discord",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Discord server connection error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while connecting the community." },
      { status: 500 }
    );
  }
}
