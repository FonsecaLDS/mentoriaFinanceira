# FIN-035 — pré-validação

## Resultado

**GO local.** A FIN-034 está funcional e seus KPIs reutilizam as RPCs de saldo, caixa e competência. A FIN-033 permanece aprovada com regressão financeira completa, incluindo transferências, cartões, faturas, reservas, idempotência e RLS.

## Decisão técnica

Foi criada uma RPC específica de série temporal sobre as mesmas fontes financeiras, com filtros de tenant, conta, moeda, regime e granularidade. O Recharts permanece apenas como camada de apresentação; não há cálculo de saldo no cliente.

## Bloqueios verificados

- Não foram introduzidos dados simulados.
- Não há soma entre moedas.
- Reversões são excluídas do caixa confirmado.
- Intervalos vazios são preenchidos apenas para moedas presentes no período.
- A consulta rejeita tenant não autorizado e granularidade inválida.
