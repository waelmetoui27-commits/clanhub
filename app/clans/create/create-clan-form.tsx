
"use client";

import { useState, type FormEvent } from "react";

export default function CreateClanForm() {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdClanId, setCreatedClanId] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanTag = tag.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < 2 || cleanName.length > 40) {
      setError("Clan name must contain between 2 and 40 characters.");
      return;
    }

    if (cleanTag && (cleanTag.length < 2 || cleanTag.length > 8)) {
      setError("Clan tag must contain between 2 and 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/clans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          tag: cleanTag || null,
          description: cleanDescription || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create your clan.");
        return;
      }

      setCreatedClanId(data.clanId);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (createdClanId) {
    return (
      <section className="rounded-2xl border border-green-500/20 bg-[#191920] p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-2xl text-green-400">
          ✓
        </div>

        <h2 className="text-2xl font-bold">
          Your clan has been created!
        </h2>

        <p className="mt-3 leading-7 text-gray-400">
          Congratulations! You are now the Owner of your new clan.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Clan ID
          </p>

          <p className="mt-2 break-all text-sm text-gray-300">
            {createdClanId}
          </p>
        </div>

        <a
          href="/"
          className="mt-7 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
        >
          Return to ClanHub
        </a>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-[#191920] p-6 sm:p-8"
    >
      <div>
        <label
          htmlFor="clan-name"
          className="mb-2 block text-sm font-semibold text-gray-200"
        >
          Clan name <span className="text-red-400">*</span>
        </label>

        <input
          id="clan-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter your clan name"
          minLength={2}
          maxLength={40}
          required
          disabled={loading}
          className="w-full rounded-xl border border-white/10 bg-[#111116] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500 disabled:opacity-50"
        />

        <p className="mt-2 text-xs text-gray-500">
          Between 2 and 40 characters. Clan names must be globally unique.
        </p>
      </div>

      <div>
        <label
          htmlFor="clan-tag"
          className="mb-2 block text-sm font-semibold text-gray-200"
        >
          Clan tag <span className="text-gray-500">(optional)</span>
        </label>

        <input
          id="clan-tag"
          type="text"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="e.g. NOVA"
          minLength={2}
          maxLength={8}
          disabled={loading}
          className="w-full rounded-xl border border-white/10 bg-[#111116] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500 disabled:opacity-50"
        />

        <p className="mt-2 text-xs text-gray-500">
          Between 2 and 8 characters. Tags must also be globally unique.
        </p>
      </div>

      <div>
        <label
          htmlFor="clan-description"
          className="mb-2 block text-sm font-semibold text-gray-200"
        >
          Description <span className="text-gray-500">(optional)</span>
        </label>

        <textarea
          id="clan-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Tell people what your clan is about..."
          rows={4}
          disabled={loading}
          className="w-full resize-y rounded-xl border border-white/10 bg-[#111116] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500 disabled:opacity-50"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating your clan..." : "Create my clan"}
      </button>

      <p className="text-center text-xs leading-5 text-gray-500">
        By creating a clan, you automatically become its Owner.
      </p>
    </form>
  );
}
