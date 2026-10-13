# FIN-025 — pré-validação

- FIN-024 validada com planejamento mensal, regimes de caixa/competência, filtros e 247 testes locais.
- FIN-023 mantém saldo e consumo derivados de movimentos/liquidações, sem fonte redundante.
- Categorias existentes têm hierarquia e `budget_group`; reservas podem ser excluídas do consumo.
- Orçamento será persistido separadamente, com limite por categoria/período/moeda, RLS, RBAC e auditoria.

**GO local:** os indicadores anteriores estão reconciliados e suportam limites sem bloquear transações.
