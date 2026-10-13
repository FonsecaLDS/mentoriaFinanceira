"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { MobileBottomNavigation } from "./mobile-bottom-navigation";
import { MobileMoreMenu } from "./mobile-more-menu";
import type { TenantOption } from "@/features/tenants/components/tenant-switcher";

export function AppShell({
  tenantSlug,
  tenants,
  email,
  children,
}: {
  tenantSlug: string;
  tenants: TenantOption[];
  email: string;
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <AppSidebar
        tenantSlug={tenantSlug}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <div className="min-w-0 flex-1">
        <AppTopbar tenantSlug={tenantSlug} tenants={tenants} email={email} />
        <main className="pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileBottomNavigation
        tenantSlug={tenantSlug}
        onMore={() => setMoreOpen(true)}
      />
      <MobileMoreMenu
        tenantSlug={tenantSlug}
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </div>
  );
}
