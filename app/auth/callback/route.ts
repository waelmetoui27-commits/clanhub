
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?error=auth-callback`
    );
  }

  const supabase = await createClient();

  // Complete Supabase authentication.
  const { error: authError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    return NextResponse.redirect(
      `${origin}/?error=auth-callback`
    );
  }

  // Retrieve the authenticated user.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      `${origin}/?error=user-not-found`
    );
  }

  // Read Discord metadata.
  const metadata = user.user_metadata ?? {};
  const customClaims = metadata.custom_claims as
    | Record<string, unknown>
    | undefined;

  const discordUserId = String(
    metadata.provider_id ?? metadata.sub ?? ""
  );

  const discordUsername = String(
    metadata.full_name ?? metadata.name ?? ""
  );

  const discordGlobalName =
    typeof customClaims?.global_name === "string"
      ? customClaims.global_name
      : null;

  const avatarUrl = String(
    metadata.avatar_url ?? metadata.picture ?? ""
  );

  // Extract the avatar hash from the Discord avatar URL.
  let avatarHash: string | null = null;

  if (avatarUrl) {
    try {
      avatarHash =
        new URL(avatarUrl).pathname.split("/").pop() ?? null;
    } catch {
      avatarHash = null;
    }
  }

  if (!discordUserId || !discordUsername) {
    return NextResponse.redirect(
      `${origin}/?error=discord-metadata`
    );
  }

  // Check whether this Supabase user already has a ClanHub profile.
  const { data: existingProfile, error: profileError } =
    await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (profileError) {
    return NextResponse.redirect(
      `${origin}/?error=profile-check`
    );
  }

  // Create a profile only if one does not already exist.
  if (!existingProfile) {
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        auth_user_id: user.id,
        discord_user_id: discordUserId,
        discord_username: discordUsername,
        discord_global_name: discordGlobalName,
        discord_avatar_hash: avatarHash,
        email: user.email ?? null,
        is_platform_admin: false,
      });

    if (insertError) {
      return NextResponse.redirect(
        `${origin}/?error=profile-create`
      );
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
