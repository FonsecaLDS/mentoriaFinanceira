# Autenticação

## Arquitetura

O Supabase Auth é a fonte oficial de identidade. A sessão é gerenciada pelo
`@supabase/ssr` em cookies; senhas e tokens não são armazenados pela aplicação.
O `proxy.ts` atualiza a sessão e protege `/t/[tenantSlug]`, mas a autorização
final continua no servidor e nas políticas RLS da FIN-008.

Rotas implementadas:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/auth/confirm`
- `/auth/error`
- `/t/[tenantSlug]/dashboard`

## Cadastro e profile

O cadastro usa `auth.signUp` com nome no metadata e redirect interno para
`/auth/confirm`. A migration
`20261010000200_create_profile_on_auth_signup.sql` cria o registro em
`public.profiles` por trigger `SECURITY DEFINER`, sem conceder privilégios
administrativos ao cliente e sem duplicar profiles.

O cadastro não cria tenant nem membership automaticamente. Usuários sem tenant
são encaminhados para o estado `no-tenant` até o onboarding ser implementado.

## Confirmação e recuperação

O ambiente local exige confirmação de e-mail e envia mensagens ao Mailpit em
`http://127.0.0.1:54324`. O route handler `/auth/confirm` troca o `code` por
sessão e aceita somente destinos internos. Recuperação e redefinição usam as
APIs oficiais `resetPasswordForEmail` e `updateUser`.

As respostas de recuperação são neutras para evitar enumeração de contas. Links
inválidos ou expirados mostram estado de erro sem registrar tokens.

## Configuração local

`supabase/config.toml` mantém signup habilitado, confirmação de e-mail ativa,
senha mínima de oito caracteres e redirects locais para `localhost:3000` e
`127.0.0.1:3000`. `.env.local` contém somente a URL e a chave publicável.

Para testar os e-mails, inicie o Supabase e acesse o Mailpit. Nenhum provedor
OAuth, MFA ou configuração remota é usado nesta tarefa.

## Segurança

- `service_role` não é importada pelo frontend.
- Redirecionamentos aceitam apenas caminhos iniciados por `/`, rejeitando `//` e
  URLs externas.
- O proxy exige usuário autenticado antes de acessar um tenant e consulta o
  tenant por slug com RLS.
- A página protegida repete a verificação no servidor; proxy não é a única
  fronteira de autorização.
- Mensagens de erro não exibem tokens, senhas ou detalhes internos.

## Testes

Validações unitárias de schemas e destinos internos ficam em
`src/features/auth/schemas.test.ts`. A integração de profile é coberta pelos
testes pgTAP existentes em `supabase/tests/tenancy.sql`.

Execute localmente:

```text
npx supabase db reset --yes
npx supabase test db
npm run test
npm run lint
npm run typecheck
npm run build
```

Testes E2E completos de confirmação dependem de abrir o link recebido no
Mailpit; não usam produção nem `service_role`.
