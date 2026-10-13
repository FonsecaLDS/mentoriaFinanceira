# Workspaces

## Modelo

Um workspace é um `tenant` e cada criação registra o usuário autenticado como `owner` em uma única transação. O slug é identificador de URL; a autorização continua sendo feita pela membership ativa e pela RLS.

## Onboarding

Usuários autenticados sem workspace são direcionados a `/onboarding`. O formulário valida nome, slug, tipo, moeda e fuso horário no cliente para feedback rápido e novamente no servidor/RPC para segurança. O slug é sugerido a partir do nome, mas pode ser editado antes da confirmação.

## Seleção e troca

O `TenantSwitcher` recebe somente workspaces retornados pela consulta RLS da sessão atual. A troca preserva o restante da rota e o layout do tenant valida novamente o acesso no servidor. Workspaces suspensos ou removidos não aparecem.

## Segurança e transação

`public.create_tenant` usa `auth.uid()`, rejeita chamadas anônimas, valida os campos de domínio e cria tenant + membership owner atomicamente. Conflito de slug faz rollback completo. Nenhum `service_role` é usado no navegador.

## Planos

Billing e limites Free/Premium ainda não existem no backend. O onboarding não cria assinatura nem contas financeiras; o ponto de validação de entitlements fica para a task de planos.

## Testes

Os testes locais cobrem criação e ownership, slug duplicado, entradas inválidas, ausência de órfão e bloqueio anônimo. O isolamento de tenants permanece coberto pela suíte pgTAP da FIN-008.
