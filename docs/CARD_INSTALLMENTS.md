# Compras e parcelas no cartão

## Modelo

`card_purchases` representa uma compra no crédito. `card_installments` representa suas parcelas e cada parcela aponta para exatamente um `invoice_cycle` e uma `transaction` planejada. O ciclo é uma previsão operacional; esta tarefa não fecha nem paga faturas.

As transações criadas para as parcelas são despesas previstas, sem `account_id`. Portanto, a compra não movimenta o saldo bancário. Uma liquidação futura deve ocorrer sobre a obrigação existente e não criar outra despesa.

## Parcelamento e arredondamento

O banco trabalha em unidades de 1/10.000 da moeda. A divisão usa truncamento inteiro e distribui o restante, uma unidade por vez, nas primeiras parcelas. Exemplo: `100,00 / 3` resulta em `33,3334`, `33,3333`, `33,3333`.

O valor total das parcelas é sempre exatamente o valor original. O valor mínimo aceito é suficiente para gerar pelo menos uma unidade mínima em cada parcela.

## Datas e ciclos

Datas são civis, sem horário. Compra no dia do fechamento pertence ao ciclo que termina naquele fechamento; compra depois dele vai para o fechamento seguinte. Dias inexistentes são limitados ao último dia do mês. O vencimento é calculado depois do fechamento conforme o dia configurado no cartão.

## Idempotência e cancelamento

`idempotency_key` é única por tenant. Repetir a mesma operação com o mesmo payload retorna a compra existente; payload diferente é rejeitado. A criação de compra, ciclos, transações e parcelas ocorre em uma única transação.

Cancelar preserva compra, parcelas e transações no histórico, marcando-as como canceladas. Compras com liquidação não podem ser canceladas silenciosamente.

## Segurança

As três tabelas possuem RLS para membros ativos. A criação e o cancelamento exigem `owner`, `admin` ou `editor`. FKs compostas protegem cartão, categoria, responsável, centro de custo, ciclos e transações contra vínculos cross-tenant.

Não há juros, câmbio automático, pagamento de fatura, compras futuras simuladas ou integração com emissores nesta etapa.
