# Categorias

O módulo de categorias é isolado por `tenant_id` e suporta os tipos `income` e `expense`, com uma única camada de subcategorias. O banco impede pai de outro tenant, tipo incompatível, terceiro nível, nomes irmãos duplicados após normalização e cores/ícones fora da lista permitida.

## Permissões

`owner`, `admin` e `editor` podem criar, editar, ativar e desativar. `owner` e `admin` podem excluir categorias folha; o PostgreSQL bloqueia exclusão de categorias com filhos e futuras referências financeiras deverão usar FK para preservar histórico. `viewer` possui somente leitura.

RLS valida membership ativa e role diretamente no PostgreSQL. O cliente não fornece autorização nem pode trocar `tenant_id`.

## Uso

A tela está em `/t/[tenantSlug]/settings/categories`. A listagem permite busca e filtros por tipo/status; categorias inativas continuam armazenadas para preservar históricos e não aparecem por padrão.

## Migrations e testes

`20261010000700_create_categories.sql` cria tabela, constraints, índices, trigger de timestamp e policies. Os testes em `supabase/tests/categories.sql` cobrem CRUD, hierarquia, duplicidade, RBAC e isolamento. Nenhuma categoria template é criada automaticamente nesta etapa.

## Integrações futuras

Transações, orçamentos e relatórios poderão referenciar `categories.id`. Este módulo não cria lançamentos financeiros nem regras de saldo.
