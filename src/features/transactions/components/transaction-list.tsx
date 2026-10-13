import Link from "next/link";
type Transaction = {
  id: string;
  type: string;
  description: string;
  amount: string | number;
  currency: string;
  competence_date: string;
  status: string;
  category_id: string | null;
  account_id: string | null;
};
const statusLabels: Record<string, string> = {
  planned: "Prevista",
  pending: "Pendente",
  partially_paid: "Parcial",
  paid: "Paga",
  cancelled: "Cancelada",
};
const money = (value: string | number, currency: string) =>
  `${currency} ${String(value).replace(".", ",")}`;
export function TransactionList({
  tenantSlug,
  transactions,
  names,
  page,
  pageSize,
  total,
  query,
}: {
  tenantSlug: string;
  transactions: Transaction[];
  names: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
  query: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) =>
    `/t/${tenantSlug}/transactions?${query ? `${query}&` : ""}page=${next}`;
  const row = (item: Transaction, mobile = false) => (
    <div
      className={
        mobile
          ? "space-y-2"
          : "grid grid-cols-[1fr_1.7fr_1fr_1fr_1fr_auto] items-center gap-3"
      }
    >
      <div className="text-sm text-[var(--text-secondary)]">
        {item.competence_date}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{item.description}</p>
        <p className="truncate text-sm text-[var(--text-secondary)]">
          {names[item.category_id ?? ""] ?? "Sem categoria"}
          {item.account_id ? ` · ${names[item.account_id] ?? "Conta"}` : ""}
        </p>
      </div>
      <span
        className={`text-sm font-semibold ${item.type === "income" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
      >
        {item.type === "income" ? "+" : "-"}
        {money(item.amount, item.currency)}
      </span>
      <span className="text-sm">
        {statusLabels[item.status] ?? item.status}
      </span>
      <Link
        href={`/t/${tenantSlug}/transactions/${item.id}`}
        className="text-sm font-semibold text-[var(--primary)]"
      >
        Abrir
      </Link>
    </div>
  );
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="hidden border-b border-[var(--border)] p-4 text-xs font-semibold text-[var(--text-secondary)] md:block">
        Data · Descrição · Valor · Status · Ação
      </div>
      <div className="hidden divide-y divide-[var(--border)] md:block">
        {transactions.map((item) => (
          <div key={item.id} className="p-4">
            {row(item)}
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)] md:hidden">
        {transactions.map((item) => (
          <div key={item.id} className="p-4">
            {row(item, true)}
          </div>
        ))}
      </div>
      {transactions.length === 0 && (
        <p className="p-8 text-center text-sm text-[var(--text-secondary)]">
          Nenhuma transação encontrada.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4 text-sm">
        <span>{total} registro(s)</span>
        <div className="flex items-center gap-2">
          <Link
            aria-disabled={page <= 1}
            href={page > 1 ? href(page - 1) : href(1)}
            className={`rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Anterior
          </Link>
          <span>
            Página {page} de {pages}
          </span>
          <Link
            aria-disabled={page >= pages}
            href={page < pages ? href(page + 1) : href(pages)}
            className={`rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
          >
            Próxima
          </Link>
        </div>
      </div>
    </section>
  );
}
