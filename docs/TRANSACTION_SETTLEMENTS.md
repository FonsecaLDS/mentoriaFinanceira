# Liquidações de transações (FIN-021)

## Modelo

`transactions` representa a obrigação ou receita. `transaction_settlements` representa cada recebimento ou pagamento confirmado. `account_movements` é o livro efetivo: cada liquidação cria um movimento assinado e cada reversão cria um movimento compensatório ligado por `reversal_of_id`.

Previsões e pendências não alteram o livro. Receitas liquidadas geram movimento positivo; despesas liquidadas geram movimento negativo.

## Pagamentos parciais e integrais

`settle_transaction` bloqueia a transação, valida membership, role, conta ativa, moeda, data e valor pendente, e grava liquidação, movimento e novo status na mesma operação.

- parcial: `pending` ou `planned` → `partially_paid`;
- integral: → `paid`;
- overpayment: rejeitado;
- cancelada: não pode ser liquidada.

O status é derivado da soma das liquidações não revertidas.

## Idempotência

Cada liquidação exige `idempotency_key` única por tenant. Repetição com o mesmo payload retorna a liquidação existente sem criar outro movimento. Reutilização incompatível falha.

Reversões possuem sua própria `reversal_idempotency_key` e seguem a mesma regra.

## Reversões

`reverse_transaction_settlement` não apaga nem altera silenciosamente o histórico. A operação:

1. bloqueia a liquidação e a transação;
2. valida membership e role `owner`, `admin` ou `editor`;
3. cria movimento compensatório;
4. marca a liquidação com `reversed_at`, `reversed_by` e chave de reversão;
5. recalcula o status usando somente liquidações ativas.

Reverter todas as liquidações retorna a transação para `pending`. O histórico permanece disponível e auditado.

## Concorrência e segurança

As RPCs usam `FOR UPDATE` na transação, na liquidação existente e na conta. FKs compostas, RLS e grants impedem acesso cross-tenant e inserção direta em liquidações/movimentos pelo papel `authenticated`. A aplicação não usa `service_role`.

## Auditoria

Criação de liquidação gera `transaction.settled`. Atualização com reversão gera `transaction.settlement_reversed`. Alteração do status da transação também permanece na auditoria de transações.

## Interface

A tela de detalhes da transação permite receber/pagar parcialmente ou integralmente, mostra o pendente e o histórico, e oferece reversão com confirmação para papéis autorizados. A liquidação continua sendo executada somente pela RPC.

## Testes

`supabase/tests/transactions.sql` cobre previsões, pendências, receitas, despesas, parciais, integrais, overpayment, idempotência, reversão, RBAC, RLS, moeda e ausência de movimento indevido. A proteção contra concorrência é implementada pelos locks transacionais; um teste multi-processo automatizado permanece como cobertura futura.
