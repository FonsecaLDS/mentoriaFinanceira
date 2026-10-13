import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getTenantContext } from "@/lib/tenant-context";
import {
  getTransaction,
  listSettlements,
  listTransactionOptions,
  pendingAmount,
} from "@/features/transactions/services/transaction.service";
import { TransactionForm } from "@/features/transactions/components/transaction-form";
import {
  SettlementActions,
  TransactionActions,
} from "@/features/transactions/components/transaction-actions";
import { SettlementPanel } from "@/features/transactions/components/settlement-panel";
const money = (value: string | number, currency: string) =>
  `${currency} ${String(value).replace(".", ",")}`;
export default async function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const [{ data: transaction }, options] = await Promise.all([
    getTransaction(client, tenant.id, id),
    listTransactionOptions(client, tenant.id),
  ]);
  if (!transaction || !membership) notFound();
  const { data: settlements } = await listSettlements(client, tenant.id, id);
  const canManage = ["owner", "admin", "editor"].includes(membership.role);
  const canEdit =
    canManage && ["planned", "pending"].includes(transaction.status);
  const names = Object.fromEntries(
    [
      ...options.categories,
      ...options.accounts,
      ...options.people,
      ...options.costCenters,
    ].map((item) => [item.id, item.name]),
  );
  const initial = canEdit
    ? {
        tenantId: tenant.id,
        type: transaction.type as "income" | "expense",
        description: transaction.description,
        amount: String(transaction.amount),
        currency: transaction.currency,
        categoryId: transaction.category_id ?? "",
        personId: transaction.person_id ?? "",
        costCenterId: transaction.cost_center_id ?? "",
        accountId: transaction.account_id ?? "",
        competenceDate: transaction.competence_date,
        dueDate: transaction.due_date ?? "",
        status: transaction.status as "planned" | "pending",
        notes: transaction.notes ?? "",
        id: transaction.id,
      }
    : undefined;
  return (
    <PageContainer>
      <PageHeader
        title={transaction.description}
        description={`Detalhes do lançamento de ${tenant.name}.`}
        actions={
          <Link
            href={`/t/${tenantSlug}/transactions`}
            className="text-sm font-semibold text-[var(--primary)]"
          >
            Voltar
          </Link>
        }
      />
      <div className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Valor</p>
              <p
                className={`text-xl font-bold ${transaction.type === "income" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
              >
                {transaction.type === "income" ? "+" : "-"}
                {money(transaction.amount, transaction.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                Competência
              </p>
              <p className="font-semibold">{transaction.competence_date}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Status</p>
              <p className="font-semibold">{transaction.status}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Categoria</p>
              <p>{names[transaction.category_id ?? ""] ?? "Sem categoria"}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Conta</p>
              <p>{names[transaction.account_id ?? ""] ?? "Sem conta"}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Vencimento</p>
              <p>{transaction.due_date ?? "Não informado"}</p>
            </div>
          </div>
          {canManage && transaction.status !== "cancelled" && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {canEdit && (
                <span className="text-sm text-[var(--text-secondary)]">
                  Edite os dados abaixo.
                </span>
              )}
              {["planned", "pending"].includes(transaction.status) && (
                <TransactionActions tenantId={tenant.id} id={transaction.id} />
              )}
            </div>
          )}
        </section>
        {canEdit && (
          <TransactionForm
            tenantId={tenant.id}
            tenantSlug={tenantSlug}
            initial={initial}
            categories={options.categories}
            accounts={options.accounts}
            people={options.people}
            costCenters={options.costCenters}
          />
        )}
        {["pending", "partially_paid"].includes(transaction.status) &&
          canManage && (
            <SettlementPanel
              tenantId={tenant.id}
              transactionId={transaction.id}
              pending={pendingAmount(transaction.amount, settlements ?? [])}
              accounts={options.accounts.filter((account) => account.is_active)}
            />
          )}
        {settlements && settlements.length > 0 && (
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold">Histórico de liquidações</h2>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex flex-wrap justify-between gap-3 py-3 text-sm"
                >
                  <span>
                    {new Date(settlement.settled_at).toLocaleDateString(
                      "pt-BR",
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(settlement.amount, transaction.currency)}
                  </span>
                  <span>{names[settlement.account_id] ?? "Conta"}</span>
                  {settlement.reversed_at ? (
                    <span className="text-sm text-[var(--danger)]">
                      Revertida
                    </span>
                  ) : canManage ? (
                    <SettlementActions
                      tenantId={tenant.id}
                      settlementId={settlement.id}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
