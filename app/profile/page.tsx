
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase-server";

function ProfileLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111116] text-white">
      <p className="text-gray-400">Loading your ClanHub profile...</p>
    </main>
  );
}

async function ProfileContent() {
  // Wait until a real request exists before accessing dynamic data.
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111116] p-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold">
            Profile not found
          </h1>
          <p className="mb-6 text-gray-400">
            We couldn't load your ClanHub profile.
          </p>
          <Link href="/" className="text-violet-400 hover:text-violet-300">
            Return to homepage
          </Link>
        </div>
      </main>
    );
  }

  const avatarHash = profile.discord_avatar_hash?.replace(
    /\.(png|jpe?g|webp|gif)$/i,
    ""
  );

  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${profile.discord_user_id}/${avatarHash}.${avatarHash.startsWith("a_") ? "gif" : "png"}?size=256`
    : null;

  const displayName =
    profile.discord_global_name ||
    profile.discord_username ||
    "Member";

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#111116] px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-gray-400 transition hover:text-white"
        >
          ← Back to ClanHub
        </Link>

        <div className="mb-8 mt-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Member account
          </p>
          <h1 className="mt-2 text-4xl font-bold">My Profile</h1>
          <p className="mt-2 text-gray-400">
            Your ClanHub identity and account information.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#191920] p-8">
          <div className="mb-8 flex items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Discord avatar"
                className="h-24 w-24 rounded-full border-2 border-violet-500 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-600 text-2xl font-bold">
                {initials}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold">{displayName}</h2>
              <p className="mt-1 text-gray-400">
                @{profile.discord_username}
              </p>
              <span className="mt-3 inline-block rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-300">
                Discord member
              </span>
            </div>
          </div>

          <div className="space-y-5 border-t border-white/10 pt-6">
            <div>
              <p className="mb-1 text-sm text-gray-500">Email address</p>
              <p className="text-gray-200">
                {profile.email || "Not available"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm text-gray-500">Discord User ID</p>
              <p className="break-all text-gray-200">
                {profile.discord_user_id}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm text-gray-500">ClanHub Member ID</p>
              <p className="break-all text-gray-200">{profile.id}</p>
            </div>

            <div>
              <p className="mb-1 text-sm text-gray-500">Member since</p>
              <p className="text-gray-200">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm text-gray-500">Account type</p>
              <p className="text-gray-200">
                {profile.is_platform_admin
                  ? "Platform Administrator"
                  : "Member"}
              </p>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-gray-500">
          Your profile information is securely loaded from ClanHub.
        </p>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  );
}
