"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileMoreItems } from "@/lib/navigation";

export function MobileMoreMenu({
  tenantSlug,
  open,
  onClose,
}: {
  tenantSlug: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 lg:hidden"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Mais opções"
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-x-0 bottom-0 rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Mais opções</h2>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-muted)]"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="grid gap-2">
          {mobileMoreItems.map(({ label, href, icon: Icon, children }) =>
            children ? (
              <div key={label} className="border-t border-[var(--border)] pt-3">
                <Link
                  href={href(tenantSlug)}
                  onClick={onClose}
                  className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold"
                >
                  <Icon className="size-5 text-[var(--primary)]" />
                  {label}
                </Link>
                <div className="mt-1 grid gap-1 pl-8">
                  {children.map(
                    ({
                      label: childLabel,
                      href: childHref,
                      icon: ChildIcon,
                    }) => (
                      <Link
                        key={childLabel}
                        href={childHref(tenantSlug)}
                        onClick={onClose}
                        aria-current={
                          pathname.startsWith(childHref(tenantSlug))
                            ? "page"
                            : undefined
                        }
                        className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm ${pathname.startsWith(childHref(tenantSlug)) ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" : "hover:bg-[var(--surface-muted)]"}`}
                      >
                        <ChildIcon className="size-4 text-[var(--primary)]" />
                        {childLabel}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <Link
                key={label}
                href={href(tenantSlug)}
                onClick={onClose}
                aria-current={
                  pathname.startsWith(href(tenantSlug)) ? "page" : undefined
                }
                className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold ${pathname.startsWith(href(tenantSlug)) ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" : "hover:bg-[var(--surface-muted)]"}`}
              >
                <Icon className="size-5 text-[var(--primary)]" />
                {label}
              </Link>
            ),
          )}
        </nav>
      </section>
    </div>
  );
}
