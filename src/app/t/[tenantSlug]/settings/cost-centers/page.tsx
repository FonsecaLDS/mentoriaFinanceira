import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogManager } from "@/features/people-cost-centers/components/catalog-manager";
import { listCostCenters } from "@/features/people-cost-centers/services/catalog.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function CostCentersSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const { data: costCenters } = await listCostCenters(client, tenant.id);
  return (
    <PageContainer>
      <PageHeader
        title="Centros de custo"
        description={`Agrupe receitas e despesas por finalidade em ${tenant.name}.`}
      />
      <CatalogManager
        kind="cost-centers"
        tenantId={tenant.id}
        records={costCenters ?? []}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
