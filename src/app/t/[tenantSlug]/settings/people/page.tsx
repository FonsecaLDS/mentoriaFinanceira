import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogManager } from "@/features/people-cost-centers/components/catalog-manager";
import { listPeople } from "@/features/people-cost-centers/services/catalog.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function PeopleSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [{ data: people }, { data: memberRows }] = await Promise.all([
    listPeople(client, tenant.id),
    client.rpc("list_tenant_members", { p_tenant_id: tenant.id }),
  ]);
  const members = (memberRows ?? []).map((row) => ({
    user_id: row.user_id,
    label: row.full_name || row.email || row.user_id,
  }));
  return (
    <PageContainer>
      <PageHeader
        title="Responsáveis"
        description={`Atribua lançamentos a pessoas de ${tenant.name}.`}
      />
      <CatalogManager
        kind="people"
        tenantId={tenant.id}
        records={people ?? []}
        members={members}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
