import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getAccount } from "@/features/accounts/services/account.service";
import { getTenantContext } from "@/lib/tenant-context";

const typeLabels: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  digital_wallet: "Carteira digital",
  benefit: "Benefício",
  investment_tracking: "Acompanhamento de investimento",
  other: "Outra",
};
export default async function AccountDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const { data: account } = await getAccount(client, tenant.id, id);
  if (!account || !membership) notFound();
  return (
    <PageContainer>
      <PageHeader
        title={account.name}
        description={`Detalhes da conta de ${tenant.name}.`}
      />
      <div className="space-y-6">
        <section className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Tipo</p>
            <p className="font-semibold">
              {typeLabels[account.type] ?? account.type}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Instituição</p>
            <p className="font-semibold">
              {account.institution_name || "Não informada"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              Saldo inicial
            </p>
            <p className="font-semibold tabular-nums">
              {account.opening_balance} {account.currency}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Data-base</p>
            <p className="font-semibold">{account.opening_date}</p>
          </div>
        </section>
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Movimentações</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Ainda não há movimentações nesta conta. O saldo atual será calculado
            quando o módulo financeiro for implementado.
          </p>
        </section>
        <Link
          href={`/t/${tenantSlug}/accounts`}
          className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold"
        >
          Voltar para contas
        </Link>
      </div>
    </PageContainer>
  );
}
