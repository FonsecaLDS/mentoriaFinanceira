import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import {
  getDashboardSummary,
  getMonthBounds,
} from "@/features/dashboard/services/dashboard.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    month?: string;
    regime?: string;
    currency?: string;
    accountId?: string;
    granularity?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const month = /^\d{4}-\d{2}$/.test(query.month ?? "")
    ? query.month!
    : new Date().toISOString().slice(0, 7);
  const regime = query.regime === "competence" ? "competence" : "cash";
  const granularity = ["day", "week", "month"].includes(query.granularity ?? "")
    ? (query.granularity as "day" | "week" | "month")
    : "month";
  const data = await getDashboardSummary(client, tenant.id, {
    ...getMonthBounds(month),
    asOf: new Date().toISOString(),
    regime,
    currency: query.currency,
    accountId: query.accountId,
    granularity,
  });
  return (
    <PageContainer>
      <PageHeader
        title="Visão geral"
        description={`Indicadores financeiros de ${tenant.name}.`}
      />
      <DashboardView
        tenantSlug={tenantSlug}
        month={month}
        regime={regime}
        currency={query.currency}
        accountId={query.accountId}
        granularity={granularity}
        data={data}
      />
    </PageContainer>
  );
}
