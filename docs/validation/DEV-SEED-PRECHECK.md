# DEV-SEED-001 — pré-validação

- Supabase local: requisito obrigatório; o script recusa URLs fora de `localhost:54321` e `127.0.0.1:54321`.
- Auth: usuários criados pela API Admin local, com senha de teste explícita e sem hashes em SQL.
- Idempotência: tenants, cadastros e movimentos usam chaves `DEMO_`/idempotency keys e são consultados antes de inserir.
- Integridade: transações, liquidações, transferências, recorrências, cartões e reservas usam RPCs existentes.
- Segurança: nenhuma `service_role` é usada no navegador; a chave fica apenas no processo local de seed.
- Não executado: reset, migration remota, commit ou push.

GO para executar `npm run seed:demo` somente com Docker/Supabase local ativo.
