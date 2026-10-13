# FIN-023 — resultado

Implementada a migration `20261010001400_add_financial_balance_queries.sql` e a camada `src/features/balances/services/balance.service.ts`.

Consultas entregues:

- `get_account_balance` / `get_account_balances`
- `get_cash_result`
- `get_accrual_result`
- `get_projected_balance`
- `get_financial_summary`

Validações executadas:

- `npx supabase db reset --no-seed`: aprovado localmente.
- `npx supabase test db`: aprovado — 10 arquivos, 225 testes.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado com 2 avisos preexistentes de `watch()` do React Hook Form.
- `npm test -- --run`: aprovado — 6 arquivos, 18 testes.
- `npm run build`: aprovado.
- `npm run format:check`: aprovado.

Os testes cobrem saldo inicial, liquidações, pagamento parcial/reversão, transferências, competência, projeção, benefícios restritos e separação de moedas. Nenhuma alteração remota, commit ou push foi executado.
