import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AccountManager } from "@/features/accounts/components/account-manager";
import { listAccounts } from "@/features/accounts/services/account.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const { data: accounts } = await listAccounts(client, tenant.id, "all");
  return (
    <PageContainer>
      <PageHeader
        title="Contas"
        description={`Gerencie contas e posições iniciais de ${tenant.name}.`}
      />
      <AccountManager
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        accounts={accounts ?? []}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
