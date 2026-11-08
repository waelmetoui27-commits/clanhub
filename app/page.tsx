
"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

type Community = {
  id: string;
  discord_guild_id: string;
  name: string;
  icon_hash: string | null;
  description: string | null;
  created_at: string;
};

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.27 5.33A18.1 18.1 0 0 0 14.83 4l-.54 1.1a16.5 16.5 0 0 0-4.58 0L9.17 4a18 18 0 0 0-4.44 1.33C1.92 9.5 1.16 13.57 1.54 17.58a18.2 18.2 0 0 0 5.45 2.75l1.18-1.92a11.8 11.8 0 0 1-1.86-.9l.46-.36a13 13 0 0 0 11.02 0l.46.36c-.6.36-1.23.66-1.87.9l1.18 1.92a18.2 18.2 0 0 0 5.45-2.75c.45-4.65-.77-8.69-3.74-12.25ZM8.9 14.95c-1.08 0-1.96-.99-1.96-2.2s.86-2.2 1.96-2.2 1.98.99 1.96 2.2c0 1.21-.86 2.2-1.96 2.2Zm6.2 0c-1.08 0-1.96-.99-1.96-2.2s.86-2.2 1.96-2.2 1.98.99 1.96 2.2c0 1.21-.86 2.2-1.96 2.2Z" />
    </svg>
  );
}

function CommunityCard({ community }: { community: Community }) {
  const initials = community.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase();

  const iconUrl = community.icon_hash
    ? `https://cdn.discordapp.com/icons/${community.discord_guild_id}/${community.icon_hash}.png?size=128`
    : null;

  return (
    <article className="group rounded-2xl border border-white/[0.07] bg-[#191920] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[#1d1d26]">
      <div className="flex items-start justify-between">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={`${community.name} icon`}
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg">
            {initials || "C"}
          </div>
        )}

        <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-gray-400">
          PUBLIC COMMUNITY
        </span>
      </div>

      <h3 className="mt-5 text-base font-semibold text-white transition group-hover:text-violet-300">
        {community.name}
      </h3>

      <p className="mt-2 min-h-[42px] text-sm leading-6 text-gray-500">
        {community.description || "A public Discord community on ClanHub."}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
        <div>
          <p className="text-sm font-semibold text-gray-200">ClanHub</p>
          <p className="mt-1 text-xs text-gray-500">Community platform</p>
        </div>

        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Active
        </span>
      </div>
    </article>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [communitiesError, setCommunitiesError] = useState<string | null>(
    null
  );

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getUser().then(({ data, error }) => {
      if (!error) {
        setUser(data.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCommunities() {
      setCommunitiesLoading(true);
      setCommunitiesError(null);

      try {
        const response = await fetch("/api/communities", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load communities.");
        }

        const data: { communities?: Community[] } = await response.json();

        setCommunities(
          Array.isArray(data.communities) ? data.communities : []
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setCommunitiesError(
          "We couldn't load communities right now. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCommunitiesLoading(false);
        }
      }
    }

    loadCommunities();

    return () => {
      controller.abort();
    };
  }, []);

  const handleDiscordLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "identify email",
        },
      });

      if (error) {
        setAuthError(error.message);
        setAuthLoading(false);
      }
    } catch {
      setAuthError("Unable to connect to Discord. Please try again.");
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setAuthError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    }

    setAuthLoading(false);
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.global_name ||
    user?.email ||
    "Member";

  const filteredCommunities = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return communities;
    }

    return communities.filter((community) => {
      const name = community.name.toLowerCase();
      const description = (community.description || "").toLowerCase();

      return name.includes(query) || description.includes(query);
    });
  }, [communities, search]);

  const featuredCommunity = communities[0] ?? null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#111116] text-white">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#111116]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-black shadow-lg shadow-violet-600/20">
              C
            </div>
            <span className="text-xl font-bold tracking-tight">
              Clan<span className="text-violet-400">Hub</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
            <a href="#" className="text-white transition hover:text-violet-300">
              Home
            </a>
            <a href="#communities" className="transition hover:text-white">
              Communities
            </a>
            <a href="#tournaments" className="transition hover:text-white">
              Tournaments
            </a>
            <a href="#about" className="transition hover:text-white">
              About
            </a>

            {user && (
              <>
                <a
                  href="/clans/create"
                  className="font-semibold text-violet-400 transition hover:text-violet-300"
                >
                  Create Clan
                </a>
                <a
                  href="/profile"
                  className="text-violet-400 transition hover:text-white"
                >
                  My Profile
                </a>
              </>
            )}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            {user ? (
              <>
                <span
                  className="max-w-[180px] truncate text-sm text-gray-300"
                  title={displayName}
                >
                  Welcome, {displayName}
                </span>

                <a
                  href="/profile"
                  className="rounded-xl border border-violet-500/30 px-4 py-2.5 text-sm text-violet-300 transition hover:bg-violet-500/10"
                >
                  Profile
                </a>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={authLoading}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                >
                  {authLoading ? "Please wait..." : "Log out"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={authLoading}
                  className="px-4 py-2 text-sm text-gray-300 transition hover:text-white disabled:opacity-50"
                >
                  {authLoading ? "Connecting..." : "Log in"}
                </button>

                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={authLoading}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DiscordIcon />
                  {authLoading ? "Connecting..." : "Get started"}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 sm:hidden"
          >
            {mobileMenu ? "Close" : "Menu"}
          </button>
        </nav>

        {mobileMenu && (
          <div className="border-t border-white/[0.07] bg-[#191920] px-6 py-5 sm:hidden">
            <div className="flex flex-col gap-5 text-sm text-gray-300">
              <a onClick={() => setMobileMenu(false)} href="#">
                Home
              </a>

              <a
                onClick={() => setMobileMenu(false)}
                href="#communities"
              >
                Communities
              </a>

              <a
                onClick={() => setMobileMenu(false)}
                href="#tournaments"
              >
                Tournaments
              </a>

              <a onClick={() => setMobileMenu(false)} href="#about">
                About
              </a>

              {user && (
                <>
                  <a
                    onClick={() => setMobileMenu(false)}
                    href="/clans/create"
                    className="font-semibold text-violet-400 hover:text-white"
                  >
                    Create Clan
                  </a>
                  <a
                    onClick={() => setMobileMenu(false)}
                    href="/profile"
                    className="font-semibold text-violet-400 hover:text-white"
                  >
                    My Profile
                  </a>
                </>
              )}

              <div className="border-t border-white/10 pt-5">
                {user ? (
                  <>
                    <p className="mb-4 truncate text-violet-300">
                      Welcome, {displayName}
                    </p>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={authLoading}
                      className="text-left font-semibold text-red-300 disabled:opacity-50"
                    >
                      {authLoading ? "Please wait..." : "Log out"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleDiscordLogin}
                    disabled={authLoading}
                    className="flex items-center gap-2 text-left font-semibold text-violet-300 disabled:opacity-50"
                  >
                    <DiscordIcon />
                    {authLoading ? "Connecting..." : "Continue with Discord"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {authError && (
        <div role="alert" className="mx-auto mt-4 max-w-7xl px-6">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {authError}
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="ml-3 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/[0.10] blur-[140px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-4 py-2 text-xs font-medium text-violet-300">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              A BETTER WAY TO CONNECT
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
              Your community.
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                Your universe.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-gray-400 sm:text-lg">
              Discover communities, build your clan and compete together.
              Bring your people, passions and ambitions into one place.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#communities"
                className="flex items-center gap-3 rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold shadow-lg shadow-violet-600/20 transition hover:-translate-y-1 hover:bg-violet-500"
              >
                Explore communities
                <ArrowIcon />
              </a>

              {user ? (
                <a
                  href="/clans/create"
                  className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-7 py-4 text-sm font-semibold text-violet-200 transition hover:-translate-y-1 hover:border-violet-400/60 hover:bg-violet-500/20"
                >
                  Create your clan
                  <ArrowIcon />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={authLoading}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-4 text-sm font-semibold text-gray-200 transition hover:border-violet-400/40 hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <DiscordIcon />
                  {authLoading ? "Connecting..." : "Create your clan"}
                </button>
              )}
            </div>

            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {["A", "M", "J", "S"].map((letter, index) => (
                  <div
                    key={letter}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#111116] text-xs font-bold ${
                      [
                        "bg-violet-600",
                        "bg-blue-600",
                        "bg-pink-600",
                        "bg-emerald-600",
                      ][index]
                    }`}
                  >
                    {letter}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-200">
                  Find your people
                </p>
                <p className="text-xs text-gray-500">
                  Discover your next community
                </p>
              </div>
            </div>
          </div>

          {/* HERO PREVIEW */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 rounded-full bg-violet-600/[0.12] blur-[90px]" />

            <div className="relative rounded-3xl border border-white/10 bg-[#191920] p-5 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                <div>
                  <p className="text-sm font-semibold">
                    Your community space
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Everything starts with connection.
                  </p>
                </div>

                <span className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
                  Platform preview
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#35235a] to-[#1d1b2b] p-5">
                <div className="flex items-center gap-3">
                  {featuredCommunity?.icon_hash ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${featuredCommunity.discord_guild_id}/${featuredCommunity.icon_hash}.png?size=128`}
                      alt={`${featuredCommunity.name} icon`}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500 text-lg font-bold">
                      {featuredCommunity
                        ? featuredCommunity.name.slice(0, 1).toUpperCase()
                        : "C"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {featuredCommunity?.name || "Your next community"}
                    </p>
                    <p className="text-xs text-violet-200/70">
                      {featuredCommunity
                        ? "Public ClanHub community"
                        : "Discover and connect"}
                    </p>
                  </div>
                </div>

                <div className="mt-7 rounded-xl bg-black/20 p-4">
                  <p className="text-sm font-semibold">
                    {featuredCommunity
                      ? "Discover this community"
                      : "Build your own space"}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-violet-200/70">
                    {featuredCommunity?.description ||
                      "Create your clan, invite your members and build your own place on ClanHub. You can connect a Discord server later."}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Community features
                  </p>
                  <span className="text-xs text-gray-500">Preview</span>
                </div>

                {[
                  {
                    icon: "🏆",
                    title: "Tournament night",
                    detail: "Competition & events",
                    color: "bg-amber-500/10",
                  },
                  {
                    icon: "🎮",
                    title: "Gaming sessions",
                    detail: "Find teammates",
                    color: "bg-violet-500/10",
                  },
                  {
                    icon: "💬",
                    title: "Community chat",
                    detail: "Meet new people",
                    color: "bg-blue-500/10",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-white/10 bg-[#20202a] px-5 py-4 shadow-xl sm:block">
              <p className="text-xs text-gray-500">
                Built for communities
              </p>
              <p className="mt-1 text-sm font-semibold text-violet-300">
                Together, better.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DISCOVERY */}
      <section
        id="communities"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              DISCOVER
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Find your community.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-gray-500">
              Explore public Discord communities that are part of ClanHub.
            </p>
          </div>

          <div className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#191920] px-4 py-3 transition focus-within:border-violet-500/50 md:max-w-sm">
            <span className="text-gray-500">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search communities..."
              aria-label="Search communities"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
            />

            <span className="text-xs text-gray-600">⌕</span>
          </div>
        </div>

        {/* COMMUNITY GRID */}
        {communitiesLoading ? (
          <div className="mt-7 rounded-2xl border border-white/[0.07] bg-[#191920] py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
            <p className="mt-4 text-sm text-gray-400">
              Loading communities...
            </p>
          </div>
        ) : communitiesError ? (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-500/20 bg-red-500/5 py-16 text-center"
          >
            <p className="text-lg font-semibold">
              Unable to load communities
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {communitiesError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              Try again
            </button>
          </div>
        ) : filteredCommunities.length > 0 ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
              />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-white/[0.07] bg-[#191920] py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl text-violet-300">
              ◈
            </div>

            <p className="mt-5 text-lg font-semibold">
              {communities.length === 0
                ? "No public communities yet"
                : "No communities found"}
            </p>

            <p className="mx-auto mt-2 max-w-md px-4 text-sm leading-6 text-gray-500">
              {communities.length === 0
                ? "Create your own clan and bring your members together. You can connect a Discord server later."
                : "Try another search term to find a community."}
            </p>

            {communities.length === 0 ? (
              user ? (
                <a
                  href="/clans/create"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
                >
                  Create your clan
                  <ArrowIcon />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={authLoading}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50"
                >
                  <DiscordIcon />
                  {authLoading ? "Connecting..." : "Sign in to create a clan"}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-5 text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>

      {/* VALUE PROPOSITION */}
      <section
        id="about"
        className="border-y border-white/[0.06] bg-[#15151c]"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              ONE PLATFORM
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your community needs.
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              From finding your people to organizing your next competition,
              ClanHub brings your community experience together.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "◉",
                title: "Discover",
                text: "Find communities that match your interests and meet people who share your passion.",
              },
              {
                icon: "◇",
                title: "Build",
                text: "Create your own clan, bring your members together and grow your community.",
              },
              {
                icon: "♜",
                title: "Compete",
                text: "Organize tournaments, manage matches and give your team something to aim for.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/[0.07] bg-[#191920] p-7 transition hover:border-violet-500/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-2xl text-violet-300">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOURNAMENTS */}
      <section
        id="tournaments"
        className="mx-auto max-w-7xl px-6 py-24"
      >
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#292044] to-[#171720] p-8 sm:p-14">
          <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-violet-500/20 blur-[100px]" />

          <div className="relative max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              COMPETE TOGETHER
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Your next big moment starts here.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400">
              Build your team, organize competitions and turn every match
              into an opportunity to grow.
            </p>

            {user ? (
              <a
                href="/clans/create"
                className="mt-8 inline-flex items-center gap-3 rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold transition hover:-translate-y-1 hover:bg-violet-500"
              >
                Create your clan
                <ArrowIcon />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleDiscordLogin}
                disabled={authLoading}
                className="mt-8 inline-flex items-center gap-3 rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold transition hover:-translate-y-1 hover:bg-violet-500 disabled:opacity-50"
              >
                {authLoading ? "Connecting..." : "Get started with Discord"}
                <ArrowIcon />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        id="get-started"
        className="mx-auto max-w-4xl px-6 pb-24 pt-8 text-center"
      >
        <div className="rounded-3xl border border-white/[0.07] bg-[#191920] px-7 py-14 sm:px-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-black shadow-lg shadow-violet-600/20">
            C
          </div>
          <h2 className="mt-7 text-3xl font-bold tracking-tight">
            Find where you belong.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-gray-500">
            Your people are out there. Create your clan, bring your members
            together and start building something on ClanHub.
          </p>

          {user ? (
            <div className="mt-7">
              <p className="text-sm text-gray-300">
                You're signed in as{" "}
                <span className="font-semibold text-violet-300">
                  {displayName}
                </span>
              </p>

              <a
                href="/clans/create"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold transition hover:-translate-y-1 hover:bg-violet-500"
              >
                Create your clan
                <ArrowIcon />
              </a>

              <div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={authLoading}
                  className="mt-5 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                >
                  {authLoading ? "Please wait..." : "Log out"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDiscordLogin}
              disabled={authLoading}
              className="mx-auto mt-7 inline-flex items-center gap-3 rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold transition hover:-translate-y-1 hover:bg-violet-500 disabled:opacity-50"
            >
              <DiscordIcon />
              {authLoading ? "Connecting..." : "Continue with Discord"}
            </button>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-9 sm:flex-row">
          <a href="#" className="text-lg font-bold">
            Clan<span className="text-violet-400">Hub</span>
          </a>

          <p className="text-xs text-gray-600">
            © 2026 ClanHub. All rights reserved.
          </p>

          <div className="flex gap-6 text-xs text-gray-500">
            <a
              href="#communities"
              className="transition hover:text-white"
            >
              Communities
            </a>
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a
              href="#tournaments"
              className="transition hover:text-white"
            >
              Tournaments
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
