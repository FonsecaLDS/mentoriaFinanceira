# Dashboard e KPIs

## Arquitetura de consultas

`getDashboardSummary` executa em paralelo as RPCs financeiras existentes e consultas tenant-scoped de vencimentos, faturas e metas. O servidor resolve o tenant pelo contexto autenticado; o navegador recebe apenas os dados do tenant autorizado.

Fontes:

- `get_financial_summary`: saldos atuais/projetados, receitas, despesas, resultado, a receber, a pagar e recursos restritos.
- `get_account_balances`: saldo individual por conta.
- `transactions`: próximos vencimentos não liquidados.
- `card_invoices` + `invoice_cycles`: faturas abertas/fechadas e vencimento.
- `financial_goals` + `reserve_movements`: metas e recursos reservados.

Não há cálculo de saldo efetivo no componente React.

## Indicadores e filtros

O dashboard exibe saldo disponível, receitas, despesas, resultado, a receber, a pagar, saldo projetado, contas, vencimentos, faturas e metas. O período, regime (`cash` ou `competence`) e moeda ficam na URL. Moedas são filtradas, nunca somadas entre si.

Caixa usa liquidações confirmadas; competência usa as datas/valores das transações. Saldos inicial, transferências, aportes e pagamentos de fatura continuam regidos pelas consultas financeiras e não viram receita/despesa por causa da tela.

## Responsividade e estados

Cards usam grid mobile-first, empilham em telas estreitas e mantêm valores com `tabular-nums`. Há estado vazio para períodos sem dados, loading skeleton e error boundary com retry. A tela permanece dentro do `AppShell` e da navegação mobile existente.

## Performance e limites

As consultas independentes são feitas em paralelo e as listas são limitadas no servidor. O gráfico completo de fluxo de caixa, drill-down avançado e relatórios ficam fora desta tarefa e pertencem à FIN-035/entregas posteriores.
