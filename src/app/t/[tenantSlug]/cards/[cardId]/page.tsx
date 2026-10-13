import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CardDetails } from "@/features/cards/components/card-details";
import { getCard } from "@/features/cards/services/card.service";
import {
  listCardInstallments,
  listAllCardInvoicePayments,
  listCardInvoices,
  listCardPurchases,
  listInvoiceCycles,
} from "@/features/card-purchases/services/purchase.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function CardDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; cardId: string }>;
}) {
  const { tenantSlug, cardId } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [
    { data: card },
    { data: invoices },
    { data: cycles },
    { data: installments },
    { data: purchases },
    { data: payments },
  ] = await Promise.all([
    getCard(client, tenant.id, cardId),
    listCardInvoices(client, tenant.id, cardId),
    listInvoiceCycles(client, tenant.id, cardId),
    listCardInstallments(client, tenant.id, cardId),
    listCardPurchases(client, tenant.id, cardId),
    listAllCardInvoicePayments(client, tenant.id),
  ]);
  if (!card) notFound();
  return (
    <PageContainer>
      <PageHeader
        title={card.name}
        description="Resumo do cartão, faturas e parcelas futuras."
      />
      <CardDetails
        tenantSlug={tenantSlug}
        card={card}
        invoices={invoices ?? []}
        cycles={cycles ?? []}
        installments={installments ?? []}
        purchases={purchases ?? []}
        payments={payments ?? []}
      />
    </PageContainer>
  );
}
