# FIN-024 — pré-validação

- FIN-023 validada com consultas centralizadas, saldos derivados e 225 testes locais.
- FIN-022 validada com transferências atômicas, idempotência e reversão.
- Liquidações, movimentos e transferências permanecem as fontes efetivas; planejamento não cria movimentos.
- Planejamento será separado em `monthly_plans` e `monthly_plan_items`, com RLS, FKs compostas, unicidade por dimensão e auditoria.

**GO local:** os cálculos existentes permitem comparar previsto e realizado sem dupla contabilização.
