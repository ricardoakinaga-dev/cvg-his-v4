# Módulo Tutores — Mapa de Arquivos

## 1. Objetivo

Mapear os arquivos reais do projeto que devem ser considerados pelo worker na implementação do módulo Tutores, com papel atual, tipo de alteração esperada, criticidade e dependências.

## 2. Backend

### [`apps/api/src/server.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)

- Papel atual: concentra as rotas HTTP de `owners`, `patients` e `owner-patient-links`.
- Tipo de alteração esperada: expansão de contrato, refatoração incremental, hardening de erros e auditoria.
- Criticidade: alta.
- Dependências: schema, contratos compartilhados, bootstrap/persistência.

### [`apps/api/src/bootstrap.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/bootstrap.ts)

- Papel atual: contém base de persistência/consulta, incluindo busca de links por `ownerId`.
- Tipo de alteração esperada: adaptação de persistência, apoio à listagem de vínculos e possíveis helpers de consulta.
- Criticidade: alta.
- Dependências: schema e tipos compartilhados.

### [`apps/api/src/runtime.test.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts)

- Papel atual: testes de runtime da API e fluxos de domínio.
- Tipo de alteração esperada: expansão de cobertura de create/list/detail/update/busca/vínculos.
- Criticidade: média.
- Dependências: contratos finais do backend.

### [`apps/api/src/db-persistence.test.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/db-persistence.test.ts)

- Papel atual: valida persistência e comportamento integrado com banco/persistência.
- Tipo de alteração esperada: cobertura de migração e persistência do novo contrato de tutor.
- Criticidade: média.
- Dependências: schema/migrations.

## 3. Frontend

### [`apps/web/src/pages/owners.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)

- Papel atual: tela simplificada de Tutores.
- Tipo de alteração esperada: reescrita da listagem, formulário, detalhe e integração com pacientes.
- Criticidade: alta.
- Dependências: API estabilizada, estilos e tipos compartilhados.

### [`apps/web/src/pages/patients.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)

- Papel atual: criação e vínculo manual de pacientes, ainda dependente de ids em alguns fluxos.
- Tipo de alteração esperada: integração com contexto do tutor salvo, redução de id manual, ajuste do pré-preenchimento.
- Criticidade: alta.
- Dependências: rotas de tutores e de vínculos.

### [`apps/web/src/index.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/index.ts)

- Papel atual: roteamento/renderização da aplicação, incluindo rota `/owners`.
- Tipo de alteração esperada: baixo impacto, apenas se a experiência de detalhe/navegação exigir.
- Criticidade: média.
- Dependências: pages e navegação.

### `apps/web/src/styles.ts`

- Papel atual: estilos globais e do shell/páginas.
- Tipo de alteração esperada: expansão de estilos para a nova experiência de Tutores.
- Criticidade: média.
- Dependências: layout final da tela.

### [`apps/web/src/pages/master-search.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/master-search.ts)

- Papel atual: busca mestre com exibição de tutores.
- Tipo de alteração esperada: eventual adaptação do shape resumido de tutor.
- Criticidade: média.
- Dependências: contrato de list item.

### [`apps/web/src/pages/dashboard.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/dashboard.ts)

- Papel atual: consumo de contagem e acesso rápido ao módulo.
- Tipo de alteração esperada: baixo impacto, só se listagem/contrato mudar envelope esperado.
- Criticidade: baixa.
- Dependências: contrato de listagem.

## 4. Schema / model

### [`packages/shared/database/src/schemas/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts)

- Papel atual: schema das tabelas `owners`, `patients`, `owner_patient_links` e correlatas.
- Tipo de alteração esperada: expansão do schema de `owners`, possíveis índices e novos campos.
- Criticidade: alta.
- Dependências: contrato de dados e migrations.

### `packages/shared/database/src/migrations/*`

- Papel atual: migrations versionadas do banco.
- Tipo de alteração esperada: migration incremental do módulo Tutores.
- Criticidade: alta.
- Dependências: schema alvo aprovado.

## 5. Tipos compartilhados

### [`packages/shared/contracts/src/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/contracts/src/index.ts)

- Papel atual: contratos compartilhados de payloads e respostas.
- Tipo de alteração esperada: expansão do contrato de tutor e do vínculo com pacientes.
- Criticidade: alta.
- Dependências: decisão final do contrato de dados.

### [`packages/shared/types/src/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/types/src/index.ts)

- Papel atual: tipos compartilhados de domínio.
- Tipo de alteração esperada: expansão de tipos relacionados a owner/tutor e compatibilidade com `ownerId`.
- Criticidade: alta.
- Dependências: contratos compartilhados e schema.

## 6. Pontos de integração com pacientes

### [`apps/web/src/pages/patients.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)

- Papel atual: consumo direto do vínculo com tutor.
- Tipo de alteração esperada: integração operacional.
- Criticidade: alta.
- Dependências: backend de tutores e vínculos.

### [`apps/api/src/server.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)

- Papel atual: API de pacientes e de vínculos.
- Tipo de alteração esperada: refletir o novo detalhe do tutor e o fluxo rápido tutor -> paciente.
- Criticidade: alta.
- Dependências: contrato de tutor.

### [`packages/shared/database/src/schemas/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts)

- Papel atual: mantém `patients.ownerId` e `owner_patient_links`.
- Tipo de alteração esperada: preservação da semântica com evolução gradual.
- Criticidade: alta.
- Dependências: estratégia de compatibilidade.

## 7. Arquivos que devem ser observados por regressão

Mesmo sem alteração inicial, precisam ser monitorados:

- [`apps/web/src/pages/appointments.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/appointments.ts)
- [`apps/web/src/pages/queue.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/queue.ts)
- [`apps/web/src/pages/encounters.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/encounters.ts)
- [`apps/web/src/pages/billing.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/billing.ts)

Motivo:

- todos ainda consomem `ownerId` ou dados resumidos de tutor.

## 8. Diretriz de uso do mapa

O worker não deve tocar todos os arquivos ao mesmo tempo. O mapa serve para:

- identificar a superfície real de impacto;
- evitar surpresa de regressão;
- separar arquivos de implementação obrigatória de arquivos de observação/revisão.
