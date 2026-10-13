# Modelo de transações (FIN-019)

## Separação de conceitos

`transactions` representa uma receita ou despesa prevista/pendente. `transaction_settlements` representa a liquidação confirmada. `account_movements` é o livro efetivo e recebe exatamente um movimento por liquidação. Portanto, competência e vencimento não alteram saldo efetivo; somente a liquidação confirmada altera o livro.

Valores são magnitudes positivas em transações e liquidações. O movimento é assinado: receita positiva e despesa negativa. O saldo inicial de `accounts` não é transação nem receita.

## Estados

Os estados permitidos são `planned`, `pending`, `partially_paid`, `paid` e `cancelled`. A função `settle_transaction` recalcula o estado sob lock: zero liquidado permanece previsto/pendente, valor parcial vira `partially_paid` e o total vira `paid`. Transações canceladas não podem ser liquidadas; transações com liquidação não podem ser canceladas ou ter valor, moeda ou tipo alterados.

## Liquidação segura

`public.settle_transaction` é uma função `SECURITY DEFINER` atômica. Ela valida membership e role, bloqueia a transação e a conta, exige conta ativa e moeda igual, rejeita datas futuras e overpayment, grava a liquidação e o movimento na mesma operação e atualiza o estado. `idempotency_key` é única por tenant: repetir a mesma operação retorna a liquidação existente sem duplicar movimento; reutilizar a chave com payload diferente falha.

Inserções diretas em `transaction_settlements` e `account_movements` não são concedidas ao papel `authenticated`. As tabelas efetivas são legíveis apenas por membros ativos.

## Integridade

FKs compostas `(tenant_id, id)` impedem categoria, responsável, centro de custo, conta ou liquidação de outro tenant. Categoria precisa ter o mesmo tipo da transação. A precisão armazenada é `NUMERIC(19,4)` e os índices cobrem tenant, datas, status e conta.

## Limitações

Esta entrega não implementa formulário, dashboard, transferências, cartões, parcelamento, recorrências, estornos ou importação. Estornos devem ser uma operação futura rastreável; não se deve apagar movimentos confirmados.

## Testes

`supabase/tests/transactions.sql` cobre estados, pagamentos parciais e integrais, overpayment, idempotência, sinais dos movimentos, cancelamento, moedas, isolamento cross-tenant, RBAC, RLS e auditoria.
