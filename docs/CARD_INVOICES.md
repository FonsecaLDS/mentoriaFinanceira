# Faturas de cartão

## Ciclos e datas

`invoice_cycles` define o período do cartão (`cycle_start`/`cycle_end`) e o vencimento. O dia de fechamento é limitado ao último dia do mês; uma compra no próprio dia de fechamento pertence ao ciclo que termina naquele dia. Depois do fechamento, a compra entra no próximo ciclo.

## Modelo e geração

`card_invoices` identifica uma fatura por tenant e ciclo. `card_installments.invoice_id` vincula cada parcela a no máximo uma fatura. A geração é transacional e idempotente: cria a fatura, associa parcelas planejadas do ciclo e reconcilia o total pela soma das parcelas.

## Estados

- `open`: pode receber parcelas elegíveis.
- `closed`: total e identidade ficam protegidos.
- `paid`: reservado para a liquidação da FIN-030; nenhum pagamento fictício é criado aqui.

Fechar uma fatura também fecha o ciclo, mas não cria movimentação bancária nem uma nova despesa. O pagamento futuro deve liquidar as transações planejadas já existentes.

## Segurança e auditoria

As tabelas têm RLS por membro ativo do tenant. Geração e fechamento exigem owner, admin ou editor e são executados por RPCs protegidas. Inserções e alterações diretas são revogadas. Criação e fechamento geram eventos de auditoria.

## Limitações

Não há pagamento, juros, rotativo, correção de fatura fechada, integração bancária ou recálculo silencioso de ciclos históricos nesta etapa.
