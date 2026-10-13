# Instruções obrigatórias do Codex — SaaS Financeiro

Leia `PROJETO_MASTER.md` integralmente antes da primeira implementação e consulte as seções da feature em cada tarefa. Documentação de design e regras financeiras precede qualquer código gerado.

- Produto: 100% web, Next.js + TypeScript + Supabase/PostgreSQL, SaaS multi-tenant, UI mobile-first.
- Nome comercial **Mentoria Financeira**. Não consolidar “Finora” em código, assets, banco, SEO ou domínio.
- Use stable versions verificadas no momento do setup, lockfile, lint/typecheck/testes.
- Segurança: RLS, membership e RBAC por tenant para toda leitura/escrita, inclusive storage e RPC. `service_role` jamais no browser. Testar acesso cruzado A/B.
- Financeiro: movimentações idempotentes/transacionais, dinheiro exato, sem duplicar despesa na quitação de cartão, transferência/aporte sem consumo, benefícios de uso restrito separados de dinheiro livre.
- Interface: reproduzir linguagem visual (não pixels) dos screenshots em `assets/`. Desktop sidebar, mobile bottom navigation; 320px sem overflow; não compactar dashboards em duas colunas ilegíveis; acessibilidade, light/dark.
- Tarefas prioritárias: FIN-001 requisitos, FIN-002 financeiro, FIN-003 multi-tenancy, FIN-004 design system; FIN-005 Free/Premium.
- Entregar tarefas isoladas com criterios de aceite, migration quando necessário, testes e riscos. Evitar dependências desnecessárias e refactors amplos sem pedido.
- Não fazer commit, deploy, alterar dados de produção nem ativar billing sem autorização explícita.
- Se faltar definição impactando segurança, dinheiro, autorização ou cobrança: perguntar antes de decidir.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
