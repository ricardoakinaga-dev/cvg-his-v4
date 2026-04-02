# Plano Final - Navbar, Cobertura Frontend x Backend e Implementacao de Melhorias

Data: 2026-03-28
Escopo: consolidacao final de planejamento
Base de analise:

- `docs/904-navbar-left-status-report.md`
- `docs/905-navbar-left-title-removal-plan.md`
- `apps/web/src/*`
- `apps/api/src/server.ts`

## Objetivo

Consolidar um plano detalhado e minucioso para:

1. evoluir a navbar esquerda com menos poluicao visual
2. mapear toda a estrutura atual de frontend e backend
3. identificar modulos e rotas do backend que ja existem, mas ainda nao estao realmente conectados ao frontend
4. priorizar a implementacao futura com risco controlado

## Resumo Executivo

O sistema atual ja possui:

- shell frontend oficial com navbar esquerda funcional
- cobertura visual para a maior parte dos modulos centrais
- backend amplo, com varios endpoints e fluxos mais maduros do que o frontend realmente expõe

O gap principal hoje nao e "ausencia de backend". O gap principal e:

- **cobertura parcial do frontend sobre recursos ja prontos na API**
- **shell visual ainda em amadurecimento**
- **navegacao com boa base, mas ainda com ruido visual e certa rigidez estrutural**

Em termos praticos:

- a navbar ja existe, mas precisa consolidacao visual
- o frontend ja conversa com muitos endpoints
- ainda ha um conjunto importante de rotas backend prontas, porem sem fluxo correspondente no frontend

## Relacao com os Relatorios Anteriores

### Relatorio 904

Leitura aproveitada:

- a navbar esquerda esta funcional
- a nota atual e `76/100`
- os maiores gaps estao em acessibilidade, mobile, consistencia arquitetural e acoplamento do menu

### Relatorio 905

Leitura aproveitada:

- a remocao do titulo visual da sidebar deve ser tratada como limpeza localizada
- o impacto backend esperado para essa mudanca e nulo ou desprezivel
- a implementacao mais segura e remover branding e bloco introdutorio da sidebar, mantendo os grupos e botoes

## Mapeamento Atual do Frontend

O frontend oficial esta centralizado em `apps/web`.

### Rotas visuais principais existentes

- `/login`
- `/`
- `/owners`
- `/patients`
- `/encounters`
- `/medical-records`
- `/users`
- `/staff`
- `/access-control`
- `/appointments`
- `/queue`
- `/triage`
- `/inpatient`
- `/sectors`
- `/beds`
- `/bed-map`
- `/diagnostics`
- `/surgeries`
- `/inventory`
- `/billing`
- `/notifications`
- `/audit`
- `/master-search`

### Organizacao atual da navbar

Grupos hoje renderizados:

- Essencial
- Administrativo
- Operacao
- Assistencial
- Backoffice
- Governanca

### Problemas estruturais ja conhecidos do frontend

- navbar ainda vive hardcoded em `apps/web/src/index.ts`
- existe layout legado paralelo em `apps/web/src/pages/layout.ts`
- experiencia mobile ainda esta incompleta
- acessibilidade de toggle e painel ainda nao esta madura
- existe excesso de texto no topo da sidebar

## Mapeamento Atual do Backend

O backend oficial esta centralizado em `apps/api/src/server.ts`.

### Areas / modulos expostos por rota

- health / readiness / liveness
- auth
- medical-records
- attachments
- inpatient
- surgeries
- diagnostics
- billing
- inventory
- notifications
- scheduling / queue
- encounters
- triage
- master-search
- owners
- patients
- owner-patient-links
- users
- staff
- access-control
- audit
- sectors
- beds
- bed-map

## Matriz de Cobertura - Backend x Frontend

### 1. Auth

Rotas backend:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/session`

Cobertura frontend:

- login conectado
- logout conectado
- refresh tratado via client auth/sdk e client api
- `GET /auth/session` nao aparece como fluxo funcional explicito de UI

Status:

- **Parcialmente conectado**

Leitura:

- o fluxo basico existe
- a sessao atual nao parece explorada como pagina ou diagnostico visivel no frontend

### 2. Owners

Rotas backend:

- `GET /owners`
- `POST /owners`
- `GET /owners/:id`
- `PATCH /owners/:id`

Cobertura frontend:

- listagem conectada
- criacao conectada
- leitura individual conectada
- atualizacao ainda nao aparece como fluxo claro na UI

Status:

- **Parcialmente conectado**

### 3. Patients

Rotas backend:

- `GET /patients`
- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`

Cobertura frontend:

- listagem conectada
- criacao conectada
- vinculacao owner-patient conectada via `POST /owner-patient-links`
- atualizacao de paciente nao aparece como fluxo claro no frontend

Status:

- **Parcialmente conectado**

### 4. Owner-Patient Links

Rotas backend:

- `GET /owner-patient-links`
- `POST /owner-patient-links`

Cobertura frontend:

- criacao conectada
- listagem dedicada nao aparece como tela/fluxo explicito

Status:

- **Parcialmente conectado**

### 5. Users

Rotas backend:

- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`

Cobertura frontend:

- listagem conectada
- leitura individual conectada
- atualizacao nao aparece como fluxo claro

Status:

- **Parcialmente conectado**

### 6. Staff

Rotas backend:

- `GET /staff`
- `GET /staff/:id`

Cobertura frontend:

- listagem conectada
- leitura individual conectada

Status:

- **Conectado no escopo atual**

### 7. Access Control

Rotas backend:

- `GET /access-control`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 8. Scheduling / Queue

Rotas backend:

- `GET /appointments`
- `POST /appointments`
- `GET /queue`
- `POST /queue/check-in`
- `POST /queue/:id/call`

Cobertura frontend:

- appointments conectados
- queue conectada
- check-in conectado
- chamada da fila conectada

Status:

- **Conectado**

### 9. Encounters

Rotas backend:

- `GET /encounters`
- `POST /encounters`
- `GET /encounters/:id`
- `GET /encounters/:id/timeline`
- `POST /encounters/:id/transition`
- `POST /encounters/:id/close`

Cobertura frontend:

- listagem conectada
- abertura conectada
- transition conectada
- close conectado
- leitura detalhada por id nao aparece como fluxo claro
- timeline dedicada de encounter nao aparece conectada como recurso da UI

Status:

- **Parcialmente conectado**

### 10. Triage

Rotas backend:

- `GET /triage`
- `POST /triage`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 11. Medical Records

Rotas backend:

- `GET /medical-records`
- `GET /medical-records/entries`
- `POST /medical-records/entries`
- `PATCH /medical-records/entries/:id`
- `DELETE /medical-records/entries/:id`
- `GET /medical-records/timeline`

Cobertura frontend:

- record por encounter conectado
- entries conectadas
- criacao conectada
- timeline conectada
- revisao/edicao de entry nao aparece conectada
- arquivamento/delete logico nao aparece conectado

Status:

- **Parcialmente conectado**

### 12. Attachments

Rotas backend:

- `GET /attachments`
- `POST /attachments`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 13. Inpatient

Rotas backend:

- `GET /inpatient`
- `POST /inpatient`
- `GET /inpatient/:stayId/progress`
- `POST /inpatient/progress`
- `POST /inpatient/:stayId/status`
- `POST /inpatient/:stayId/assign-bed`
- `POST /inpatient/:stayId/transfer-bed`

Cobertura frontend:

- listagem conectada
- admissao conectada
- progress conectado
- status conectado
- assign-bed nao aparece conectado
- transfer-bed nao aparece conectado

Status:

- **Parcialmente conectado**

### 14. Sectors / Beds / Bed Map

Rotas backend:

- `GET /sectors`
- `POST /sectors`
- `GET /beds`
- `POST /beds`
- `GET /bed-map`

Cobertura frontend:

- setores conectados
- leitos conectados
- mapa de leitos conectado

Status:

- **Conectado**

Observacao:

- a integracao funcional com `assign-bed` e `transfer-bed` ainda nao esta realmente refletida em fluxo de UI operacional completo

### 15. Surgeries

Rotas backend:

- `GET /surgeries`
- `POST /surgeries`
- `POST /surgeries/:id/status`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 16. Diagnostics

Rotas backend:

- `GET /diagnostics/orders`
- `POST /diagnostics/orders`
- `POST /diagnostics/orders/:id/result`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 17. Billing

Rotas backend:

- `GET /billing`
- `GET /billing/items`
- `POST /billing/estimate`
- `POST /billing/items`
- `POST /billing/:encounterId/status`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 18. Inventory

Rotas backend:

- `GET /inventory/items`
- `GET /inventory/consumptions`
- `POST /inventory/consumptions`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 19. Notifications

Rotas backend:

- `GET /notifications`
- `GET /notifications/jobs`
- `POST /notifications`
- `POST /notifications/process`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 20. Audit

Rotas backend:

- `GET /audit/events`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 21. Master Search

Rotas backend:

- `GET /master-search`

Cobertura frontend:

- conectada

Status:

- **Conectado**

### 22. Health / Ready / Live

Rotas backend:

- `GET /health`
- `GET /ready`
- `GET /live`

Cobertura frontend:

- sem pagina ou fluxo funcional no frontend oficial

Status:

- **Sem conexao no frontend**

Leitura:

- isso nao e necessariamente um problema
- sao rotas operacionais de infra/observabilidade

## Rotas Backend Ja Construidas Sem Conexao Real no Frontend

Aqui estao os casos mais importantes em que o backend existe, mas o frontend ainda nao expõe o recurso de forma real ou completa.

### Rotas claramente sem fluxo funcional equivalente no frontend

- `GET /auth/session`
- `GET /health`
- `GET /ready`
- `GET /live`
- `GET /owner-patient-links`
- `GET /encounters/:id`
- `GET /encounters/:id/timeline`
- `PATCH /medical-records/entries/:id`
- `DELETE /medical-records/entries/:id`
- `POST /inpatient/:stayId/assign-bed`
- `POST /inpatient/:stayId/transfer-bed`
- `PATCH /owners/:id`
- `PATCH /patients/:id`
- `PATCH /users/:id`

### Rotas que podem estar tecnicamente acessiveis, mas sem experiencia completa de produto

- `POST /inpatient/:stayId/status`
- `POST /surgeries/:id/status`
- `POST /diagnostics/orders/:id/result`
- `POST /billing/:encounterId/status`

Leitura:

- existe chamada do frontend em alguns desses casos
- mas ainda falta verificar maturidade de UX, descoberta de fluxo, contexto visual e integracao mais natural entre paginas

## Modulos Backend com Maior Maturidade que o Frontend

Os modulos abaixo parecem mais prontos na API do que no uso real pela interface:

- `medical-records`
- `owners`
- `patients`
- `users`
- `encounters`
- `inpatient`

Motivo:

- a API ja oferece mais operacoes do que a UI realmente entrega como fluxo

## Diagnostico Consolidado

### O que esta bom hoje

- cobertura visual ampla dos modulos principais
- navegacao ja organizada por dominios
- API oficial relativamente rica
- boa base de CRUD e operacao assistencial conectada ao frontend

### O que esta travando maturidade

- navbar ainda precisa limpeza e consolidacao
- frontend nao aproveita toda a capacidade ja existente no backend
- varios recursos estao "tecnicamente implementados" mas nao "produtizados" na interface
- ha coexistencia de shell novo com layout legado paralelo

## Plano Final de Melhoria e Implementacao

## Eixo 1 - Consolidacao da Navbar Esquerda

### Objetivo

Levar a navbar de um estado funcional `76/100` para um estado mais limpo, consistente e pronto para sustentar o crescimento das rotas.

### Acoes

1. remover branding textual e bloco introdutorio da sidebar
2. manter apenas toggle, grupos, links e area de usuario
3. recalibrar espacamentos da sidebar
4. manter `route.title` apenas onde for realmente necessario
5. revisar responsividade mobile
6. adicionar acessibilidade basica do painel
7. decidir destino de `layout.ts` para reduzir drift

### Resultado esperado

- menos poluicao visual
- melhor foco nos modulos
- shell mais escalavel para crescimento de rotas e grupos

## Eixo 2 - Fechar Lacunas Frontend x Backend

### Prioridade P0 - Fluxos backend existentes com maior valor imediato

1. expor edicao de owners
2. expor edicao de patients
3. expor edicao de users
4. expor update/revisao de entries clinicas
5. expor arquivamento de entries clinicas
6. expor assign-bed e transfer-bed dentro do fluxo de internacao

### Prioridade P1 - Fechar lacunas de leitura e contexto

7. criar fluxo mais claro para detalhe de encounter
8. expor timeline de encounter no frontend
9. expor listagem consultavel de owner-patient-links quando fizer sentido operacional
10. decidir se `auth/session` deve ter uso operacional ou permanecer tecnico

### Prioridade P2 - Fluxos operacionais/infra opcionais

11. avaliar se health/readiness/liveness merecem painel tecnico restrito
12. caso nao merecam UI, documentar que permanecem endpoints exclusivamente operacionais

## Eixo 3 - Reorganizacao da Arquitetura de Navegacao

### Objetivo

Fazer a navbar representar melhor a realidade do produto e do backend.

### Acoes

1. transformar definicao de grupos/links em estrutura mais centralizada
2. preparar a navegacao para crescer sem inflar `index.ts`
3. alinhar rotas frontend com capacidades reais dos modulos
4. decidir se alguns links devem aparecer apenas quando houver fluxo completo

### Observacao

Este eixo nao precisa virar RBAC dinamico agora. A prioridade e reduzir rigidez e melhorar manutencao.

## Sequencia Recomendada de Implementacao

### Fase 1 - Limpeza do shell

- executar o plano do relatorio `905`
- fechar a poluicao visual da navbar
- preservar estabilidade da navegacao atual

### Fase 2 - Consolidacao de fluxos CRUD faltantes

- owners update
- patients update
- users update
- medical-record entry update/archive

### Fase 3 - Fechar internacao operacional completa

- assign-bed
- transfer-bed
- revisar coerencia entre `inpatient`, `beds`, `sectors` e `bed-map`

### Fase 4 - Fechar detalhe e contexto clinico

- detalhe de encounter
- timeline de encounter
- melhora da navegacao entre atendimento, triagem, prontuario e internacao

### Fase 5 - Revisao estrutural da navegacao

- reduzir hardcode em `index.ts`
- decidir destino de `layout.ts`
- estabilizar agrupamento final da navbar

## Riscos

### Risco 1 - Melhorar a navbar sem resolver a cobertura funcional

Se a navegacao ficar visualmente melhor, mas continuar apontando para experiencias incompletas, a percepcao de maturidade pode piorar.

Mitigacao:

- evoluir shell e cobertura funcional em paralelo

### Risco 2 - Abrir escopo demais no backend

Muitas lacunas atuais nao pedem backend novo, apenas melhor uso do backend existente.

Mitigacao:

- priorizar primeiro os endpoints ja implementados

### Risco 3 - Crescimento desordenado da navegacao

Se novos links forem adicionados sem consolidar estrutura, a sidebar pode voltar a ficar poluida e rigida.

Mitigacao:

- concluir primeiro a limpeza visual e a organizacao dos grupos

### Risco 4 - Drift entre shell novo e layout antigo

Mitigacao:

- decidir explicitamente se `layout.ts` sera removido, arquivado ou mantido como legado sem uso

## Criterios de Sucesso do Plano

O plano sera bem executado quando:

1. a navbar estiver visualmente limpa e funcional
2. o shell nao tiver redundancia desnecessaria
3. os principais endpoints backend hoje "ociosos" na UI ganharem fluxo real
4. owners, patients, users, medical-records e inpatient tiverem cobertura frontend mais completa
5. a arquitetura de navegacao ficar mais clara e menos hardcoded

## Recomendacao Final

A proxima trilha de trabalho nao deve ser "criar novas features grandes". Ela deve ser:

1. **consolidar a navbar esquerda**
2. **fechar as lacunas entre backend pronto e frontend incompleto**
3. **organizar a estrutura da navegacao para sustentar o crescimento futuro**

Em outras palavras:

- o backend ja esta adiantado em varios pontos
- o frontend precisa agora transformar capacidade tecnica existente em experiencia real de produto
- a navbar deve ser tratada como a camada de entrada dessa consolidacao, nao apenas como cosmetic fix
