# FIN-033 — pré-validação

## Resultado

**GO local.** A FIN-032 possui migration, RLS/RBAC, operações atômicas de aporte/retirada e testes SQL próprios. Os testes financeiros anteriores cobrem transações, liquidações, transferências, cartões, faturas, recorrências, planejamento, saldos e reservas.

## Cobertura reutilizada

| Área                                        | Evidência                                                       |
| ------------------------------------------- | --------------------------------------------------------------- |
| Saldos, caixa e competência                 | `supabase/tests/financial_balances.sql`, `monthly_planning.sql` |
| Transações, pagamentos parciais e reversões | `supabase/tests/transactions.sql`                               |
| Transferências e reversão                   | `supabase/tests/transfers.sql`                                  |
| Compras parceladas                          | `supabase/tests/card_purchases.sql`                             |
| Faturas e pagamentos sem dupla despesa      | `supabase/tests/card_invoices.sql`, `card_invoice_payments.sql` |
| Recorrências idempotentes                   | `supabase/tests/recurrences.sql`                                |
| Metas e reservas                            | `supabase/tests/goals_reserves.sql`                             |

## Lacuna coberta pela FIN-033

`supabase/tests/financial_consistency.sql` reconcilia os módulos na mesma fixture determinística: saldo inicial, receita e despesa liquidadas, lançamento previsto, transferência, aporte e retirada de reserva, idempotência, rollback, moedas e isolamento/RBAC.

Não foram usados dados de produção, mocks de saldo ou alterações remotas.
