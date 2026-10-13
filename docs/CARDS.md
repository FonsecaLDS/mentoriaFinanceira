# Cartões de crédito

Cartões são instrumentos de crédito e não contas de dinheiro livre. O cadastro guarda somente identificação operacional: nome, instituição opcional, limite, moeda, fechamento, vencimento e conta padrão para pagamento.

## Datas

`closing_day` e `due_day` aceitam valores de 1 a 31. Eles representam dias civis, sem horário. Quando compras e faturas forem implementadas, um dia inexistente será ajustado deterministicamente para o último dia daquele mês. Esta tarefa não calcula fatura nem cria despesa.

## Segurança e histórico

Não são armazenados número completo do cartão, CVV, senha, token ou credenciais do emissor. A conta padrão é opcional, precisa estar ativa, pertencer ao mesmo tenant e usar a mesma moeda.

Arquivar altera o estado e mantém o registro para vínculos futuros. O cadastro não cria compras, parcelas, faturas ou pagamentos. A tabela possui RLS; mutações são feitas por RPCs que exigem `owner`, `admin` ou `editor`.

## Interface

A tela está em `/t/[tenantSlug]/cards`, com busca, filtro por status, criação, edição, arquivamento e reativação. O limite é exibido com a própria moeda e cartões não são apresentados como saldo de conta.
