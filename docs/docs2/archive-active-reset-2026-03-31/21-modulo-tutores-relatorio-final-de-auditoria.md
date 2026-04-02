# Modulo Tutores — Relatorio Final de Auditoria

## 1. Resumo executivo

O modulo Tutores avancou de um CRUD simplificado para uma implementacao funcionalmente muito mais proxima do contrato documental: houve expansao de schema, contratos compartilhados, backend, frontend de `owners` e fluxo com `patients`. O modulo hoje ja cobre create, list, detail, update, filtros, detalhe com pacientes vinculados e acao rapida para abrir o fluxo de paciente a partir do tutor salvo.

Mesmo assim, a auditoria identificou divergencias relevantes entre o plano documental e a implementacao real. A mais grave e estrutural: o backend do modulo continua usando `OwnersService` com estado principal em memoria e persistencia apenas acessoria, o que quebra a aderencia plena ao requisito de sincronizacao banco/backend/frontend. Alem disso, os campos de auditoria minima de autor de criacao/edicao nao estao sendo populados, a UX de contatos multiplos ficou parcial, as mascaras e validacoes client-side previstas nao foram implementadas, e o fluxo de pacientes ainda expõe campo manual de tutor.

Classificacao final recomendada: **reprovado para avanco**.

Justificativa da classificacao:

- o modulo evoluiu bem e esta tecnicamente mais maduro que antes;
- porem ainda nao atende integralmente o gate documental de sincronizacao fullstack e de robustez de staging;
- existem gaps bloqueantes para considerar a etapa encerrada como pronta para auditoria liberatoria.

## 2. Escopo auditado

Foram auditados:

- documentos 01 a 20 do plano do modulo Tutores;
- schema/model;
- contratos e tipos compartilhados;
- implementacao do modulo `owners`;
- rotas de API relacionadas a `owners` e integracao com `patients`;
- frontend de `owners`;
- ajustes no frontend de `patients`;
- fluxo de vinculo via `owner-patient-links`;
- evidencias tecnicas de build, typecheck e testes.

## 3. Arquivos analisados

Arquivos principais do escopo auditado:

- [packages/shared/types/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/types/src/index.ts)
- [packages/shared/contracts/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/contracts/src/index.ts)
- [packages/shared/database/src/schemas/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts)
- [packages/shared/database/src/migrations/006_expand_owners_for_tutors.sql](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/006_expand_owners_for_tutors.sql)
- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts)
- [packages/modules/owners/src/repositories/database-owner.repository.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/repositories/database-owner.repository.ts)
- [packages/modules/owners/src/repositories/in-memory-owner.repository.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/repositories/in-memory-owner.repository.ts)
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)
- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)

Arquivos de evidencia complementar:

- [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts)
- [apps/api/src/db-persistence.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/db-persistence.test.ts)

## 4. Aderencia ao plano documental

### Avaliacao geral

Aderencia parcial, com boa cobertura funcional, mas com desvios importantes em robustez e sincronizacao.

### Pontos aderentes

- o contrato de Tutor foi expandido com documento estruturado, contatos, endereco, status, origem e campos administrativos;
- o frontend de `owners` deixou de ser simplorio;
- o backend passou a oferecer listagem mais rica, filtros, detalhe expandido e integracao com pacientes;
- o fluxo rapido de adicionar paciente a partir do tutor salvo foi introduzido;
- houve migration incremental para `owners`.

### Pontos nao aderentes ou so parcialmente aderentes

- sincronizacao real banco/backend/frontend nao ficou completa porque a leitura continua dependente do estado em memoria do `OwnersService`;
- mascaras de CPF/CNPJ, telefone e CEP previstas nos documentos nao foram implementadas;
- estrategia de multiplos contatos ficou parcial, limitada na UI a contato principal mais um adicional;
- auditoria minima de autoria (`createdByUserId` e `updatedByUserId`) nao foi efetivamente populada;
- o fluxo de pacientes ainda permite interacao com campo manual de tutor.

## 5. Aderencia por fase

### Fase 01

Status: parcialmente aderente

Entregue:

- schema de `owners` expandido;
- migration incremental criada;
- tipos e contratos compartilhados atualizados.

Gap:

- o modelo persistente aceita o contrato novo, mas a arquitetura de runtime nao usa o banco como fonte de verdade para list/detail/update;
- nao foi criada coluna explicita de normalizacao para documento/telefone/e-mail, apesar do contrato documental enfatizar normalizacao forte.

### Fase 02

Status: parcialmente aderente

Entregue:

- `GET /owners` com busca, filtros e paginacao;
- `POST /owners` e `PATCH /owners/:id` com contrato expandido;
- `GET /owners/:id` com pacientes vinculados;
- `GET /owners/:id/patients` adicionado;
- tratamento de erro baseado em `AppError`.

Gap:

- validacao de documento ficou fraca, baseada so em comprimento minimo;
- busca robusta existe no `OwnersService` em memoria, mas o repositorio SQL continua com busca simples e nao e usado como base primaria;
- `createdByUserId` e `updatedByUserId` nao sao preenchidos com o principal autenticado;
- nao ha protecao mais sofisticada para duplicidade potencial por telefone/e-mail, apenas bloqueio por documento.

### Fase 03

Status: parcialmente aderente

Entregue:

- listagem de tutores com filtros;
- formulario em blocos;
- campos de endereco, email, status, origem e observacoes;
- estados de sucesso e erro;
- edicao via reaproveitamento do formulario.

Gap:

- validacoes client-side sao basicas;
- mascaras nao existem;
- suporte de contatos multiplos e so parcial;
- nao ha validacao visual por campo do jeito previsto na documentacao.

### Fase 04

Status: parcialmente aderente

Entregue:

- detalhe do tutor com dados completos;
- exibicao de pacientes vinculados;
- botao rapido de adicionar paciente;
- pre-preenchimento do tutor no fluxo de pacientes.

Gap:

- a tela de pacientes ainda exibe campo manual de tutor principal;
- o fluxo nao elimina por completo a digitacao manual de id, apenas passa a oferecer contexto pre-preenchido;
- integracao com `owner-patient-links` foi preservada, mas nao aprofundada para cenarios mais robustos de multiplos responsaveis.

### Fase 05

Status: nao aderente o suficiente para gate final

Entregue:

- `typecheck` e `build` de API e web passaram;
- o subfluxo de `master registry` em runtime passou.

Gap:

- nao foram adicionados testes automatizados especificos do modulo Tutores;
- a suite ampla de runtime da API continua falhando em cenarios nao ligados diretamente a Tutores, o que impede fechamento limpo do gate tecnico;
- o modulo nao sai desta auditoria com robustez suficiente para ser considerado plenamente pronto para staging controlado.

## 6. Achados positivos

- O contrato de dados ficou muito mais alinhado ao uso hospitalar veterinario do que o estado inicial.
- O schema de `owners` foi expandido de forma incremental, sem destruicao da base existente.
- O backend agora expoe detalhe do tutor com pacientes vinculados.
- A listagem de tutores passou a suportar filtros e envelope paginado.
- O frontend de Tutores deixou de ser um formulario minimo e passou a cobrir identificacao, contato, endereco e dados administrativos.
- O fluxo `salvar tutor -> adicionar paciente` foi incorporado.
- O backend tolera aliases no fluxo de pacientes para reduzir friccao com o estado legado.

## 7. Inconsistencias encontradas

### Inconsistencia 1

Persistencia nao e a fonte principal de verdade.

Evidencia:

- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts) continua mantendo `#owners` em memoria como base da leitura;
- o repositorio e chamado apenas em `create` e `update`, de forma acessoria;
- nao ha hidratação inicial a partir do banco.

Impacto:

- quebra o principio de sincronizacao banco/backend/frontend;
- dificulta staging real;
- faz o schema evoluido existir sem ser efetivamente a base de leitura operacional.

### Inconsistencia 2

Campos de auditoria de autoria foram modelados, mas nao preenchidos.

Evidencia:

- `createdByUserId` e `updatedByUserId` existem no contrato e no schema;
- em [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts) o create salva `undefined` para autoria;
- o update tambem nao recebe o usuario autenticado.

Impacto:

- rastreabilidade minima incompleta;
- nao atende integralmente os documentos 02, 03, 06 e 10.

### Inconsistencia 3

UX de contatos multiplos ficou parcial.

Evidencia:

- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts) oferece contato principal e um contato adicional fixo;
- nao ha lista dinamica/repetivel de contatos.

Impacto:

- atende parcialmente o requisito de multiplos contatos;
- limita casos reais de mais de dois meios de contato.

### Inconsistencia 4

Mascaras e validacoes client-side previstas nao foram entregues.

Evidencia:

- nao ha mascara de CPF/CNPJ, telefone ou CEP na UI;
- validacao visual por campo e minima.

Impacto:

- experiencia inferior ao plano documental;
- maior risco de dados mal formatados na operacao.

### Inconsistencia 5

O fluxo de pacientes ainda expõe um campo manual de tutor.

Evidencia:

- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts) ainda mostra `Tutor principal` como input de texto.

Impacto:

- reduz a aderencia ao principio documental de nao depender de digitacao manual de id em fluxo regular.

## 8. Divergencias entre frontend e backend

- O frontend de Tutores trabalha com um formulario mais rico, mas a UX ainda nao espelha toda a profundidade do contrato, especialmente em contatos repetiveis.
- O frontend de Pacientes aceita contexto do tutor, mas ainda permite operacao manual com id.
- O backend suporta `status`, `origin`, endereco e contatos estruturados, mas a UI nao oferece validacao equivalente por campo.
- O backend retorna detalhe expandido, porem o frontend de edicao depende em parte do item da listagem em memoria local.

## 9. Divergencias entre contrato e persistencia

- O contrato fala em normalizacao forte de documento, telefone e email; a persistencia efetiva nao ganhou colunas dedicadas para isso.
- O contrato preve auditoria minima de autoria; a persistencia aceita esses campos, mas a implementacao nao os popula.
- O contrato preve `contacts` como estrutura principal; a persistencia manteve `email` e `phone` raiz como espelho, o que e aceitavel como retrocompatibilidade, mas aumenta risco de divergencia.
- O contrato aponta fullstack sincronizado; a implementacao nao faz leitura operacional a partir do banco.

## 10. Pendencias

- ligar `OwnersService` a um fluxo de leitura real do banco ou reestruturar o runtime para nao manter a memoria como fonte primaria;
- preencher `createdByUserId` e `updatedByUserId` com o principal autenticado;
- implementar mascaras e validacoes client-side principais;
- evoluir a UI para contatos repetiveis reais;
- remover a dependencia operacional do campo manual de tutor em `patients.ts`;
- adicionar testes automatizados especificos do modulo Tutores;
- revalidar a suite ampla de runtime da API ate fechar sem falhas residuais.

## 11. Riscos

### Risco alto

Persistencia e runtime desalinhados.

### Risco alto

Auditoria minima incompleta para autoria de create/update.

### Risco medio

Operacao ainda poder cair em fluxo manual de id no modulo Pacientes.

### Risco medio

Dados de documento/telefone/CEP podem chegar sem o acabamento de UX previsto.

### Risco medio

Ausencia de testes especificos do modulo aumenta risco de regressao em novas rodadas.

## 12. Classificacao final do modulo

**Reprovado para avanco**

Motivo:

- o modulo melhorou fortemente e esta funcional em varios pontos relevantes;
- porem nao atende ainda o gate documental de sincronizacao fullstack e de robustez minima para avancar sem correcoes obrigatorias;
- os gaps encontrados nao sao cosmeticos; eles afetam fonte de verdade, rastreabilidade e disciplina de fluxo operacional.

## 13. Lista objetiva de correcoes obrigatorias

1. Corrigir a arquitetura de leitura/escrita de `owners` para que o backend nao dependa de mapa em memoria como fonte principal de verdade.
2. Preencher `createdByUserId` e `updatedByUserId` nas operacoes de create/update.
3. Implementar mascaras e validacoes client-side de documento, telefone e CEP.
4. Transformar contatos em UI realmente repetivel, e nao apenas contato principal mais um adicional.
5. Ajustar `patients.ts` para que o fluxo regular nao exponha o campo manual de tutor como caminho principal.
6. Adicionar testes automatizados focados no modulo Tutores.
7. Reexecutar e estabilizar a suite de runtime da API antes do novo gate.

## 14. Conclusao final

O modulo Tutores saiu do estado inicial simplificado e hoje tem base funcional real para cadastro, listagem, detalhe e vinculacao inicial com pacientes. Isso e um avanço concreto.

Ao mesmo tempo, a auditoria conclui que a implementacao ainda nao pode ser tratada como etapa encerrada para avancar sem ressalvas. O principal motivo e que a persistencia evoluiu, mas o runtime do backend ainda nao esta plenamente alinhado a ela, o que enfraquece o proprio objetivo documental de sincronizacao entre banco, backend e frontend.

Decisao recomendada:

- nao seguir para fechamento do projeto deste modulo;
- executar as correcoes obrigatorias;
- somente depois reaplicar o gate de auditoria final.
