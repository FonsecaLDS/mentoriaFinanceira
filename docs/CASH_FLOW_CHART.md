# Gráfico de fluxo de caixa

## Fonte e séries

`get_cash_flow_series` é uma RPC server-side tenant-scoped. No regime de caixa, soma liquidações não revertidas por `settled_at`; no regime de competência, soma transações não canceladas por `competence_date`. Transferências, saldo inicial, aportes e pagamentos de fatura não são transformados em receita/despesa pelo gráfico.

Cada ponto contém `income`, `expense`, `result` e `cumulative_result`, com moeda explícita. Intervalos sem movimento são preenchidos com zero somente quando existe uma moeda com dados no período.

## Filtros e granularidade

Período, conta, moeda, regime e agrupamento (`day`, `week`, `month`) são preservados na URL. Conta e tenant são validados no banco; moedas não são somadas entre si. O default visualiza a primeira moeda retornada pelos KPIs, e o seletor permite escolher outra.

## Visualização e acessibilidade

`CashFlowChart` usa Recharts com linhas separadas para receitas, despesas e resultado/resultado acumulado. Tooltip e legenda identificam cada série, o eixo usa locale pt-BR e o texto alternativo informa quantidade de períodos, moeda e métrica. Em telas estreitas o container se adapta sem overflow.

## Performance e limites

A agregação ocorre em uma única RPC por consulta, sem N+1. O gráfico não implementa projeção de caixa futura, conversão cambial ou o relatório analítico completo; esses comportamentos exigem regras próprias.
