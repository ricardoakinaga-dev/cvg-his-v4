# 410 - Matriz de Aderencia Documental

**Objetivo:** detalhar o que esta aderente, parcialmente aderente ou desalinhado entre a documentacao e a implementacao atual.

> **Snapshot histórico:** esta matriz registra a fotografia documental de 11/08/2026. As divergências de índice, migrations, SPA e README apontadas aqui foram reconciliadas parcialmente na execução de 15/08; para a situação atual, use [`2026-08-15-relatorio-auditoria-e-correcoes.md`](2026-08-15-relatorio-auditoria-e-correcoes.md).

## 1. Indice e governanca da pasta `docs`

| Item | Evidencia | Avaliacao | Nota |
| --- | --- | --- | ---: |
| `docs/README.md` organiza faixas principais | O indice descreve `010-099`, `100-199`, `200-299`, `700-790`, `900+` | Estrutura boa como espinha dorsal | 80 |
| `docs/README.md` representa o diretorio real | Existem 245 arquivos `.md` no topo de `docs/`; apenas 85 sao mencionados no indice | O indice nao funciona como mapa real do diretorio | 35 |
| Separacao entre principal, historico e apoio | O proprio README menciona `docs2` e apoio complementar, mas muitos artefatos historicos continuam no topo | Parcial | 45 |
| Unicidade de numeracao | Ha duplicidade em `130`, `134`, `135`, `136`, `137`, `138`, `51`, `88`, `89`, `90`, `91` | Risco de colisao semantica e citacao ambigua | 25 |

## 2. Arquitetura alvo

| Documento | Evidencia no codigo | Avaliacao | Nota |
| --- | --- | --- | ---: |
| `112-target-architecture.md` | O repositorio tem `apps/api`, `apps/worker`, `apps/spa`, `packages/modules`, `packages/shared`, `infra`, `tools`; `apps/web` ficou como legado de transicao | Alta aderencia estrutural, com migracao de frontend em andamento | 90 |
| `113-module-contracts.md` | Modulos expoem `src/index.ts`; ha centralizacao de contratos em `packages/shared/contracts/src/index.ts` | Boa aderencia, apesar de simplificar parte da realidade | 84 |
| `123-phased-execution-plan.md` | As fases batem com os dominios implementados no monorepo | Documento segue util como mapa conceitual | 82 |

## 3. Frontend

| Documento | Evidencia no codigo | Avaliacao | Nota |
| --- | --- | --- | ---: |
| `114-frontend-architecture.md` descreve `apps/web` como canonico | Historicamente correto, mas a trilha oficial atual migrou para `apps/spa` | Registro historico; nao deve mais orientar deploy | 40 |
| `114-frontend-architecture.md` diz que a navegacao usa hash routing | `apps/web/src/index.ts` usa path routing server-side como `/owners`, `/patients`, `/encounters` | Desatualizado tecnicamente no frontend legado | 20 |
| `114-frontend-architecture.md` lista poucos modulos/paginas | O frontend real agora esta em `apps/spa` com shell e rotas premium mais amplas | Cobertura historica insuficiente para o estado atual | 30 |
| `apps/web/README.md` | Chama o app de frontend oficial, mas descreve apenas um subconjunto de fluxos e ainda diz que nao ha testes web automatizados | Parcialmente correto; desatualizado em cobertura e testes | 45 |

## 4. Backend

| Documento | Evidencia no codigo | Avaliacao | Nota |
| --- | --- | --- | ---: |
| `115-backend-architecture.md` | `apps/api/src/server.ts` realmente atua como transporte HTTP e composition root | Boa aderencia conceitual | 85 |
| Profundidade operacional do backend documentado | O documento nao detalha amplitude de rotas nem modulos ativos | Bom como principio, fraco como espelho do construido | 70 |
| `apps/api/README.md` status = skeleton | `apps/api/src/server.ts` ja implementa 58 rotas/metodos | Fortemente desatualizado | 18 |

## 5. Worker

| Documento | Evidencia no codigo | Avaliacao | Nota |
| --- | --- | --- | ---: |
| `116-worker-architecture.md` | O worker de fato processa tarefas assincronas e usa correlacao | Boa aderencia conceitual | 80 |
| `apps/worker/README.md` status = skeleton | `apps/worker/src/index.ts` executa bootstrap, loop, processamento e shutdown | Desatualizado | 30 |

## 6. Instalacao e deploy

| Item | Evidencia | Avaliacao | Nota |
| --- | --- | --- | ---: |
| `130-instalacao-publicacao-cvg-his-v2-real.md` identifica a trilha canonica correta | Bate com `README.md`, `apps/*`, `infra/systemd/*` e `docker-compose.v2.yml` | Correto no eixo principal | 90 |
| Migrations descritas no fluxo principal | O documento manda aplicar apenas `001-004`, mas existem `001-016` em `packages/shared/database/src/migrations/` | Incompleto para banco atual | 35 |
| Portas sugeridas para API e Web | O documento vivo `130-instalacao-publicacao-cvg-his-v2-real.md` esta alinhado ao `docker-compose.v2.yml`: API externa `3000` e Web externa `3001` | Divergencia operacional saneada na trilha viva | 90 |
| Artefatos operacionais citados existem | `docker-compose.v2.yml`, `.env.v2.example`, `infra/docker/Caddyfile.v2`, `infra/systemd/*`, `infra/scripts/cutover-v2.sh` existem | Alta aderencia | 92 |
| Script de cutover aplica schema completo | `infra/scripts/cutover-v2.sh` aplica apenas migrations `001-004` | Incompleto frente ao banco documentado e ao restante das migrations | 40 |

## 7. Modulos implementados vs modulos documentados

### Modulos implementados no codigo

- `access-control`
- `attachments`
- `audit`
- `auth`
- `billing`
- `diagnostics`
- `discharges`
- `encounters`
- `inpatient`
- `inventory`
- `medical-records`
- `notifications`
- `owners`
- `patients`
- `prescription-executions`
- `scheduling`
- `staff`
- `surgery`
- `triage`
- `users`

### Cobertura documental identificavel

| Modulo | Situacao documental | Nota |
| --- | --- | ---: |
| `owners` | Forte cobertura historica na serie `01-31` sob nome "tutores" | 80 |
| `patients` | Boa cobertura historica na serie `34-46` | 78 |
| `encounters` | Cobertura parcial na serie `48-53` | 72 |
| `medical-records` | Cobertura parcial na serie `55-58` | 70 |
| `diagnostics` | Cobertura parcial na serie `65-67` | 68 |
| `inpatient` | Cobertura parcial na serie `69-71` | 68 |
| `prescription-executions` | Cobertura forte na serie `73-86` | 82 |
| `discharges` | Cobertura relativamente forte na serie `88-97` | 78 |
| `auth` | Cobertura conceitual em `108-authentication-strategy.md` | 60 |
| `audit` | Cobertura conceitual em `110-audit-trail-strategy.md` e `120-audit-model.md` | 65 |
| `access-control` | Sem trilha modular clara e atualizada | 25 |
| `attachments` | Referenciado por composicao, sem trilha propria clara | 30 |
| `billing` | Implementado no codigo, pouca trilha documental operacional dedicada | 35 |
| `inventory` | Implementado no codigo, documentacao dispersa | 40 |
| `notifications` | Implementado no codigo, pouca documentacao viva dedicada | 30 |
| `scheduling` | Implementado no codigo, sem trilha modular clara | 25 |
| `staff` | Implementado no codigo, sem trilha modular clara | 20 |
| `surgery` | Implementado no codigo, sem trilha modular clara | 20 |
| `triage` | Implementado no codigo, sem trilha modular clara | 25 |
| `users` | Implementado no codigo, sem trilha modular clara | 20 |

**Leitura:** a cobertura documental dos modulos existe, mas e claramente desigual. A pasta `docs/` representa melhor os dominios "classicos" do roadmap do que o estado integral do monorepo atual.

**Atualizacao de leitura:** a arquitetura de frontend foi deslocada para `apps/spa`; qualquer menção a `apps/web` nesta matriz deve ser lida como registro historico do estado anterior.

## 8. Testes e validacao

| Item | Evidencia | Avaliacao | Nota |
| --- | --- | --- | ---: |
| Faixa `700-790` e recente | Documentos datados de 2026-03-31 e escritos com diagnostico do estado real | Muito boa aderencia como retrato atual | 88 |
| Existencia de camada de testes | Foram encontrados testes em `apps/api`, `packages/modules`, `tests/integration`, `e2e/tests` | A documentacao nao esta vendendo algo inexistente | 85 |
| Operabilidade imediata do gate `test:critical` | A suite sobe, mas falhou por credenciais de PostgreSQL (o ambiente de teste requer `DATABASE_URL_TEST`) | Parcial; existe, mas nao e autooperavel em qualquer ambiente | 60 |
| Consistencia entre docs e scripts raiz | `package.json` possui `test`, `test:all`, `test:critical`, `test:e2e`, `release:check` | Boa aderencia | 80 |

## 9. Achados criticos

### Critico 1: frontend documentado abaixo do escopo realmente entregue

Risco:

- leitores concluem que o frontend cobre apenas dashboard, owners, patients, encounters e prontuario
- o codigo real entrega bem mais superficie funcional

Impacto:

- baixa confianca na documentacao
- onboarding mais lento
- falsa impressao de incompletude do produto

### Critico 2: guia de deploy e cutover nao acompanha todo o conjunto de migrations legadas

Risco:

- ambiente novo fica abaixo do schema esperado pelo repositorio atual
- deploy aparentemente "correto" pode sair incompleto

Impacto:

- falhas de runtime
- divergencia entre homologacao e producao
- dificuldade de suporte

### Critico 3: taxonomia editorial da pasta `docs/` esta frouxa

Risco:

- historico, prompts, auditorias, plano operacional e documentacao vigente competem no mesmo nivel

Impacto:

- leitura ambigua
- excesso de documentos candidatos a "fonte de verdade"
- perda de rastreabilidade

## 10. Recomendacao de classificacao editorial

| Classe | Definicao | Acao recomendada |
| --- | --- | --- |
| Viva | Documento deve refletir o comportamento atual do sistema | Atualizar continuamente |
| Referencia | Documento explica arquitetura, principios ou contratos estaveis | Manter e revisar pontualmente |
| Historica | Documento registra fase, auditoria, rollout ou decisao encerrada | Mover para subpasta de historico ou sinalizar no topo |
| Operacional | Documento usado para deploy, cutover, rollback e suporte | Endurecer com checklist e validade |
| Prompt/execucao assistida | Documento voltado a automacao assistida, nao ao leitor humano geral | Separar do topo de `docs/` |

## 11. Nota final da matriz

**Aderencia documental consolidada: 57/100.**

Ha valor real e reaproveitavel na documentacao, mas ainda falta curadoria editorial, consolidacao de fonte de verdade e atualizacao dos pontos onde o codigo ultrapassou os documentos.
