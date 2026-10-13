# App Shell

## Arquitetura

`src/app/t/[tenantSlug]/layout.tsx` resolve a sessão e consulta somente os tenants visíveis pela RLS. O `AppShell` recebe essa lista e compõe sidebar desktop, topbar, conteúdo e navegação mobile.

## Navegação

Desktop usa a sidebar persistente a partir de `lg`. Mobile usa a barra inferior com Início, Transações, Contas, Cartões e Mais. Os links preservam o `tenantSlug`; o servidor continua sendo a autoridade de acesso.

## TenantSwitcher e sessão

O seletor usa a lista retornada pelo Supabase para a sessão atual. Não há criação de tenant nem autorização baseada apenas na URL. O menu de usuário encerra a sessão pelo cliente Supabase existente.

## Temas e tokens

`ThemeProvider` persiste `light`, `dark` ou `system` em `localStorage` e aplica os tokens já existentes em `globals.css`. A preferência `system` acompanha `prefers-color-scheme`.

## Responsividade e acessibilidade

O shell começa em coluna única, reserva espaço para a bottom navigation e usa `env(safe-area-inset-bottom)`. Links ativos têm `aria-current`, controles têm nomes acessíveis, o menu Mais fecha por clique fora ou Escape e a sidebar desktop pode ser recolhida.

## Dependências futuras

As rotas financeiras são placeholders intencionais. Dashboard, consultas financeiras, criação de workspace, permissões de UI e funcionalidades de negócio permanecem nas tasks próprias.
