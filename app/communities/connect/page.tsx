
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

function normalizeGuildName(name: string): string {
  const mathematicalRanges = [
    [0x1d400, 0x1d419, 0x41],
    [0x1d41a, 0x1d433, 0x61],
    [0x1d434, 0x1d44d, 0x41],
    [0x1d44e, 0x1d467, 0x61],
    [0x1d468, 0x1d481, 0x41],
    [0x1d482, 0x1d49b, 0x61],
    [0x1d49c, 0x1d4b5, 0x41],
    [0x1d4b6, 0x1d4cf, 0x61],
    [0x1d4d0, 0x1d4e9, 0x41],
    [0x1d4ea, 0x1d503, 0x61],
    [0x1d504, 0x1d51d, 0x41],
    [0x1d51e, 0x1d537, 0x61],
    [0x1d538, 0x1d551, 0x41],
    [0x1d552, 0x1d56b, 0x61],
    [0x1d56c, 0x1d585, 0x41],
    [0x1d586, 0x1d59f, 0x61],
    [0x1d5a0, 0x1d5b9, 0x41],
    [0x1d5ba, 0x1d5d3, 0x61],
    [0x1d5d4, 0x1d5ed, 0x41],
    [0x1d5ee, 0x1d607, 0x61],
    [0x1d608, 0x1d621, 0x41],
    [0x1d622, 0x1d63b, 0x61],
    [0x1d63c, 0x1d655, 0x41],
    [0x1d656, 0x1d66f, 0x61],
    [0x1d670, 0x1d689, 0x41],
    [0x1d68a, 0x1d6a3, 0x61],
    [0xff21, 0xff3a, 0x41],
    [0xff41, 0xff5a, 0x61],
  ];

  const digitRanges = [
    [0x1d7ce, 0x1d7d7],
    [0x1d7d8, 0x1d7e1],
    [0x1d7e2, 0x1d7eb],
    [0x1d7ec, 0x1d7f5],
    [0x1d7f6, 0x1d7ff],
  ];

  const smallCapsMap: Record<string, string> = {
    "ᴬ": "a", "ᴮ": "b", "ᴰ": "d", "ᴱ": "e",
    "ᴳ": "g", "ᴴ": "h", "ᴵ": "i", "ᴶ": "j",
    "ᴷ": "k", "ᴸ": "l", "ᴹ": "m", "ᴺ": "n",
    "ᴼ": "o", "ᴾ": "p", "ᴿ": "r", "ᵀ": "t",
    "ᵁ": "u", "ᵂ": "w",
    "ᴛ": "t", "ᴅ": "d", "ʙ": "b", "ᴄ": "c",
    "ᴇ": "e", "ɢ": "g", "ʜ": "h", "ɪ": "i",
    "ᴊ": "j", "ᴋ": "k", "ʟ": "l", "ᴍ": "m",
    "ᴏ": "o", "ᴘ": "p", "ʀ": "r",
    "ꜱ": "s", "ᴜ": "u", "ᴠ": "v", "ᴡ": "w",
    "ʏ": "y", "ᴢ": "z",
    "ᴀ": "a",
    "ᵃ": "a", "ᵇ": "b", "ᵈ": "d", "ᵉ": "e",
    "ᵍ": "g", "ʰ": "h", "ⁱ": "i", "ʲ": "j",
    "ᵏ": "k", "ˡ": "l", "ᵐ": "m", "ⁿ": "n",
    "ᵒ": "o", "ᵖ": "p", "ʳ": "r", "ˢ": "s",
    "ᵗ": "t", "ᵘ": "u", "ᵛ": "v", "ʷ": "w",
    "ˣ": "x", "ʸ": "y", "ᶻ": "z",
    "ϻ": "m",
    "Ƭ": "t",
  };

  const converted = Array.from(name)
    .map((character) => {
      if (smallCapsMap[character]) {
        return smallCapsMap[character];
      }

      const code = character.codePointAt(0);

      if (code === undefined) return character;

      for (const [start, end, base] of mathematicalRanges) {
        if (code >= start && code <= end) {
          return String.fromCodePoint(base + (code - start));
        }
      }

      for (const [start, end] of digitRanges) {
        if (code >= start && code <= end) {
          return String.fromCodePoint(0x30 + (code - start));
        }
      }

      return character;
    })
    .join("");

  return converted
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function getGuildSortGroup(name: string): number {
  const normalized = normalizeGuildName(name);

  if (/\p{Script=Arabic}/u.test(normalized)) {
    return 3;
  }

  const firstCharacter = Array.from(normalized)[0];

  if (!firstCharacter) {
    return 2;
  }

  if (/\p{Script=Latin}/u.test(firstCharacter)) {
    return 0;
  }

  if (/\p{N}/u.test(firstCharacter)) {
    return 1;
  }

  return 2;
}

function compareGuilds(a: DiscordGuild, b: DiscordGuild): number {
  const groupA = getGuildSortGroup(a.name);
  const groupB = getGuildSortGroup(b.name);

  if (groupA !== groupB) {
    return groupA - groupB;
  }

  const normalizedA = normalizeGuildName(a.name);
  const normalizedB = normalizeGuildName(b.name);

  const comparison = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true,
    ignorePunctuation: true,
  }).compare(normalizedA, normalizedB);

  return comparison || a.name.localeCompare(b.name);
}

export default function ConnectCommunityPage() {
  const router = useRouter();

  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredGuilds = guilds.filter((guild) =>
    normalizeGuildName(guild.name).includes(
      normalizeGuildName(searchQuery)
    )
  );

  useEffect(() => {
    let cancelled = false;

    async function loadGuilds() {
      try {
        const response = await fetch("/api/discord/servers", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load your Discord servers."
          );
        }

        if (!cancelled) {
          const sortedGuilds = [...(data.guilds || [])].sort(
            compareGuilds
          );

          setGuilds(sortedGuilds);
          setError(null);
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
        throw new Error(
          data.error || "Unable to connect this Discord server."
        );
      }

      router.push("/clans/dashboard?discord=connected");
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
            Connect a Discord server
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-400">
            Choose a Discord server you belong to and connect it to
            your existing ClanHub clan. You do not need to own the
            Discord server or have Manage Server permission.
          </p>
        </div>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Your Discord servers
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select one server to connect to your clan.
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
          ) : error ? (
            <div className="py-10 text-center">
              <div className="text-4xl">🔄</div>

              <h3 className="mt-4 text-lg font-semibold">
                Discord connection required
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                {error}
              </p>

              <a
                href="/api/discord/connect"
                className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold transition hover:bg-violet-500"
              >
                Connect Discord again
              </a>
            </div>
          ) : guilds.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-4xl">🏠</div>

              <h3 className="mt-4 text-lg font-semibold">
                No Discord servers found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                We could not find any Discord servers linked to
                your account. Make sure you belong to at least one
                Discord server, then connect Discord again.
              </p>

              <a
                href="/api/discord/connect"
                className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
              >
                Connect Discord again
              </a>
            </div>
          ) : (
            <>
              <div className="mt-7">
                <label
                  htmlFor="discord-server-search"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Find a server
                </label>

                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>

                  <input
                    id="discord-server-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search your 69 Discord servers..."
                    className="w-full rounded-xl border border-white/10 bg-[#191920] py-3 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Showing {filteredGuilds.length} of {guilds.length} servers
                </p>
              </div>

              {filteredGuilds.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="text-4xl">🔎</div>

                  <h3 className="mt-4 text-lg font-semibold">
                    No servers found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                    We couldn't find a Discord server matching "{searchQuery}".
                    Try another name.
                  </p>

                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-5 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-violet-500/50 hover:text-white"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {filteredGuilds.map((guild) => {
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
                          <p className="truncate font-semibold">
                            {guild.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {guild.owner
                              ? "You own this Discord server"
                              : "You are a member of this Discord server"}
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
            </>
          )}

          {!loading && !error && guilds.length > 0 && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!selectedGuild || connecting}
              className="mt-7 w-full rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {connecting
                ? "Connecting your clan..."
                : "Connect selected server"}
            </button>
          )}
        </section>

        <div className="mx-auto mt-6 max-w-2xl space-y-2 text-center">
          <p className="text-xs leading-6 text-gray-500">
            Only the active Owner of a ClanHub clan can connect its
            Discord server. Ordinary Discord members are allowed.
          </p>

          <p className="text-xs leading-6 text-gray-500">
            ClanHub's Discord bot must already be installed in the
            selected server. Someone with permission to manage that
            Discord server may need to install it.
          </p>

          <p className="text-xs leading-6 text-gray-600">
            This connects your existing clan. It does not create
            another ClanHub clan.
          </p>
        </div>
      </div>
    </main>
  );
}
