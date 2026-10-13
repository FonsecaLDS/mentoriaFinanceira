# Recorrências

Recorrências são regras geradoras de transações previstas. Elas não são pagamentos e não movimentam contas até uma liquidação confirmada.

## Modelo

`recurrence_rules` pertence a um tenant e guarda tipo, periodicidade (`daily`, `weekly` ou `monthly`), intervalo, datas, limite opcional de ocorrências, valor, moeda e referências financeiras. Cada transação gerada recebe `recurrence_rule_id` e `recurrence_occurrence_date`.

O índice único por regra e data torna a geração idempotente. A execução usa `generate_due_occurrences`, com limite máximo de 100 ocorrências por chamada e datas calculadas no banco.

## Datas

Recorrências são baseadas em datas civis, sem horário. Assim, transições de horário de verão não alteram a ocorrência. Em meses curtos, o dia é limitado ao último dia do mês; uma regra do dia 31 volta ao dia 31 quando o mês possuir esse dia.

## Estados

- Ativa: pode gerar ocorrências.
- Pausada: preserva a próxima data e pode ser retomada.
- Cancelada: não volta a gerar ocorrências.

Cancelar ou pausar não remove transações já geradas. Transações liquidadas continuam protegidas pelas regras de histórico existentes.

## Segurança

As regras possuem RLS para leitura por membros ativos. Criação, edição, pausa, retomada, cancelamento e geração exigem `owner`, `admin` ou `editor`. As FKs compostas impedem categoria, conta, responsável ou centro de custo de outro tenant.

## Interface

A tela está em `/t/[tenantSlug]/recurrences`, com criação, edição, pausa, retomada, cancelamento e botão explícito para gerar ocorrências até hoje. O formulário usa as opções financeiras do tenant atual.

Não há agendamento remoto, assinaturas, parcelamento ou recorrência de transferências nesta versão.
