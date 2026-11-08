
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type ClanData = {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  logo_path: string | null;
  status: string;
  created_at: string;
  role: string;
};

type MemberData = {
  role: string;
  joined_at: string;
  users: {
    discord_username: string | null;
    discord_global_name: string | null;
    discord_avatar_hash: string | null;
  } | null;
};

function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111116] text-white">
      <p className="text-gray-400">Loading your clan...</p>
    </main>
  );
}

async function DashboardContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const admin = createAdminClient();

  // Find the ClanHub profile belonging to the signed-in user.
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-[#111116] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-[#191920] p-8">
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <p className="mt-3 text-gray-400">
            We couldn't find your ClanHub profile. Please sign out and sign
            back in.
          </p>
          <Link href="/" className="mt-6 inline-block text-violet-400 hover:text-violet-300">
            Return to ClanHub
          </Link>
        </div>
      </main>
    );
  }

  // Find the user's active clan membership.
  const { data: membership, error: membershipError } = await admin
    .from("clan_memberships")
    .select("clan_id, role")
    .eq("user_id", profile.id)
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) {
    console.error("Clan membership lookup failed:", membershipError);
  }

  if (!membership) {
    return (
      <main className="min-h-screen bg-[#111116] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#191920] p-8">
          <h1 className="text-2xl font-bold">You don't belong to a clan yet</h1>
          <p className="mt-3 text-gray-400">
            Create your own clan or find a clan to join.
          </p>
          <Link
            href="/clans/create"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            Create a clan
          </Link>
        </div>
      </main>
    );
  }

  // Load the clan details.
  const { data: clan, error: clanError } = await admin
    .from("clans")
    .select("id, name, tag, description, logo_path, status, created_at")
    .eq("id", membership.clan_id)
    .maybeSingle();

  if (clanError || !clan) {
    console.error("Clan lookup failed:", clanError);

    return (
      <main className="min-h-screen bg-[#111116] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-[#191920] p-8">
          <h1 className="text-2xl font-bold">Unable to load your clan</h1>
          <p className="mt-3 text-gray-400">
            We couldn't retrieve your clan information. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  // Load active clan members.
  const { data: memberships, error: membersError } = await admin
    .from("clan_memberships")
    .select(
      "role, joined_at, users:users!clan_memberships_user_id_fkey(discord_username, discord_global_name, discord_avatar_hash)"
    )
    .eq("clan_id", clan.id)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  if (membersError) {
    console.error("Clan members lookup failed:", membersError);
  }

  const members = (memberships ?? []) as unknown as MemberData[];

  const memberCount = members.length;
  const isOwner = membership.role === "owner";

  return (
    <main className="min-h-screen bg-[#111116] text-white">
      <header className="border-b border-white/10 bg-[#191920]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Clan<span className="text-violet-400">Hub</span>
          </Link>

          <Link href="/" className="text-sm text-gray-400 transition hover:text-white">
            Back to homepage
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Clan dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Welcome to your clan
          </h1>
          <p className="mt-3 text-gray-400">
            Manage your clan and keep track of its members.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#191920] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-3xl font-bold text-violet-300">
              {clan.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {clan.name}
                </h2>
                {clan.tag && (
                  <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
                    [{clan.tag}]
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-gray-400">
                {isOwner ? "Owner" : "Member"} · {memberCount}{" "}
                {memberCount === 1 ? "member" : "members"}
              </p>
            </div>

            <span className="w-fit rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-green-400">
              {clan.status}
            </span>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-gray-200">
              About this clan
            </h3>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-400">
              {clan.description || "No description has been added yet."}
            </p>
          </div>

          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Created
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {new Date(clan.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Clan ID
              </p>
              <p className="mt-2 break-all text-sm text-gray-400">
                {clan.id}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#191920] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Clan members</h2>
              <p className="mt-2 text-sm text-gray-400">
                People who currently belong to your clan.
              </p>
            </div>

            <span className="rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-300">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
          </div>

          {membersError ? (
            <p className="mt-6 text-sm text-red-400">
              Unable to load clan members.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {members.map((member, index) => {
                const displayName =
                  member.users?.discord_global_name ||
                  member.users?.discord_username ||
                  "Discord user";

                const avatarHash = member.users?.discord_avatar_hash;

                return (
                  <div
                    key={`${displayName}-${index}`}
                    className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/20 p-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-500/10 font-semibold text-violet-300">
                      {avatarHash ? (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${profile.id}/${avatarHash}.png`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-200">
                        {displayName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Joined{" "}
                        {new Date(member.joined_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>

                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        member.role === "owner"
                          ? "bg-violet-500/10 text-violet-300"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {member.role === "owner" ? "Owner" : "Member"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#191920] p-6">
            <h3 className="font-semibold">Discord server</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Connect a Discord server to your clan when you're ready.
            </p>
            <p className="mt-4 text-sm text-violet-400">
              Discord connection coming next
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#191920] p-6">
            <h3 className="font-semibold">Clan competitions</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Your clan needs at least two members to become eligible for
              competitions.
            </p>
            <p className="mt-4 text-sm text-gray-300">
              {memberCount >= 2
                ? "Your clan meets the minimum member requirement."
                : "Invite members to unlock competition eligibility."}
            </p>
          </div>
        </section>

        {isOwner && (
          <p className="mt-8 text-center text-xs text-gray-500">
            You are the Owner and have full management permissions.
          </p>
        )}
      </div>
    </main>
  );
}

export default function ClanDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
