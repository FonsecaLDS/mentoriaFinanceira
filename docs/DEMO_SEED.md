# Seed financeiro DEMO_

O seed cria dados fictícios e identificáveis para validação local dos módulos financeiros. Ele só aceita `localhost:54321`/`127.0.0.1:54321`, não usa dados reais e não deve ser executado em staging ou produção.

## Uso

```text
npm run seed:demo:dry-run
npm run seed:demo
npm run seed:demo:validate
npm run seed:demo:clean -- --confirm
```

`install` é idempotente: localiza tenants, usuários e registros `DEMO_` existentes e não os atualiza nem sobrescreve. As operações financeiras usam as RPCs do domínio, com chaves de idempotência. `clean` só remove tenants com slug `demo-*` após confirmação explícita e não deve ser usado sem conferir o alvo local.

## Usuários locais

| Usuário | Senha | Função de exemplo |
| --- | --- | --- |
| `demo.owner@mentoria.local` | `Demo1234!` | owner |
| `demo.family@mentoria.local` | `Demo1234!` | owner |
| `demo.business@mentoria.local` | `Demo1234!` | owner |
| `demo.editor@mentoria.local` | `Demo1234!` | editor |
| `demo.viewer@mentoria.local` | `Demo1234!` | viewer |

As contas são criadas pela API Admin local do Supabase com email confirmado apenas para facilitar testes locais; nenhum responsável financeiro vira usuário automaticamente.

## Cobertura

O dataset cobre três tenants, contas, categorias, responsáveis, centros de custo, transações de janeiro a dezembro de 2026, liquidações parciais e integrais, transferências, recorrência, planejamento, orçamentos, metas/reservas, cartões, compras, parcelas e auditoria. Previsões futuras permanecem não liquidadas; saldo inicial não é receita e movimentos derivados são criados pelas funções oficiais.

Limite intencional: o seed não executa `supabase db reset`, não cria dados remotos e não fabrica módulos que ainda não existam no schema local.
