# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO ATENDIMENTOS

## Objetivo

Implementar o módulo Atendimentos do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Tutores e Pacientes e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com Tutores e Pacientes
- fluxo de recepção e abertura de atendimento
- dados iniciais de triagem administrativa/clínica
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- prontuário clínico completo
- evolução médica detalhada
- prescrições completas
- exames completos
- internação completa
- faturamento completo
- auditoria final formal
- exclusão destrutiva de atendimento

## CONTEXTO DO DOMÍNIO

O módulo Atendimentos representa a abertura e o controle operacional do contato assistencial do paciente com o hospital veterinário.

Um atendimento:

- sempre pertence a um paciente válido
- se conecta indiretamente a um tutor/responsável
- nasce na recepção, triagem ou fluxo clínico
- precisa permitir classificação inicial do caso
- precisa sustentar a continuidade futura para prontuário, exames, internação e desfecho clínico
- não deve ser tratado como CRUD genérico

Este módulo deve refletir uso real hospitalar veterinário:

- recepção abre atendimento
- identifica tutor e paciente
- registra motivo principal
- classifica prioridade inicial
- define tipo/origem/status
- encaminha para próxima etapa clínica ou operacional

## CONTRATO BASE DO MÓDULO ATENDIMENTOS

Campos obrigatórios mínimos:

- id
- patientId
- ownerId
- status
- attendanceType
- chiefComplaint
- openedAt

Campos operacionais essenciais:

- priority
- origin
- sector
- responsibleUserId
- veterinarianUserId
- triageNotes
- administrativeNotes
- clinicalAlertsSnapshot

Campos de tempo e controle:

- startedAt
- finishedAt
- cancelledAt
- createdAt
- updatedAt
- createdByUserId
- updatedByUserId

Campos opcionais relevantes:

- queueToken
- referralSource
- weightAtAdmission
- temperatureAtAdmission
- heartRateAtAdmission
- respiratoryRateAtAdmission
- mucosaStatus
- hydrationStatus

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Atendimento não existe sem paciente salvo.
2. Atendimento não existe sem tutor/responsável associado ao paciente no momento da abertura.
3. O fluxo principal não deve depender de digitação manual de IDs.
4. O atendimento deve ser aberto a partir de paciente válido e tutor coerente.
5. `chiefComplaint` é obrigatório.
6. `status` é obrigatório.
7. `attendanceType` é obrigatório.
8. `priority` é obrigatória.
9. `openedAt` deve ser persistido.
10. Atendimento não deve ser excluído de forma destrutiva.
11. Cancelamento e finalização devem ser controlados por status e timestamps.
12. Backend deve usar persistência/banco como fonte real de verdade.
13. Não usar memória volátil como fonte principal.
14. O módulo deve estar preparado para evolução futura para prontuário, sem implementar prontuário completo agora.
15. O snapshot clínico inicial do atendimento pode existir mesmo que dados atuais do paciente mudem depois.
16. Um atendimento deve refletir o estado operacional do caso naquele momento, não apenas apontar para entidades externas.

## ENUMS E ESTRUTURAS RECOMENDADAS

Status permitidos do atendimento:

- open
- in_progress
- waiting
- completed
- cancelled

Tipos de atendimento permitidos:

- consultation
- emergency
- return
- hospitalization_entry
- procedure
- teleorientation

Prioridade permitida:

- low
- normal
- high
- critical

Origem permitida:

- reception
- whatsapp
- phone
- walk_in
- referral
- internal_transfer

Setor inicial permitido:

- reception
- triage
- consultation_room
- emergency_room
- hospitalization
- diagnostic

Estrutura recomendada para `clinicalAlertsSnapshot`:

Implementar de forma simples, estruturada e persistível.
Aceitável nesta fase:

- lista de strings

ou

- lista de objetos simples com:
  - type
  - label
  - severity

Desde que fique sincronizado entre banco, backend e frontend.

Estrutura recomendada de vínculo:

- atendimento guarda `patientId` obrigatório
- atendimento guarda `ownerId` obrigatório
- `ownerId` deve ser coerente com tutor principal ou vínculo operacional vigente do paciente
- não expandir agora para múltiplos responsáveis complexos além do necessário

## ARQUIVOS REAIS CANDIDATOS A ALTERAÇÃO

Mapear e usar os arquivos reais existentes, priorizando:

- `apps/web/src/pages/attendances.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo real de `attendances`, se existir
- integrações com `patients`
- integrações com `owners/tutores`
- testes existentes do `app/api`

Se houver migrations no projeto, criar migration incremental consistente com o padrão atual.

## FASE 0 — DOCUMENTAÇÃO DO MÓDULO EM /docs

Antes de implementar código:

1. Verificar se já existem documentos do módulo Atendimentos em `/docs`.
2. Se não existirem, criar a documentação mínima necessária do módulo Atendimentos em `/docs`, em formato `.md`, cobrindo:
   - visão geral
   - contrato de dados
   - backend
   - frontend
   - integração com Pacientes e Tutores
   - regras de negócio
   - fluxo operacional de recepção e triagem inicial
   - plano de implementação
   - critérios de aceite
   - plano de testes
   - gate de auditoria
3. Se já existirem, ler integralmente e seguir os documentos.
4. Não alterar outros arquivos fora de `/docs` nesta fase 0.

Importante:
A implementação do código só pode começar depois da leitura/consolidação documental.

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ler toda a documentação do módulo Atendimentos em `/docs` e extrair:

- contrato de dados
- regras de negócio
- campos obrigatórios
- campos opcionais
- fluxos principais
- dependências com Pacientes e Tutores
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
- onde há risco de fluxo manual frágil entre paciente, tutor e atendimento

Saída esperada:
um entendimento interno claro do gap entre contrato e código.

## FASE 3 — IMPLEMENTAÇÃO CONTROLADA

### FASE 3.1 — BANCO / SCHEMA

Objetivo:
Fazer o banco suportar 100% do contrato do módulo Atendimentos.

Ações obrigatórias:

- criar ou expandir schema de `attendances`
- adicionar campos obrigatórios
- adicionar campos operacionais
- adicionar campos de controle temporal
- adicionar auditoria mínima
- garantir vínculo consistente com `patientId` e `ownerId`
- preparar persistência do `clinicalAlertsSnapshot`
- criar migration incremental, se houver mecanismo de migrations

Critério de conclusão:

- persistência suporta create, update, detail e list
- contrato do atendimento está refletido no schema
- não há campo crítico só no frontend sem persistência real

### FASE 3.2 — BACKEND / API

Objetivo:
Implementar a API de Atendimentos aderente ao contrato e usando banco como fonte real.

Rotas mínimas obrigatórias:

- `POST /attendances`
- `GET /attendances`
- `GET /attendances/:id`
- `PATCH /attendances/:id`

Rotas opcionais aceitáveis se a arquitetura pedir:

- `POST /attendances/:id/start`
- `POST /attendances/:id/complete`
- `POST /attendances/:id/cancel`

Ações obrigatórias:

- validar `patientId` existente
- validar `ownerId` existente e coerente com o paciente
- validar `chiefComplaint`
- validar `status`
- validar `attendanceType`
- validar `priority`
- preencher `openedAt` no create
- preencher `createdByUserId` e `updatedByUserId`
- retornar payloads coerentes para list/detail
- implementar busca por paciente, tutor, status, tipo e prioridade
- usar persistência como fonte operacional de verdade
- não depender de memória como base principal

Critério de conclusão:

- API funcional ponta a ponta
- contratos coerentes com frontend
- atendimento inválido rejeitado corretamente
- dados persistem e voltam do banco
- detail retorna paciente e tutor com grau de expansão suficiente para uso operacional

### FASE 3.3 — FRONTEND / LISTAGEM E FORMULÁRIO

Objetivo:
Implementar UI utilizável, operacional e coerente com backend.

Arquivo prioritário:

- `apps/web/src/pages/attendances.ts`

Listagem deve exibir no mínimo:

- identificador do atendimento
- paciente
- tutor
- tipo de atendimento
- prioridade
- status
- horário de abertura
- setor/origem quando fizer sentido
- indicadores básicos de alerta, se aplicável
- busca e filtros

Formulário de abertura deve ser dividido em blocos:

Bloco 1 — Identificação do caso

- paciente
- tutor
- tipo de atendimento
- origem
- setor inicial

Bloco 2 — Contexto inicial

- `chiefComplaint`
- `triageNotes`
- `administrativeNotes`

Bloco 3 — Classificação inicial

- prioridade
- status inicial
- profissional responsável, se aplicável

Bloco 4 — Snapshot clínico inicial

- `clinicalAlertsSnapshot`
- peso na admissão
- temperatura
- FC
- FR
- mucosa
- hidratação

Regras obrigatórias:

- não aceitar ID manual de paciente e tutor como caminho principal
- usar seleção/busca de entidades salvas
- permitir abertura a partir de contexto do paciente, se houver fluxo vindo de Pacientes
- implementar estados de loading, error, success, empty quando aplicável
- implementar validação por campo
- manter sincronização de `names/types/payload` com backend

Critério de conclusão:

- formulário cria e edita corretamente
- listagem funciona
- frontend está sincronizado com backend
- UX não depende de fluxo manual frágil

### FASE 3.4 — INTEGRAÇÃO COM PACIENTES E TUTORES

Objetivo:
Fechar o fluxo operacional Paciente → Atendimento.

Fluxos obrigatórios:

1. localizar tutor
2. localizar paciente
3. abrir atendimento
4. trazer tutor coerente com o paciente
5. salvar atendimento
6. exibir atendimento aberto na listagem/detalhe

Fluxo recomendado adicional:

1. abrir detalhe do paciente
2. clicar `Abrir atendimento`
3. abrir formulário com paciente e tutor já preenchidos
4. registrar dados iniciais
5. salvar

Ações obrigatórias:

- reaproveitar o que já foi construído em Tutores e Pacientes
- impedir que o fluxo principal recaia em campo manual
- impedir incoerência entre paciente e tutor
- manter fallback técnico apenas se estritamente necessário e nunca como UX principal

Critério de conclusão:

- fluxo real da recepção funciona ponta a ponta
- incoerência tutor/paciente é barrada no backend

### FASE 3.5 — TRIAGEM INICIAL E SNAPSHOT CLÍNICO

Objetivo:
Garantir que o atendimento capture o estado inicial do caso de forma útil.

Ações obrigatórias:

- persistir `chiefComplaint`
- persistir `priority`
- persistir `triageNotes`
- persistir `clinicalAlertsSnapshot`
- persistir sinais/medidas iniciais se adotados
- exibir essas informações de forma clara no frontend
- manter estrutura simples, sem virar prontuário completo

Critério de conclusão:

- atendimento guarda contexto inicial real do caso
- dados reaparecem corretamente em detail/edit/list quando aplicável

### FASE 3.6 — VALIDAÇÕES

Backend:

- `patientId` válido
- `ownerId` válido
- coerência entre `patientId` e `ownerId`
- `chiefComplaint` obrigatório
- `status` obrigatório
- `attendanceType` obrigatório
- `priority` obrigatória
- tutor/paciente ativos quando aplicável à regra atual do sistema

Frontend:

- validação por campo
- mensagens claras
- impedir envio evidentemente inválido

Critério de conclusão:

- erros críticos barrados no backend
- UX mínima de validação funcionando no frontend

### FASE 3.7 — TESTES MÍNIMOS

Criar testes focados do módulo cobrindo no mínimo:

- create atendimento
- update atendimento
- list atendimento
- detail atendimento
- vínculo coerente com paciente
- rejeição de paciente inexistente
- rejeição de tutor incoerente com paciente
- autoria mínima, se aplicável
- fluxo de leitura persistida, se aplicável ao padrão do projeto
- criação de atendimento vindo do fluxo do paciente, se implementado
- persistência e reexibição do snapshot clínico inicial

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
- revisar status, tipo e prioridade
- revisar integração tutor/paciente/atendimento
- corrigir automaticamente inconsistências básicas encontradas

Não deixar:

- campo novo sem persistência
- persistência sem exposição na API
- API sem consumo correto no frontend
- fluxo principal dependendo de atalho manual frágil
- incoerência entre paciente e tutor passando despercebida

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Confirmar:

- create funciona
- update funciona
- list funciona
- detail funciona
- atendimento sempre vinculado a paciente válido
- atendimento sempre coerente com tutor
- integração com Pacientes e Tutores funciona
- snapshot clínico inicial funciona
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
4. Não quebrar os módulos Tutores e Pacientes.
5. Não usar memória como fonte principal.
6. Não aceitar fluxo manual frágil como caminho principal.
7. Não duplicar lógica sem necessidade.
8. Não expandir escopo para prontuário completo, exames ou internação completa.
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

`Módulo Atendimentos pronto para auditoria`

Importante:
Não declarar pronto para produção.
Declarar apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- o atendimento for aberto corretamente
- o vínculo com paciente e tutor for obrigatório e funcional
- o fluxo operacional inicial for coerente
- frontend, backend e banco estiverem sincronizados
- o módulo estiver apto para auditoria enterprise

## FIM DO PROMPT
