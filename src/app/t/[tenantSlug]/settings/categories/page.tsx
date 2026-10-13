import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { listCategories } from "@/features/categories/services/category.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function CategoriesSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const { data: categories } = await listCategories(client, tenant.id, {
    status: "all",
  });
  const canManage = ["owner", "admin", "editor"].includes(membership.role);
  const canDelete = ["owner", "admin"].includes(membership.role);
  return (
    <PageContainer>
      <PageHeader
        title="Categorias"
        description={`Organize receitas e despesas de ${tenant.name}.`}
      />
      <CategoryManager
        tenantId={tenant.id}
        categories={categories ?? []}
        canManage={canManage}
        canDelete={canDelete}
      />
    </PageContainer>
  );
}
