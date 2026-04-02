# Legacy Inventory

## Escopo do inventario

Este inventario cobre o legado do repositorio atual por leitura estrutural e documental. A avaliacao considera principalmente:

- `apps/his-api`
- `apps/his-web`
- `apps/his-worker`
- `packages/db`
- `packages/rbac`
- `packages/audit`
- `packages/contracts`
- `packages/domain`
- `packages/config`
- `packages/events`
- `docs/docs2`

Observacao: o repositorio ja contem alguns caminhos de V2 em paralelo, mas eles nao sao tratados aqui como baseline do sistema; o inventario abaixo foca a base legada operacional.

## Visao geral da estrutura atual

### Apps legadas

- `apps/his-api`: backend principal, com grande concentracao de modulos de negocio e infraestrutura.
- `apps/his-web`: frontend principal, com telas para recepcao, pacientes, tutores, encounters, internacao, financeiro, estoque, exames e notificacoes.
- `apps/his-worker`: worker assíncrono para filas e rotinas auxiliares.

### Packages legados

- `packages/db`: schemas e migrations com ampla cobertura de entidades.
- `packages/rbac`: estrutura de papeis e permissoes.
- `packages/audit`: artefatos relacionados a auditoria.
- `packages/contracts`: contratos compartilhados, ainda sem segmentacao clara por bounded context.
- `packages/domain`: utilitarios de dominio, mas sem ownership suficientemente claro no novo alvo.
- `packages/config` e `packages/events`: apoio transversal tecnico.

### Documentacao legada relevante

- `docs/docs2`: historico de planos, checklists, auditorias e fases anteriores.
- `README.md` e arquivos avulsos de operacao/deploy: refletem evolucao incremental do sistema atual.

## Mapa de responsabilidades percebidas

### Nucleo assistencial observado

- `owners`, `patients`, `encounters`, `clinicalNotes`, `documents`, `patientContext`

### Governanca e identidade

- `auth`, `rbac`, `audit`

### Operacao assistencial avancada

- `inpatient`, `beds`, `wards`, `bedmap`, `handovers`
- `medicationOrders`, `medicationSchedules`, `medicationAdministrations`, `medicationLogs`, `medicationDoses`
- `exams`

### Administrativo e consumo assistencial

- `encounterBilling`, `encounterFinancial`, `payments`, `cash`, `products`, `services`, `stock`

### Suporte e operacao

- `notifications`, `reports`, `metrics`, `system`, `integration`, `search`

## Pontos fortes do legado

- cobertura funcional ampla para um HIS veterinario
- presenca de encounter como eixo clinico central
- auth e RBAC ja operacionais
- tenant scoping recorrente
- trilhas de autoria e auditoria em varias partes
- schemas ricos que ajudam a descobrir regras ja operadas

## Pontos frageis

- excesso de responsabilidade concentrada no backend legado
- fronteiras de modulo irregulares
- coexistencia de varios modulos correlatos sem delimitacao clara
- risco de confundir conceito clinico com conceito administrativo
- documentacao historica distribuida e de temporalidade heterogenea

## Sobreposicoes e confusoes de dominio

- `encounterBilling` e `encounterFinancial` sugerem sobreposicao entre faturamento por episodio e contas administrativas
- `products`, `services`, `stock`, `payments` e `cash` coexistem sem uma narrativa unica de bounded context
- `clinicalNotes`, `documents` e `patientContext` parecem capturar camadas diferentes do prontuario, mas sem um modelo unico explicito
- `appointments` e `agendaConfig` se relacionam com fluxo assistencial, mas o limite com recepcao e encounter precisa redesenho

## Inconsistencias de nomenclatura

- termos clinicos, operacionais e administrativos aparecem misturados no mesmo nivel
- alguns nomes representam capacidade de negocio, outros representam mecanismo tecnico
- ha naming no legado que reflete historico de implementacao, nao linguagem ubiqua alvo

## Acoplamentos ruins observados

- backend concentrando modulos demais sem particionamento alvo do V2
- documentacao e estrutura do codigo nem sempre convergem para o mesmo modelo mental
- risco de frontend e backend compartilharem assumptions nao formalizadas em contrato
- risco de schema fisico antigo ser usado como definicao conceitual do futuro sistema

## Gargalos arquiteturais percebidos

- ausencia de fronteira alvo entre modulos clinicos e administrativos
- dificuldade de localizar ownership real de certos fluxos
- possibilidade de replicar padroes antigos apenas por estarem funcionando
- dependencia excessiva de leitura historica para entender intencao do sistema

## Conclusao do inventario

O legado e valioso como sistema real e fonte de aprendizado, mas nao oferece fundacao suficientemente limpa para continuar crescendo como V2. O diagnostico confirma a necessidade de reconstruir com fronteiras claras e uso seletivo das regras ja descobertas.
