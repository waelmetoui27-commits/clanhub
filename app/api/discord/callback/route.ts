
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const DISCORD_REDIRECT_URI =
  "https://theclanhub.vercel.app/api/discord/callback";

const STATE_COOKIE = "clanhub_discord_oauth_state";
const SESSION_COOKIE = "clanhub_discord_session";

type DiscordGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
};

type DiscordUser = {
  id: string;
  username: string;
};

function redirectWithError(request: Request, error: string) {
  const response = NextResponse.redirect(
    new URL(`/?discord_error=${encodeURIComponent(error)}`, request.url)
  );

  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/discord",
    maxAge: 0,
  });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/discord",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const discordError = url.searchParams.get("error");

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirectWithError(request, "authentication-required");
    }

    if (discordError) {
      return redirectWithError(request, "authorization-denied");
    }

    const storedState = request.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${STATE_COOKIE}=`))
      ?.substring(`${STATE_COOKIE}=`.length);

    if (
      !code ||
      !returnedState ||
      !storedState ||
      returnedState !== storedState
    ) {
      return redirectWithError(request, "invalid-oauth-state");
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return redirectWithError(request, "discord-not-configured");
    }

    const tokenResponse = await fetch(
      "https://discord.com/api/v10/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
        cache: "no-store",
      }
    );

    if (!tokenResponse.ok) {
      return redirectWithError(request, "token-exchange-failed");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (typeof accessToken !== "string" || !accessToken) {
      return redirectWithError(request, "invalid-discord-token");
    }

    const discordUserResponse = await fetch(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!discordUserResponse.ok) {
      return redirectWithError(request, "discord-user-fetch-failed");
    }

    const discordUser: DiscordUser =
      await discordUserResponse.json();

    if (!discordUser.id) {
      return redirectWithError(request, "invalid-discord-user");
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("discord_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return redirectWithError(
        request,
        "discord-profile-check-failed"
      );
    }

    if (!profile) {
      return redirectWithError(
        request,
        "discord-profile-not-found"
      );
    }

    if (profile.discord_user_id !== discordUser.id) {
      return redirectWithError(
        request,
        "discord-user-id-mismatch"
      );
    }

    const guildsResponse = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!guildsResponse.ok) {
      return redirectWithError(
        request,
        "discord-servers-fetch-failed"
      );
    }

    const guildsData: DiscordGuild[] =
      await guildsResponse.json();

    // Keep every guild with a valid ID and name.
    // Discord's owner and permissions fields are optional.
    const memberGuilds = Array.isArray(guildsData)
      ? guildsData
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
          }))
      : [];

    if (memberGuilds.length === 0) {
      return redirectWithError(
        request,
        "no-discord-servers"
      );
    }

    const { data: session, error: insertError } = await admin
      .from("discord_connection_sessions")
      .insert({
        auth_user_id: user.id,
        guilds: memberGuilds,
        expires_at: new Date(
          Date.now() + 10 * 60 * 1000
        ).toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !session) {
      return redirectWithError(
        request,
        "session-save-failed"
      );
    }

    const response = NextResponse.redirect(
      new URL("/communities/connect", request.url)
    );

    response.cookies.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/discord",
      maxAge: 600,
    });

    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/discord",
      maxAge: 0,
    });

    return response;
  } catch {
    return redirectWithError(request, "callback-failed");
  }
}
