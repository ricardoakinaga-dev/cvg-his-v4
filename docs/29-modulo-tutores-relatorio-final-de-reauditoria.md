# Modulo Tutores — Relatorio Final de Reauditoria

## 1. Resumo executivo da reauditoria

A reauditoria confirma que a rodada pos-auditoria corrigiu a maior parte dos bloqueios que motivaram a reprovacao anterior do modulo Tutores. O modulo deixou de depender do fluxo manual mais fragil no frontend, passou a preencher autoria em `create/update`, ganhou mascaras e validacoes client-side basicas, evoluiu a UI de contatos para estrutura repetivel real e adicionou testes focados no escopo de Tutores.

O bloqueio mais sensivel, relacionado a fonte de verdade do backend, foi corrigido de forma suficiente nos fluxos expostos pela API do modulo: `GET /owners`, `GET /owners/:id` e a resolucao de tutor em `GET /patients` agora usam leitura via repositorio quando ha persistencia. Ainda existe `Map` em memoria dentro de `OwnersService`, mas ele deixou de ser a unica base operacional nos fluxos auditados de Tutores.

A ressalva remanescente mais importante e externa ao escopo estrito de Tutores: a suite ampla de `runtime.test.js` da API continua sem fechamento limpo nesta sessao, embora os testes focados do modulo Tutores tenham passado. Por isso, a classificacao recomendada sobe de `reprovado para avanco` para **aprovado com ressalvas**.

## 2. Escopo reaudidado

Esta reauditoria focou nos itens que reprovaram o modulo na auditoria anterior:

- fonte de verdade do backend no modulo `owners`;
- autoria minima de `create/update`;
- fluxo tutor -> paciente sem campo manual como caminho principal;
- mascaras e validacoes client-side;
- contatos multiplos repetiveis;
- testes focados do modulo;
- impacto da ressalva da suite ampla da API sobre a classificacao do escopo Tutores.

## 3. Arquivos verificados

- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts)
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)
- [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts)
- [docs/21-modulo-tutores-relatorio-final-de-auditoria.md](/root/.openclaw/workspace/cvg-his-v2/docs/21-modulo-tutores-relatorio-final-de-auditoria.md)
- [docs/22-modulo-tutores-plano-de-correcao-pos-auditoria.md](/root/.openclaw/workspace/cvg-his-v2/docs/22-modulo-tutores-plano-de-correcao-pos-auditoria.md)
- [docs/28-modulo-tutores-gate-de-reauditoria.md](/root/.openclaw/workspace/cvg-his-v2/docs/28-modulo-tutores-gate-de-reauditoria.md)

## 4. Comparacao objetiva com a auditoria anterior

Na auditoria anterior, os bloqueios centrais eram:

- backend ainda apoiado principalmente em memoria;
- autoria nao preenchida;
- campo manual de tutor ainda relevante em `patients.ts`;
- ausencia de mascaras;
- contatos repetiveis inexistentes;
- ausencia de testes focados;
- revalidacao ampla da API ainda aberta.

Estado atual apos correcao:

- os fluxos expostos da API de Tutores passaram a consultar o repositorio com `listForAccount` e `getForAccountOrThrow`;
- `createdByUserId` e `updatedByUserId` passaram a ser populados;
- a tela de pacientes passou a usar busca e selecao de tutor salvo, com campo oculto para o id;
- mascaras de documento, telefone e CEP foram implementadas;
- a UI de contatos agora e dinamica, com add/remove e selecao de principal;
- testes focados foram adicionados;
- a suite ampla da API segue como ressalva global.

## 5. Verificacao dos bloqueios anteriores

### Bloqueio 1

Se o backend do modulo Tutores agora usa persistencia/repositorio como fonte operacional real nos fluxos expostos, em vez de depender do mapa em memoria como base principal.

Status: **parcialmente corrigido, mas suficiente para reclassificacao**

Evidencias:

- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts) agora expõe `listForAccount` e `getForAccountOrThrow`, consultando `ownerRepository` antes do fallback em memoria.
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts) passou a usar `await owners.listForAccount(...)` em `GET /owners`.
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts) passou a usar `await owners.getForAccountOrThrow(...)` em `GET /owners/:id` e na resolucao de tutor em `GET /patients`.

Leitura tecnica:

- o modulo ainda mantem cache em memoria dentro de `OwnersService`;
- porem, nos fluxos auditados de Tutores, a leitura operacional deixou de ser exclusivamente derivada do `Map`;
- isso resolve o bloqueio principal para o escopo exposto da API, mas nao caracteriza uma eliminacao total da memoria como apoio interno.

### Bloqueio 2

Se `createdByUserId` e `updatedByUserId` estao efetivamente preenchidos em `create/update`.

Status: **corrigido**

Evidencias:

- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts) agora recebe `actorUserId` em `create` e `update`.
- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts) preenche `createdByUserId` e `updatedByUserId` no create, e atualiza `updatedByUserId` no update.
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts) passou a repassar `principal.user.id` nas rotas `POST /owners` e `PATCH /owners/:id`.
- [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts) adicionou teste especifico para autoria.

### Bloqueio 3

Se o fluxo de Pacientes deixou de usar campo manual de tutor como caminho principal operacional.

Status: **corrigido**

Evidencias:

- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts) removeu o input visivel de `Tutor principal` por id.
- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts) passou a renderizar `patient-owner-selection` com busca por tutor salvo e acao de `Selecionar`.
- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts) mantem `patient-owner-id` apenas como campo oculto de suporte ao fluxo.

Observacao:

- ainda existe input manual de tutor no formulario de vinculo `owner-patient-link`, mas esse formulario nao e o caminho principal de criacao de paciente a partir do tutor. Para o bloqueio auditado, a correcao foi suficiente.

### Bloqueio 4

Se mascaras e validacoes client-side principais foram realmente implementadas.

Status: **corrigido**

Evidencias:

- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) implementa `formatCpfCnpj`.
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) implementa `formatPhone`.
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) implementa `formatPostalCode`.
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) valida documento, CEP, email, telefone e existencia de contato principal antes de salvar.

Leitura tecnica:

- nao e um sistema de validacao de formulario avancado;
- mas atende o minimo obrigatorio que a auditoria anterior cobrava como bloqueio.

### Bloqueio 5

Se contatos multiplos ficaram realmente repetiveis na UI.

Status: **corrigido**

Evidencias:

- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) passou a usar `owner-contacts-list` com renderizacao dinamica de linhas.
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) implementa `renderContacts`, `createContactRow`, `collectContacts`, botao `Adicionar contato` e remocao de linhas.
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) permite definir contato principal por radio.

### Bloqueio 6

Se existem testes focados suficientes para sustentar a reclassificacao do modulo.

Status: **corrigido com ressalva**

Evidencias:

- [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts) adicionou teste de autoria em `create/update`.
- [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts) adicionou teste de leitura `repository-backed` para list/detail.
- o teste focado executado com `node --test --test-name-pattern="owners|authorship|repository-backed|master registry" dist/runtime.test.js` passou.

Ressalva:

- a cobertura ainda nao fecha toda a superficie do modulo;
- mas saiu de “ausencia de testes focados” para uma cobertura minima suficiente para reclassificacao.

### Bloqueio 7

Se a ressalva da suite ampla da API afeta ou nao a aprovacao do escopo Tutores.

Status: **afeta como ressalva, mas nao bloqueia mais o modulo**

Evidencias:

- `pnpm --filter @cvg-his-v2/api typecheck`: passou
- `pnpm --filter @cvg-his-v2/web typecheck`: passou
- os testes focados do modulo Tutores passaram
- a suite ampla `pnpm --filter @cvg-his-v2/api test` continua sem fechamento limpo nesta sessao

Leitura tecnica:

- a falha remanescente da suite ampla e um risco global da API;
- nao ha evidencia nesta reauditoria de que o escopo Tutores em si ainda esteja quebrado pelos pontos que motivaram a reprovacao anterior;
- portanto isso deve ser registrado como ressalva global, nao como motivo isolado para manter `reprovado para avanco` no modulo Tutores.

## 6. Itens efetivamente corrigidos

- preenchimento de `createdByUserId` e `updatedByUserId`;
- remocao do campo manual de tutor como caminho principal em `patients.ts`;
- mascaras de documento, telefone e CEP;
- validacoes client-side basicas de documento, CEP, email, telefone e contatos;
- contatos multiplos repetiveis com add/remove;
- testes focados do modulo Tutores;
- leitura via repositorio nos endpoints auditados do modulo.

## 7. Itens parcialmente corrigidos

- fonte de verdade do backend:
  a leitura por repositorio foi aplicada aos fluxos expostos da API de Tutores, mas `OwnersService` ainda preserva cache em memoria como fallback e apoio interno.

- robustez de testes:
  o modulo agora tem testes focados, mas ainda nao existe evidencia de fechamento limpo da suite ampla da API.

## 8. Itens ainda pendentes

- estabilizar a suite ampla da API para remover a ressalva global de runtime;
- decidir, em rodada futura, se `OwnersService` deve ser completamente reestruturado para eliminar o papel residual do `Map` em memoria tambem fora dos fluxos auditados.

## 9. Riscos remanescentes

### Risco medio

Ainda existe apoio interno em memoria no `OwnersService`, o que pode voltar a gerar divergencia se novos fluxos forem abertos sem usar os metodos `listForAccount` e `getForAccountOrThrow`.

### Risco medio

A suite ampla da API ainda nao oferece evidência limpa de estabilidade transversal.

### Risco baixo

As validacoes client-side foram elevadas ao nivel minimo exigido, mas ainda nao representam um framework robusto de formularios enterprise.

## 10. Classificacao final atualizada do modulo

**Aprovado com ressalvas**

## 11. Justificativa da classificacao

Manter `reprovado para avanco` seria incorreto nesta altura porque os bloqueios que motivaram a reprovacao anterior foram, em sua maioria, efetivamente corrigidos:

- autoria foi resolvida;
- fluxo manual de tutor deixou de ser o caminho principal;
- mascaras e validacoes principais existem;
- contatos repetiveis existem;
- testes focados existem;
- o backend passou a usar leitura via repositorio nos fluxos expostos de Tutores.

Ao mesmo tempo, marcar `aprovado` sem ressalvas tambem seria excessivo porque:

- ainda ha uso residual de memoria como apoio interno no `OwnersService`;
- a suite ampla da API nao foi estabilizada por completo nesta sessao.

Por isso, a classificacao tecnicamente mais honesta e `aprovado com ressalvas`.

## 12. Lista objetiva de pendencias remanescentes

1. Revalidar e estabilizar a suite ampla da API.
2. Registrar formalmente que o uso residual de memoria em `OwnersService` nao deve voltar a ser usado como base principal em novos fluxos de Tutores.
3. Se o projeto exigir eliminacao total da memoria como apoio interno, abrir rodada especifica de refatoracao arquitetural, fora desta reauditoria.

## 13. Decisao recomendada

**Pode avancar com ressalvas**

Leitura objetiva:

- o modulo Tutores nao deve mais ficar travado pelo status de reprovado;
- ele pode liberar continuidade do projeto;
- a ressalva principal agora e global/arquitetural, e nao mais um bloqueio funcional central do modulo.

## 14. Conclusao final

A reauditoria conclui que a rodada de correcoes pos-auditoria foi bem-sucedida naquilo que precisava resolver para mudar o patamar do modulo. O modulo Tutores nao esta mais no estado que justificava a reprovacao anterior.

O resultado correto agora e:

- modulo liberado para continuidade;
- classificado como `aprovado com ressalvas`;
- com recomendacao de tratar a suite ampla da API e a arquitetura residual de memoria como pendencias tecnicas posteriores, e nao como motivo para manter bloqueado o avanço do modulo.
