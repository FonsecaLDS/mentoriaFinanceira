# DEV-SEED-001 — resultado

Execução realizada no Supabase local em 2026-10-10, sem reset, migration remota ou alteração remota.

```text
npm run seed:demo:dry-run
npm run seed:demo
npm run seed:demo:validate
```

Resultado do seed: 3 tenants `demo-*`, 5 usuários de teste e 411 transações DEMO_ (137 por tenant). Cada tenant possui contas, categorias, pessoas, centros de custo, liquidações, transferências, recorrência, cartões/compras/faturas, pagamento e estorno de fatura, metas/reservas, planejamento, orçamentos e auditoria.

A segunda execução manteve as mesmas quantidades de dados, confirmando idempotência sem duplicar cadastros, transações ou movimentos.

O resultado abaixo é deliberadamente deixado como “não executado” até a execução no ambiente local do usuário; não declarar sucesso sem essa evidência.

- `npm run seed:demo:dry-run`: aprovado, sem alterações.
- `npm run seed:demo`: aprovado no Supabase local `http://127.0.0.1:54321`.
- `npm run seed:demo:validate`: aprovado (`tenants: 3`, `totalTransactions: 411`).
- `npm run lint`: aprovado com 2 warnings preexistentes de `react-hooks/incompatible-library`.
- `npm run typecheck`: aprovado.
- `npm run test`: aprovado, 8 arquivos e 22 testes.
- `npm run build`: aprovado.
- `npx supabase test db`: 19 arquivos passaram; `financial_consistency.sql` falhou porque consulta categorias/contas sem escopo de tenant e o seed persistente adiciona múltiplas linhas. O seed não foi removido para mascarar a falha.
- Reset/destruição remota: não realizado.
- Commit/push: não realizado.
