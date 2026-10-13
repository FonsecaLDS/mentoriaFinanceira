# Metas e reservas

## Modelo patrimonial

`financial_goals` guarda nome, valor-alvo, moeda, prazo e status. `financial_reserves` é a alocação segregada e opcionalmente aponta para uma meta. `reserve_movements` registra aportes positivos e retiradas negativas ligados a uma conta e a um `account_movement`.

## Aportes e retiradas

Um aporte cria um débito na conta e um crédito na reserva. Uma retirada cria o movimento inverso. Nenhuma operação cria `transactions`, receitas ou despesas. O saldo da reserva é sempre a soma dos movimentos confirmados; o saldo livre da conta continua vindo do livro `account_movements`.

As operações usam NUMERIC, bloqueios de conta/reserva, FKs compostas por tenant, chave idempotente e rollback transacional. Retirada acima do saldo da reserva e aporte acima do saldo livre são rejeitados.

## Progresso e segurança

O progresso usa saldo efetivo da reserva dividido pelo valor-alvo, limitado a 0–100%. Não há mistura de moedas nem conversão implícita. RLS limita leitura ao tenant ativo; somente owner, admin e editor alteram metas, reservas e movimentos. Auditoria registra criação/edição e cada movimento.

## Limitações

Não há investimentos automáticos, custódia, transferências externas, juros ou rateio entre moedas. O histórico não é apagado fisicamente.
