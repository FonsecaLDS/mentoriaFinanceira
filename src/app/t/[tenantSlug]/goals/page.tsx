import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAccounts } from "@/features/accounts/services/account.service";
import { GoalsManager } from "@/features/goals/components/goals-manager";
import {
  listGoals,
  listReserveMovements,
  listReserves,
} from "@/features/goals/services/goal.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [
    { data: goals },
    { data: reserves },
    { data: movements },
    { data: accounts },
  ] = await Promise.all([
    listGoals(client, tenant.id),
    listReserves(client, tenant.id),
    listReserveMovements(client, tenant.id),
    listAccounts(client, tenant.id, "active"),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title="Metas e reservas"
        description="Separe recursos, acompanhe o progresso e preserve o patrimônio sem criar receitas ou despesas artificiais."
      />
      <GoalsManager
        tenantId={tenant.id}
        goals={goals ?? []}
        reserves={reserves ?? []}
        movements={movements ?? []}
        accounts={(accounts ?? []).map((account) => ({
          id: account.id,
          name: account.name,
          currency: account.currency,
          is_active: account.is_active,
        }))}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
