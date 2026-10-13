import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MembersPage } from "@/features/members/components/members-page";
import { getTenantContext } from "@/lib/tenant-context";

export default async function MembersSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, user, membership } =
    await getTenantContext(tenantSlug);
  if (!tenant || !user || !membership) notFound();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    client.rpc("list_tenant_members", { p_tenant_id: tenant.id }),
    client
      .from("tenant_invitations")
      .select("id, email, role, status, expires_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),
  ]);
  const current = members?.find((member) => member.user_id === user.id);
  if (!current) notFound();
  return (
    <PageContainer>
      <PageHeader
        title="Membros"
        description={`Gerencie o acesso ao workspace ${tenant.name}.`}
      />
      <MembersPage
        tenantId={tenant.id}
        members={members ?? []}
        invitations={invitations ?? []}
        canManage={current.role === "owner" || current.role === "admin"}
      />
    </PageContainer>
  );
}
