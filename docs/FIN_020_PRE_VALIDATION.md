# FIN-020 — Pré-validação financeira

## Resumo executivo

Resultado: **NO-GO**.

A estrutura de FIN-018 e FIN-019 foi revisada estaticamente, mas a evidência obrigatória de execução do PostgreSQL local não está disponível neste ambiente. Docker e Podman não estão instalados, portanto não é seguro iniciar a implementação da interface de transações.

## Estado da FIN-018

Migration verificada: `20261010000900_create_accounts.sql`.

- `accounts` possui `tenant_id`, FK, índices por tenant, RLS e políticas para membros ativos.
- `opening_balance` usa `NUMERIC(19,4)` e `opening_date`; não existe `current_balance` persistido.
- Contas de benefício permanecem identificadas pelo tipo `benefit`.
- Arquivamento usa `is_active` e `archived_at`; DELETE não é concedido ao papel da aplicação.
- Alterações de saldo inicial/moeda/data são auditadas e preparadas para bloqueio após movimentos.
- O isolamento cross-tenant depende de execução real das políticas e FKs; não foi possível comprová-lo no banco local.

## Estado da FIN-019

Migration verificada: `20261010001000_create_transactions.sql`.

- `transactions` separa receita/despesa, competência, vencimento e status.
- `transaction_settlements` registra liquidações parciais/integrais.
- `account_movements` é o livro de movimentos confirmados.
- FKs compostas mantêm tenant, conta, categoria, responsável e centro de custo consistentes.
- `settle_transaction` usa `SECURITY DEFINER`, lock da transação, validação de moeda, overpayment e chave de idempotência.
- Inserção direta em liquidações/movimentos não é concedida ao papel `authenticated`.
- Estados, cancelamento e campos financeiros após liquidação têm triggers de proteção.
- Auditoria é registrada em `audit_logs`.
- Reversões/estornos ainda não existem; permanecem fora do escopo FIN-019.

## Migrations, tabelas e relacionamentos

- `20261010000900_create_accounts.sql`: `accounts`.
- `20261010001000_create_transactions.sql`: `transactions`, `transaction_settlements`, `account_movements`.
- `transactions` referencia contas, categorias, responsáveis e centros de custo com FKs compostas por tenant.
- Uma liquidação gera um único movimento efetivo por `settlement_id`.

## Regras financeiras revisadas

As regras de caixa versus competência, saldo inicial, benefícios restritos, pagamentos parciais, liquidação integral, overpayment, idempotência e ausência de dupla contabilização estão representadas no schema e na RPC. A correção efetiva sob concorrência ainda precisa de teste no PostgreSQL.

## Código e segurança

- Não há `service_role` no navegador.
- RLS e RBAC estão presentes nas tabelas financeiras.
- A interface ainda não foi iniciada, conforme a política de bloqueio.
- Consultas da futura listagem deverão usar paginação server-side; não há alteração necessária nesta fase.

## Testes executados

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado com warning preexistente do React Compiler em `category-manager.tsx`.
- `npm test -- --run`: 14 testes aprovados.
- `npm run build`: aprovado.
- `npx supabase status`: não executado com sucesso — Docker/Podman ausente.
- `npx supabase test db`: não executado com sucesso — Docker/Podman ausente.

Os testes SQL relevantes estão preparados em `supabase/tests/accounts.sql` e `supabase/tests/transactions.sql`, mas não constituem evidência aprovada enquanto o banco local não puder ser iniciado.

## Falhas e riscos remanescentes

1. **Bloqueador:** RLS, FKs, triggers, RPC, locking, idempotência e rollback não foram executados no PostgreSQL.
2. A validação de moeda no banco garante formato ISO de três letras; a lista de códigos válidos é reforçada na aplicação.
3. Reversões/estornos ainda não estão implementados, conforme o escopo FIN-019.

## Decisão

**NO-GO.** A FIN-020 não deve iniciar enquanto os testes SQL essenciais não forem executados e aprovados em Supabase Local. Nenhuma tela, action ou alteração estrutural da FIN-020 foi criada.

## Próximo passo mínimo

Disponibilizar Docker Desktop ou Podman, executar `npx supabase start` e então `npx supabase test db`. Se todos os testes financeiros passarem, reavaliar o GO e iniciar a fase 2.

## Revalidação em 10/10/2026

Foi tentada novamente a execução de `npx supabase status` e `npx supabase test db`. O ambiente retornou `docker: command not found` e também não encontrou Podman. O resultado permanece **NO-GO**; a implementação da UI continua não iniciada.

## Revalidação concluída — GO

O Docker Desktop foi localizado em `C:\Users\João Vitor Fonseca\AppData\Local\Programs\DockerDesktop\resources\bin` e o PATH da sessão foi ajustado. O stack Supabase local foi reiniciado, o banco foi resetado e todas as migrations foram aplicadas.

Resultado final de `npx supabase test db`:

- 8 arquivos de teste aprovados.
- 168 testes aprovados.
- FIN-018, FIN-019, RLS, tenancy, auditoria e grants aprovados.
- Nenhuma falha crítica financeira aberta na validação local.

Decisão atual: **GO**. A fase 2 da FIN-020 está autorizada a começar.
