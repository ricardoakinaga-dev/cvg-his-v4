# Modulo Tutores — Correcao 02 — Auditoria de Autoria

## 1. Objetivo

Fechar a trilha minima de autoria do modulo Tutores, preenchendo corretamente `createdByUserId` e `updatedByUserId` nas operacoes de create e update.

## 2. Onde createdByUserId e updatedByUserId ja existem

Atualmente esses campos ja existem em:

- contrato/tipos compartilhados;
- schema de `owners`;
- migration de expansao de `owners`.

Ou seja, o problema nao e modelagem. O problema e implementacao incompleta da autoria.

## 3. Por que hoje a trilha esta incompleta

Hoje:

- as rotas de `owners` recebem um principal autenticado no `server.ts`;
- mas `OwnersService.create` e `OwnersService.update` nao recebem a autoria do principal;
- por isso os campos acabam vazios.

Isso gera rastreabilidade parcial:

- ha `appendAudit` no modulo;
- mas a autoria interna do proprio registro nao fica preenchida.

## 4. Como obter o principal/autoria no estado atual do sistema

A autoria ja existe no fluxo da API:

- `requirePrincipal(...)` retorna o principal autenticado;
- `principal.user.id` pode ser usado como autor;
- `principal.user.accountId` ja e usado no modulo.

Portanto, a origem de autoria ja esta disponivel e nao exige nova infraestrutura.

## 5. Estrategia recomendada

### Preferencial

Passar `createdByUserId` e `updatedByUserId` explicitamente para o modulo `owners` nas operacoes de create/update.

### Diretriz

- `create` deve gravar `createdByUserId` e `updatedByUserId` com o usuario atual;
- `update` deve preservar `createdByUserId` e atualizar `updatedByUserId`;
- `updatedAt` e `version` devem continuar coerentes.

## 6. Fallback transitorio aceitavel

Se a assinatura do servico nao puder ser alterada sem atrito alto:

- e aceitavel usar um objeto de metadados adicional na chamada do servico;
- nao e aceitavel manter `undefined` como estado final.

Fallback nao aceitavel:

- inferir autoria do lado do frontend;
- usar valor fixo ou dummy em producao;
- tratar apenas no `appendAudit` e ignorar o registro principal.

## 7. Regras de create

No create:

- preencher `createdByUserId` com `principal.user.id`;
- preencher `updatedByUserId` com o mesmo valor inicial;
- manter `createdAt` e `updatedAt` coerentes;
- iniciar `version` corretamente.

## 8. Regras de update

No update:

- preservar `createdByUserId` original;
- preencher `updatedByUserId` com o usuario autenticado da alteracao;
- atualizar `updatedAt`;
- incrementar `version`.

## 9. Arquivos provaveis a alterar

- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)
- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts)
- [packages/modules/owners/src/repositories/database-owner.repository.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/repositories/database-owner.repository.ts)

## 10. Criterios para fechar a correcao

- create grava `createdByUserId` e `updatedByUserId`;
- update preserva `createdByUserId` e atualiza `updatedByUserId`;
- detalhe do tutor passa a refletir a autoria quando disponivel;
- a auditoria deixa de apontar trilha minima incompleta;
- testes ou validacoes manuais confirmam os valores corretos apos create/update.
