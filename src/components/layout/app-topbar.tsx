import { Bell, Leaf, Search } from "lucide-react";
import {
  TenantSwitcher,
  type TenantOption,
} from "@/features/tenants/components/tenant-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";

export function AppTopbar({
  tenantSlug,
  tenants,
  email,
}: {
  tenantSlug: string;
  tenants: TenantOption[];
  email: string;
}) {
  return (
    <header className="flex min-h-20 flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
      <div className="flex w-full items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">Mentoria</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notificações"
            className="grid min-h-11 min-w-11 place-items-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            <Bell className="size-5" aria-hidden="true" />
          </button>
          <UserMenu email={email} />
        </div>
      </div>
      <div className="w-full max-w-xs lg:w-auto">
        <TenantSwitcher tenants={tenants} currentSlug={tenantSlug} />
      </div>
      <div className="hidden min-w-48 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)] md:flex">
        <Search className="size-4" aria-hidden="true" /> Buscar no espaço...
      </div>
      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notificações"
          className="grid min-h-11 min-w-11 place-items-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
        >
          <Bell className="size-5" />
        </button>
        <UserMenu email={email} />
      </div>
    </header>
  );
}
