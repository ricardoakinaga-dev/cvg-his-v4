# Fase 5 - Regras Hospitalares Iniciais e Auditoria Reforçada

## Objetivo da fase
Aproximar o módulo IAM do contexto hospitalar real do CVG-HIS, aplicando regras iniciais por perfil/setor, separando melhor acesso clínico detalhado de acesso administrativo e reforçando auditoria sobre leituras sensíveis já viáveis na arquitetura atual.

## Status
- Concluída com endurecimento de permissões clínicas, reforço da matriz hospitalar padrão e auditoria adicional de leitura sensível.

## Itens concluídos

### 1. Recalibração da matriz hospitalar por perfil
- ajustada a matriz `ROLE_PERMISSIONS` para refletir melhor perfis assistenciais e administrativos;
- removido acesso financeiro operacional de perfis clínicos principais:
  - `vet`
  - `veterinario`
  - `coordenacao_medica`
- reforçado o corte entre perfis clínicos e não clínicos:
  - recepção, financeiro, administrativo, farmácia/estoque e banho/tosa continuam sem `medical_record.read`;
  - enfermagem passou a ter `medical_record.read` para leitura assistencial, sem ganhar assinatura clínica;
  - residente mantém escrita clínica, mas sem permissão de assinatura final.

### 2. Ampliação do catálogo de perfis/setores suportados
- adicionados papéis/aliases hospitalares e operacionais no catálogo padrão:
  - `gestao`
  - `radiologia`
  - `ultrassonografia`
  - `farmacia`
  - `estoque`
  - `banho_tosa`
- `radiologia` e `ultrassonografia` passaram a refletir o núcleo de imagem;
- `farmacia` e `estoque` passaram a refletir o núcleo de farmácia/estoque.

### 3. Separação mais forte entre leitura clínica detalhada e acesso administrativo
- rotas sensíveis remapeadas para exigir `medical_record.read`:
  - `GET /encounters/:id`
  - `GET /encounters/:id/timeline`
  - `GET /patients/:id/summary`
  - `GET /notes/:id`
  - `GET /documents/:id`
  - `GET /patient-context/by-patient/:patientId`
  - `GET /patient-context/by-stay/:stayId`
- `GET /patient-context/stay/:stayId` passou a exigir `inpatient.read` em vez de `patient.read`.

### 4. Correção de inconsistência arquitetural de segurança
- `patientContext` deixava o `accountId` depender de `x-account-id` no request;
- isso contrariava a diretriz de backend como fonte de verdade;
- o fluxo foi corrigido para resolver `accountId` do `requestContext.actor`, derivado do token validado.

### 5. Auditoria reforçada para leitura sensível
- criado helper para registrar leituras sensíveis com `requestId` e ator autenticado;
- auditorias de leitura adicionadas em:
  - resumo sensível de paciente
  - detalhe de encounter
  - timeline clínica
  - leitura de nota clínica
  - leitura de documento clínico
  - leitura de contexto clínico completo do paciente/stay
  - leitura de resumo financeiro por encounter
  - leitura de contas a receber

## Itens não concluídos
- escopos de acesso por setor/unidade ainda não participam da decisão em runtime;
- residente ainda não possui mecanismo de assinatura supervisionada ou dupla checagem;
- não foi criada UI dedicada para visualização de logs/auditoria reforçada;
- ainda faltam regras contextuais ABAC, break-glass e workflow de aprovação.

## Decisões técnicas
- priorizar `medical_record.read` como marcador canônico de leitura clínica detalhada;
- manter permissões específicas (`note.*`, `document.*`, `medorder.*`) para não perder granularidade funcional;
- usar auditoria de leitura apenas onde a leitura já é claramente sensível e identificável por entidade;
- preservar compatibilidade incremental das rotas menos sensíveis para não quebrar módulos administrativos existentes.

## Matriz resumida por perfil

### Perfis executivos e administrativos
- `superadmin` / `admin`
  - acesso total
- `diretoria` / `gestao`
  - leitura estratégica, financeira e relatórios
  - sem escrita clínica
- `administrativo`
  - gestão de usuários, papéis, permissões, sessões e notificações
  - sem prontuário clínico detalhado
- `financeiro`
  - cobrança, contas a receber, fechamento e relatórios financeiros
  - sem `medical_record.read`

### Perfis clínicos
- `coordenacao_medica`
  - leitura/escrita clínica ampla, assinatura, handover, internação, exames e governança clínica
  - sem núcleo financeiro operacional padrão
- `vet` / `veterinario`
  - leitura/escrita clínica, assinatura, prescrições, exames, documentos e internação
  - sem relatórios financeiros estratégicos e sem núcleo financeiro padrão
- `residente`
  - leitura/escrita clínica e pedidos assistenciais
  - sem assinatura final de prontuário
- `enfermagem`
  - leitura de prontuário, handover, medicação e contexto de internação
  - sem assinatura clínica final e sem poderes administrativos

### Perfis diagnósticos e apoio
- `laboratorio`
  - pedidos/resultados laboratoriais
  - sem prontuário completo
- `imagem` / `radiologia` / `ultrassonografia`
  - pedidos/resultados de imagem
  - sem prontuário completo
- `farmacia_estoque` / `farmacia` / `estoque`
  - produto, estoque, leitura operacional de prescrição
  - sem financeiro estratégico e sem prontuário completo

### Perfis operacionais
- `recepcao`
  - agenda, cadastros, faturamento operacional básico e fluxo de atendimento
  - sem `medical_record.read`
- `banho_tosa`
  - agenda/cadastros básicos e catálogo operacional
  - sem acesso clínico detalhado ou financeiro estratégico

## O que já está protegido
- leitura de prontuário detalhado agora depende explicitamente de `medical_record.read` nos endpoints mais sensíveis já integrados;
- leitura financeira por encounter e lista de recebíveis passou a ser auditável;
- o account context do `patientContext` não depende mais de header forjado pelo cliente;
- seeds padrão passaram a representar melhor os perfis hospitalares esperados.

## O que ainda depende de integração com outros módulos
- enforcement de escopo por unidade/setor/leito;
- assinatura supervisionada para residente;
- versionamento/adendo formal de prontuário com trilha longitudinal ampliada;
- auditoria de leitura sensível em todos os módulos restantes do HIS;
- diferenciação contextual mais forte entre leitura clínica mínima e leitura integral do prontuário.

## Estruturas criadas/alteradas
- criado:
  - `apps/his-api/src/modules/iam/auditSensitiveAccess.ts`
- alterado:
  - `apps/his-api/src/modules/patients/summary.ts`
  - `apps/his-api/src/modules/encounters/routes.ts`
  - `apps/his-api/src/modules/encounters/service.ts`
  - `apps/his-api/src/modules/clinicalNotes/routes.ts`
  - `apps/his-api/src/modules/clinicalNotes/service.ts`
  - `apps/his-api/src/modules/documents/routes.ts`
  - `apps/his-api/src/modules/documents/service.ts`
  - `apps/his-api/src/modules/patients/routes.ts`
  - `apps/his-api/src/modules/patientContext/routes.ts`
  - `apps/his-api/src/modules/patientContext/service.ts`
  - `apps/his-api/src/modules/patientContext/routes.test.ts`
  - `apps/his-api/src/modules/encounterFinancial/routes.ts`
  - `packages/rbac/src/permissions.ts`
  - `packages/db/src/seed.ts`

## Arquivos modificados
- `apps/his-api/src/modules/iam/auditSensitiveAccess.ts`
- `apps/his-api/src/modules/patients/summary.ts`
- `apps/his-api/src/modules/encounters/routes.ts`
- `apps/his-api/src/modules/encounters/service.ts`
- `apps/his-api/src/modules/clinicalNotes/routes.ts`
- `apps/his-api/src/modules/clinicalNotes/service.ts`
- `apps/his-api/src/modules/documents/routes.ts`
- `apps/his-api/src/modules/documents/service.ts`
- `apps/his-api/src/modules/patients/routes.ts`
- `apps/his-api/src/modules/patientContext/routes.ts`
- `apps/his-api/src/modules/patientContext/service.ts`
- `apps/his-api/src/modules/patientContext/routes.test.ts`
- `apps/his-api/src/modules/encounterFinancial/routes.ts`
- `packages/rbac/src/permissions.ts`
- `packages/db/src/seed.ts`

## Migrações criadas
- nenhuma nova migration nesta fase

## Seeds criadas/alteradas
- alterado:
  - `packages/db/src/seed.ts`
  - atualização de papéis/aliases e respectivos vínculos padrão

## Endpoints criados/alterados
- alterados:
  - `GET /encounters/:id`
  - `GET /encounters/:id/timeline`
  - `GET /patients/:id/summary`
  - `GET /notes/:id`
  - `GET /documents/:id`
  - `GET /patient-context/by-patient/:patientId`
  - `GET /patient-context/by-stay/:stayId`
  - `GET /patient-context/stay/:stayId`
  - `GET /encounters/:encounterId/financial-summary`
  - `GET /financial/receivables`

## Telas criadas/alteradas
- nenhuma tela nova nesta fase
- efeito esperado no frontend:
  - respostas 403 mais precisas para perfis sem prontuário detalhado
  - navegação continua como reflexo do backend, não como proteção primária

## Testes criados
- expandido `apps/his-api/src/modules/patientContext/routes.test.ts`
  - novo caso cobrindo bloqueio sem `medical_record.read`

## Validação executada
- `corepack pnpm --filter @cvg-his/his-api exec vitest run src/modules/patientContext/routes.test.ts src/modules/adminIam/routes.test.ts src/modules/auth/routes.test.ts src/middlewares/requirePermission.security.test.ts` ✅
- `corepack pnpm --filter @cvg-his/his-api build` ✅
- `corepack pnpm --filter @cvg-his/his-web build` ✅

## Riscos
- o reforço de `medical_record.read` pode expor 403 adicionais em fluxos frontend que ainda assumiam permissões mais genéricas;
- como ainda não há escopo por setor/unidade, um papel clínico continua podendo ler prontuários fora do setor esperado;
- a suíte de `patientContext` permanece com ruído de infraestrutura (`Redis/BullMQ` mockado com host `test`), embora esteja passando.

## Débitos técnicos
- criar testes específicos de matriz de permissões por papel;
- espalhar auditoria de leitura sensível para módulos restantes de prontuário;
- alinhar o frontend para esconder ou redirecionar melhor fluxos que agora exigem `medical_record.read`;
- introduzir enforcement real de escopos clínicos por unidade/setor/contexto.

## Dependências da próxima fase
- consolidar testes mínimos e smoke tests do módulo IAM;
- revisar seeds e migrações em cenário de implantação;
- preparar instruções operacionais de uso e implantação;
- registrar limitações remanescentes e resumo executivo da entrega.

## Próximos passos
- iniciar Fase 6 com revisão final, testes mínimos e entrega técnica;
- validar seeds com os novos papéis hospitalares;
- revisar os fluxos de prontuário no frontend à luz do novo corte `medical_record.read`;
- fechar documentação de implantação e limitações do MVP.
