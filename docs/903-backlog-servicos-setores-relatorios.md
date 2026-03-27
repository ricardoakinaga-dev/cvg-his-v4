# Backlog — Serviços, Setores, Relatórios Assistenciais e Financeiros

Data atualizacao: 2026-03-27
Origem: replanejamento pós-validação de rotas no frontend oficial
Status: priorizado para próximo ciclo após validação manual das rotas

## Contexto

Após republicação do `cvg-his-v2-web` e validação manual das rotas no domínio, identificou-se que os seguintes itens não são "só frontend" — exigem backend, persistência, worker e integração com módulos existentes:

- **Serviços**: entidade serviços/produtos, CRUD, catálogo, integração com billing
- **Setores**: estrutura hospitalar (wards, beds, bedmap)
- **Relatórios assistenciais**: relatórios de atendimento, internação, triagem, prontuário
- **Relatórios financeiros**: relatórios de billing, conciliação, consumo assistencial

## Escala

- 90-100: pronto, com melhorias incrementais
- 70-89: funcional, mas com lacunas relevantes
- 50-69: implementado de forma parcial ou pouco resiliente
- 0-49: documentado ou demonstrado, mas não pronto para operação real

## Itens do Backlog

### Bloco 1: Serviços (Serviços/Produtos)

| ID      | Area                            | Owner              | Esforço | Dependencia         | Criterio de aceite                                                                                         | Nota |
| ------- | ------------------------------- | ------------------ | ------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| SPC-001 | Base comercial                  | Backend + Data     | M       | AUD-008-02          | Entidade `service` existe no DB com campos: id, name, description, category, unit_price, active, tenant_id | —    |
| SPC-002 | CRUD de serviços                | Backend + Frontend | M       | SPC-001             | API suporta create, read, update, list com paginação e filtro por category                                 | —    |
| SPC-003 | Catálogo mínimo                 | Backend + Clinical | S       | SPC-001             | Catálogo inicial com categorias: consulta, exame, procedimento, produto, medicamento                       | —    |
| SPC-004 | Integração com billing          | Backend            | M       | SPC-001, AUD-007-02 | Service item pode ser lançado em encounter e gera billing_item vinculado                                   | —    |
| SPC-005 | Frontend — listagem de serviços | Frontend           | S       | SPC-002             | Página `/services` existe com listagem, busca e filtros                                                    | —    |
| SPC-006 | Testes de módulo                | QA + Backend       | M       | SPC-002             | Suite de testes cobre CRUD, validação de preço, integridade com billing                                    | —    |

### Bloco 2: Setores (Estrutura Hospitalar)

| ID      | Area                      | Owner              | Esforço | Dependencia         | Criterio de aceite                                                                                    | Nota          |
| ------- | ------------------------- | ------------------ | ------- | ------------------- | ----------------------------------------------------------------------------------------------------- | ------------- |
| SPC-010 | Estrutura hospitalar      | Backend + Data     | M       | AUD-008-02          | Entidades `sector` e `bed` existem no DB; sector tem code, name, kind; bed tem sectorId, code, status | **Concluído** |
| SPC-011 | CRUD de setores/leitos    | Backend + Frontend | M       | SPC-010             | API suporta CRUD de sectors e beds; status de bed: available, occupied, maintenance                   | **Concluído** |
| SPC-012 | Integração com internação | Backend            | M       | SPC-010, AUD-006-01 | Inpatient stay vincula a bed_id; transferência atualiza status dos beds                               | **Concluído** |
| SPC-013 | Bedmap operacional        | Backend + Frontend | L       | SPC-011             | Mapa visual de leitos por sector com status e ocupação atual                                          | **Concluído** |
| SPC-014 | Testes de módulo          | QA + Backend       | M       | SPC-011             | Suite cobre CRUD, transições de status, integridade com inpatient                                     | **Concluído** |

**SPC-010 Implementado em 2026-03-27:**

- **Modelo canônico criado:**
  - `sectors` tabela: id, account_id, code, name, kind (clinic|surgery|icu|isolation|observation|other), active, timestamps
  - `beds` tabela: id, account_id, sector_id (FK→sectors), code, name, status (available|occupied|maintenance), supports_species, active, timestamps
  - `inpatient_stays` atualizada: novos campos sector_id, bed_id, transfer_to_sector_id, transfer_to_bed_id

- **Tipos TypeScript:**
  - `SectorId`, `BedId` (branded types)
  - `SectorSummary`, `BedSummary` interfaces

- **Contratos:**
  - `CreateSectorRequest`, `CreateBedRequest`
  - `SectorListResponse`, `BedListResponse`
  - `BedMapSector`, `BedMapBed`, `BedMapResponse`
  - `AssignBedRequest`

- **Serviços:**
  - `SectorBedService`: CRUD de setores/leitos, bedmap, assign/transfer bed, manage occupancy
  - `DatabaseSectorRepository`, `DatabaseBedRepository`

- **API Endpoints:**
  - `GET /sectors` — lista setores
  - `POST /sectors` — cria setor
  - `GET /beds` — lista leitos (opcional: ?sectorId=)
  - `POST /beds` — cria leito
  - `GET /bed-map` — mapa de ocupação por setor
  - `POST /inpatient/:stayId/assign-bed` — atribui leito a internação
  - `POST /inpatient/:stayId/transfer-bed` — transfere leito em internação

- **Frontend V2:**
  - `/sectors` — página de gestão de setores
  - `/beds` — página de gestão de leitos
  - `/bed-map` — mapa visual de ocupação de leitos
  - Navegação atualizada: grupo "Assistencial" inclui novas páginas

- **Integração com internação:**
  - `InpatientService.admit()` aceita sectorId e bedId opcionais
  - `InpatientService.assignBed()` — atribui leito
  - `InpatientService.transferBed()` — transfere leito (libera anterior, ocupa novo)
  - Bed status atualizado automaticamente em admission e discharge

- **Prova executável:**
  - Test 13 em `db-persistence.test.ts`:
    1. Cria setor UTI-VET
    2. Cria leito UTI-01
    3. Admite paciente com sector/bed
    4. Verifica bedmap com ocupação
    5. Transfere para outro leito
    6. Dá alta e verifica que leito fica disponível
    7. Persiste e verifica após restart

- **Migration:**
  - `005_sectors_beds.sql` — cria tabelas sectors, beds; adiciona colunas a inpatient_stays

### Bloco 3: Relatórios Assistenciais

| ID      | Area                      | Owner              | Esforço | Dependencia               | Criterio de aceite                                                                  | Nota |
| ------- | ------------------------- | ------------------ | ------- | ------------------------- | ----------------------------------------------------------------------------------- | ---- |
| SPC-020 | Relatório de atendimentos | Backend + Frontend | M       | AUD-004-01                | Relatório de encounters por período, status, triagem; export CSV                    | —    |
| SPC-021 | Relatório de internação   | Backend + Frontend | M       | AUD-06-01, SPC-010        | Relatório de stays por ward, duração, desfecho; export CSV                          | —    |
| SPC-022 | Relatório de triagem      | Backend + Frontend | M       | AUD-004-01                | Relatório de triagem por período, prioridade, tempo de espera                       | —    |
| SPC-023 | Relatório de prontuário   | Backend + Frontend | L       | AUD-005-01                | Timeline clínica por paciente com filtros por período e tipo de entry               | —    |
| SPC-024 | Dashboard assistencial    | Frontend + Backend | L       | SPC-020, SPC-021, SPC-022 | Página `/reports/clinical` com indicadores: atendimentos/dia, tempo médio, ocupação | —    |

### Bloco 4: Relatórios Financeiros

| ID      | Area                              | Owner              | Esforço | Dependencia      | Criterio de aceite                                                               | Nota |
| ------- | --------------------------------- | ------------------ | ------- | ---------------- | -------------------------------------------------------------------------------- | ---- |
| SPC-030 | Relatório de billing              | Backend + Frontend | M       | AUD-007-02       | Relatório de billing por período, status, encounter; export CSV                  | —    |
| SPC-031 | Relatório de consumo assistencial | Backend + Frontend | L       | SPC-004, SPC-020 | Conciliação entre encounters e billing items; mostra discrepâncias               | —    |
| SPC-032 | Relatório de inventory            | Backend + Frontend | M       | AUD-007-03       | Relatório de estoque por item, movimentação, alerta de mínimo                    | —    |
| SPC-033 | Dashboard financeiro              | Frontend + Backend | L       | SPC-030, SPC-031 | Página `/reports/financial` com indicadores: receita, inadimplência, conciliação | —    |

## Ordem Recomendada de Execução

### Prioridade P0 (destrava integração)

1. SPC-001 — Base comercial (serviços no DB)
2. SPC-010 — Estrutura hospitalar (wards/beds no DB)
3. SPC-004 — Integração serviços → billing

### Prioridade P1 (funcionalidade operacional)

4. SPC-002 — CRUD de serviços
5. SPC-011 — CRUD de setores/leitos
6. SPC-012 — Integração setores → internação
7. SPC-020 — Relatório de atendimentos
8. SPC-030 — Relatório de billing

### Prioridade P2 (completude e UX)

9. SPC-003 — Catálogo mínimo
10. SPC-005 — Frontend serviços
11. SPC-013 — Bedmap operacional
12. SPC-021 — Relatório de internação
13. SPC-022 — Relatório de triagem
14. SPC-031 — Relatório consumo assistencial

### Prioridade P3 (polimento)

15. SPC-023 — Relatório prontuário
16. SPC-024 — Dashboard assistencial
17. SPC-032 — Relatório inventory
18. SPC-033 — Dashboard financeiro
19. SPC-006 — Testes serviços
20. SPC-014 — Testes setores

## Dependências com AUD

- SPC-001, SPC-010 dependem de AUD-008-02 (persistência real)
- SPC-004 depende de AUD-007-02 (conciliação billing)
- SPC-012 depende de AUD-006-01 (internação)
- SPC-020 depende de AUD-004-01 (encounters)
- SPC-021 depende de AUD-006-01 (internação)
- SPC-023 depende de AUD-005-01 (prontuário)
- SPC-030 depende de AUD-007-02 (billing)
- SPC-031 depende de AUD-007-02 e SPC-004
- SPC-032 depende de AUD-007-03 (inventory)

## Regra de Progresso

- Um item só deve mudar para Concluído quando houver:
  1. Código integrado no módulo correspondente
  2. Validação executável (teste ou demonstração manual)
  3. Reflexo honesto em /docs
- Relatórios devem gerar CSV ou equivalente exportável
- Dashboard deve ser acessível via rota no frontend oficial

## Próximos Passos Imediatos

1. Validar rotas manuais no domínio após republish
2. Executar `pnpm typecheck && pnpm build` para garantir build limpo
3. Iniciar SPC-001 (base comercial) e SPC-010 (estrutura hospitalar) em paralelo
4. Sincronizar com AUD-007-02 para integração billing
