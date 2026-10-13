import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-[var(--primary)]">
          <ShieldCheck aria-hidden="true" className="size-5" />
          <span>Mentoria Financeira</span>
        </div>
        {children}
      </section>
    </main>
  );
}
