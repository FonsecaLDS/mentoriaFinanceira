# Membros e convites

## Memberships e roles

`tenant_members` continua sendo a fonte de autorização por tenant. Ações de gestão são aceitas somente para owner/admin, com admin limitado a editor/viewer. Editor e viewer não convidam nem alteram membros.

## Convites

O servidor gera um token opaco com `crypto.randomBytes`, armazena somente o SHA-256 e entrega um link local ao gestor. O convite expira em sete dias, é único, não aceita role owner e não pode duplicar membership ou convite pendente equivalente.

No ambiente local, o link pode ser copiado e aberto em `/invite/[token]`; não há envio externo de e-mail nesta task. A produção precisará conectar um provedor transacional sem registrar tokens.

## Aceitação, revogação e reenvio

A aceitação calcula o hash no servidor e usa a RPC transacional existente. O e-mail autenticado precisa coincidir com o convite. Aceitação, revogação e reenvio invalidam/rejeitam replay, expiração e tokens revogados.

## Ownership

O banco protege o último owner ativo com trigger deferrable. Alterações de role/status são centralizadas em RPCs; o cliente não escolhe autorização. Transferência de ownership existe no banco para a próxima interface de transferência segura.

## Auditoria e planos

As operações críticas são persistidas em `audit_logs` por triggers transacionais. A tabela registra tenant, ator confiável, ação, recurso, timestamp e metadados permitidos, sem token ou credencial. Os limites Free/Premium continuam como dependência da task de billing; nenhuma assinatura ou limite inventado é aplicado nesta etapa.

## Testes

A suíte pgTAP cobre criação, aceitação, replay, e-mail divergente, role inválida, convite revogado, permissões de editor, alteração de role e isolamento já existente. Dados reais e ambientes remotos não são usados.
