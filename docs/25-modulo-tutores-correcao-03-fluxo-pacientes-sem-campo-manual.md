# Modulo Tutores — Correcao 03 — Fluxo Pacientes sem Campo Manual

## 1. Objetivo

Remover a dependencia operacional do campo manual de tutor no modulo Pacientes, tornando o fluxo vindo de Tutores o caminho principal e natural da operacao.

## 2. Comportamento atual inadequado

Hoje:

- `patients.ts` recebe contexto de tutor vindo de Tutores;
- mas ainda exibe campo manual de tutor principal;
- esse campo continua sendo um caminho operacional relevante.

Problema:

- o fluxo tutor -> paciente fica apenas parcialmente resolvido;
- a recepcao ainda pode cair em digitacao manual de id.

## 3. Comportamento desejado

Quando o usuario chega a Pacientes a partir de Tutores:

- o tutor ja vem pre-selecionado;
- o contexto do tutor deve ficar claro visualmente;
- o campo manual nao deve ser o caminho principal;
- o usuario deve seguir diretamente com o cadastro do paciente.

Quando o usuario abre Pacientes sem contexto previo:

- o sistema pode permitir selecao de tutor;
- mas deve evitar depender de id cru como UX principal.

## 4. Como tratar o contexto de tutor vindo da tela de detalhe

### Regras

- receber `ownerId`/`tutorId` via querystring ou estado de navegacao;
- carregar e exibir nome do tutor selecionado;
- bloquear ou ocultar o campo manual quando ha contexto valido;
- permitir trocar o tutor apenas se houver regra explicita para isso.

## 5. Como evitar que o campo manual siga como caminho principal

### Preferencial

- quando houver contexto de tutor, o campo de id nao deve aparecer como input editavel principal;
- mostrar um bloco de contexto com tutor selecionado;
- se necessario, expor acao secundaria de “trocar tutor” em vez de input direto.

### Para acesso direto ao modulo Pacientes

- oferecer busca/selecao de tutor;
- evitar exigir digitacao manual de id como primeiro caminho.

## 6. Fallback aceitavel apenas se necessario

Fallback aceitavel:

- manter input tecnico escondido ou somente leitura para carregamento interno;
- permitir entrada manual apenas em modo excepcional de suporte/administracao.

Fallback nao aceitavel:

- deixar o input manual visivel como caminho comum de uso;
- depender de copiado/colado de `ownerId` para fluxo regular.

## 7. Impacto em patients.ts e integracao

Arquivos provaveis:

- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts), apenas se o frontend precisar de detalhe complementar do tutor

Pontos de integracao:

- querystring/contexto vindo do detalhe do tutor;
- pre-preenchimento coerente;
- criacao de paciente com `primaryOwnerId`;
- reflexo posterior no detalhe do tutor.

## 8. Ordem recomendada

1. revisar a UX atual de `patients.ts`;
2. esconder ou retirar o caminho manual quando houver contexto;
3. tornar tutor selecionado um bloco explicito de contexto;
4. revisar criacao de paciente;
5. validar fluxo vindo de detalhe do tutor;
6. validar fluxo sem contexto previo.

## 9. Criterios de conclusao

- fluxo vindo de Tutores nao depende de id manual;
- tutor selecionado fica explicito;
- paciente pode ser criado diretamente a partir do tutor salvo;
- campo manual deixa de ser caminho operacional principal;
- o fluxo tutor -> paciente passa a ser percebido como continuo e natural.
