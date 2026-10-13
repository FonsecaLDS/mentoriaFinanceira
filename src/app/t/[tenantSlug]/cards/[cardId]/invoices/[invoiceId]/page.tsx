import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAccounts } from "@/features/accounts/services/account.service";
import { InvoiceDetails } from "@/features/cards/components/card-details";
import {
  getCardInvoice,
  listCardInstallments,
  listCardInvoicePayments,
  listCardPurchases,
  listInvoiceCycles,
} from "@/features/card-purchases/services/purchase.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; cardId: string; invoiceId: string }>;
}) {
  const { tenantSlug, cardId, invoiceId } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [
    { data: invoice },
    { data: installments },
    { data: payments },
    { data: cycles },
    { data: purchases },
    { data: accounts },
  ] = await Promise.all([
    getCardInvoice(client, tenant.id, invoiceId),
    listCardInstallments(client, tenant.id),
    listCardInvoicePayments(client, tenant.id, invoiceId),
    listInvoiceCycles(client, tenant.id, cardId),
    listCardPurchases(client, tenant.id, cardId),
    listAccounts(client, tenant.id, "active"),
  ]);
  if (!invoice || invoice.card_id !== cardId) notFound();
  const cycle =
    (cycles ?? []).find((item) => item.id === invoice.invoice_cycle_id) ?? null;
  return (
    <PageContainer>
      <PageHeader
        title="Detalhes da fatura"
        description="Parcelas, pagamentos e valor pendente."
      />
      <InvoiceDetails
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        invoice={invoice}
        cycle={cycle}
        installments={(installments ?? []).filter(
          (item) => item.invoice_id === invoiceId,
        )}
        purchases={purchases ?? []}
        payments={payments ?? []}
        accounts={accounts ?? []}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
      />
    </PageContainer>
  );
}
