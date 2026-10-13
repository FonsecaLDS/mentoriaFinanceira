# Testes e CI

## Arquitetura

- Vitest + Testing Library executam testes unitários e de componentes em `jsdom`.
- Playwright executa o smoke test E2E em Chromium contra o servidor Next.js local.
- Supabase CLI + pgTAP executam os testes SQL em containers locais, reutilizando os testes de RLS da FIN-012.
- O GitHub Actions separa qualidade, unitários/cobertura, banco, E2E e build.

## Comandos locais

```powershell
npm ci
npm run lint
npm run typecheck
npm run format:check
npm run test
npm run test:coverage
npx supabase start
npm run test:db
npm run test:e2e
npm run build
```

`npm run test:db` exige Docker Desktop e um Supabase local ativo. Os testes usam fixtures próprias e não conectam ao Supabase Cloud. Não execute `db reset` automaticamente sobre dados locais que precisem ser preservados.

## Cobertura

O Vitest usa o provider V8 e gera saída textual, HTML e LCOV em `coverage/`. O relatório mede o código exercitado pelos testes existentes; não há um percentual artificial configurado como meta.

## GitHub Actions

O workflow `.github/workflows/ci.yml` roda em pull requests e em pushes para `main`/`master`, usa Node 22 e `npm ci`, e concede apenas `contents: read` ao `GITHUB_TOKEN`. As variáveis Supabase são valores locais de teste; nenhum segredo de produção é necessário.

Chromium é instalado no job E2E por ser o navegador base disponível no CI. Firefox e WebKit ficam para uma expansão posterior quando a matriz de runners justificar o custo.

## Regras de aprovação

Uma alteração só está aprovada quando lint, typecheck, formatação, testes unitários, testes SQL, smoke E2E e build retornam código zero. A execução remota do GitHub Actions deve ser verificada no próprio GitHub; a validação local não substitui essa confirmação.

## Falhas comuns

- Docker parado: iniciar o Docker Desktop antes de `supabase start`.
- Browser ausente: executar `npx playwright install --with-deps chromium` em Linux.
- Erro de formatação: executar `npx prettier --write` nos arquivos alterados.
- Falha de build por ambiente: conferir as variáveis públicas locais, sem inserir segredos no workflow.
