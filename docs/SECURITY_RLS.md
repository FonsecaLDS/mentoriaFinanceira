# Segurança RLS e isolamento multi-tenant

## Escopo

A fundação multi-tenant usa banco e schema compartilhados. `tenant_id`, membership ativa e RBAC são verificados no PostgreSQL; o slug da URL não concede acesso.

## Auditoria aplicada

- `profiles`, `tenants`, `tenant_members` e `tenant_invitations` permanecem com RLS habilitado.
- Funções de autorização existentes (`is_active_tenant_member` e `has_tenant_role`) continuam sendo usadas pelas policies e pelas RPCs.
- Alterações administrativas de membros e convites passam pelas RPCs autorizadas. O cliente autenticado não possui mais `UPDATE`/`DELETE` direto em `tenant_members` nem `INSERT`/`UPDATE`/`DELETE` direto em `tenant_invitations`.
- Administradores não conseguem excluir owners; a operação exige owner. A proteção do último owner continua garantida pelo trigger de integridade.
- `token_hash` não é concedido para leitura ao papel `authenticated` e não é retornado pelas RPCs públicas.
- `audit_logs` possui RLS por membership ativa, escrita somente por triggers confiáveis e consulta paginada por RPC.

## Matriz resumida

| Operação            | Owner                       | Admin         | Editor/Viewer             |
| ------------------- | --------------------------- | ------------- | ------------------------- |
| Ler dados do tenant | Sim                         | Sim           | Sim, com membership ativa |
| Gerenciar membros   | Sim                         | Editor/viewer | Não                       |
| Gerenciar convites  | Sim                         | Editor/viewer | Não                       |
| Promover a owner    | Sim, via operação protegida | Não           | Não                       |
| Excluir owner       | Somente owner               | Não           | Não                       |

## Validação local

Os testes SQL em `supabase/tests/tenancy.sql`, `supabase/tests/members.sql` e `supabase/tests/rls_grants.sql` cobrem isolamento A/B, membership ativa, RBAC, convites, replay, grants e RLS. Execute:

```powershell
npx supabase test db
```

Antes de aplicar em outro ambiente, valide as migrations em um banco local limpo. A migration corretiva é `20261010000500_harden_rls_grants.sql`.

## Rollback

Não há rollback destrutivo automático. Em ambiente local, reverta o arquivo da migration e recrie o banco somente se os dados locais puderem ser descartados. Em ambiente remoto, prepare uma migration explícita e faça revisão antes de aplicar.

## Limitações conhecidas

Billing/entitlements e teste de concorrência com múltiplos processos continuam fora do escopo. Eventos financeiros futuros devem reutilizar a mesma trilha quando seus módulos existirem.
