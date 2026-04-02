# Modulo Pacientes — Relatorio Final de Auditoria

## 1. Resumo executivo

O modulo Pacientes evoluiu de forma relevante e hoje cobre boa parte do contrato documental: schema ampliado, persistencia de dados clinicos iniciais, alertas estruturados, frontend com formulario em blocos, integracao com Tutores e testes focados do modulo. O fluxo principal de criar paciente com tutor salvo esta operacional e a base fullstack esta significativamente mais madura que o estado inicial.

Mesmo assim, a auditoria encontrou inconsistencias materiais que impedem classificar o modulo como `aprovado` sem ressalvas. As mais relevantes sao:

- `GET /patients/:id` nao retorna detalhe expandido com tutor, apesar do contrato e da UX pressuporem esse dado;
- a busca persistida de pacientes nao cobre tutor e microchip no repositorio SQL, embora a UX e o contrato apontem busca mais ampla;
- o schema ainda permite `species` e `sex` nulos no banco, contrariando a obrigatoriedade documental;
- a regra documental de coerencia entre `birthDate` e `estimatedAge` nao foi implementada de forma consistente;
- o backend valida existencia de tutor, mas nao valida tutor ativo como indicado nos docs.

Classificacao final recomendada:

**Aprovado com ressalvas**

## 2. Escopo auditado

Foram auditados:

- documentos do modulo Pacientes em `/docs`;
- prompt master utilizado na implementacao;
- schema e migration de `patients`;
- contratos e tipos compartilhados;
- modulo `patients`;
- rotas da API de pacientes;
- frontend de pacientes;
- integracao com Tutores;
- testes focados do modulo.

## 3. Arquivos analisados

- [docs/33-prompt-master-implementacao-enterprise-completa-modulo-pacientes.md](/root/.openclaw/workspace/cvg-his-v2/docs/33-prompt-master-implementacao-enterprise-completa-modulo-pacientes.md)
- [docs/35-modulo-pacientes-contrato-de-dados.md](/root/.openclaw/workspace/cvg-his-v2/docs/35-modulo-pacientes-contrato-de-dados.md)
- [docs/39-modulo-pacientes-validacoes-regras-de-negocio.md](/root/.openclaw/workspace/cvg-his-v2/docs/39-modulo-pacientes-validacoes-regras-de-negocio.md)
- [docs/42-modulo-pacientes-gate-de-auditoria.md](/root/.openclaw/workspace/cvg-his-v2/docs/42-modulo-pacientes-gate-de-auditoria.md)
- [packages/shared/database/src/schemas/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts)
- [packages/shared/contracts/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/contracts/src/index.ts)
- [packages/shared/types/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/types/src/index.ts)
- [packages/modules/patients/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/patients/src/index.ts)
- [packages/modules/patients/src/repositories/database-patient.repository.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/patients/src/repositories/database-patient.repository.ts)
- [apps/api/src/server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)
- [apps/web/src/pages/patients.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)
- [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts)

## 4. Aderência ao contrato

### Avaliacao geral

Aderencia boa, mas incompleta.

O modulo atende a maior parte do contrato em create, update, listagem, vínculo com tutor e alertas clinicos. Os gaps principais estao na rigidez do schema, no detalhe expandido e na busca persistida.

### Pontos aderentes

- paciente nao e criado sem tutor valido;
- o frontend nao usa digitacao manual de ID de tutor como caminho principal;
- alertas clinicos sao estruturados, persistidos e exibidos;
- autoria minima existe;
- o formulario esta dividido em blocos coerentes com o contrato;
- testes focados do modulo existem e passam;
- `typecheck` de API e web passou.

### Pontos nao aderentes ou parcialmente aderentes

- o schema nao reforca obrigatoriedade de `species` e `sex` no banco;
- o detalhe de paciente nao retorna tutor expandido na API;
- a busca persistida nao cobre tutor e microchip;
- a coerencia entre `birthDate` e `estimatedAge` nao foi de fato implementada;
- o backend nao valida tutor ativo, apenas tutor existente.

## 5. Análise por camada

### Banco

Status: **parcialmente aderente**

Pontos positivos:

- schema de `patients` foi expandido com campos clinicos e administrativos;
- alertas sao persistidos em `jsonb`;
- autoria minima existe no schema;
- migration incremental foi criada.

Problemas:

- [index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts) ainda deixa `species` e `sex` anulaveis no banco, embora o contrato as trate como obrigatorias;
- `ownerId` continua sendo o nome persistido do vínculo principal, o que e aceitavel por compatibilidade, mas mantem a semantica tecnica desalinhada do termo documental `tutorId`.

### Backend

Status: **parcialmente aderente**

Pontos positivos:

- `POST /patients`, `GET /patients`, `GET /patients/:id` e `PATCH /patients/:id` existem;
- create e update preenchem autoria;
- tutor invalido e rejeitado;
- listagem exposta usa `listForAccount`;
- detalhe exposto usa `getForAccountOrThrow`;
- validacoes basicas de nome, especie, sexo e tutor existem.

Problemas:

- o backend nao valida tutor ativo, embora os docs indiquem isso;
- a coerencia entre `birthDateApproximate` e `estimatedAge` ficou so comentada no service e nao efetivamente aplicada;
- a verificacao de duplicidade em `create()` usa `this.list()` e nao consulta persistencia diretamente;
- a leitura persistida ainda convive com `Map` interno como fallback.

### Frontend

Status: **aderente com ressalvas**

Pontos positivos:

- formulario em blocos;
- busca e selecao de tutor via sistema;
- sem campo manual de ID como caminho principal;
- alertas clinicos com criacao/remocao;
- listagem, detalhe e edicao existem;
- validacao basica de nome, especie, sexo e tutor funciona.

Problemas:

- filtros de especie/status sao aplicados no cliente, nao em query dedicada de backend;
- o detalhe depende de dados de tutor que nem sempre voltam da rota de detalhe, o que pode produzir `Tutor: ---` em cenarios fora da lista atual;
- nao ha validacao de conflito entre data de nascimento e idade estimada.

### Integração

Status: **aderente**

Pontos positivos:

- fluxo Tutor -> Paciente funciona por contexto e querystring;
- o frontend de pacientes reaproveita o contexto vindo de Tutores;
- o vínculo principal e persistido.

Problemas:

- o detalhe do paciente nao vem expandido com tutor pela API, o que enfraquece a consistencia completa da integracao no response de detail.

### Alertas

Status: **aderente**

Pontos positivos:

- estrutura coerente;
- persistencia via `jsonb`;
- exibicao com destaque por severidade;
- validacao de `type`, `label` e `severity` no backend.

### Validações

Status: **parcialmente aderente**

Backend:

- nome obrigatorio: sim
- especie obrigatoria: sim no service, nao no schema
- status obrigatorio: parcialmente, com default
- tutor valido: sim
- tutor ativo: nao
- coerencia `birthDate` vs `estimatedAge`: nao

Frontend:

- validacao por campo: basica e suficiente para fluxo principal
- mensagens claras: sim
- validacao de conflito nascimento/idade: nao

### Testes

Status: **aderente com ressalvas**

Pontos positivos:

- existem testes focados para create, update, list, tutor invalido, detail e required fields;
- o recorte focado de pacientes passou.

Problemas:

- o teste chamado “patients detail returns linked tutor info” nao verifica de fato dados expandidos de tutor; ele verifica apenas `primaryOwnerId` e alertas;
- portanto a cobertura de detail esta abaixo do que o nome do teste sugere.

## 6. Achados positivos

- O modulo Pacientes deixou de ser um fluxo basico e ganhou estrutura mais compativel com uso hospitalar veterinario.
- O vínculo com tutor salvo esta corretamente incorporado no fluxo principal.
- Alertas clinicos foram implementados de maneira simples e evolutiva.
- A UI esta organizada em blocos coerentes com operacao real.
- Os testes focados do modulo existem e passaram.
- A base fullstack esta, em geral, sincronizada para os principais campos clinicos iniciais.

## 7. Inconsistências encontradas

### Inconsistencia 1

Schema nao reforca obrigatoriedade de `species` e `sex`.

Evidencia:

- [index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts) define `species` e `sex` sem `notNull()`.

Impacto:

- o contrato fica garantido pelo service, mas nao pelo banco;
- isso e inconsistência estrutural de camada, ainda que mitigada pela aplicacao.

### Inconsistencia 2

Detalhe de paciente nao retorna tutor expandido na API.

Evidencia:

- [server.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts) em `GET /patients/:id` retorna diretamente `patient`;
- nao ha enriquecimento com `ownerName`, `tutorName` ou `tutor`.

Impacto:

- quebra parcial do contrato documental de detail expandido;
- fragiliza o detalhe quando ele nao depende do estado da listagem.

### Inconsistencia 3

Busca persistida nao cobre tutor e microchip.

Evidencia:

- [database-patient.repository.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/patients/src/repositories/database-patient.repository.ts) busca apenas por `name`, `species` e `breed`;
- o placeholder do frontend promete nome, raca, microchip ou tutor.

Impacto:

- experiencia de busca fica mais rica no texto da UI do que no repositorio real;
- com persistencia ativa, busca por tutor e microchip pode nao funcionar como esperado.

### Inconsistencia 4

Coerencia entre `birthDate` e `estimatedAge` nao foi implementada.

Evidencia:

- [index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/patients/src/index.ts) apenas comenta “prefer birthDate” quando ambos existem;
- o objeto final ainda pode persistir ambos.

Impacto:

- viola regra documental de consistencia;
- pode gerar dados clinicos ambíguos.

### Inconsistencia 5

Tutor ativo nao e validado.

Evidencia:

- [index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/patients/src/index.ts) usa `this.#owners.getOrThrow(...)`, mas nao avalia status do tutor.

Impacto:

- fica abaixo do documento de validacoes, que menciona tutor existente e ativo.

## 8. Divergências fullstack

- Contrato/documentacao exigem detail expandido com tutor; a API de detail nao entrega isso.
- Contrato/documentacao e UX indicam busca mais ampla por tutor/microchip; o repositorio persistido nao cobre isso.
- Contrato/documentacao tratam `species` e `sex` como obrigatorios; o banco nao reforca isso com `notNull()`.

## 9. Pendências

- expandir `GET /patients/:id` para resposta expandida com tutor;
- endurecer schema para obrigatoriedade real de `species` e `sex`;
- implementar busca persistida por tutor e microchip;
- decidir regra efetiva para `birthDate` versus `estimatedAge`;
- validar status ativo do tutor conforme contrato.

## 10. Riscos

### Risco medio

O detalhe do paciente pode ficar incompleto ou inconsistente fora do fluxo da listagem.

### Risco medio

A busca real em ambiente persistido pode frustrar uso operacional ao nao localizar por tutor ou microchip.

### Risco baixo

Campos obrigatorios continuarem anulaveis no banco aumenta risco estrutural em cenarios fora do service atual.

### Risco baixo

Persistir `birthDate` e `estimatedAge` ao mesmo tempo pode gerar ambiguidade clinica.

## 11. Classificação final

**Aprovado com ressalvas**

## 12. Justificativa da classificação

O modulo nao deve ser reprovado porque:

- o fluxo principal funciona;
- o vínculo com tutor esta correto;
- os dados clinicos iniciais existem;
- os alertas funcionam;
- os testes focados existem e passam;
- nao foi encontrado bloqueio fatal em create/update/list do fluxo principal.

O modulo tambem nao deve ser classificado como `aprovado` sem ressalvas porque:

- ainda ha inconsistencias fullstack reais;
- detalhe expandido nao esta completo;
- busca persistida nao cobre todo o comportamento prometido;
- parte da obrigatoriedade documental nao esta reforcada no schema.

## 13. Lista de correções obrigatórias

1. Expandir `GET /patients/:id` para retornar tutor vinculado de forma explicita.
2. Alinhar busca persistida com o contrato e a UX, cobrindo tutor e microchip.
3. Endurecer o schema para obrigatoriedade real de `species` e `sex`.
4. Implementar regra consistente para `birthDate` e `estimatedAge`.
5. Validar tutor ativo conforme o contrato documental, ou revisar explicitamente essa regra na documentação se a regra de negocio real for outra.

## 14. Decisão recomendada

**Pode avançar com ressalvas**

Leitura objetiva:

- o modulo pode seguir no programa de continuidade do sistema;
- mas deve carregar um pacote curto de correcoes obrigatorias antes de uma classificacao sem ressalvas.

## 15. Conclusão final

O modulo Pacientes esta funcional e suficientemente maduro para nao ficar bloqueado, mas ainda nao fechou totalmente o gap entre contrato documental, API de detalhe, busca persistida e rigidez do schema.

Decisao final:

**Pode avançar com ressalvas**
