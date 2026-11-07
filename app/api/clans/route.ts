
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    // 1. Verify the authenticated ClanHub user.
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "You must sign in before creating a clan." },
        { status: 401 }
      );
    }

    // 2. Read and validate the request body.
    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const tag =
      body.tag === undefined || body.tag === null
        ? null
        : typeof body.tag === "string"
          ? body.tag.trim() || null
          : undefined;

    const description =
      body.description === undefined || body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim() || null
          : undefined;

    if (name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { error: "Clan name must contain between 2 and 40 characters." },
        { status: 400 }
      );
    }

    if (tag === undefined) {
      return NextResponse.json(
        { error: "Clan tag must be text." },
        { status: 400 }
      );
    }

    if (tag !== null && (tag.length < 2 || tag.length > 8)) {
      return NextResponse.json(
        { error: "Clan tag must contain between 2 and 8 characters." },
        { status: 400 }
      );
    }

    if (description === undefined) {
      return NextResponse.json(
        { error: "Clan description must be text." },
        { status: 400 }
      );
    }

    // 3. Call the secure database function.
    const admin = createAdminClient();

    const { data: clanId, error: createError } = await admin.rpc(
      "create_clan",
      {
        p_auth_user_id: authUser.id,
        p_name: name,
        p_tag: tag,
        p_description: description,
      }
    );

    if (createError) {
      console.error("Clan creation failed:", createError);

      const errorMessage = createError.message || "";
      const errorDetails = createError.details || "";
      const databaseError = `${errorMessage} ${errorDetails}`;

      if (
        databaseError.includes("clans_name_global_unique_idx")
      ) {
        return NextResponse.json(
          { error: "A clan with this name already exists." },
          { status: 409 }
        );
      }

      if (
        databaseError.includes("clans_tag_global_unique_idx")
      ) {
        return NextResponse.json(
          { error: "A clan with this tag already exists." },
          { status: 409 }
        );
      }

      if (
        databaseError.includes("clans_created_by_unique_idx") ||
        errorMessage.includes("already created a clan")
      ) {
        return NextResponse.json(
          { error: "You have already created a clan." },
          { status: 409 }
        );
      }

      if (
        databaseError.includes("clan_memberships_one_active_user_idx")
      ) {
        return NextResponse.json(
          {
            error:
              "You must leave your current clan before creating your own.",
          },
          { status: 409 }
        );
      }

      if (errorMessage.includes("user profile not found")) {
        return NextResponse.json(
          {
            error:
              "Your ClanHub profile could not be found. Please sign in again.",
          },
          { status: 404 }
        );
      }

      if (
        errorMessage.includes("Clan name must") ||
        errorMessage.includes("Clan tag must")
      ) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create your clan. Please try again." },
        { status: 500 }
      );
    }

    if (!clanId) {
      throw new Error("Clan creation returned no clan ID.");
    }

    // 4. Return the newly created clan.
    return NextResponse.json(
      {
        success: true,
        message: "Your clan has been created successfully.",
        clanId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Clan creation API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while creating your clan." },
      { status: 500 }
    );
  }
}
