
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

export default function ConnectCommunityPage() {
  const router = useRouter();

  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGuilds() {
      try {
        const response = await fetch("/api/discord/servers", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load your Discord servers.");
        }

        if (!cancelled) {
          setGuilds(data.guilds || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your Discord servers."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGuilds();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect() {
    if (!selectedGuild) {
      setError("Please select a Discord server first.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/discord/servers/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guildId: selectedGuild,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to connect this community.");
      }

      router.push("/profile?community=connected");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setConnecting(false);
    }
  }

  function getGuildIcon(guild: DiscordGuild) {
    if (!guild.icon) return null;

    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
  }

  return (
    <main className="min-h-screen bg-[#111116] px-5 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <span>←</span>
          Back to ClanHub
        </a>

        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-3xl font-black shadow-lg shadow-violet-600/20">
            C
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Connect your community
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-400">
            Choose a Discord server that you own or manage.
            ClanHub will create a community connected to that server.
          </p>
        </div>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your Discord servers</h2>
              <p className="mt-1 text-sm text-gray-500">
                Select one server to continue.
              </p>
            </div>

            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
              {guilds.length} available
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-500" />
              <p className="mt-4 text-sm text-gray-400">
                Loading your Discord servers...
              </p>
            </div>
          ) : guilds.length === 0 && !error ? (
            <div className="py-14 text-center">
              <div className="text-4xl">🏠</div>
              <h3 className="mt-4 text-lg font-semibold">
                No manageable servers found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                Make sure you own a Discord server or have Manage Server
                permission, then try connecting Discord again.
              </p>
              <a
                href="/api/discord/connect"
                className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
              >
                Connect Discord again
              </a>
            </div>
          ) : (
            <div className="mt-7 space-y-3">
              {guilds.map((guild) => {
                const selected = selectedGuild === guild.id;
                const icon = getGuildIcon(guild);

                return (
                  <button
                    key={guild.id}
                    type="button"
                    onClick={() => {
                      setSelectedGuild(guild.id);
                      setError(null);
                    }}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    {icon ? (
                      <img
                        src={icon}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#292832] text-lg font-bold text-gray-300">
                        {guild.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{guild.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {guild.owner ? "Server owner" : "Server manager"}
                      </p>
                    </div>

                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-violet-500 bg-violet-500 text-white"
                          : "border-white/20 text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && guilds.length > 0 && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!selectedGuild || connecting}
              className="mt-7 w-full rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {connecting ? "Connecting community..." : "Connect selected server"}
            </button>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-6 text-gray-600">
          Your community will initially be private and pending approval.
          You can manage it through ClanHub once connected.
        </p>
      </div>
    </main>
  );
}
