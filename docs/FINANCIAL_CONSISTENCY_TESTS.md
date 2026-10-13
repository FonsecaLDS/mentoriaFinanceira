# Testes de consistência financeira

## Escopo

A suíte de consistência combina os livros já existentes sem criar novas regras financeiras. O `account_movements` é a fonte do saldo efetivo; `transactions` representa obrigações/receitas; transferências e reservas movem patrimônio sem entrar no resultado de consumo.

## Matriz de cobertura

| Invariante                                   | Teste principal                                                       |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Saldo inicial + movimentos confirmados       | `financial_balances.sql`, `financial_consistency.sql`                 |
| Transferência consolidada igual a zero       | `transfers.sql`, `financial_consistency.sql`                          |
| Parcelas conservam o total                   | `card_purchases.sql`                                                  |
| Pagamento de fatura não duplica despesa      | `card_invoice_payments.sql`                                           |
| Pagamento parcial não excede pendência       | `card_invoice_payments.sql`, `transactions.sql`                       |
| Reversão preserva histórico                  | `transactions.sql`, `transfers.sql`, `card_invoice_payments.sql`      |
| Aporte não é despesa; retirada não é receita | `goals_reserves.sql`, `financial_consistency.sql`                     |
| Previsão não altera saldo efetivo            | `transactions.sql`, `recurrences.sql`, `financial_consistency.sql`    |
| Idempotência não duplica efeitos             | testes de cada módulo + `financial_consistency.sql`                   |
| Falha não deixa estado parcial               | `transactions.sql`, `goals_reserves.sql`, `financial_consistency.sql` |
| Isolamento tenant/RBAC                       | `rls_grants.sql`, testes de cada módulo e `financial_consistency.sql` |
| Moedas não são somadas sem conversão         | `financial_balances.sql`, `financial_consistency.sql`                 |

## Fixtures e execução

Os testes criam tenants, usuários, contas e lançamentos fictícios dentro de transações com `rollback`. Valores são `numeric` e usam seeds/IDs fixos. A suíte local é executada por `npx supabase test db` e também pelo job `database-tests` do CI existente (`npm run test:db`).

## Concorrência e limites

As funções de liquidação, transferência e reserva usam idempotência e locks/transações no banco. A suíte valida reprocessamento e limites, mas não afirma aprovação de carga concorrente real: esse ensaio depende de um ambiente de CI com múltiplas conexões e deve ser realizado antes de produção.

## Resultados

Consultar `docs/validation/FIN-033-RESULT.md` para a execução desta tarefa. Falhas de consistência, RLS ou dupla contabilização bloqueiam a liberação da próxima tarefa.
