# UI de transações (FIN-020)

## Arquitetura

As rotas `/t/[tenantSlug]/transactions`, `/transactions/new` e `/transactions/[id]` são Server Components. A listagem usa paginação PostgreSQL de 20 registros, filtros por URL e consultas auxiliares em lote para categorias, contas, responsáveis e centros de custo. Não há carregamento integral do histórico nem consulta N+1.

## CRUD e permissões

O formulário usa React Hook Form e Zod. Receitas e despesas compartilham o modelo FIN-019; o status inicial pode ser `planned` ou `pending`. As Server Actions validam autenticação, membership ativa, role e payload antes de usar as políticas RLS. O cancelamento atualiza o estado e preserva histórico; não há exclusão física.

## Liquidação

A tela de detalhe chama exclusivamente `settle_transaction`, a RPC transacional da FIN-019. O cliente não altera saldo, não cria movimentos e não calcula liquidação. A tela exibe o saldo pendente calculado no servidor com unidades inteiras de quatro casas decimais e mostra o histórico de liquidações.

## Filtros e responsividade

Busca, período, tipo, status, categoria, conta, responsável, centro de custo e faixa de valor são combináveis e aplicados no servidor. A busca possui debounce de 350 ms; os demais filtros preservam a URL após aplicação. Desktop usa grade de linhas; mobile usa cartões verticais, sem overflow horizontal.

## Limitações

Não foram implementados cartões, transferências, recorrências, parcelamento, importação ou dashboard. Estornos seguem fora do escopo FIN-019 e exigem operação específica antes de serem expostos na UI.

## Testes

`supabase/tests/transactions.sql` cobre o domínio financeiro, RLS, RBAC, idempotência e isolamento. `transaction.schema.test.ts` cobre validação de formulário. A validação final inclui typecheck, lint, Vitest, build e testes SQL locais.
