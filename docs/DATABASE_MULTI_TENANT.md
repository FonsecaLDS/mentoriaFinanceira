# Fundação multi-tenant

## Arquitetura

FIN-008 usa banco e schema compartilhados. O isolamento é feito por
`tenant_id`, membership ativa e Row Level Security no PostgreSQL. A identidade
autenticada continua em `auth.users`; `profiles` guarda apenas dados públicos e
operacionais.

Migration: `20261010000100_create_multi_tenant_foundation.sql`.

## Tabelas

- `profiles`: relação 1:1 com `auth.users`; leitura e edição apenas do próprio
  perfil.
- `tenants`: espaço financeiro, slug único, tipo `individual`, `family` ou
  `business`, moeda base e timezone.
- `tenant_members`: relação usuário/tenant com roles `owner`, `admin`,
  `editor` e `viewer`, além dos status `active`, `suspended` e `removed`.
- `tenant_invitations`: convite com `token_hash`, expiração e status. O hash
  não possui privilégio de SELECT para o role `authenticated`.

FKs apontam para `auth.users` e `tenants`; IDs são UUIDs e timestamps são
`timestamptz`. Índices cobrem membership por tenant/usuário e convites por
tenant/status/expiração. Slugs, e-mails e moeda são normalizados por trigger.

## Operações protegidas

`public.create_tenant(...)` é a única operação de criação exposta ao cliente:
usa `auth.uid()`, cria tenant e membership `owner` na mesma transação e não
aceita `created_by` do cliente. `public.accept_tenant_invitation_by_hash(...)`
consome convite pendente uma única vez, confere e-mail autenticado e cria a
membership com o role convidado.

Triggers impedem alteração de `created_by`, `tenant_id` e `user_id`. Um trigger
de constraint, inicialmente deferido, exige pelo menos um owner ativo ao final
da transação; isso permite transferência segura em mais de uma operação e
bloqueia remoção/rebaixamento do último owner.

## RLS e privilégios

Todas as quatro tabelas têm RLS habilitado. Acesso a `tenants` e
`tenant_members` exige membership ativa; alterações administrativas exigem
`owner` ou `admin`. `editor` e `viewer` não gerenciam memberships ou convites.

As tabelas não concedem privilégios a `anon`. `tenant_invitations` concede ao
role autenticado apenas as colunas seguras para SELECT; `token_hash` permanece
restrito ao banco e às funções de segurança.

## Tipos e testes

Os tipos gerados do schema ficam em [src/types/supabase.ts](../src/types/supabase.ts)
e são usados pelos clientes Supabase browser/server.

Os testes pgTAP ficam em `supabase/tests/tenancy.sql` e cobrem:

- criação atômica de tenant e owner;
- normalização e unicidade de slug;
- isolamento A/B com RLS;
- convite com hash e consumo único;
- ausência de acesso ao `token_hash`;
- bloqueio de autoelevação e alteração de `created_by`;
- proteção do último owner e acesso anônimo.

Execute localmente:

```text
npx supabase db reset --yes
npx supabase test db
npx supabase migration list
```

`db reset` apaga apenas dados locais. Em staging/produção, valide a migration
com `db push --dry-run` antes de aplicar; nenhum ambiente remoto é vinculado ou
alterado por esta tarefa.

## Reversão

Antes de aplicar em ambiente persistente, faça backup e gere uma migration de
reversão revisada. Não remover estas tabelas enquanto houver FKs de módulos
posteriores; a remoção deve ser planejada junto com os consumidores.
