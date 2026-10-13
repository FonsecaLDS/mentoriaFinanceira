# Contas financeiras (FIN-018)

## Modelo e tipos

`accounts` pertence a um tenant e suporta `checking`, `savings`, `cash`, `digital_wallet`, `benefit`, `investment_tracking` e `other`. A conta de benefício permanece identificada pelo tipo e não é tratada automaticamente como dinheiro livre.

O saldo inicial é uma posição histórica composta por `opening_balance` (`NUMERIC(19,4)`) e `opening_date`. Não existe `current_balance`: o saldo atual será derivado de movimentos confirmados quando `account_movements` for implementada.

## Moeda e histórico

A aplicação valida códigos ISO 4217 suportados pelo runtime de internacionalização e o banco exige código de três letras em maiúsculas. A entrada aceita até quatro casas decimais sem conversão binária. A data-base não pode ser futura.

Enquanto não houver movimentos, dados cadastrais e saldo inicial podem ser editados por usuários autorizados. A migration já prepara o bloqueio de moeda, saldo e data quando uma futura `account_movements` possuir registros para a conta. Alterações são registradas em `audit_logs`.

## Arquivamento e permissões

Arquivar define `is_active = false` e `archived_at`; reativar limpa o timestamp. Não há DELETE para o papel da aplicação. Membros ativos leem; `owner`, `admin` e `editor` criam/editam/arquivam; `viewer` não modifica.

## Rotas e limitações

- `/t/[tenantSlug]/accounts`: cadastro, busca, filtro e arquivamento.
- `/t/[tenantSlug]/accounts/[id]`: dados cadastrais, saldo inicial e estado vazio de movimentações.

Transações, transferências, cartões, conciliação bancária e saldo atual não fazem parte desta entrega.

## Testes

`supabase/tests/accounts.sql` cobre RLS, isolamento, tipos, precisão, data futura, duplicidade, arquivamento, auditoria, RBAC e ausência de exclusão física.
