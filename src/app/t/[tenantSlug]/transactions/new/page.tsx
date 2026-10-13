import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { listTransactionOptions } from "@/features/transactions/services/transaction.service";
import { getTenantContext } from "@/lib/tenant-context";
export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const options = await listTransactionOptions(client, tenant.id);
  if (!membership || !["owner", "admin", "editor"].includes(membership.role))
    notFound();
  return (
    <PageContainer>
      <PageHeader
        title="Novo lançamento"
        description={`Registre uma receita ou despesa em ${tenant.name}.`}
      />
      <TransactionForm
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        categories={options.categories}
        accounts={options.accounts}
        people={options.people}
        costCenters={options.costCenters}
      />
    </PageContainer>
  );
}
