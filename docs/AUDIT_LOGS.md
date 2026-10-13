# Trilha de auditoria

## Arquitetura

`audit_logs` registra eventos críticos do domínio multi-tenant no PostgreSQL. A migration `20261010000600_audit_logs.sql` cria a tabela, índices, RLS, triggers transacionais e a RPC `list_tenant_audit_logs`.

Cada evento contém `tenant_id`, `actor_id`, `action`, `resource_type`, `resource_id`, `metadata` controlado e `created_at` gerado pelo banco. Eventos globais sem tenant não são expostos pela API nesta etapa.

## Eventos suportados

- `tenant.created`, `tenant.updated` e `tenant.owner_transferred`;
- `member.role_changed`, `member.suspended`, `member.reactivated` e `member.removed`;
- `invitation.created`, `invitation.accepted`, `invitation.revoked` e `invitation.expired`.

Os eventos são gerados por triggers nas operações existentes. Como a gravação acontece na mesma transação, um rollback também desfaz a auditoria.

## Segurança

Usuários autenticados podem consultar somente eventos de tenants nos quais possuem membership ativa. A API não concede `INSERT`, `UPDATE` ou `DELETE` em `audit_logs`; a escrita ocorre pela função de trigger com lista fixa de ações. `actor_id` vem de `auth.uid()` e não de payload do cliente.

Convites não registram e-mail, token ou `token_hash` em `metadata`. A tabela não armazena senhas, credenciais ou payloads financeiros completos.

## Consulta

`list_tenant_audit_logs(tenant_id, limit, before, action, resource_type)` aceita até 100 registros por página, ordena por `created_at`/`id` decrescente e aplica RLS no contexto do usuário. A consulta não autoriza acesso a outro tenant.

## Testes

`supabase/tests/audit.sql` valida criação, aceitação e revogação de convites, alteração de role, actor confiável, ausência de tokens, imutabilidade lógica, paginação, isolamento cross-tenant e rollback. Execute:

```powershell
npx supabase test db
```

## Limitações

Retenção, exportação e painel administrativo não fazem parte desta task. A trilha cobre apenas operações já implementadas; eventos financeiros futuros devem usar o mesmo mecanismo quando seus módulos existirem.
