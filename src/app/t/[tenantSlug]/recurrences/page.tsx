import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listTransactionOptions } from "@/features/transactions/services/transaction.service";
import { RecurrenceManager } from "@/features/recurrences/components/recurrence-manager";
import { listRecurrences } from "@/features/recurrences/services/recurrence.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function RecurrencesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [{ data: rules }, options] = await Promise.all([
    listRecurrences(client, tenant.id),
    listTransactionOptions(client, tenant.id),
  ]);
  const currencies = [
    ...new Set(
      options.accounts
        .map((item) => item.currency)
        .concat(tenant.base_currency),
    ),
  ];
  return (
    <PageContainer>
      <PageHeader
        title="Recorrências"
        description="Regras que geram lançamentos previstos sem movimentar saldos automaticamente."
      />
      <RecurrenceManager
        tenantId={tenant.id}
        rules={rules ?? []}
        categories={options.categories}
        accounts={options.accounts}
        people={options.people}
        costCenters={options.costCenters}
        currencies={currencies}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
