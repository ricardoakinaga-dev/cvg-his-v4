# Auditoria rapida - tela de prontuario clinico

Data: 2026-04-28

## 1. Arquivo da pagina

- Pagina principal: `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue`
- Testes relacionados: `apps/spa/src/pages/medical-records/__tests__/MedicalRecordsDetailPage.test.ts`
- Service SPA: `apps/spa/src/services/medicalRecords.ts`
- Tipos SPA: `apps/spa/src/types/medicalRecords.ts`

## 2. Rota frontend

- Rota: `/medical-records/:id`
- Nome da rota: `MedicalRecordDetail`
- Registro: `apps/spa/src/router/routes.ts`
- Observacao: o parametro `:id` pode chegar como `encounterId` ou como `medicalRecordId`; a pagina tenta `getByEncounter(id)` e, em fallback, busca em `listAll()`.

## 3. Servicos usados

- `medicalRecordsService`
- `encounterService`
- `patientService`
- `ownerService`
- `billingService`
- `diagnosticsService`
- `prescriptionsService`
- `useEntityCache`

## 4. Endpoints chamados

- `GET /medical-records?encounterId=:id`
- `GET /medical-records`
- `GET /medical-records/entries?encounterId=:encounterId`
- `POST /medical-records/entries`
- `PATCH /medical-records/entries/:entryId`
- `DELETE /medical-records/entries/:entryId`
- `GET /medical-records/timeline?encounterId=:encounterId`
- `GET /medical-records/entries/:entryId/revisions`
- Endpoints auxiliares por service:
  - atendimento por ID
  - paciente por ID
  - tutor por ID
  - financeiro/comanda por atendimento
  - itens financeiros por atendimento
  - diagnosticos por atendimento
  - prescricoes por paciente

## 5. Tipos de entrada clinica existentes

- `anamnesis`
- `physical_exam`
- `progress_note`
- `assessment`
- `plan`
- `prescription`
- `conduct`

## 6. Blocos renderizados hoje

- Header do prontuario.
- Alertas de erro/sucesso/visao parcial.
- Rail lateral do paciente, ficha animal, seguranca clinica e cliente.
- Cards de resumo operacional.
- Acesso rapido de anamnese.
- Ficha estruturada para salvar multiplas entradas.
- Cards operacionais/Vetus-like: ultimos atendimentos, anamneses, vacinas/vermfugos, agenda, exames, internacao, receituario, grafico de peso, imagens, comanda, historico clinico.
- Entradas clinicas brutas.
- Timeline tecnica.
- Modal de nova/edicao de entrada.
- Modal de arquivamento.

## 7. Campos duplicados

- Anamnese aparece no acesso rapido, no card `Anamneses`, na ficha estruturada e em `Entradas Clinicas`.
- Exame fisico aparece na ficha estruturada e em `Entradas Clinicas`.
- Avaliacao/plano/conduta aparecem na ficha estruturada, em cards historicos e em entradas brutas.
- Prescricao aparece no card `Receituario`, na ficha estruturada e em entradas brutas.
- Dados de atendimento aparecem no header, resumo, agenda e ultimos atendimentos.
- Paciente aparece no header, rail lateral, resumo e agenda.

## 8. Dados tecnicos expostos indevidamente

- ID do paciente aparece como dado principal no rail.
- Autor aparece como UUID truncado em `Por: ...`.
- Timeline mostra eventos tecnicos como `record_created`, `entry_added`, `conduct added`, `plan added`.
- Mensagens como `Atendimento nao carregado` aparecem como card solto.
- `Visao parcial` aparece como texto tecnico sem orientacao clinica amigavel.
- Versao de entrada (`v1`) aparece junto da leitura clinica principal.

## 9. Blocos que devem virar secundarios

- Timeline tecnica.
- Entradas clinicas brutas.
- IDs de prontuario, atendimento, paciente e tutor.
- Autor por UUID.
- Eventos do sistema.
- Comanda/financeiro.
- Agenda.
- Imagens/anexos.
- Vacinas/vermfugos.
- Internacao.
- Historico antigo e dados de migracao Vetus.

## 10. Problemas criticos de UX clinica

- A tela nao segue raciocinio medico: queixa, anamnese, exame fisico, vitais, exames, suspeita, tratamento, prescricao e retorno.
- Conteudo operacional compete visualmente com conteudo clinico.
- Entradas clinicas sao repetidas em varios blocos.
- A timeline tecnica domina a leitura e parece prontuario, mas nao e resumo medico.
- Faltam estados vazios clinicos claros para queixa, vitais, exames e proximos passos.
- A tela usa labels tecnicas (`Entrada Clinica`, eventos do sistema, UUIDs) na visao principal.
- O header nao prioriza identificacao clinica completa do paciente e tutor.
- Acoes principais estao misturadas com comanda e cadastro, reduzindo foco medico.
