import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAccounts } from "@/features/accounts/services/account.service";
import { listCategories } from "@/features/categories/services/category.service";
import { BudgetManager } from "@/features/budgets/components/budget-manager";
import { getMonthlyBudgets } from "@/features/budgets/services/budget.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function BudgetsPage({
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
  const [{ data: budgets }, { data: categories }, { data: accounts }] =
    await Promise.all([
      getMonthlyBudgets(client, tenant.id, year, month, regime),
      listCategories(client, tenant.id, { status: "all" }),
      listAccounts(client, tenant.id, "active"),
    ]);
  const currencies = [
    ...new Set((accounts ?? []).map((account) => account.currency)),
  ];
  return (
    <PageContainer>
      <PageHeader
        title="Orçamentos"
        description={`Acompanhe limites e consumo de ${tenant.name}.`}
      />
      <BudgetManager
        tenantId={tenant.id}
        year={year}
        month={month}
        regime={regime}
        budgets={budgets ?? []}
        categories={(categories ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
          parent_id: category.parent_id,
        }))}
        currencies={currencies.length ? currencies : [tenant.base_currency]}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
