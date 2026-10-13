# FIN-023 — pré-validação

- FIN-022: migration, RPCs, RLS, idempotência e reversão validadas localmente.
- `account_movements` continua sendo a fonte única do saldo efetivo.
- Liquidações ativas representam caixa; reversões mantêm histórico e compensam o movimento.
- Transferências possuem dois movimentos vinculados e não criam `transactions`.
- `accounts.opening_balance` é posição inicial, não receita.

**GO local:** as fontes atuais permitem calcular saldos por conta, caixa, competência e projeção sem tabela redundante.
