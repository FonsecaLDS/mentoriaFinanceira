# FIN-021 — Resultado

**Data:** 10/10/2026  
**Status:** implementado e validado localmente, com ressalva de concorrência multi-processo

## Entrega

- Liquidação integral e parcial pela RPC existente.
- Reversão rastreável com movimento compensatório.
- Reabertura para `pending` quando todas as liquidações forem revertidas.
- Idempotência independente para liquidação e reversão.
- Auditoria de liquidação e reversão.
- Ação de reversão na tela de detalhes, com confirmação e RBAC no servidor.
- Tipos Supabase atualizados.
- Documentação em `docs/TRANSACTION_SETTLEMENTS.md`.

## Migration

- `supabase/migrations/20261010001200_add_settlement_reversals.sql`

## Arquivos principais

- `src/features/transactions/actions/transaction.actions.ts`
- `src/features/transactions/components/transaction-actions.tsx`
- `src/features/transactions/schemas/transaction.schema.ts`
- `src/features/transactions/services/transaction.service.ts`
- `src/app/t/[tenantSlug]/transactions/[id]/page.tsx`
- `src/types/supabase.ts`
- `supabase/tests/transactions.sql`

## Validação executada

| Comando                           | Resultado                                          |
| --------------------------------- | -------------------------------------------------- |
| `npx supabase db reset --no-seed` | migration 012 aplicada em banco limpo              |
| `npx supabase test db`            | 177/177 testes aprovados                           |
| `npm run lint`                    | aprovado; 2 warnings do React Hook Form, sem erros |
| `npm run typecheck`               | aprovado                                           |
| `npm test -- --run`               | 18/18 testes aprovados                             |
| `npm run test:e2e`                | 1/1 smoke aprovado                                 |
| `npm run build`                   | aprovado                                           |

## Limitação conhecida

O teste concorrente com dois processos/sessões simultâneos não foi executado; a proteção está implementada com locks PostgreSQL e coberta por revisão/testes funcionais. Não foram executados commit, push, deploy ou migrations remotas.
