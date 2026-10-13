"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems, type NavigationItem } from "@/lib/navigation";

export function AppSidebar({
  tenantSlug,
  collapsed,
  onToggle,
}: {
  tenantSlug: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const settings = navigationItems.find((item) => item.children);
  const settingsActive = Boolean(
    settings && pathname.startsWith(settings.href(tenantSlug)),
  );
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  function isActive(item: NavigationItem) {
    return (
      pathname === item.href(tenantSlug) ||
      (item.label !== "Dashboard" && pathname.startsWith(item.href(tenantSlug)))
    );
  }

  function childLinks(children: NavigationItem[]) {
    return children.map(({ label, href, icon: Icon }) => {
      const active = isActive({ label, href, icon: Icon });
      return (
        <Link
          key={label}
          href={href(tenantSlug)}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold ${active ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"}`}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      );
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      className={`group hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 transition-[width] lg:flex ${collapsed ? "w-20" : "w-64"}`}
      data-testid="desktop-sidebar"
    >
      <div className="flex h-12 items-center gap-3 px-2">
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
          <Leaf className="size-5" />
        </span>
        <span className="text-xl font-bold tracking-tight group-data-[collapsed=true]:hidden">
          Mentoria
        </span>
      </div>
      <nav className="mt-8 flex-1 space-y-1" aria-label="Navegação principal">
        {navigationItems.map(({ label, href, icon: Icon, children }) => {
          const active = isActive({ label, href, icon: Icon });
          if (children) {
            return (
              <div key={label} className="relative">
                <button
                  type="button"
                  aria-expanded={settingsOpen}
                  aria-controls="settings-submenu"
                  onClick={() => setSettingsOpen((open) => !open)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition-colors ${active ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left group-data-[collapsed=true]:hidden">
                    {label}
                  </span>
                  <ChevronDown
                    className={`size-4 transition-transform group-data-[collapsed=true]:hidden ${settingsOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {settingsOpen && (
                  <div
                    id="settings-submenu"
                    className={`mt-1 grid gap-1 ${collapsed ? "absolute top-0 left-full z-20 ml-2 w-64 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg" : "ml-5 border-l border-[var(--border)] pl-2"}`}
                  >
                    {childLinks(children)}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={label}
              href={href(tenantSlug)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition-colors ${active ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"}`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="group-data-[collapsed=true]:hidden">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        aria-label={
          collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
        }
        onClick={onToggle}
        className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
      >
        {collapsed ? (
          <ChevronRight className="size-5" aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-5" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
