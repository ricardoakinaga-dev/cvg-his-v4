---
document_status: current
document_kind: baseline
effective_date: 2026-09-26
owner: Liderança técnica CVG-HIS
review_cycle: on-round-completion
---

# Auditoria completa do sistema — CVG-HIS V4 (rodada 2)

[Plano executivo](2026-09-26-plano-executivo-rodada-2.md) ·
[Roadmap](2026-09-26-roadmap-rodada-2.md) ·
[Backlog](2026-09-26-backlog-rodada-2.md) ·
[Controles de privacidade, autenticação e pagamentos](security/PRIVACY_AUTH_AND_PAYMENT_CONTROLS.md)

**Data:** 26 de setembro de 2026
**Objeto:** workspace local, HEAD `ad2f0373` mais as alterações não commitadas, incluindo as correções desta data
**Nota geral:** **70/100** (média ponderada 70,17)
**Parecer:** **não apto para produção com a topologia atual.** As correções de 26/09 resolveram os cinco defeitos bloqueantes da rodada anterior. Esta auditoria, porém, encontrou um problema arquitetural mais grave: a API mantém os dados das contas em cache por processo, sem invalidação entre réplicas, e o Helm de produção sobe 3 réplicas.

Esta auditoria substitui a [auditoria preliminar da mesma data](2026-09-26-auditoria-programa.md) e a [baseline de 21/09](2026-09-21-auditoria-profunda-repositorio.md), que ficam como histórico.

> A nota mede maturidade demonstrada, não "percentual pronto". Itens **P0** bloqueiam a produção independentemente da média.

---

## 1. Método e evidências executadas

1. Gates reexecutados depois de todas as correções.
2. Varredura do monorepo inteiro por padrões de risco: SQL dinâmico, SSRF, representação monetária, fuso horário, cache por processo, locks, PII em logs, índices, política de senha, infraestrutura.
3. Verificação manual de cada achado candidato. Achados não comprovados foram descartados e estão listados na seção 5.
4. Captura de tela da interface nova (alergia) em tema claro, tema escuro e largura de celular.

| Gate | Resultado |
|---|---|
| `pnpm typecheck` | ✅ 0 erros |
| `pnpm lint` | ✅ 0 erros, 158 avisos |
| `pnpm test:root` | ✅ 3.155 passaram, 3 skipped |
| Testes SPA (Vitest) | ✅ 1.962/1.962 |
| API, worker e contratos (`node:test`) | ✅ |
| Integração PostgreSQL (prescrições, MFA, RLS/LGPD, Pix, rotas, auditoria) | ✅ 71/71 |
| `validate:openapi` · `validate:rls` · `complexity:check` · `docs:validate` | ✅ |
| E2E SPA (Playwright, Chromium, PostgreSQL e Redis dedicados) | ⚠️ 434 passaram, 2 falharam ([seção 6](#6-e2e-de-navegador)) |

---

## 2. Quadro de notas

| # | Item | Nota | Antes (25–26/09) | Peso | Motivo da variação |
|---|---|---:|---:|---:|---|
| 1 | Arquitetura e modularidade | **64** | 76 | 3 | Cache por processo como fonte de leitura (achado A1) |
| 2 | Qualidade de código | **71** | 70 | 3 | Regras compartilhadas novas; 158 avisos; arquivos gigantes |
| 3 | Build, tipagem e dependências | **90** | 90 | 2 | Sem mudança |
| 4 | Testes automatizados | **84** | 82 | 6 | Regressões novas; E2E completo executado |
| 5 | API e contratos | **82** | 82 | 4 | OpenAPI documenta os novos 409 e headers |
| 6 | Banco, migrações e RLS | **87** | 87 | 6 | Sem mudança |
| 7 | Autenticação, MFA e sessão | **80** | 68 | 6 | MFA voluntário corrigido; política de senha inconsistente |
| 8 | Autorização e segurança | **83** | 84 | 6 | SSRF sólido; isolamento do cache depende dos chamadores |
| 9 | Módulos clínicos | **79** | 74 | 7 | Alerta de alergia com justificativa |
| 10 | Agenda e notificações | **55** | 55 | 4 | Lembretes ainda sem outbox |
| 11 | Faturamento, caixa e estoque | **72** | 78 | 5 | Dinheiro em ponto flutuante; dia civil em UTC (A3, A4) |
| 12 | Pagamentos | **60** | 45 | 6 | Pix idempotente; Pix real por atendimento ausente |
| 13 | Fiscal / NFS-e | **45** | 38 | 3 | Guard coerente; sem assinatura nem homologação |
| 14 | Anexos | **76** | 60 | 4 | Compensação segura |
| 15 | LGPD e privacidade | **62** | 45 | 5 | Sem falsa conclusão; falta o executor de eliminação |
| 16 | Trilha de auditoria | **78** | 75 | 3 | Cache limitado |
| 17 | Worker e eventos | **80** | 74 | 4 | Detecção de loop travado |
| 18 | Frontend, UX e acessibilidade | **75** | 76 | 5 | Mensagens de erro da API em inglês na tela (A5) |
| 19 | Observabilidade | **60** | 58 | 4 | Alertas ainda sem destino |
| 20 | Deploy, infra e backup | **58** | 62 | 5 | Sem NetworkPolicy nem HPA; restore real ausente |
| 21 | CI/CD e release | **50** | 55 | 2 | Árvore suja maior; 80 commits sem push |
| 22 | Documentação | **62** | 58 | 2 | Documentos atualizados; volume ainda excessivo |
| 23 | **Consistência multi-réplica** (novo) | **35** | — | 5 | Achado A1 |
| | **Geral** | **70** | 69 | 100 | Σ(nota × peso)/100 = 70,17 |

Leitura das notas: **85+** maduro · **70–84** bom com ressalvas · **55–69** lacunas relevantes · **< 55** insuficiente para produção.

---

## 3. Achados novos

### A1 — Cache por processo sem invalidação entre réplicas · **P0**
- **Evidência:** o boot carrega os dados de todas as contas em `Map`s de 29 módulos (`apps/api/src/runtime.ts:1488-1515`). As leituras síncronas `patients.getOrThrow`, `owners.getOrThrow` e `encounters.getOrThrow` consultam só esse cache (`packages/modules/patients/src/index.ts:356`, `packages/modules/owners/src/index.ts:322`). São **60 chamadas desse tipo contra 12 leituras autoritativas**. Não existe LISTEN/NOTIFY, TTL nem invalidação. O Helm de produção define `replicaCount: 3` para a API (`infra/helm/cvg-his-v2/values.prod.yaml:6`).
- **Impacto:** um paciente, tutor ou atendimento criado numa réplica não existe nas outras até o próximo reinício. Com o balanceamento entre réplicas, o usuário vê "não encontrado" ou dados antigos de forma intermitente. A memória cresce com o tamanho de todas as contas, e o tempo de boot cresce junto.
- **Isolamento:** como o cache guarda dados de todas as clínicas no mesmo processo e o RLS não se aplica a ele, o isolamento depende de cada chamador comparar `accountId`. Nos pontos amostrados a comparação existe, mas não há garantia estrutural.
- **Correção:** mitigação imediata com 1 réplica de API. Solução definitiva com leitura *read-through* (cache miss vai ao repositório), `getOrThrow(accountId, id)` com escopo obrigatório e invalidação por `LISTEN/NOTIFY`, ou eliminação do cache nas entidades transacionais.

### A2 — Caixa volta para o cache local quando o banco diz "nenhum caixa aberto" · P1
`findOpenRegister` (`packages/modules/cash/src/index.ts:353-365`) consulta o repositório e, se não encontra, devolve um caixa "aberto" do cache do processo. Se o caixa foi fechado em outra réplica, esta réplica continua tratando-o como aberto.

### A3 — Representação monetária mista · P1
Os módulos `financial` e `counter-sales` usam centavos inteiros. Já `billing` (`index.ts:437,640`), `cash` (`index.ts:376-417`) e `quotes` somam `number` decimal e arredondam com `toFixed(2)` ou `Math.round(x*100)/100`; nas somas de reconciliação de caixa, não arredondam. O risco é divergência de centavos entre faturamento, caixa e financeiro.

### A4 — Dia civil em UTC nos relatórios e no "hoje" · P1
O contrato `docs/engineering/REPORT_DATE_SEMANTICS.md` fixa os dias civis em UTC, e o "hoje" da venda de balcão usa `new Date().toISOString().slice(0,10)` (`packages/modules/counter-sales/src/index.ts:1445`). Numa clínica em São Paulo (UTC−3), o movimento das 21h às 23h59 entra no dia seguinte nos relatórios diários e no fechamento.

### A5 — Mensagens de erro da API em inglês chegam ao usuário · P1
O SPA exibe `body.message` cru (`apps/spa/src/services/api.ts:305-308`). A API tem 245 `ValidationError` com texto em inglês. A captura desta auditoria mostrou "Field 'encounterId' must be a valid UUID" na tela de prescrições.

### A6 — Política de senha inconsistente e hashes legados · P1
O setup do administrador exige 12 caracteres (`apps/api/src/routes/setup-routes.ts:22`); a criação de usuários, 8 (`users-staff-quotes-routes.ts:57`). Não há verificação contra senhas vazadas. Hashes SHA-256 sem sal ainda são aceitos e só migram quando o usuário faz login (`packages/modules/users/src/index.ts:69-71`).

### A7 — Infraestrutura de cluster incompleta · P1
O chart Helm não tem `NetworkPolicy` nem `HorizontalPodAutoscaler`. O securityContext, os limites de recurso e as PDBs estão corretos.

### A8 — Tabela de retenção promete o que o sistema não faz · P1
`DATA_PROVIDER_RETENTION` (`packages/modules/lgpd/src/service.ts:144+`) declara `anonymize_after_window`, e esse texto vai para o pacote de exportação entregue ao titular. Pela decisão de produto de 26/09, não há expurgo automático; o texto precisa refletir "retido enquanto houver relacionamento ou obrigação legal". O prazo de 20 anos para o prontuário veterinário também precisa de validação jurídica.

### A9 — Script de E2E depende de ferramentas e portas fixas · P2
`infra/scripts/run-e2e-spa.sh:118-119` chama `rg` (ripgrep), que não está instalado neste host, e o `docker-compose.e2e.yml` fixa as portas 5434 e 6381. Nesta auditoria, a execução padrão falhou porque outra stack ocupava a 5434.

### A10 — Assinatura de webhook sem timestamp · P2
A assinatura `X-Webhook-Signature` (`packages/modules/webhooks/src/index.ts:586-588`) cobre só o corpo. Sem timestamp assinado, o receptor não consegue rejeitar replays antigos; o `Idempotency-Key` ajuda, mas não substitui.

### A11 — Exportação LGPD de titular inexistente devolve pacote vazio · P2
`POST /lgpd/export` não verifica se o `subjectId` existe na conta, então devolve um pacote vazio em vez de 404.

## 4. Achados anteriores: situação

| Achado | Situação |
|---|---|
| B1 Pix sem idempotência | ✅ corrigido |
| B2 LGPD com falsa conclusão | ✅ corrigido; executor pendente (decisão de produto registrada) |
| B3 Compensação de anexos | ✅ corrigido |
| B4 MFA voluntário ignorado | ✅ corrigido |
| B5 NFS-e com guard incoerente | ✅ corrigido; assinatura e homologação pendentes |
| Loop do worker travado | ✅ corrigido |
| Cache de auditoria sem limite | ✅ corrigido |
| Alergia × prescrição | ✅ fase 1 entregue (alerta com justificativa) |
| Lembretes sem outbox | ⛔ aberto |
| Pix real por atendimento | ⛔ aberto |
| Alertas sem destino | ⛔ aberto |
| Restore real e RPO/RTO | ⛔ aberto |
| Código sem push e sem CI remoto | ⛔ piorou (80 commits locais; árvore com mais alterações) |
| Avisos de lint e arquivos gigantes | ⚠️ 161 → 158 avisos |

## 5. Verificado e sem defeito

Estes pontos foram investigados e **não** geram achado:
- **SQL dinâmico:** todas as consultas montadas com template usam parâmetros `$n`; não há `sql.raw`.
- **SSRF em webhooks:** o DNS é resolvido e o IP fixado na conexão; faixas privadas IPv4/IPv6 são bloqueadas, inclusive IPv4 mapeado em IPv6 (testado); redirecionamentos não são seguidos.
- **PII em logs:** o logger compartilhado sanitiza os valores; nenhum log com e-mail, CPF ou telefone foi encontrado.
- **Concorrência financeira e de estoque:** há `SELECT … FOR UPDATE` em estoque, vendas, caixa, faturamento e financeiro.
- **Imagens Docker:** usuário não-root, digest fixado, npm/pnpm removidos do runtime, sem módulos nativos incompatíveis com Alpine.
- **Exportação LGPD entre contas:** os provedores filtram por `accountId`; não há vazamento.
- **Índices por conta:** um heurístico apontou 18 tabelas sem índice iniciado por `account_id`. As amostras conferidas (`clinical_entries`) têm índice composto. Fica só como item de verificação por `EXPLAIN`.

## 6. E2E de navegador

Resultado da suíte Playwright completa, sem os testes visuais, executada contra PostgreSQL e Redis dedicados e descartáveis:

**434 passaram e 2 falharam** (436 casos, 12,3 min), com PostgreSQL e Redis descartáveis. O script padrão não rodou neste host (achado A9); a execução usou o modo de banco externo do próprio script, com um banco dedicado removido ao final.

| Falha | Causa observada | Relação com as correções de 26/09 |
|---|---|---|
| `deleted-sales-report-flow.spec.ts:72`: timeout de 90 s | Ao clicar em "Recolher menu lateral", o `div.app-layout` intercepta o evento de ponteiro. É a mesma falha do menu compacto registrada em 25/09 (achado A12) | Nenhuma: `AppLayout.vue` tem alterações anteriores a esta sessão |
| `visual-regression.spec.ts:603` (prontuário, tema escuro, desktop) | 4.943 pixels diferentes (1%) em relação ao snapshot | Nenhuma: `MedicalRecordsDetailPage.vue` foi reescrita antes desta sessão (+445/−750 linhas); falta revisar e atualizar o snapshot (A13) |

### A12 — Menu compacto intercepta cliques · P1
Com o menu lateral aberto, uma camada de `div.app-layout` impede o clique no botão de recolher. O defeito é reproduzível no E2E e bloqueia a navegação em telas compactas.

### A13 — Snapshot visual do prontuário desatualizado · P2
A diferença de 1% vem da reescrita da página, que ainda não foi revisada visualmente. O snapshot precisa ser revisado e, se estiver correto, atualizado.

## 7. Conclusão

As correções de 26/09 elevaram as áreas que estavam abaixo de 50, e nenhum defeito de integridade da rodada anterior permanece aberto. O bloqueio principal de produção passou a ser arquitetural (A1). Ele tem mitigação simples e imediata, rodar 1 réplica da API, e uma correção estrutural que deve vir antes de qualquer escala horizontal. O [roadmap](2026-09-26-roadmap-rodada-2.md) organiza essas correções, as integrações externas (Pix real, NFS-e, lembretes) e a operação (alertas, restore, CI) em ondas com critérios de saída.
