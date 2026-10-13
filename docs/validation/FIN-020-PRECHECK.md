# FIN-020 — Pré-validação

**Data:** 10/10/2026  
**Decisão:** GO

## Evidências

- FIN-018 e FIN-019 implementadas nas migrations `20261010000900_create_accounts.sql` e `20261010001000_create_transactions.sql`.
- Migration corretiva `20261010001100_harden_transaction_account_currency.sql` aplicada no Supabase Local.
- `accounts`, `transactions`, `transaction_settlements` e `account_movements` possuem FKs, constraints, índices e RLS.
- Testes locais cobrem isolamento multi-tenant, RBAC, liquidações parciais/integrais, idempotência, precisão e ausência de movimento para previsão/pendência.
- `npx supabase test db`: 8 arquivos e 168 testes aprovados.

## Regras confirmadas

- Previsões e pendências não alteram o livro de movimentos.
- Status pago é derivado de liquidação confirmada.
- Categoria e conta precisam pertencer ao mesmo tenant; a conta também precisa ter a mesma moeda.
- Liquidação é executada somente pela RPC transacional existente.
- Não há `service_role` no navegador.

O bloqueio de pré-validação foi removido. A implementação da interface FIN-020 pode ser considerada em escopo.
