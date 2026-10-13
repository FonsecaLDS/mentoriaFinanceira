# Pagamentos de faturas de cartão

## Modelo

`card_invoice_payments` registra cada pagamento ligado a uma fatura, conta pagadora, movimento no livro efetivo e chave de idempotência. O valor usa `NUMERIC(19,4)`.

O pagamento cria um único `account_movements` negativo na conta pagadora. As parcelas continuam representando a despesa de consumo e não recebem uma segunda liquidação; assim, pagar a fatura não duplica a despesa.

## Pagamentos parciais e integrais

Somente faturas fechadas podem ser pagas. O pagamento parcial mantém a fatura `closed` e reduz o pendente. Quando a soma dos pagamentos ativos alcança o total da fatura, o status passa a `paid`.

Valor zero, negativo, acima do pendente, conta inativa, moeda incompatível e data futura são rejeitados. A conta e a fatura precisam pertencer ao mesmo tenant.

## Reversões

Reverter um pagamento não apaga seu registro. Cria um movimento compensatório positivo ligado por `reversal_of_id`, marca o pagamento como revertido e recalcula o status da fatura. Reversão de pagamento é diferente de cancelamento/estorno de compra.

## Idempotência, concorrência e segurança

As RPCs bloqueiam fatura, conta e pagamento quando necessário. Chaves repetidas retornam a operação original; chaves reutilizadas com payload diferente falham. RLS limita leitura ao tenant ativo, e apenas owner/admin/editor podem pagar ou reverter. Inserções diretas são revogadas.

## Auditoria e limitações

Criação e reversão geram auditoria. Não há juros, rotativo, integração bancária ou interface completa nesta etapa. A liquidação das parcelas individuais não é repetida para evitar dupla contabilização do cartão.
