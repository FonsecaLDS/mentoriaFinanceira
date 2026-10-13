import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAccounts } from "@/features/accounts/services/account.service";
import { listCategories } from "@/features/categories/services/category.service";
import { PlanningManager } from "@/features/planning/components/planning-manager";
import {
  getMonthlyComparison,
  getMonthlySummary,
} from "@/features/planning/services/planning.service";
import { listPeople } from "@/features/people-cost-centers/services/catalog.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function PlanningPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ month?: string; regime?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const now = new Date();
  const match = query.month?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  const regime = query.regime === "cash" ? "cash" : "competence";
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [
    { data: summary },
    { data: comparison },
    { data: accounts },
    { data: categories },
    { data: people },
  ] = await Promise.all([
    getMonthlySummary(client, tenant.id, year, month, regime),
    getMonthlyComparison(client, tenant.id, year, month, regime),
    listAccounts(client, tenant.id, "active"),
    listCategories(client, tenant.id, { status: "active" }),
    listPeople(client, tenant.id, "active"),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title="Planejamento"
        description={`Compare previsto e realizado de ${tenant.name}.`}
      />
      <PlanningManager
        tenantId={tenant.id}
        year={year}
        month={month}
        regime={regime}
        summary={summary ?? []}
        comparison={comparison ?? []}
        accounts={(accounts ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          currency: item.currency,
        }))}
        categories={(categories ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
        }))}
        people={(people ?? []).map((item) => ({
          id: item.id,
          name: item.name,
        }))}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
