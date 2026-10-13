# FIN-021 — Pré-validação

**Data:** 10/10/2026  
**Decisão:** GO com ressalva de concorrência

## Evidências

- FIN-019 e FIN-020 estão implementadas e documentadas.
- A RPC `settle_transaction` existente foi preservada e endurecida para ignorar liquidações revertidas no saldo pendente.
- A migration `20261010001200_add_settlement_reversals.sql` adiciona reversão, movimento compensatório, idempotência e auditoria.
- RLS, grants, FKs compostas e validações de tenant/moeda permanecem ativas.
- O banco local foi resetado com todas as migrations aplicadas.
- `npx supabase test db`: 8 arquivos e 177 testes aprovados.

## Regras confirmadas

- Previsões e pendências não alteram saldo.
- Pagamento confirmado altera o livro uma única vez.
- Pagamento parcial reduz o pendente; pagamento integral encerra a obrigação.
- Overpayment, moeda incompatível, tenant incorreto e viewer são rejeitados.
- Repetições idempotentes não duplicam movimentos.
- Reversões preservam registros e criam compensação rastreável.

## Ressalva

Os locks `FOR UPDATE` e a ordem transacional foram revisados e exercitados pelos testes funcionais, mas não há teste automatizado multi-processo simulando duas liquidações simultâneas. Esse cenário deve ser executado antes de uma aprovação de produção de alto volume.
