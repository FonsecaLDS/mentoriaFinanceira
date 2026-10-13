"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <span className="hidden max-w-36 truncate text-left text-sm font-semibold md:block">
          {email}
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm hover:bg-[var(--surface-muted)]"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sair
        </button>
      </div>
    </details>
  );
}
