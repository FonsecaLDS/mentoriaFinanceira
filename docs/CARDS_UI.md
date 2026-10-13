# Interface de cartões e faturas

## Rotas

- `/t/[tenantSlug]/cards`: cartões autorizados, limite, utilizado e disponível.
- `/t/[tenantSlug]/cards/[cardId]`: ciclos, faturas e parcelas do cartão.
- `/t/[tenantSlug]/cards/[cardId]/invoices/[invoiceId]`: detalhes, pagamentos e valor pendente.

## Dados e segurança

As páginas consultam cartões, ciclos, faturas, parcelas e pagamentos pelos serviços existentes. O limite utilizado é derivado dos valores pendentes das faturas e parcelas ainda não faturadas; o pagamento é sempre executado pela RPC server-side da FIN-030. A UI não calcula nem grava saldos bancários.

Não são exibidos PAN, CVV, senha ou credenciais bancárias. A autorização real continua no tenant context, RLS e RPC; esconder o botão para viewer é apenas UX.

## Responsividade e estados

Cartões, faturas e parcelas usam blocos responsivos em vez de tabelas comprimidas. Formulário de pagamento mantém valor pendente visível, exige conta compatível e desabilita o envio durante a requisição. Estados sem faturas, sem parcelas e sem pagamentos são explícitos.

## Limitações

Não foi criada uma nova engine de faturas, limites ou pagamentos, nem uma interface para estorno nesta tarefa. A reversão continua disponível pelo serviço seguro da FIN-030 e será exposta conforme a tarefa de operações correspondente.
