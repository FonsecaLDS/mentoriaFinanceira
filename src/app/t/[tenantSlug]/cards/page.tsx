import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAccounts } from "@/features/accounts/services/account.service";
import { CardManager } from "@/features/cards/components/card-manager";
import { listCards } from "@/features/cards/services/card.service";
import {
  listAllCardInvoicePayments,
  listCardInstallments,
  listCardInvoices,
  sumMoney,
  subtractMoney,
} from "@/features/card-purchases/services/purchase.service";
import { getTenantContext } from "@/lib/tenant-context";

export default async function CardsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [
    { data: cards },
    { data: accounts },
    { data: invoices },
    { data: payments },
    { data: installments },
  ] = await Promise.all([
    listCards(client, tenant.id),
    listAccounts(client, tenant.id, "active"),
    listCardInvoices(client, tenant.id),
    listAllCardInvoicePayments(client, tenant.id),
    listCardInstallments(client, tenant.id),
  ]);
  const currencies = [
    ...new Set(
      (accounts ?? [])
        .map((account) => account.currency)
        .concat(tenant.base_currency),
    ),
  ];
  const summaries = Object.fromEntries(
    (cards ?? []).map((card) => {
      const cardInvoices = (invoices ?? []).filter(
        (invoice) => invoice.card_id === card.id,
      );
      const cardPayments = payments ?? [];
      const pendingInvoices = cardInvoices
        .filter((invoice) => invoice.status !== "paid")
        .map((invoice) => {
          const paid = sumMoney(
            cardPayments
              .filter(
                (payment) =>
                  payment.invoice_id === invoice.id && !payment.reversed_at,
              )
              .map((payment) => payment.amount),
          );
          return subtractMoney(invoice.total_amount, paid);
        });
      const unbilled = (installments ?? [])
        .filter(
          (installment) =>
            installment.card_id === card.id && !installment.invoice_id,
        )
        .map((installment) => installment.amount);
      const used = sumMoney([...pendingInvoices, ...unbilled]);
      return [
        card.id,
        {
          used,
          available: subtractMoney(card.credit_limit, used),
          nextInvoice: pendingInvoices[0] ?? null,
        },
      ];
    }),
  );
  return (
    <PageContainer>
      <PageHeader
        title="Cartões"
        description="Cadastre instrumentos de crédito sem misturá-los às contas de dinheiro livre."
      />
      <CardManager
        tenantId={tenant.id}
        cards={cards ?? []}
        accounts={accounts ?? []}
        currencies={currencies}
        canManage={["owner", "admin", "editor"].includes(membership.role)}
        tenantSlug={tenantSlug}
        summaries={summaries}
      />
    </PageContainer>
  );
}
