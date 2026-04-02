# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO PRONTUÁRIO CLÍNICO

## Objetivo

Implementar o módulo Prontuário Clínico do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Atendimentos, Pacientes e Tutores, e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com Atendimentos, Pacientes e Tutores
- criação e edição de evolução clínica
- histórico progressivo de registros clínicos
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- prescrição completa
- pedidos de exames completos
- internação completa
- faturamento clínico
- assinatura digital complexa
- auditoria final formal
- exclusão destrutiva de registros clínicos

## CONTEXTO DO DOMÍNIO

O módulo Prontuário Clínico representa o registro assistencial progressivo do caso veterinário ao longo do atendimento.

Um prontuário clínico:

- sempre se relaciona a um atendimento válido
- se conecta indiretamente a paciente e tutor
- deve permitir múltiplas evoluções ao longo do caso
- precisa preservar histórico clínico
- precisa registrar autoria e momento de cada evolução
- não deve ser tratado como um CRUD genérico de texto

Este módulo deve refletir uso real hospitalar veterinário:

- o atendimento é aberto
- a equipe clínica registra anamnese e exame físico
- registra avaliação inicial
- registra conduta/plano
- registra evoluções subsequentes
- mantém histórico sem sobrescrever de forma destrutiva o raciocínio anterior

## CONTRATO BASE DO MÓDULO PRONTUÁRIO CLÍNICO

Entidade central recomendada:

- `medical_record_entries`
ou equivalente real do projeto, desde que mantenha o contrato documental

Campos obrigatórios mínimos:

- id
- encounterId
- patientId
- ownerId
- entryType
- note
- recordedAt
- createdByUserId
- createdAt
- updatedAt

Campos clínicos essenciais:

- subjective
- objective
- assessment
- plan

Campos médicos/operacionais relevantes:

- diagnosisHypotheses
- clinicalFindings
- proceduresPerformed
- recommendations
- attachmentsMeta
- flags

Campos de controle:

- status
- updatedByUserId
- supersedesEntryId
- versionNumber

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Registro clínico não existe sem atendimento salvo.
2. Registro clínico não existe sem paciente e tutor coerentes com o atendimento.
3. O fluxo principal não deve depender de digitação manual de IDs.
4. Deve ser possível criar evolução clínica inicial e evoluções subsequentes.
5. O histórico clínico não deve ser perdido por edição destrutiva simples.
6. O módulo deve preservar rastreabilidade mínima de autoria e tempo.
7. `entryType` é obrigatório.
8. `recordedAt` é obrigatório.
9. Deve existir um campo principal de registro clínico textual estruturado (`note` e/ou SOAP).
10. O prontuário deve se conectar ao atendimento como fonte operacional do episódio clínico.
11. Backend deve usar persistência/banco como fonte real de verdade.
12. Não usar memória volátil como fonte principal.
13. O módulo deve preparar terreno para prescrições, exames e internação, sem implementar esses módulos completos agora.
14. Exclusão destrutiva de evolução clínica não deve ser implementada.
15. Edição posterior deve preservar lógica de histórico, versionamento simples ou supersedência, conforme a arquitetura real permitir.

## ENUMS E ESTRUTURAS RECOMENDADAS

Tipos de entrada permitidos (`entryType`):

- initial_assessment
- progress_note
- discharge_note
- procedure_note
- nursing_note
- administrative_clinical_note

Status permitidos:

- active
- amended
- superseded

Estrutura clínica recomendada:
Permitir modelo SOAP simples e evolutivo:

- subjective
- objective
- assessment
- plan

Sem obrigar todos os campos em todos os `entryTypes`, mas mantendo coerência clínica mínima.

Estruturas auxiliares aceitáveis:

- `diagnosisHypotheses`: lista de strings
- `clinicalFindings`: lista de strings
- `proceduresPerformed`: lista de strings
- `recommendations`: lista de strings
- `attachmentsMeta`: lista simples de metadados
- `flags`: lista simples de marcadores clínicos/operacionais

Estratégia de histórico recomendada:

- manter entradas separadas por evolução
ou
- usar `supersedesEntryId` + `versionNumber`
desde que preserve histórico e rastreabilidade.

## ARQUIVOS REAIS CANDIDATOS A ALTERAÇÃO

Mapear e usar os arquivos reais existentes, priorizando:

- `apps/web/src/pages/medical-records.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo real de prontuário/medical-records, se existir
- integrações com encounters
- integrações com patients
- integrações com owners/tutores
- testes existentes do app/api

Se houver migrations no projeto, criar migration incremental consistente com o padrão atual.

## FASE 0 — DOCUMENTAÇÃO DO MÓDULO EM /docs

Antes de implementar código:

1. Verificar se já existem documentos do módulo Prontuário Clínico em `/docs`.
2. Se não existirem, criar a documentação mínima necessária do módulo Prontuário Clínico em `/docs`, em formato `.md`, cobrindo:
   - visão geral
   - contrato de dados
   - backend
   - frontend
   - integração com Atendimentos, Pacientes e Tutores
   - regras de negócio
   - fluxo operacional clínico
   - estratégia de histórico/evolução
   - plano de implementação
   - critérios de aceite
   - plano de testes
   - gate de auditoria
3. Se já existirem, ler integralmente e seguir os documentos.
4. Não alterar outros arquivos fora de `/docs` nesta fase 0.

Importante:
A implementação do código só pode começar depois da leitura/consolidação documental.

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ler toda a documentação do módulo Prontuário Clínico em `/docs` e extrair:

- contrato de dados
- regras de negócio
- campos obrigatórios
- campos opcionais
- estratégia de histórico
- fluxos principais
- dependências com Atendimentos, Pacientes e Tutores
- critérios de aceite
- critérios de teste
- critérios de pronto para auditoria

Proibido iniciar implementação sem concluir esta fase.

## FASE 2 — MAPEAMENTO DO CÓDIGO REAL

Mapear o estado atual do projeto e comparar docs vs código real.

Identificar:

- o que já existe
- o que está parcial
- o que está incorreto
- o que precisa ser criado
- o que precisa ser refatorado minimamente
- onde há risco de desalinhamento entre frontend/backend/banco
- onde há risco de sobrescrever histórico de forma inadequada
- onde há risco de fluxo manual frágil entre atendimento, paciente e prontuário

Saída esperada:
um entendimento interno claro do gap entre contrato e código.

## FASE 3 — IMPLEMENTAÇÃO CONTROLADA

### FASE 3.1 — BANCO / SCHEMA

Objetivo:
Fazer o banco suportar 100% do contrato do módulo Prontuário Clínico.

Ações obrigatórias:

- criar ou expandir schema do módulo de prontuário
- adicionar campos obrigatórios
- adicionar campos clínicos estruturados
- adicionar campos de histórico/rastreabilidade
- adicionar auditoria mínima
- garantir vínculo consistente com `encounterId`, `patientId` e `ownerId`
- preparar persistência para listas simples e metadados clínicos
- criar migration incremental, se houver mecanismo de migrations

Critério de conclusão:

- persistência suporta create, update controlado, detail, list e histórico
- contrato do prontuário está refletido no schema
- não há campo clínico central só no frontend sem persistência real

### FASE 3.2 — BACKEND / API

Objetivo:
Implementar a API do Prontuário Clínico aderente ao contrato e usando banco como fonte real.

Rotas mínimas obrigatórias:

- `POST /medical-records`
- `GET /medical-records`
- `GET /medical-records/:id`
- `PATCH /medical-records/:id`

Rotas opcionais aceitáveis se a arquitetura pedir:

- `GET /encounters/:id/medical-records`
- `POST /medical-records/:id/amend`
- `POST /medical-records/:id/supersede`

Ações obrigatórias:

- validar `encounterId` existente
- validar `patientId` e `ownerId` coerentes com o atendimento
- validar `entryType`
- validar `recordedAt`
- validar conteúdo mínimo do registro clínico
- preencher `createdByUserId` e `updatedByUserId`
- retornar payloads coerentes para list/detail
- permitir recuperar histórico por atendimento
- usar persistência como fonte operacional de verdade
- não depender de memória como base principal

Critério de conclusão:

- API funcional ponta a ponta
- contratos coerentes com frontend
- prontuário inválido rejeitado corretamente
- dados persistem e voltam do banco
- detail retorna atendimento/paciente/tutor com grau de expansão suficiente para uso clínico

### FASE 3.3 — FRONTEND / LISTAGEM E FORMULÁRIO

Objetivo:
Implementar UI utilizável, clínica e coerente com backend.

Arquivo prioritário:

- `apps/web/src/pages/medical-records.ts`

Listagem deve exibir no mínimo:

- identificador da evolução
- tipo da entrada
- atendimento
- paciente
- tutor
- data/hora do registro
- autor, se disponível
- status
- indicadores clínicos relevantes, se aplicável
- busca e filtros

Formulário de criação/edição deve ser dividido em blocos:

Bloco 1 — Contexto do caso

- atendimento
- paciente
- tutor
- tipo da entrada
- data/hora do registro

Bloco 2 — Registro clínico principal

- note
- subjective
- objective
- assessment
- plan

Bloco 3 — Estruturas clínicas auxiliares

- hipóteses diagnósticas
- achados clínicos
- procedimentos realizados
- recomendações

Bloco 4 — Controle e marcadores

- status
- flags
- vínculo com `supersedesEntryId`, se aplicável

Regras obrigatórias:

- não aceitar ID manual de atendimento, paciente e tutor como caminho principal
- usar contexto de entidades salvas
- permitir criação a partir de contexto do atendimento
- implementar estados de loading, error, success, empty quando aplicável
- implementar validação por campo
- manter sincronização de `names/types/payload` com backend

Critério de conclusão:

- formulário cria e edita corretamente
- listagem funciona
- frontend está sincronizado com backend
- UX não depende de fluxo manual frágil

### FASE 3.4 — INTEGRAÇÃO COM ATENDIMENTOS, PACIENTES E TUTORES

Objetivo:
Fechar o fluxo operacional Atendimento → Prontuário.

Fluxos obrigatórios:

1. localizar atendimento
2. abrir contexto clínico do atendimento
3. criar evolução clínica inicial
4. salvar
5. visualizar histórico do caso

Fluxo recomendado adicional:

1. abrir detalhe do atendimento
2. clicar `Abrir prontuário` ou `Nova evolução`
3. abrir formulário com atendimento, paciente e tutor já preenchidos
4. registrar evolução
5. salvar
6. voltar ao histórico do atendimento

Ações obrigatórias:

- reaproveitar o que já foi construído em Atendimentos, Pacientes e Tutores
- impedir que o fluxo principal recaia em campo manual
- impedir incoerência entre `encounterId`, `patientId` e `ownerId`
- manter fallback técnico apenas se estritamente necessário e nunca como UX principal

Critério de conclusão:

- fluxo clínico real funciona ponta a ponta
- incoerência atendimento/paciente/tutor é barrada no backend

### FASE 3.5 — HISTÓRICO E EVOLUÇÃO CLÍNICA

Objetivo:
Garantir que o prontuário preserve continuidade clínica sem sobrescrita destrutiva simples.

Ações obrigatórias:

- permitir múltiplas entradas clínicas por atendimento
- garantir recuperação do histórico em ordem útil
- implementar estratégia mínima de versionamento/supersedência se houver edição relevante
- impedir que edições simples destruam rastreabilidade do registro anterior sem controle
- manter arquitetura simples e evolutiva

Critério de conclusão:

- histórico clínico do atendimento fica visível
- evolução nova não apaga o raciocínio anterior
- rastreabilidade mínima existe

### FASE 3.6 — VALIDAÇÕES

Backend:

- `encounterId` válido
- `patientId` válido
- `ownerId` válido
- coerência entre `encounterId`, `patientId` e `ownerId`
- `entryType` obrigatório
- `recordedAt` obrigatório
- conteúdo clínico mínimo obrigatório

Frontend:

- validação por campo
- mensagens claras
- impedir envio evidentemente inválido

Critério de conclusão:

- erros críticos barrados no backend
- UX mínima de validação funcionando no frontend

### FASE 3.7 — TESTES MÍNIMOS

Criar testes focados do módulo cobrindo no mínimo:

- create registro clínico
- update/amend registro clínico
- list registro clínico
- detail registro clínico
- histórico por atendimento
- rejeição de atendimento inexistente
- rejeição de incoerência entre atendimento/paciente/tutor
- autoria mínima, se aplicável
- fluxo de leitura persistida, se aplicável ao padrão do projeto
- criação de evolução a partir do contexto do atendimento, se implementado
- preservação do histórico após nova evolução ou supersedência

Critério de conclusão:

- testes focados do módulo executam com sucesso
- build e typecheck passam

## FASE 4 — VALIDAÇÃO CONTÍNUA

Após cada subfase:

- rodar build
- rodar typecheck
- validar funcionamento básico
- corrigir antes de avançar

Não avançar com erro aberto que afete a fase atual.

## FASE 5 — CORREÇÕES AUTOMÁTICAS DE CONSISTÊNCIA

Antes de finalizar:

- revisar frontend vs backend
- revisar contrato vs persistência
- revisar payloads
- revisar nomes divergentes
- revisar `entryType` e `status`
- revisar integração `encounter/patient/owner`
- revisar histórico e supersedência
- corrigir automaticamente inconsistências básicas encontradas

Não deixar:

- campo novo sem persistência
- persistência sem exposição na API
- API sem consumo correto no frontend
- fluxo principal dependendo de atalho manual frágil
- histórico clínico sendo sobrescrito de forma destrutiva sem controle

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Confirmar:

- create funciona
- update/amend funciona
- list funciona
- detail funciona
- registro sempre vinculado a atendimento válido
- registro sempre coerente com paciente e tutor
- integração com Atendimentos, Pacientes e Tutores funciona
- histórico clínico funciona
- backend usa banco como fonte real nos fluxos expostos
- frontend está sincronizado
- módulo está pronto para auditoria

Se houver bloqueio crítico:

- corrigir antes de encerrar

## SAÍDA INTERNA OBRIGATÓRIA POR FASE

Ao concluir cada fase principal, registrar internamente:

- o que foi alterado
- quais arquivos foram impactados
- quais critérios da fase foram atendidos
- quais riscos surgiram
- se existe alguma pendência bloqueante antes de seguir

Não avançar para a próxima fase se a fase atual ainda tiver bloqueio crítico aberto.

## REGRAS GLOBAIS DE IMPLEMENTAÇÃO

1. Não improvisar arquitetura.
2. Não criar abstração excessiva.
3. Não criar módulos paralelos desnecessários.
4. Não quebrar os módulos Tutores, Pacientes e Atendimentos.
5. Não usar memória como fonte principal.
6. Não aceitar fluxo manual frágil como caminho principal.
7. Não duplicar lógica sem necessidade.
8. Não expandir escopo para prescrição completa, exames completos ou internação completa.
9. Fazer apenas a refatoração mínima necessária.
10. Se houver conflito entre docs e código, seguir os docs com a menor ruptura possível.

## ENTREGA FINAL OBRIGATÓRIA

Ao final, entregar:

1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo por fase do que foi implementado
4. pendências remanescentes, se existirem
5. riscos conhecidos, se existirem
6. confirmação final exata:

`Módulo Prontuário Clínico pronto para auditoria`

Importante:
Não declarar pronto para produção.
Declarar apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- o registro clínico for criado corretamente
- o vínculo com atendimento, paciente e tutor for obrigatório e funcional
- o fluxo de evolução clínica inicial for coerente
- o histórico clínico for preservado
- frontend, backend e banco estiverem sincronizados
- o módulo estiver apto para auditoria enterprise

## FIM DO PROMPT
