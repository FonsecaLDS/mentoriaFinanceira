import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getTenantContext } from "@/lib/tenant-context";
import {
  listTransactionOptions,
  listTransactions,
  type TransactionFilters,
} from "@/features/transactions/services/transaction.service";
import { TransactionFilters as Filters } from "@/features/transactions/components/transaction-filters";
import { TransactionList } from "@/features/transactions/components/transaction-list";

type Params = Promise<{ tenantSlug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) =>
  Array.isArray(input) ? input[0] : input;
export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { client, tenant, membership } = await getTenantContext(tenantSlug);
  if (!tenant || !membership) notFound();
  const filters: TransactionFilters = {
    type: value(query.type),
    status: value(query.status),
    categoryId: value(query.category),
    accountId: value(query.account),
    personId: value(query.person),
    costCenterId: value(query.costCenter),
    from: value(query.from),
    to: value(query.to),
    minAmount: value(query.min),
    maxAmount: value(query.max),
    search: value(query.q),
    page: Number(value(query.page) || 1),
    pageSize: 20,
  };
  const [{ data: transactions, count }, options] = await Promise.all([
    listTransactions(client, tenant.id, filters),
    listTransactionOptions(client, tenant.id),
  ]);
  const names = Object.fromEntries(
    [
      ...options.categories,
      ...options.accounts,
      ...options.people,
      ...options.costCenters,
    ].map((item) => [item.id, item.name]),
  );
  const queryString = new URLSearchParams(
    Object.entries(query).flatMap(([key, raw]) =>
      raw === undefined ? [] : [[key, Array.isArray(raw) ? raw[0] : raw]],
    ),
  ).toString();
  return (
    <PageContainer>
      <PageHeader
        title="Transações"
        description={`Receitas e despesas de ${tenant.name}.`}
        actions={
          <Link
            href={`/t/${tenantSlug}/transactions/new`}
            className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-white"
          >
            Novo lançamento
          </Link>
        }
      />
      <div className="space-y-5">
        <Filters
          categories={options.categories}
          accounts={options.accounts}
          people={options.people}
          costCenters={options.costCenters}
        />
        <TransactionList
          tenantSlug={tenantSlug}
          transactions={transactions ?? []}
          names={names}
          page={filters.page ?? 1}
          pageSize={20}
          total={count ?? 0}
          query={queryString.replace(/(^|&)page=\d+/, "").replace(/^&/, "")}
        />
      </div>
    </PageContainer>
  );
}
