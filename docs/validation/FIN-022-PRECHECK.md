# FIN-022 — pré-validação

- FIN-021: validada localmente com migration, RLS, liquidação e reversão.
- `account_movements`: fonte única de movimentos; reversões existentes usam `reversal_of_id`.
- Migration FIN-022: adiciona `transfers`, `transfer_id` e constraint de origem mutuamente exclusiva.
- Contas: possuem FK composta `(tenant_id, id)`, moeda e estado ativo.
- Escopo preservado: sem câmbio, cartões, Pix ou saldo redundante.

**GO local:** o modelo suporta a implementação atômica sem duplicar saldo.
