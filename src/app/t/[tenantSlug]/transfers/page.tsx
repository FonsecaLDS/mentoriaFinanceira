import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAccounts } from "@/features/accounts/services/account.service";
import { TransferManager } from "@/features/transfers/components/transfer-manager";
import { listTransfers } from "@/features/transfers/services/transfer.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function TransfersPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [{ data: accounts }, { data: transfers }] = await Promise.all([
    listAccounts(client, tenant.id, "all"),
    listTransfers(client, tenant.id),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title="Transferências"
        description="Mova valores entre contas do mesmo espaço sem gerar receita ou despesa."
      />
      <TransferManager
        tenantId={tenant.id}
        accounts={accounts ?? []}
        transfers={transfers ?? []}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
