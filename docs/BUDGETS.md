# Orçamentos por categoria

## Modelo e períodos

`category_budgets` guarda um limite por tenant, categoria de despesa, ano, mês e moeda. A chave única impede dois limites para a mesma dimensão. Remover um limite apenas o desativa; o histórico continua em `audit_logs`.

## Consumo e desvios

`get_budget_consumption` calcula `spent`, `remaining = limit - spent`, `variance = spent - limit` e `usage_percentage = spent / limit * 100`. Limite zero retorna percentual zero e fica excedido quando há consumo. O gasto acima de 100% permanece visível.

No regime de competência, o consumo usa despesas não canceladas pela `competence_date`. No regime de caixa, usa liquidações não revertidas pela data de pagamento; pagamentos parciais entram somente pelo valor liquidado. Transferências, saldo inicial e categorias de reserva não consomem orçamento.

## Categorias, moedas e alertas

Somente categorias de despesa folha podem receber limite; categorias pai com filhas ativas são rejeitadas para evitar contagem dupla. Categorias inativas permanecem no histórico. Cada moeda é agregada separadamente. Os níveis visuais são `normal`, `warning` a partir de 80% e `exceeded` a partir de 100%.

## Permissões e UX

Owner, admin e editor criam, editam e removem limites; viewer consulta. RLS restringe leitura ao tenant ativo e as RPCs validam RBAC. A tela `/t/[tenantSlug]/budgets` permite escolher mês e regime, exibe barras, valores, desvios e status textuais, com layout responsivo. Ultrapassar o limite nunca bloqueia pagamentos e não envia notificações externas.
