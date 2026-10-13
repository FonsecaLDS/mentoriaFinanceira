# Desenvolvimento local

## Pré-requisitos

- Node.js compatível com as engines das dependências instaladas.
- npm e Docker Desktop com o Docker Engine ativo, usando containers Linux.
- Supabase CLI local do projeto: `npx supabase --version`.

O projeto usa a infraestrutura gerenciada pela Supabase CLI. Não há um
`docker-compose.yml` manual nem configuração global de Docker neste repositório.

## Inicialização

1. Abra o Docker Desktop e confirme que o Engine está em execução.
2. Na raiz do projeto, execute `npx supabase start`.
3. Gere as variáveis locais com `npx supabase status -o env`.
4. Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável.
5. Inicie o Next.js com `npm run dev`.

`.env.local` nunca deve ser versionado. A chave `service_role` é administrativa
e não deve ser usada no browser nem colocada em variáveis `NEXT_PUBLIC_*`.

## Serviços locais padrão

| Serviço                   | URL/porta padrão       |
| ------------------------- | ---------------------- |
| API REST / Auth / Storage | http://127.0.0.1:54321 |
| PostgreSQL                | 127.0.0.1:54322        |
| Supabase Studio           | http://127.0.0.1:54323 |
| Inbucket (e-mail local)   | http://127.0.0.1:54324 |

Confirme os valores efetivos com `npx supabase status`; a configuração em
`supabase/config.toml` é a fonte local das portas.

## Migrations e seed

Migrations versionadas ficam em `supabase/migrations/`. Crie uma nova migration
com:

```text
npx supabase migration new nome_da_migration
```

Liste o estado com `npx supabase migration list`. O `supabase/seed.sql` está
intencionalmente vazio de dados: esta tarefa não cria tabelas, tenants,
usuários ou finanças.

`npx supabase db reset` apaga os dados locais. Só execute depois de confirmar
que a perda é aceitável.

## Parar e reconstruir

```text
npx supabase stop
npx supabase start
```

O fluxo local, staging e produção deve permanecer separado. No futuro, após
aprovação, o projeto remoto será vinculado com `npx supabase link --project-ref`
e migrations serão validadas com `npx supabase db push --dry-run` antes de
qualquer aplicação. Esta tarefa não cria projeto remoto, não executa `link` e
não executa `db push`.

## Troubleshooting

- `docker` não encontrado: instale/inicie o Docker Desktop e reabra o terminal;
  não reinstale nem altere configurações globais automaticamente.
- Porta ocupada: verifique `npx supabase status` e os processos locais antes de
  alterar `supabase/config.toml`.
- Supabase não inicia: confirme containers Linux, recursos disponíveis e
  `docker ps`; não remova volumes ou containers de outros projetos.
- Variáveis ausentes: gere novamente `npx supabase status -o env` e atualize
  apenas `.env.local`.
