import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getTenantContext } from "@/lib/tenant-context";

export default async function TenantLayout({
  children,
  params,
}: LayoutProps<"/t/[tenantSlug]">) {
  const { tenantSlug } = await params;
  const { user, tenant, tenants } = await getTenantContext(tenantSlug);
  if (!user)
    redirect(`/login?next=/t/${encodeURIComponent(tenantSlug)}/dashboard`);
  if (!tenant) notFound();
  return (
    <AppShell
      tenantSlug={tenantSlug}
      tenants={tenants}
      email={user.email ?? "Conta"}
    >
      {children}
    </AppShell>
  );
}
