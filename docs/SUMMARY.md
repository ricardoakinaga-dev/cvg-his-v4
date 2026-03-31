# SUMMARY — CVG-HIS-V2 — Resumo Abrangente da Documentação

> Gerado automaticamente a partir da leitura de todos os ~170 arquivos `.md` sob `/docs/` (incluindo subdiretórios `adr/`, `checklists/` e `docs2/`).
> Data: 2026-03-30

---

## 1. Visão Geral do Projeto

O **CVG-HIS-V2** (Centro Veterinário Guarapiranga — Health Information System V2) é um **sistema de informação hospitalar veterinário** completo, construído como uma reconstrução a partir de um sistema legado (`apps/his-*`). O projeto atende ao Centro Veterinário Guarapiranga e é publicado no domínio `nexusvet.centroveterinarioguarapiranga.com`.

### O que o sistema faz:

- **Gestão de tutores/responsáveis** (owners) por animais de estimação
- **Cadastro de pacientes** (animais) com dados clínicos
- **Abertura e controle de atendimentos** (encounters/episódios clínicos)
- **Prontuário clínico longitudinal** com evolução, prescrição e conduta
- **Pedidos e resultados de exames** diagnósticos
- **Internação/hospitalização** com controle de setores e leitos
- **Execução de prescrição** (enfermagem)
- **Alta/desfecho clínico** com encerramento formal do caso
- **Gestão administrativa**: faturamento, estoque, notificações
- **Governança**: autenticação, RBAC, auditoria

### Tecnologias centrais:

- **Runtime**: Node.js 22 + TypeScript
- **Package Manager**: pnpm 10 com workspaces
- **Build**: Turbo para orquestração de tasks
- **Banco**: PostgreSQL 16+ com Drizzle ORM
- **Cache/Fila**: Redis 7+
- **Frontend**: `apps/web` — Node.js HTTP server + SPA com hash routing (HTML inline, sem framework React/Vue)
- **Deploy**: Docker Compose + Caddy reverse proxy + systemd (alternativa)
- **Testes**: Vitest + Playwright (smoke E2E)

### Arquitetura do repositório:

```
cvg-his-v2/
├── apps/
│   ├── api/         # Servidor HTTP, rotas, composition root
│   ├── web/         # Frontend SPA oficial (canônico)
│   └── worker/      # Processamento assíncrono, jobs
├── packages/
│   ├── modules/*    # 17 módulos de negócio
│   └── shared/*     # 9 pacotes de infraestrutura
├── infra/           # Docker, DB, observabilidade, scripts
├── tools/           # Utilitários de migração
└── docs/            # Documentação completa (170+ arquivos)
```

**Referências principais**: `docs/010-reconstruction-rationale.md`, `docs/100-domain-map.md`, `docs/112-target-architecture.md`, `docs/README.md`

---

## 2. Arquitetura

### Stack Tecnológico e Decisões Arquiteturais (ADRs)

| ADR | Título | Resumo |
|-----|--------|--------|
| ADR-003 | Arquitetura Canônica do V2 | `apps/api`, `apps/web`, `apps/worker` são as trilhas oficiais. Apps legados `apps/his-*` são **arquivados**. |
| ADR-004 | Stack de Persistência | PostgreSQL + Drizzle ORM + Redis. Repository Pattern como padrão de acesso a dados. |
| ADR-005 | Persistência Implementada (Wave 1) | Bootstrap, healthcheck, schemas Drizzle para 22 tabelas de domínio. |
| ADR-006 | Repository Pattern | Cada módulo expõe repositório com interface, implementação in-memory (dev/test) e database (produção). |
| ADR-007 | Frontend Canônico V2 | `apps/web` (`@cvg-his-v2/web`) é o frontend oficial. `apps/his-web` é legado/referência. |
| ADR-009 | Estrutura Simplificada de Módulos | Módulos usam `src/index.ts` (service + repository interfaces) + `src/repositories/`. Contratos centralizados em `packages/shared/contracts/src/index.ts`. Pacote `packages/domain` é legacy e será removido. |

### Padrões Arquiteturais Chave:

1. **Modular Monolith primeiro** — distribuição depois se necessário
2. **Domínio antes de transporte** — regra de negócio no backend, não na UI
3. **Contratos explícitos** — módulos se comunicam por surface pública
4. **Side effects assíncronos** — eventos e jobs para operações secundárias
5. **Repository-first** — persistência como fonte real de verdade, nunca memória
6. **Shared packages pequenos** — 9 pacotes de infraestrutura controlados

### Bounded Contexts:

| Contexto | Módulos | Invariantes |
|----------|---------|-------------|
| Identity and Access | auth, access-control, users, staff | Identidade autenticada, sessão revogável |
| Master Registry | owners, patients | Paciente pertence ao contexto institucional |
| Encounter Management | scheduling, triage, encounters | Todo encounter referencia paciente válido |
| Clinical Record | medical-records, attachments | Autoria obrigatória, versionamento |
| Advanced Care | inpatient, surgery, diagnostics | Preservação de referência ao encounter |
| Administrative Consumption | billing, inventory, notifications | Sem governar regras clínicas |

**Referências**: `docs/101-bounded-contexts.md`, `docs/113-module-contracts.md`, `docs/115-backend-architecture.md`, `docs/114-frontend-architecture.md`, `docs/116-worker-architecture.md`, `docs/adr/ADR-003-arquitetura-canonica-v2.md` até `docs/adr/ADR-009-module-structure-simplified.md`

---

## 3. Módulos

### 3.1 Tutores / Owners

- **Descrição**: Cadastro de tutores/responsáveis pelos animais. Suporta contatos múltiplos, documento estruturado, endereço, responsável financeiro, status e origem.
- **Status**: **Aprovado com ressalvas** (reauditoria concluída, vide `docs/29-modulo-tutores-relatorio-final-de-reauditoria.md`)
- **Entregas**: Schema expandido (migration 006), service com `listForAccount`/`getForAccountOrThrow`, autoria em create/update, mascaras CPF/CNPJ/telefone/CEP, contatos repetíveis na UI, testes focados
- **Ressalvas**: Suite ampla da API instável em módulos externos; cache residual em memória no service
- **Docs**: `docs/01-modulo-tutores-visao-geral.md` a `docs/31-modulo-tutores-entrega-final-pronto-para-auditoria.md` (31 documentos)

### 3.2 Pacientes

- **Descrição**: Cadastro de pacientes (animais) com dados clínicos (espécie, raça, sexo, peso, castração, microchip, alertas clínicos). Vínculo obrigatório com tutor.
- **Status**: **Aprovado com ressalvas** (vide `docs/43-modulo-pacientes-relatorio-final-de-reauditoria.md`)
- **Entregas**: Schema expandido (migration 007), alertas clínicos estruturados (jsonb), formulário em 5 blocos, integração tutor→paciente, validações, testes
- **Ressalvas**: Schema não reforça `species`/`sex` como NOT NULL no banco; detail não retorna tutor expandido; busca persistida não cobre tutor/microchip
- **Docs**: `docs/32-prompt-master-implementacao-enterprise-modulo-pacientes.md` a `docs/44-modulo-pacientes-entrega-final-pronto-para-auditoria.md`

### 3.3 Atendimentos (Encounters)

- **Descrição**: Abertura e controle operacional do episódio clínico. Suporta tipos (consulta, emergência, retorno), prioridades, origens, snapshot clínico inicial, transições de status e fechamento.
- **Status**: **Aprovado com ressalvas** (após reauditoria curta, vide `docs/51-modulo-atendimentos-relatorio-final-de-reauditoria-curta.md`)
- **Entregas**: Schema expandido (migration 008 e 009), `chiefComplaint` como campo principal, detail com paciente+tutor expandidos, status normalizados, transição/close repository-first, testes
- **Ressalvas**: Compatibilidade transitória com campo `reason`; cobertura HTTP não dedicada ao detail enriquecido
- **Docs**: `docs/47-prompt-master-implementacao-enterprise-completa-modulo-atendimentos.md` a `docs/56-modulo-atendimentos-entrega-final-pronto-para-auditoria.md`

### 3.4 Prontuário Clínico (Medical Records)

- **Descrição**: Registro assistencial longitudinal com entries versionáveis (anamnese, evolução, prescrição, conduta), timeline clínica, soft-delete lógico, anexos com checksum SHA-256 e armazenamento real.
- **Status**: **Implementado e validado** — soft-delete, versionamento com `expectedVersion`, revisões, reidratação via repository após restart
- **Entregas**: `entry_revisions`, `clinical_timeline`, `AttachmentRepository` + `LocalFileStorage`, `db-persistence.test.ts` comprovando persistência real
- **Docs**: `docs/57-prompt-master-implementacao-enterprise-completa-modulo-prontuario-clinico.md` e docs de fases 6

### 3.5 Prescrições (Prescriptions / Plano Terapêutico)

- **Descrição**: Criação e gestão de prescrições médicas com itens estruturados. Integrada ao prontuário e atendimento.
- **Status**: Implementado no módulo `medical-records` e rotas expostas na API
- **Docs**: Integrado nos docs de fase 6 e módulo prontuário

### 3.6 Exames (Diagnostics / Pedidos + Resultados)

- **Descrição**: Fluxo diagnóstico formal com pedidos de exame (laboratorial, imagem, etc.), itens solicitados e resultados estruturados. Suporta catálogo de exames, lifecycle pedido→coleta→resultado.
- **Status**: **Aprovado com ressalvas** (vide relatório de reauditoria `docs/73-modulo-exames-pedidos-resultados-relatorio-final-de-reauditoria.md`)
- **Entregas**: Persistência de `exam_orders`, `exam_order_items`, `exam_results`, catálogo padrão com 6 exames, lifecycle com transições válidas/inválidas, 9 testes
- **Docs**: `docs/64-prompt-master-implementacao-enterprise-completa-modulo-exames-pedidos-resultados.md` a `docs/75-modulo-exames-pedidos-resultados-entrega-final-pronto-para-auditoria.md`

### 3.7 Internação (Inpatient / Hospitalização)

- **Descrição**: Permanência do paciente sob cuidado contínuo. Suporta admissão, transferência, alta, restrição de internação ativa única por paciente, controle de setores e leitos (SPC-010).
- **Status**: **Aprovado com ressalvas** (vide `docs/79-modulo-internacao-hospitalizacao-relatorio-final-de-reauditoria.md`)
- **Entregas**: Schema expandido (migrations 011, 005), `sectors` e `beds` com CRUD, `bed-map` operacional, `assign-bed` e `transfer-bed`, persistência real em DB, 7 testes + teste 13 de persistência
- **Docs**: `docs/68-prompt-master-implementacao-enterprise-completa-modulo-internacao-hospitalizacao.md` a `docs/81-modulo-internacao-hospitalizacao-entrega-final-pronto-para-auditoria.md`, `docs/913-spc-backlog-servicos-setores-relatorios.md`

### 3.8 Execução de Prescrição / Enfermagem

- **Descrição**: Registro de administração/ não administração de itens prescritos. Suporta status (pendente, administrado, não administrado, suspenso, cancelado), eventos de log, checagem dupla, snapshot de sinais vitais.
- **Status**: Implementado no módulo `prescription-executions` (mencionado nos prompts master 82-86)
- **Docs**: `docs/82-prompt-master-implementacao-enterprise-completa-modulo-execucao-prescricao-enfermagem.md`

### 3.9 Alta / Desfecho Clínico

- **Descrição**: Encerramento formal do caso clínico. Suporta tipos (ambulatorial, internação, transferência, óbito), desfechos, resumo clínico final, orientações de continuidade, follow-up. Bloqueia duplicidade por atendimento.
- **Status**: **Aprovado com ressalvas** (vide `docs/95-modulo-alta-desfecho-clinico-relatorio-final-de-reauditoria.md`)
- **Entregas**: Módulo `discharges`, permissões `discharges.read`/`discharges.manage`, integração com medical-records (timeline), testes
- **Docs**: `docs/87-prompt-master-implementacao-enterprise-completa-modulo-alta-desfecho-clinico.md` a `docs/96-modulo-alta-desfecho-clinico-entrega-final-pronto-para-auditoria.md`

---

## 4. Fases do Projeto

| Fase | Escopo | Status |
|------|--------|--------|
| 0 | Congelamento estratégico e inventário do legado | ✅ Completo |
| 1 | Fundação documental (domínio, workflows, segurança, arquitetura, dados) | ✅ Completo |
| 2 | Fundação do monorepo (workspace, turbo, shared packages, skeletons) | ✅ Completo — typecheck/build/test PASS |
| 3 | Core de identidade, acesso e governança (auth, users, staff, access-control, audit) | ✅ Completo — 9/9 testes |
| 4 | Cadastro mestre (owners, patients, vínculos) | ✅ Completo — 8/8 testes |
| 5 | Atendimento e episódio clínico (scheduling, triage, encounters) | ✅ Completo — schema expandido, lifecycle |
| 6 | Prontuário clínico base (medical-records, attachments) | ✅ Completo — versionamento, soft-delete, anexos reais |
| 7 | Operação assistencial avancada (inpatient, surgery, diagnostics) | ✅ Completo — persistência real, lifecycle |
| 8 | Administrativo e consumo assistencial (billing, inventory, notifications) | ✅ Completo — suites de módulo |
| 9 | Migração controlada | 📄 Documentado, pendente infraestrutura de staging |

### Ciclo de implementação por módulo:

Cada módulo segue um ciclo rigoroso:
1. **Documentação** em `/docs` (contrato de dados, visão geral, backend, frontend, gate de auditoria)
2. **Implementação** (banco → backend → frontend → integração → validações → testes)
3. **Auditoria** (relatório final, classificação: aprovado/reprovado/aprovado com ressalvas)
4. **Reauditoria** (se reprovado, correções + novo gate)
5. **Entrega final** (handoff para próxima etapa)

### Produção Enterprise:

Após implementação dos módulos, o projeto entrou em um ciclo de **prontidão para produção**:
- **Matriz de prontidão**: `docs/98-matriz-prontidao-producao-enterprise.md` — 9 critérios ponderados
- **Hardening global**: `docs/90-hardening-global.md` — 8 fases de endurecimento transversal
- **Nota inicial**: 78/100 (não pronto para produção)
- **Após recuperação cirurgica**: 85-87/100 — **apto para produção controlada** (vide `docs/155-relatorio-final-recuperacao-cirurgica-85-plus.md`, `docs/156-decisao-executiva-prontidao-85-plus.md`)

**Referências**: `docs/123-phased-execution-plan.md`, `docs/126-implementation-readiness-review.md`, fase progress reports (200-272)

---

## 5. Segurança e Governança

### Autenticação:

- **Tokens**: HMAC assinados com `AUTH_SECRET` (mínimo 32 chars em staging/production)
- **Sessão**: Stateful com repositório (sobrevive a restart via DB)
- **Claims mínimas**: `sub`, `account_id`, `session_id`, `auth_time`
- **Refresh**: Rotação de nonce a cada uso
- **Logout**: Revogação de sessão no backend
- **Senhas seed**: Prefixo `seed_` com salt dedicado
- Vide `docs/108-authentication-strategy.md`

### RBAC (Role-Based Access Control):

- **Perfis base**: admin, reception, auditor, nurse, veterinarian, finance, inventory, diagnostics, surgery
- **Enforcement**: Centralizado no backend via `assertAuthorized`
- **Policies**: Avaliadas no backend; frontend consome capabilities derivadas apenas para UX
- **Permissões por domínio**: `owners.read`, `owners.manage`, `patients.read`, `patients.manage`, `medical-records.*`, `discharges.read`, `discharges.manage`, etc.
- Vide `docs/107-roles-and-permissions.md`, `docs/109-authorization-strategy.md`

### Auditoria:

- **Modelo**: Append-only, correlacionável, separado de logs técnicos
- **Campos mínimos**: `event_id`, `occurred_at`, `actor_id`, `account_id`, `module`, `action`, `entity_type`, `entity_id`, `correlation_id`, `payload_summary`, `risk_level`
- **Eventos obrigatórios**: login, refresh, falha de auth, revoke, criação/revisão de entries clínicas, transições de encounter, alterações de cadastro mestre
- **Autoria**: `createdByUserId` e `updatedByUserId` preenchidos em create/update nos módulos principais
- Vide `docs/110-audit-trail-strategy.md`, `docs/120-audit-model.md`

### Dados Sensíveis:

- Minimização de exposição em responses e logs
- Segregação de acesso por policy e contexto
- Logs não contêm segredos, tokens ou payloads clínicos completos
- Vide `docs/111-sensitive-data-handling.md`

### Regras de Segurança Assistencial:

- Nenhuma entry clínica relevante pode ser criada sem autoria identificável
- Prescrição, conduta e evolução são distinguíveis no modelo
- Revisão não apaga historico silenciosamente
- Vide `docs/106-patient-safety-rules.md`

---

## 6. Deploy e Infraestrutura

### Docker Setup:

- **docker-compose.v2.yml**: PostgreSQL + Redis + API + Web + Worker
- **Dockerfiles**: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/worker/Dockerfile`
- **Reverse proxy**: Caddy com exemplo de configuração (`infra/docker/Caddyfile.v2`)
- Vide `docs/130-instalacao-publicacao-cvg-his-v2-real.md`

### Serviços e Portas:

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Web V2 | 3000 | Frontend SPA |
| API V2 | 3001 | Backend HTTP |
| PostgreSQL | 5432 | Banco de dados |
| Redis | 6379 | Cache/filas |

### Variáveis de Ambiente Obrigatórias:

- `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `FILE_STORAGE_PATH` (API)
- `API_BASE_URL` (Web)
- Vide `docs/130-instalacao-publicacao-cvg-his-v2-real.md` seção 4

### Migrations:

- **Estratégia**: Idempotentes, ordenadas numericamente (001-020+), aplicadas **antes** de subir a API
- **Localização**: `packages/shared/database/src/migrations/`
- **Migrations existentes**:
  - 001: Schema inicial (22 tabelas)
  - 002: Revisões de entries
  - 003: Persistência de cuidados avançados
  - 004: Governança de clinical entries
  - 005: Setores e leitos
  - 006: Expansão de owners para tutores
  - 007: Expansão de patients para dados clínicos
  - 008: Expansão de encounters para atendimentos
  - 009: Hardening de contrato de encounters
  - 011: Expansão de inpatient stays
  - 015-020: Versionamento (patients, encounters, medical records, inpatient)
- Vide `docs/MIGRATIONS-STRATEGY.md`

### Procedimento de Cutover:

- Script único: `infra/scripts/cutover-v2.sh`
- Checklist: `docs/131-checklist-cutover-servidor.md`
- Passos: validar .env → subir stack → aplicar migrations → validar health → (opcional) trocar Caddy → (opcional) parar legado
- **Rollback**: `docker compose down` + `systemctl reload caddy`
- Vide `docs/150-release-rollback-procedure-enterprise.md`

### Deploy Legado → V2:

- Apps legados (`apps/his-api`, `apps/his-web`, `apps/his-worker`) são **arquivados**
- Deploy correto: apenas `apps/api`, `apps/web`, `apps/worker`
- Plano cirúrgico de troca documentado em `docs/130-instalacao-publicacao-cvg-his-v2-real.md` seção 12

---

## 7. Problemas e Issues

### Issues Críticos Identificados (estado mais recente):

1. **Suite ampla da API** — Historicamente instável em módulos `notifications`, `appointments`, `users`. Após recuperação cirúrgica final, fechou em 52/52. Risco de regressão permanece se não houver manutenção.
2. **Testes HTTP incompletos** — Cobertura de contrato HTTP ainda pode ser expandida para mais módulos além dos centrais.
3. **Versionamento otimista incompleto** — `expectedVersion` implementado em patients, encounters, medical-records, inpatient, prescriptions, discharges. Outros módulos podem necessitar.
4. **Observabilidade básica** — Health check básico presente, mas sem dashboards, alertas ou métricas de performance em produção.
5. **Processo de release** — Documentado (`docs/150-release-rollback-procedure-enterprise.md`) mas sem ensaio ponta a ponta em staging real.

### Issues por Módulo:

- **Tutores/Owners**: Schema não usa `fullName` como coluna canônica ainda (compatibilidade com `name`); cache residual em memória
- **Pacientes**: `species`/`sex` não são NOT NULL no banco; detail não retorna tutor expandido; busca não cobre tutor/microchip
- **Atendimentos**: Compatibilidade transitória com campo `reason` além de `chiefComplaint`; status legados e novos coexistem
- **Prontuário**: Assinatura digital não implementada; concorrência cross-runtime mais forte pendente
- **Billing/Inventory**: Ainda em nível básico sem conciliação completa
- **Notifications**: Canal interno simples, sem fila mais rica

### Gaps Técnicos Globais:

- Pacote `packages/domain` existe mas não é usado por nenhum módulo (declarado legacy, planejado para remoção)
- Layout legado paralelo em `apps/web/src/pages/layout.ts` coexistindo com shell novo em `index.ts`
- Módulo de serviços/produtos (SPC-001) ainda não implementado

**Referências**: `docs/900-executive-audit-backlog.md`, `docs/137-relatorio-correcao-lacunas-producao-enterprise.md`, `docs/140-decisao-final-prontidao-producao-enterprise.md`

---

## 8. Navbar / UX

### Estado Atual da Navbar:

- **Nota**: 76/100 (`docs/904-navbar-left-status-report.md`)
- **Implementação**: Sidebar esquerda em `apps/web/src/index.ts` com grupos (Essencial, Administrativo, Operação, Assistencial, Backoffice, Governança), estado expandido/recolhido persistido em `localStorage`, topbar integrada
- **Problemas**: Branding textual excessivo no topo; layout legado paralelo (`layout.ts`); responsividade mobile incompleta (sem overlay, fechamento por clique fora, Escape, lock de scroll); acessibilidade intermediária

### Planos de Melhoria Documentados:

1. **Remoção de título da sidebar** (`docs/905-navbar-left-title-removal-plan.md`): Remover branding e bloco introdutorio, manter toggle + grupos + links + área de usuário. Impacto backend: nenhum.
2. **Plano final de navbar + integração frontend-backend** (`docs/906-final-navbar-and-backend-frontend-integration-plan.md`): Mapeamento completo de cobertura backend×frontend (22 áreas); identifica rotas backend prontas sem fluxo frontend real (ex: update de owners/patients/users, assign-bed/transfer-bed, timeline de encounter).
3. **Navbar premium, float e mobile** (`docs/907-navbar-premium-float-mobile-plan.md`): Evolução para navbar flutuante, drawer premium no mobile, motion suave, sombras refinadas, adaptação tablet.

### Organização da Navegação (sidebar):

- **Essencial**: Dashboard, Tutores, Pacientes, Busca Mestra
- **Administrativo**: Usuários, Equipe, Controle de Acesso
- **Operação**: Agendamentos, Fila, Triagem, Atendimentos
- **Assistencial**: Prontuário, Prescrições, Exames, Internação, Setores, Leitos, Mapa de Leitos, Cirurgias
- **Backoffice**: Estoque, Faturamento, Notificações
- **Governança**: Auditoria

**Referências**: `docs/904-navbar-left-status-report.md`, `docs/905-navbar-left-title-removal-plan.md`, `docs/906-final-navbar-and-backend-frontend-integration-plan.md`, `docs/907-navbar-premium-float-mobile-plan.md`

---

## 9. Backlog e Planos

### Executive Audit Backlog (`docs/900-executive-audit-backlog.md`):

11 áreas auditadas (AUD-001 a AUD-011) com notas de 42 a 88. Prioridades P0-P2. 33 histórias derivadas com owner, esforço e critério de aceite. Organizadas em 7 sprints sugeridas.

### Enterprise Acceleration Plan (`docs/902-enterprise-acceleration-plan.md`):

3 ondas de execução rumo a 88-92/100:
- **Onda 1** (Produção Técnica): ENT-001 a ENT-004 — DB real, worker/API, readiness, testes — **todos concluídos**
- **Onda 2** (Produto Operacional): ENT-005 a ENT-008 — frontend oficial, fluxos, smoke E2E, prontuário enterprise — **todos concluídos**
- **Onda 3** (Endurecimento Enterprise): ENT-009 a ENT-011 — segurança, operação avançada, migração — **ENT-009 e ENT-010 concluídos, ENT-011 pendente**

### SPC Backlog — Serviços, Setores e Relatórios (`docs/913-spc-backlog-servicos-setores-relatorios.md`):

- **SPC-001 a SPC-006**: Serviços/produtos — pendente
- **SPC-010 a SPC-014**: Setores/leitos/bedmap — **concluídos** (migration 005, CRUD, assign-bed, transfer-bed, bedmap)
- **SPC-020 a SPC-024**: Relatórios assistenciais — pendente
- **SPC-030 a SPC-033**: Relatórios financeiros — pendente

### Hardening Global (`docs/90-hardening-global.md`):

8 fases de endurecimento transversal:
1. Padronizar repository-first
2. Remover cache dos services
3. Constraints reais no banco (onda segura)
4. Testes HTTP completos
5. Versionamento otimista
6. Evitar delete+recreate em coleções
7. Padronizar lifecycle endpoints
8. Estabilizar suite ampla

Status: Em andamento. Suite ampla fechada em 52/52. Versionamento em módulos centrais. Constraints aplicadas parcialmente.

### Recuperação para 85+/100 (`docs/142-prompt-master-recuperacao-85-plus-producao-enterprise.md`, `docs/151`, `docs/152`):

Ciclo de recuperação em 3 rodadas:
1. Recuperação principal (expectedVersion, testes HTTP, suite ampla)
2. Segunda recuperação (observabilidade, lifecycle)
3. Fechamento ultra-cirúrgico (último teste da suite)

Resultado final: **85-87/100 — apto para produção controlada** (`docs/156-decisao-executiva-prontidao-85-plus.md`)

### Matriz de Prontidão (`docs/98-matriz-prontidao-producao-enterprise.md`):

| Critério | Peso | Nota Final Estimada |
|----------|------|-------------------|
| Cobertura funcional dos módulos centrais | 15 | 88 |
| Integração entre módulos | 12 | 84 |
| Consistência fullstack | 12 | 82 |
| Integridade de dados e persistência | 12 | 82 |
| Arquitetura operacional | 15 | 80 |
| Qualidade de testes e gate técnico | 15 | 78 |
| Segurança, autorização e trilha | 8 | 82 |
| Observabilidade e operação | 6 | 68 |
| Processo de release e governança | 5 | 72 |
| **Total ponderado** | **100** | **~85** |

**Referências**: `docs/900-executive-audit-backlog.md`, `docs/902-enterprise-acceleration-plan.md`, `docs/90-hardening-global.md`, `docs/98-matriz-prontidao-producao-enterprise.md`, `docs/154-relatorio-final-recuperacao-cirurgica-85-plus.md`, `docs/156-decisao-executiva-prontidao-85-plus.md`

---

## Referências Cruzadas aos Documentos Mais Importantes

| Documento | Descrição |
|-----------|-----------|
| `docs/README.md` | Índice principal da documentação |
| `docs/010-reconstruction-rationale.md` | Rationale da reconstrução do legado |
| `docs/100-domain-map.md` | Mapa de domínios macro |
| `docs/101-bounded-contexts.md` | Bounded contexts e invariantes |
| `docs/103-business-rules.md` | Regras de negócio nucleares |
| `docs/112-target-architecture.md` | Arquitetura alvo do repositório |
| `docs/113-module-contracts.md` | Contratos canônicos de módulos |
| `docs/123-phased-execution-plan.md` | Plano de execução por fases (0-9) |
| `docs/126-implementation-readiness-review.md` | Review de prontidão para implementação |
| `docs/130-instalacao-publicacao-cvg-his-v2-real.md` | Guia de instalação e publicação |
| `docs/900-executive-audit-backlog.md` | Backlog executivo de auditoria |
| `docs/902-enterprise-acceleration-plan.md` | Plano de aceleração enterprise |
| `docs/90-hardening-global.md` | Hardening global transversal |
| `docs/98-matriz-prontidao-producao-enterprise.md` | Matriz de prontidão para produção |
| `docs/150-release-rollback-procedure-enterprise.md` | Procedimento de release e rollback |
| `docs/MIGRATIONS-STRATEGY.md` | Estratégia de migrations |
| `docs/adr/ADR-009-module-structure-simplified.md` | Estrutura simplificada de módulos |
| `docs/904-navbar-left-status-report.md` | Status da navbar esquerda |
| `docs/906-final-navbar-and-backend-frontend-integration-plan.md` | Plano de integração frontend×backend |
| `docs/913-spc-backlog-servicos-setores-relatorios.md` | Backlog de serviços, setores e relatórios |

---

*Este summary foi gerado a partir da leitura integral de todos os arquivos .md no diretório `/docs/` do projeto cvg-his-v2. Para detalhes específicos de qualquer módulo, fase ou decisão, consultar os documentos referenciados acima.*
