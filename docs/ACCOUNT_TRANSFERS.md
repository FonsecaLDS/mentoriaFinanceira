# Transferências entre contas

## Modelo

`transfers` pertence a um tenant e registra origem, destino, valor, moeda, data efetiva, descrição e chave de idempotência. A moeda precisa ser a mesma nas duas contas; não há câmbio nesta versão.

## Atomicidade e movimentos

`create_transfer` é uma RPC `SECURITY DEFINER` autorizada apenas para owner, admin e editor. Ela bloqueia as contas em ordem determinística, grava a transferência e cria exatamente dois `account_movements` na mesma transação: débito na origem e crédito no destino. Não cria `transactions`, portanto não entra em receitas ou despesas.

## Idempotência e reversão

A chave é única por tenant. Repetições com o mesmo payload retornam o registro existente; payload diferente falha. `reverse_transfer` nunca apaga os movimentos: cria dois movimentos compensatórios ligados por `reversal_of_id`, marca a transferência como revertida e registra auditoria.

## Segurança e limitações

RLS permite leitura somente a membros ativos do tenant. As RPCs validam autenticação, membership, role, contas ativas, tenant comum e moeda. Não há transferências internacionais, Pix, cartões, saldo redundante ou execução remota de banco.
