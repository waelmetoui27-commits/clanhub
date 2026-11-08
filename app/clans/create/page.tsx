
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase-server";
import CreateClanForm from "./create-clan-form";

function CreateClanLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111116] text-white">
      <p className="text-gray-400">Loading...</p>
    </main>
  );
}

async function CreateClanContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#111116] px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to ClanHub
        </Link>

        <div className="mb-10 mt-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Build your community
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Create your clan
          </h1>

          <p className="mt-4 max-w-xl leading-7 text-gray-400">
            Give your clan an identity, bring your members together
            and start competing on ClanHub.
          </p>
        </div>

        <CreateClanForm />

        <p className="mt-8 text-center text-xs text-gray-600">
          You can connect a Discord server to your clan later.
        </p>
      </div>
    </main>
  );
}

export default function CreateClanPage() {
  return (
    <Suspense fallback={<CreateClanLoading />}>
      <CreateClanContent />
    </Suspense>
  );
}
