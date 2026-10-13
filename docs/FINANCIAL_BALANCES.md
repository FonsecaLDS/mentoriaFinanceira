# Cálculos financeiros

## Fontes de verdade

`accounts.opening_balance` com `opening_date` é a posição inicial. `account_movements` é o livro efetivo: liquidações geram movimentos assinados, transferências geram débito e crédito, e reversões geram movimentos compensatórios. Não existe coluna de saldo atual.

## Consultas centralizadas

As RPCs da migration `20261010001400_add_financial_balance_queries.sql` agregam no PostgreSQL e validam membership ativo:

- `get_account_balance` e `get_account_balances`: saldo inicial mais movimentos até a data solicitada.
- `get_cash_result`: liquidações não revertidas no período; transferências e saldo inicial ficam fora.
- `get_accrual_result`: transações não canceladas por `competence_date`, independentemente do pagamento.
- `get_projected_balance`: saldo efetivo mais receitas e despesas pendentes com vencimento futuro.
- `get_financial_summary`: consolida indicadores por moeda, sem somar moedas diferentes.

## Benefícios, reversões e precisão

Contas `benefit` aparecem como `restricted_balance` e não entram em `available_balance`. Reversões não apagam histórico e deixam de contribuir para caixa confirmado. Todas as agregações usam `NUMERIC(19,4)`; a aplicação deve manter os valores como strings, sem `float`.

## Performance e segurança

As agregações são server-side, filtradas por tenant e apoiadas pelos índices existentes em contas, transações, liquidações e movimentos. As funções não aceitam acesso de anônimo e não substituem RLS; o tenant é validado por `is_active_tenant_member`.
