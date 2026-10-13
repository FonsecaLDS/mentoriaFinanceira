# Responsáveis e centros de custo (FIN-017)

## Modelo

`people` representa uma pessoa usada para classificação analítica. Ela não é uma conta de acesso. `linked_user_id` é opcional e, quando informado, a FK composta exige que o usuário seja membro do mesmo tenant. O vínculo não altera permissões.

`cost_centers` representa uma finalidade, projeto, departamento ou residência. É independente de categoria e não implementa rateio nesta versão.

Ambas as tabelas têm nome normalizado por tenant, `is_active`, timestamps e índices por tenant/status. A desativação preserva histórico; a role `authenticated` não possui DELETE.

## Permissões e RLS

Membros ativos podem consultar os cadastros do tenant. `owner`, `admin` e `editor` podem criar, editar, ativar e desativar. `viewer` tem leitura. Todas as políticas usam `is_active_tenant_member` ou `has_tenant_role`, e `tenant_id` nunca é resolvido pela URL.

## CRUD e UI

As rotas são `/t/[tenantSlug]/settings/people` e `/t/[tenantSlug]/settings/cost-centers`. Os formulários usam Zod e React Hook Form; as listagens têm busca, filtro por status, estados vazio/erro e controles acessíveis em telas estreitas.

## Integração futura

Transações poderão referenciar um responsável e um centro de custo, mantendo ambos opcionais. Rateios, permissões derivadas do responsável e exclusão física não fazem parte desta entrega.

## Testes

`supabase/tests/people_cost_centers.sql` cobre RLS, isolamento A/B, duplicidade normalizada, vínculo de membro, RBAC, desativação e ausência de DELETE para o papel da aplicação.
