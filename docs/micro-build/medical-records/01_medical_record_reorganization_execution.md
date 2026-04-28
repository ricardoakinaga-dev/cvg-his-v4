# Execucao - reorganizacao do prontuario clinico

Data: 2026-04-28

## Arquivos alterados

- `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue`
- `apps/spa/src/pages/medical-records/__tests__/MedicalRecordsDetailPage.test.ts`
- `docs/micro-build/medical-records/00_medical_record_screen_audit.md`
- `docs/micro-build/medical-records/01_medical_record_reorganization_execution.md`

## Blocos reorganizados

A visao principal foi reorganizada para leitura medica nesta ordem:

1. Header clinico do paciente e tutor.
2. Alertas clinicos.
3. Queixa principal.
4. Anamnese.
5. Exame fisico.
6. Parametros vitais.
7. Exames solicitados / recomendados.
8. Suspeita diagnostica / avaliacao clinica.
9. Terapeutica / plano de tratamento.
10. Prescricao / receituario.
11. Conduta e proximos passos.
12. Observacoes.
13. Registro de novas informacoes clinicas.

## Dados removidos da visao principal

- UUID do paciente como identificacao principal.
- Autor tecnico por UUID.
- Timeline tecnica.
- Eventos de sistema.
- Card solto de `Atendimento nao carregado`.
- Cards operacionais de agenda, comanda, imagens, vacinas/vermfugos e internacao.
- Entradas clinicas brutas como forma principal de leitura.

## Dados movidos para area tecnica/secundaria

- Blocos operacionais e contexto complementar.
- Entradas clinicas brutas e auditoria.
- Timeline tecnica e IDs.
- IDs de prontuario, atendimento, paciente e tutor.
- Autor tecnico truncado.
- Comanda/financeiro.
- Agenda.
- Imagens/anexos.
- Vacinas/vermfugos.
- Internacao.

## Duplicidades eliminadas

- Anamnese passa a aparecer uma vez na leitura principal.
- Exame fisico passa a aparecer uma vez na leitura principal.
- Avaliacao passa a aparecer como `Suspeita diagnostica / avaliacao clinica`.
- Plano passa a aparecer como `Terapeutica / plano de tratamento`.
- Prescricao passa a aparecer como `Prescricao / receituario`.
- Conduta passa a aparecer como `Conduta e proximos passos`.
- A timeline tecnica permanece recolhida e nao duplica a narrativa clinica principal.

## Comportamento preservado

- Mesmos services e endpoints.
- Mesma rota `/medical-records/:id`.
- Mesmo fallback para carregar por `medicalRecordId` quando a rota nao resolve por `encounterId`.
- Mesma criacao de entradas via `POST /medical-records/entries`.
- Mesma edicao via `PATCH /medical-records/entries/:entryId`.
- Mesmo arquivamento via `DELETE /medical-records/entries/:entryId`.
- Mesma carga de atendimento, paciente, tutor, financeiro, diagnosticos, prescricoes e timeline.
- Nenhuma regra clinica nova foi criada.
- Nenhum dado clinico foi inventado.

## Riscos restantes

- Parametros vitais ainda nao existem como estrutura dedicada no contrato usado pela tela; a tela exibe estado vazio e apenas reaproveita peso cadastral quando disponivel.
- Exames solicitados/recomendados dependem do service de diagnosticos; quando exames estao descritos em texto livre da avaliacao, a tela nao tenta interpretar automaticamente.
- Comanda, agenda, imagens, vacinas e internacao continuam presentes apenas como contexto secundario, mas ainda precisam de uma futura revisao por modulo.
- A identificacao de autor segue tecnica na area de auditoria porque nao ha nome de usuario resolvido nesta tela.

## Endpoints que precisam melhoria futura

- `GET /medical-records?encounterId=:id`: incluir payload clinico agregado pronto para leitura medica.
- `GET /medical-records/entries`: considerar filtros por tipo e retorno do nome do autor.
- `GET /medical-records/timeline`: separar eventos clinicos reais de eventos tecnicos/auditoria.
- Endpoint futuro de parametros vitais estruturados por atendimento.
- Endpoint futuro de exames solicitados/recomendados normalizados por atendimento.

## Checklist de validacao

- [x] Header nao usa UUID como nome principal.
- [x] Alertas principais sao clinicos.
- [x] Queixa principal aparece antes da anamnese.
- [x] Anamnese aparece uma vez na visao principal.
- [x] Exame fisico aparece uma vez na visao principal.
- [x] Parametros vitais possuem bloco proprio e estado vazio.
- [x] Exames possuem bloco proprio e estado vazio.
- [x] Avaliacao usa nomenclatura clinica.
- [x] Plano usa nomenclatura de terapeutica/tratamento.
- [x] Prescricao fica separada do plano.
- [x] Conduta e proximos passos ficam separados.
- [x] Timeline tecnica fica recolhida.
- [x] Entradas brutas ficam recolhidas.
- [x] IDs ficam recolhidos em detalhes tecnicos.
- [x] Teste focado da tela passou.

## Comandos executados

- `npm --prefix apps/spa run typecheck`: passou.
- `npm --prefix apps/spa run test -- src/pages/medical-records/__tests__/MedicalRecordsDetailPage.test.ts`: passou, 27 testes.
- `npm run typecheck`: passou.
- `npm run lint`: falhou fora do escopo do prontuario.
- `npm run test`: falhou fora do escopo do prontuario.
- `npm run build`: passou.

Detalhes das falhas fora do escopo:

- `npm run lint` falhou em `apps/api/src/routes/fiscal-routes.ts` por referencias a tipos/metodos de IPI nao exportados/nao existentes no modulo fiscal atual:
  - `CreateFiscalIpiTableRequest`
  - `FiscalIpiTableListResponse`
  - `UpdateFiscalIpiTableRequest`
  - `listIpiTables`
  - `createIpiTable`
  - `updateIpiTable`
- `npm run test` falhou em `apps/spa/tests/unit/labels.test.ts`: o teste espera `🐕 Canino`, mas `speciesLabel('canine')` retorna `🐕 Canina`.

Validacao diretamente relacionada ao prontuario:

- Typecheck da SPA passou.
- Teste focado de `MedicalRecordsDetailPage.vue` passou.
- Build completo passou.
