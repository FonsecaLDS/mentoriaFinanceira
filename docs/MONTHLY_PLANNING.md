# Planejamento mensal

## Modelo

`monthly_plans` garante um período por tenant. `monthly_plan_items` guarda estimativas por tipo, moeda e dimensões opcionais de categoria, conta e responsável. Esses registros não são transações e não criam movimentos.

## Previsto x realizado

`get_monthly_comparison` agrega os valores planejados e os valores reais por dimensão. No regime de competência, realizado usa `transactions.amount` e `competence_date`; no regime de caixa, usa liquidações não revertidas e `settled_at`. Pagamentos parciais entram somente pelo valor pago no caixa.

`get_monthly_summary` retorna receitas, despesas, resultados, desvios e uso percentual por moeda. Quando a despesa planejada é zero, o percentual retorna zero — nunca `Infinity` ou `NaN`.

## Edição e reutilização

`upsert_monthly_plan_item` atualiza a mesma dimensão sem duplicar itens. Owner, admin e editor podem editar; viewer só consulta. A auditoria registra criação e alteração. `copy_monthly_plan` reutiliza o mês anterior sem copiar transações ou movimentos.

## Filtros e segurança

A comparação aceita categoria, conta e responsável. Cada RPC valida membership ativo e as FKs compostas impedem referências de outro tenant. Moedas permanecem separadas; não há conversão cambial.

## UX e limitações

A tela `/t/[tenantSlug]/planning` permite escolher mês e regime, editar previstos e visualizar a tabela responsiva. Não implementa orçamento completo, recorrências, alertas ou dashboard principal.
