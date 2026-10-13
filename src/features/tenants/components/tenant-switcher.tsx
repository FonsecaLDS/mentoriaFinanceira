"use client";

import { ChevronsUpDown, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type TenantOption = { slug: string; name: string };

export function TenantSwitcher({
  tenants,
  currentSlug,
}: {
  tenants: TenantOption[];
  currentSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const rest = pathname.split("/").slice(3).join("/") || "dashboard";
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--primary)]">
        <Users className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-[var(--text-secondary)]">
          Espaço atual
        </span>
        <select
          aria-label="Selecionar espaço"
          value={currentSlug}
          onChange={(event) => router.push(`/t/${event.target.value}/${rest}`)}
          className="w-full cursor-pointer appearance-none truncate bg-transparent text-sm font-semibold outline-none"
        >
          {tenants.map((tenant) => (
            <option key={tenant.slug} value={tenant.slug}>
              {tenant.name}
            </option>
          ))}
        </select>
        <Link
          href="/onboarding"
          className="mt-1 block text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          + Novo workspace
        </Link>
      </span>
      <ChevronsUpDown
        className="size-4 shrink-0 text-[var(--text-secondary)]"
        aria-hidden="true"
      />
    </div>
  );
}
