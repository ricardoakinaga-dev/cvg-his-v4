# Progresso Fase 1 - Cadastro tutor/paciente OpenAPI e resumos

Data: 2026-05-28

## Incremento entregue

Incremento da Fase 1 do roadmap Premium Enterprise no item `F1-03 - Validar cadastro tutor/paciente`.

O foco foi tornar os cadastros de tutores e pacientes mais auditaveis e integraveis, documentando no OpenAPI os contratos usados pela SPA para busca, detalhe e resumo operacional.

## Escopo implementado

- Documentacao OpenAPI do resumo operacional do tutor:
  - `GET /owners/{ownerId}/summary`.
- Documentacao OpenAPI do resumo operacional do paciente:
  - `GET /patients/{patientId}/summary`.
- Filtros de tutores documentados:
  - busca textual/digitos;
  - status;
  - responsavel financeiro;
  - contexto ABAC por setor.
- Filtros de pacientes documentados:
  - busca textual/digitos;
  - tutor;
  - especie;
  - status.
- Contrato de vinculo tutor-paciente refinado com `relationshipType` e `financialResponsible`.
- Schemas de tutor atualizados para refletir o contrato real da aplicacao:
  - contatos;
  - endereco;
  - perfil;
  - perfil financeiro;
  - ID Vetus;
  - data original Vetus;
  - status.
- Schemas de paciente atualizados para refletir o contrato real da aplicacao:
  - tutor principal;
  - castracao;
  - microchip;
  - pedigree;
  - cor;
  - doenca cronica;
  - alergia;
  - temperamento;
  - observacoes;
  - ID Vetus;
  - data original Vetus;
  - status.
- Novos schemas:
  - `OwnerContact`;
  - `OwnerAddress`;
  - `OwnerProfile`;
  - `OwnerFinancialProfile`;
  - `OwnerPatientLink`;
  - `OwnerSummaryResponse`;
  - `PatientSummaryResponse`.
- Testes de rota adicionados para:
  - resumo do tutor com animais vinculados e contador de atendimentos;
  - resumo do paciente com snapshot do tutor e atendimentos recentes.

## Evidencias de validacao

- `pnpm validate:openapi`: passou.
  - `246 paths`;
  - `36 tags`;
  - `252 schemas`.
- `pnpm --filter @cvg-his-v2/api build`: passou.
- `node --test apps/api/dist/routes/owners-routes.test.js`: passou.
  - `5` testes.
- `node --test apps/api/dist/routes/patients-routes.test.js`: passou.
  - `5` testes.

## Impacto no roadmap

Este incremento reforca `F1-03` porque cadastro, busca e historico operacional de tutor/paciente deixam de depender apenas de implementacao interna da SPA. Os endpoints de resumo agora estao documentados, testados e alinhados com os dados usados pelos cockpits de tutor e paciente.

Isso aproxima o CVG-HIS v4 do perfil Premium Enterprise por melhorar interoperabilidade, homologacao, auditoria tecnica e clareza de contrato para integracoes externas.

## Proximo foco recomendado

Continuar `F1-03` com cobertura SPA/integração para:

1. criar tutor;
2. criar paciente vinculado;
3. editar dados criticos;
4. buscar por documento/telefone/microchip/ID Vetus;
5. validar que o detalhe exibe historico operacional consolidado.
