"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export function MobileBottomNavigation({
  tenantSlug,
  onMore,
}: {
  tenantSlug: string;
  onMore: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Navegação mobile"
    >
      {navigationItems
        .filter((item) => item.mobile)
        .map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href(tenantSlug) ||
            (label !== "Dashboard" && pathname.startsWith(href(tenantSlug)));
          return (
            <Link
              key={label}
              href={href(tenantSlug)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${active ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{label === "Dashboard" ? "Início" : label}</span>
            </Link>
          );
        })}
      <button
        type="button"
        onClick={onMore}
        className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-[var(--text-secondary)]"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
        <span>Mais</span>
      </button>
    </nav>
  );
}
