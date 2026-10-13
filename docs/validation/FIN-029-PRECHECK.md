# FIN-029 — pré-validação

- FIN-028 validada com GO em `docs/validation/FIN-028-RESULT.md`.
- Compras e parcelas existentes em `card_purchases` e `card_installments`.
- Divisão monetária exata e atribuição de ciclos cobertas pela suíte SQL da FIN-028.
- `invoice_cycles` já aplica as regras de fechamento, meses curtos e vencimento.
- Não existem faturas nem vínculos `invoice_id` antes desta migration; a alteração é incremental e preserva ciclos e parcelas.
- RLS, FK composta por tenant e permissões das tabelas financeiras existentes foram revisadas.

## GO

O schema de compras e parcelas está consistente: a FIN-029 pode adicionar faturas sem recriar compras, sem movimentar saldos e sem implementar a liquidação da FIN-030.
