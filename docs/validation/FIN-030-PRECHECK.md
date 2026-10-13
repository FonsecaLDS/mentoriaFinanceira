# FIN-030 — pré-validação

- FIN-029 validada com GO em `docs/validation/FIN-029-RESULT.md`.
- Faturas únicas por ciclo, totais reconciliados e fechamento protegido.
- `settle_transaction` e `reverse_transaction_settlement` existentes foram revisados.
- Para cartão, o pagamento usará um movimento agregado vinculado diretamente à fatura; não serão criadas liquidações duplicadas para cada parcela.
- `account_movements` já suporta reversões e será estendido com uma origem específica de pagamento de fatura.
- RLS, FK composta por tenant e RBAC foram revisados antes da migration.

## GO

As faturas e os ciclos estão consistentes. A FIN-030 pode adicionar pagamentos agregados, parciais, integrais e reversões sem recriar despesas de consumo.
