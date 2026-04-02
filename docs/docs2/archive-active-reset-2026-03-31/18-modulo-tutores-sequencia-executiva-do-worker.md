# Módulo Tutores — Sequência Executiva do Worker

## 1. Objetivo

Fornecer um roteiro passo a passo para implementação do módulo Tutores sem improviso excessivo.

## 2. Passo 1

- Objetivo: validar o contrato documental antes de codar.
- Arquivo(s): documentos 01 a 17 em `/docs`.
- Ação esperada: revisar contrato de dados, fases e mapa de arquivos.
- Dependência anterior: nenhuma.
- Evidência de conclusão: entendimento explícito do shape final de Tutor.
- Risco de seguir adiante sem validar: backend e frontend implementarem shapes diferentes.

## 3. Passo 2

- Objetivo: fechar o shape transitório entre `owner` técnico e `Tutor` de negócio.
- Arquivo(s): `packages/shared/contracts/src/index.ts`, `packages/shared/types/src/index.ts`.
- Ação esperada: definir interfaces/tipos compartilhados que guiarão banco, backend e frontend.
- Dependência anterior: passo 1.
- Evidência de conclusão: tipos de create/update/list/detail definidos.
- Risco de seguir adiante sem validar: migration e API com nomes/campos incompatíveis.

## 4. Passo 3

- Objetivo: expandir o schema de `owners`.
- Arquivo(s): `packages/shared/database/src/schemas/index.ts`.
- Ação esperada: adicionar campos necessários e preservar retrocompatibilidade.
- Dependência anterior: passo 2.
- Evidência de conclusão: schema alvo refletindo o contrato.
- Risco de seguir adiante sem validar: API construída sobre persistência insuficiente.

## 5. Passo 4

- Objetivo: criar migration incremental.
- Arquivo(s): `packages/shared/database/src/migrations/*`.
- Ação esperada: introduzir alterações sem quebrar dados existentes.
- Dependência anterior: passo 3.
- Evidência de conclusão: migration aplicável e reversível dentro da estratégia do projeto.
- Risco de seguir adiante sem validar: divergência entre schema local e banco real.

## 6. Passo 5

- Objetivo: adaptar o backend de create e update.
- Arquivo(s): `apps/api/src/server.ts`, possivelmente `apps/api/src/bootstrap.ts`.
- Ação esperada: aceitar payload novo, normalizar dados, validar e persistir.
- Dependência anterior: passos 2 a 4.
- Evidência de conclusão: `POST /owners` e `PATCH /owners/:id` operacionais com o novo contrato.
- Risco de seguir adiante sem validar: frontend enviar payload que a API descarta.

## 7. Passo 6

- Objetivo: adaptar listagem e busca da API.
- Arquivo(s): `apps/api/src/server.ts`, `apps/api/src/bootstrap.ts`.
- Ação esperada: incluir paginação, filtros e busca por múltiplas chaves.
- Dependência anterior: passo 5.
- Evidência de conclusão: `GET /owners` padronizado e útil para recepção.
- Risco de seguir adiante sem validar: UI antiga mascarar inconsistência de busca.

## 8. Passo 7

- Objetivo: ampliar detalhe do tutor.
- Arquivo(s): `apps/api/src/server.ts`, `apps/api/src/bootstrap.ts`.
- Ação esperada: retornar contatos, endereço, status, origem e pacientes vinculados.
- Dependência anterior: passos 5 e 6.
- Evidência de conclusão: `GET /owners/:id` suficiente para a tela de detalhe.
- Risco de seguir adiante sem validar: frontend inventar chamadas laterais desnecessárias.

## 9. Passo 8

- Objetivo: reforçar erros e auditoria.
- Arquivo(s): `apps/api/src/server.ts`.
- Ação esperada: padronizar erros e ampliar `appendAudit`.
- Dependência anterior: passos 5 a 7.
- Evidência de conclusão: respostas previsíveis e auditáveis.
- Risco de seguir adiante sem validar: UX ruim e rastreabilidade incompleta.

## 10. Passo 9

- Objetivo: reconstruir a listagem de Tutores no frontend.
- Arquivo(s): `apps/web/src/pages/owners.ts`, possivelmente `apps/web/src/styles.ts`.
- Ação esperada: adaptar consumo da nova listagem, busca e filtros.
- Dependência anterior: passos 5 a 8.
- Evidência de conclusão: listagem operacional usando contrato real.
- Risco de seguir adiante sem validar: formulário novo sobre base visual quebrada.

## 11. Passo 10

- Objetivo: reconstruir o formulário de Tutores.
- Arquivo(s): `apps/web/src/pages/owners.ts`, `apps/web/src/styles.ts`.
- Ação esperada: introduzir blocos, contatos, endereço, status e ações.
- Dependência anterior: passo 9.
- Evidência de conclusão: create/update funcionais no frontend.
- Risco de seguir adiante sem validar: integração com paciente sobre cadastro ainda incompleto.

## 12. Passo 11

- Objetivo: implementar detalhe do tutor no frontend.
- Arquivo(s): `apps/web/src/pages/owners.ts`.
- Ação esperada: renderizar dados completos e pacientes vinculados.
- Dependência anterior: passos 7, 9 e 10.
- Evidência de conclusão: detalhe útil e estável.
- Risco de seguir adiante sem validar: botão de adicionar paciente sem contexto confiável.

## 13. Passo 12

- Objetivo: integrar fluxo tutor -> paciente.
- Arquivo(s): `apps/web/src/pages/owners.ts`, `apps/web/src/pages/patients.ts`, possivelmente `apps/api/src/server.ts`.
- Ação esperada: adicionar ação rápida de paciente com tutor salvo.
- Dependência anterior: passo 11.
- Evidência de conclusão: paciente criado a partir do tutor sem digitação manual de id.
- Risco de seguir adiante sem validar: principal valor operacional do módulo continua ausente.

## 14. Passo 13

- Objetivo: cobrir testes e regressões.
- Arquivo(s): `apps/api/src/runtime.test.ts`, `apps/api/src/db-persistence.test.ts`, eventuais testes de frontend se existirem.
- Ação esperada: validar API, persistência, duplicidade, detalhe e integração.
- Dependência anterior: passos 5 a 12.
- Evidência de conclusão: casos críticos cobertos.
- Risco de seguir adiante sem validar: staging com sensação falsa de prontidão.

## 15. Passo 14

- Objetivo: hardening final.
- Arquivo(s): backend, frontend e documentação residual.
- Ação esperada: corrigir desvios, revisar performance de busca, revisar mensagens e auditoria.
- Dependência anterior: passo 13.
- Evidência de conclusão: módulo apto para gate de auditoria.
- Risco de seguir adiante sem validar: auditoria reprovar por inconsistência simples evitável.
