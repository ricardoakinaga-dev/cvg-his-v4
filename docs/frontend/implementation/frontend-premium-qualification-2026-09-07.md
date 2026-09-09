# Dossiê de qualificação frontend — 07/09/2026

## Parecer desta retomada

O candidato recebeu implementação e verificação bounded em várias jornadas, mas
não há base para promoção integral dos 34 FEA nem para um GO frontend. O estado
permanece `ACTIVE`; esta qualificação não atribui AAA e não substitui UAT,
revisão humana ou validação do ERP integrado.

## Controle corrente — 09/09/2026

O candidato atual está vinculado ao archive integral validado
`full-current12-20260909` (Chromium, `420/420`, 150 rotas e 300 navegações) e à
matriz crítica cross-browser `cross-browser-current5-20260909` (`72/72`,
`24/24` em Chromium, Firefox e WebKit). A recaptura Agenda
`continuity-oaR48z` passou `30/30` sem falhas e com `inputsStable=true`; o
relatório tem SHA `825d72b207610e70df94245b1d02d0875cf006d98885b2b5f1533993b3180514`.
Essas provas são `passed_bounded` locais; não promovem nenhum FEA a aceite integral.

A recaptura corrente do formulário de paciente em
`evidence/continuity-ltIKmD/report.json` passou seis combinações e 38
interações, em claro/escuro, 1440/390 e viewport CSS proxy 195×422, sem falhas
e com `inputsStable=true`. O relatório tem SHA
`158f05c96e7c47f3c5ef7dd235ab18f264be42a5cabe81bfcd3c8b190a65f513` e cobre
validação com resumo/foco, troca de `ownerId` com rascunho, falha/sucesso,
desmontagem e logout.

A recaptura laboratorial de performance mais recente está em
[`evidence/performance-current-20260909.json`](evidence/performance-current-20260909.json),
com SHA `4742bea9cd24933c1e0dc601b2c2778d3b7d988400bf12ef1b5cf0b3e63355d4`
e harness SHA `5a52ef1647141a36cfae8a746855816a96115aed39aed364823d1586040c29dc`.
O build recém-reconstruído coincide com o relatório: 494 arquivos, 3.882.751 B
e fingerprint `f97a8535841c6af7de4e7157d362ce4b069c8c26039cb378e8964fa36f0a7540`;
o entry inicial mede 253.369 B brutos/76.924 B gzip, `−16,75%` contra a meta
laboratorial de 92.406 B. As três rotas ficaram dentro dos limites propostos,
com FCP/LCP máximos de 232/232 ms em `/`, 124/124 ms em `/login` e 188/188 ms
na Agenda, zero long tasks e zero erros. A decisão segue
`HOLD_FOR_OWNER_APPROVAL`: isso é laboratório local, sem RUM/INP/CLS de campo,
rede lenta real ou participantes. O relatório canônico de 07/09 permanece
histórico; esta recaptura fica em `evidence/` para não reescrever o digest da
prova integral já validada.

A recaptura dedicada de internação/leitos foi renovada no candidato atual em
`evidence/continuity-scpRq4/report.json`: `16/16` combinações, quatro rotas,
nove interações, claro/escuro e 1440/390, sem falhas e com `inputsStable=true`.
O relatório tem SHA
`e204a048854ed627cb03a0013b6ff939cf649608de312631fe1bf10217597736` e usa o
harness SHA
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.

FEA-025 também foi recapturada no mesmo candidato: PIX
`evidence/continuity-kPxWqj/report.json` passou `4/4` e dinheiro/reversão
`evidence/continuity-oIF3nA/report.json` passou `4/4`, ambos em 1440/390 e
claro/escuro. Os testes SPA financeiros focados passaram `64/64`. Essas provas
permanecem sintéticas e bounded.

## Matriz de estado

| Entrega | Estado nesta retomada | Evidência ou lacuna principal |
| --- | --- | --- |
| FEA-001 | Parcial / HOLD integral | `frontend-baseline-2026-09-07.json` reconcilia o candidato atual: 253 registros de rota, 249 protegidos/4 públicos, 690 arquivos frontend rastreados, 163 arquivos-fonte alterados no worktree candidato, 20 artefatos de evidência (sendo um protocolo não observado), assets, estados e evidências FE-01/02/03; ainda faltam baseline humana das tarefas, reconciliação semântica de todos os achados e validação real |
| FEA-002 | Protocolo pronto / HOLD integral | `task-baseline-2026-09-07.json`/`.md` definem cinco tarefas, cinco perfis, massa sintética, conteúdo obrigatório, sucesso/erro e campos de medição; ainda não há participantes, observações ou métricas humanas e evidência sintética não substitui UAT |
| FEA-003 | Parcial / HOLD integral | `evidence/performance-current-20260909.json`: build fingerprintado corrente com 494 arquivos/3.882.751 B, HTML inicial 76.924 B gzip (−16,75% contra o alvo de 92.406 B), gzip observado no transporte, Chromium/FCP/LCP laboratorial, Agenda autenticada com massa controlada e orçamento por rota registrados; sem INP de campo, RUM, rede lenta ou participantes |
| FEA-004 | PASS no contrato exercitado / HOLD integral | `button-navigation-EcT9XZ/report.json`: `createWebHistory`, requests documentais, back/forward, teclado, Alt/Ctrl/Meta/Shift, auxclick, popup, externo, download, disabled e submit em 4 combinações; stories adaptam explicitamente o default slot; consumidores completos e revisão/UAT ainda abertos |
| FEA-005 | Parcial / HOLD integral | `continuity-ltIKmD` passou seis combinações e 38 interações, cobrindo dirty state, troca de `ownerId`, falha/sucesso, desmontagem e logout; sem persistência durável, touch, zoom 200% nativo, leitor de tela real, duplicidade e UAT |
| FEA-006 | Parcial / HOLD integral | Busca própria da Recepção com concorrência e invalidação; contratos reais e aceite de domínio permanecem abertos |
| FEA-007 | Parcial / HOLD integral | Foco/scroll de rota usa identidades estruturais, `data-scroll-key`/título semântico para regiões locais, deadline bounded, MutationObserver e invalidação de frames; `continuity-oaR48z` passou 30/30 na Agenda e `continuity-wBIaTG` 8/8 em Owners/Users, enquanto os testes focados de `useRouteFocus` + `DataTable` passaram 116/116. A matriz atual `cross-browser-current5-20260909.manifest.json` passou 72/72 nos três engines; todos os consumidores, guard-order completo, dispositivos e UAT permanecem abertos |
| FEA-008 | Parcial / HOLD integral | `AppointmentsListPage.vue` caiu para 3.086 linhas e `PatientDetailPage.vue` para 4.075, ambos abaixo dos limites do manifesto, com helpers de apresentação/grade extraídos e 6 testes novos; `complexity:check` corrente também confirma `server.ts` em 8.333/8.335 e `ReportWorkbenchPage.vue` em 3.142/3.186, ambos dentro do orçamento. Consumidores, revisão visual e UAT continuam abertos |
| FEA-009 | Parcial / HOLD integral | `cvgPulseTokens` e `cvgPulseLightTheme`/`cvgPulseDarkTheme` mapeiam o CSS atual sem quebrar exports legacy; teste focalizado 41/41, pacote 48/48 e typecheck passaram; Storybook/Chromium `cvg-pulse-tokens-OklWS0` passou 12/12 em 390/768/1440, ambos os temas e movimento normal/reduzido, com prancha preenchida, números tabulares e contraste mínimo 5,52:1 light / 10,85:1 dark; licença/fallback da fonte, dispositivos, UAT e aceite integral ainda faltam |
| FEA-010 | Parcial / HOLD integral | Família `DsButton`, matriz Storybook e navegação têm contrato bounded exercitado; tipos públicos foram alinhados e 13 testes Vue cobrem variantes, loading, acessibilidade e links, mas estados completos, revisão visual e UAT ainda não foram encerrados |
| FEA-011 | Parcial / HOLD integral | `continuity-ltIKmD` cobre paciente em seis combinações, 1440/390 e viewport CSS proxy 195×422, nos dois temas, com resumo/foco de erro, draft, loading/falha, ações e logout; zoom nativo, touch/teclado virtual, leitor de tela, duplicidade e UAT continuam pendentes |
| FEA-012 | PASS_WITHIN_CONTRACT bounded / HOLD integral | `continuity-tdvKP0` passa 4/4 na matriz Users/DataTable (populado, no-results, 503/retry e 403), com foco em limpeza de rows/contadores e sanitização; autorização/RLS real, todos consumidores, confirmação operacional e UAT continuam ausentes |
| FEA-013 | Bounded pass / HOLD integral | `continuity-UNgisr` e `continuity-w8uHmC` passam 6/6 cada, com botão bloqueado, exatamente um alerta global, zero local visível, 2/0 rAF e proxy CSS 200%; os 18 consumidores têm inventário e a regressão integral `full-current12-20260909` fechou 420/420 após a correção do adapter de auditoria transacional. Ainda faltam cada consumidor no browser, timeline em dispositivo real, provider/reversão, participantes, UAT e aprovação global |
| FEA-014 | Parcial / HOLD integral | `continuity-oaR48z` confirma a composição atual da Agenda em cinco aliases, 1440/768/390, claro/escuro e 30/30 interações; a suíte visual corrente passou 29/29 sem atualização de snapshot. Após Lista → Semana → Dia, o documento mantém a largura da viewport e a grade semanal usa rolagem local; revisão visual humana, contraste medido, touch/zoom e UAT permanecem abertos |
| FEA-015 | Parcial / HOLD integral | `clinicalLabels` e inventário de strings alinham Tutor/Paciente/Atendimento/Agendamento/Agenda/Esteira em seis superfícies; focused 113/113 e typecheck SPA passam; validação com OP, inventário completo e UAT permanecem abertos |
| FEA-016 | Parcial / HOLD integral | O estudo Blender permanece conceitual. A tela de login usa os assets oficiais `hospital-logo-poster.webp`/`hospital-logo-loop.mp4`; `evidence/login-assets-20260908.json` passou 24/24 em 390/1440, claro/escuro, movimento normal/reduzido e rede normal/Save-Data/2G, mantendo poster e omitindo MP4 sob `Save-Data`/2G. Fonte/workflow/seed, revisão visual humana, loop e rede real, contraste, integração e UAT continuam abertos |
| FEA-017 | Parcial / HOLD integral | O manifesto `reception-current-20260909.manifest.json` vincula `continuity-21Izko`, que passou 4/4 em 1440/390, claro/escuro, `inputsStable=true` e zero falhas: busca/resultados priorizados, fila, invalidação de resposta antiga e seleção que conserva `ownerId` em `/appointments/new`. Busca/seleção completa sem rolagem em 390×844, comparação com baseline FE-04, operação, participantes e UAT permanecem abertos |
| FEA-018 | Parcial / HOLD integral | O manifesto `duplicate-current-20260909.manifest.json` vincula `continuity-rXZgpi`, que passou 8/8 em 1440/390, claro/escuro, com conflitos de duplicidade de tutor e paciente, draft preservado, abertura do existente e proteção de navegação; `continuity-ltIKmD` renova a troca de `ownerId` com rascunho e o descarte explícito. Persistência/RLS, touch/zoom nativos, leitor de tela e UAT continuam pendentes |
| FEA-019 | Parcial / HOLD integral | `evidence/continuity-oaR48z/report.json` passou 30/30 na Agenda, com cinco aliases, 1440/768/390, claro/escuro, disclosure mobile por teclado, abertura do formulário e retorno; a suíte visual corrente passou 29/29 sem atualização de snapshot. Conflito/fuso/virada de dia em homologação, revisão visual humana, touch/zoom, leitores reais e UAT permanecem abertos |
| FEA-020 | Condicional no piloto / aberto | `continuity-gTtJmg`: 4/4, consulta na URL, teclado, retorno contextual e limpeza; ranking, permissões de produção e UAT ausentes |
| FEA-021 | Condicional no piloto / HOLD integral | `continuity-Tt90aV`/`dashboard-current-20260909.manifest.json`: 20/20, cinco perfis, dois temas e 1440/390, prioridade de função, shell/persistido/paleta e bloqueio de acesso exercitados; sem backend/RLS, papéis de produção, UAT ou aceite integral |
| FEA-022 | Condicional no piloto / HOLD integral | `continuity-2Iakc3`: 4/4, troca de paciente limpa contexto clínico e retorno preserva filtro; contexto de lista é serializado na URL; sem touch/zoom 200%, leitor de tela, backend/RLS, métricas humanas ou UAT |
| FEA-023 | Parcial / HOLD integral | `continuity-VCI5AU`: 4/4 em 390/1440 e claro/escuro, com falha inicial preservando draft e segunda tentativa confirmada após releitura. Create/update/archive agora validam ID, contexto, tipo, título/conteúdo, versão e estado arquivado; archive faz leitura explícita incluindo arquivados; histórico longitudinal e diagnóstico têm confirmação contextual; concorrência invalida spinners obsoletos. Sem replay/browser-to-DB, RLS, persistência durável ou UAT |
| FEA-024 | Condicional no piloto / HOLD integral | A recaptura corrente `continuity-scpRq4` passou 16/16 em quatro rotas, nove interações, dois temas e 1440/390, com draft/status/contexto, refresh/403, cards e reflow mobile; touch, zoom, leitor de tela, backend/RLS, UAT e operação clínica continuam ausentes |
| FEA-025 | Parcial / HOLD integral | As recapturas correntes `continuity-kPxWqj` (PIX, 4/4) e `continuity-oIF3nA` (dinheiro/reversão, 4/4) cobrem, respectivamente, POST `202`/pending → settled/QR/idempotência e POST `201`/motivo obrigatório/reversão/idempotência/refresh-reload, em claro/escuro e 1440/390; os testes SPA financeiros focados passaram `64/64`. A fatia PIX permanece somente em solicitação/polling conforme o contrato: não há endpoint seguro para confirmação/reversão manual e nada foi inventado no SPA. Ainda faltam provider/RLS/DB integrado, replay transacional em banco, reconciliação operacional, contrato PIX de confirmação/reversão e UAT |
| FEA-026 | Parcial / HOLD integral | `continuity-ohbW3A`: 8/8 fresco, claro/escuro e 1440/390, com seleção explicitamente limitada à página/consulta, limpeza ao filtrar, unidades críticas sem truncamento e rascunho temporário sem mutação de estoque; mutação batch/persistência e UAT ausentes |
| FEA-027 | Condicional no piloto / HOLD integral | `continuity-v2XVM5`: 20/20 em Pedidos, Laudos, Hemogramas, Urina e Bioquímico, claro/escuro e 1440/390; Pedidos/Laudos cobrem loading/error/retry/vazio intrínseco/populado/no-results/403, modal/anexo, foco e rolagem por teclado; analítico cobre valores estruturados com parâmetro/valor/unidade/referência, solicitado/coletado/concluído, referências indisponíveis com retry e 112 checks Axe sem violações; hardening de refresh concorrente em Pedidos coberto por teste unitário; backend/RLS/persistência/permissões reais, toque/zoom/leitor de tela e UAT ausentes; crítica fresh final não devolveu veredito antes do timeout |
| FEA-028 | Condicional no piloto / HOLD integral | `continuity-udvwWj`: 16/16 em estoque, contas a pagar, contas a receber e Pagamento Antecipado, claro/escuro e 1440/390, com exportação ancorada no `executionId` exibido, execução não duplicada durante export, snapshot server-side, catálogo de colunas capturado e CSV browser comparado byte-a-byte ao artefato server-side (BOM UTF-8, vírgula, LF sem newline final), estado sem resultados com limpeza e falha recuperável; testes cobrem reconciliação/AbortSignal e limites UTC; browser continua sintético e backend/RLS/UAT permanecem abertos; crítica fresh final não devolveu veredito antes do timeout |
| FEA-029 | Parcial / HOLD integral | `continuity-4SjGml`: 4/4, 403 focalizado sem vazio contraditório, retry, Axe 0 em forbidden/resumo/usuários/grupos/setores/matriz, tabs com roving tabindex, estados textuais Sim/Não, foco de edição, tabelas móveis acessíveis e overflow zero; catálogo concorrente usa geração contra resposta obsoleta, seleção da matriz é normalizada quando o alvo desaparece no refresh, controles ficam bloqueados durante refresh e rollback composto é testado; autorização real, papéis distintos, backend/RLS e UAT ausentes; crítica fresh final não devolveu veredito antes do timeout |
| FEA-030 | Condicional no escopo medido / HOLD integral | `continuity-tQnwrY` cobriu 56/56 em Chromium e o manifesto atual `cross-browser-current5-20260909.manifest.json` passou 72/72 em Chromium/Firefox/WebKit; sem leitor de tela real, device/touch, zoom 200%, contraste manual exaustivo ou UAT |
| FEA-031 | Parcial / HOLD integral | Build/typecheck atual passou com 809 módulos/487 precaches; a recaptura `evidence/performance-current-20260909.json` confirma 494 arquivos/3.882.751 B, entry 253.369 B/76.924 B gzip, FCP/LCP e long tasks dentro dos alvos laboratoriais; não há INP/CLS de campo, RUM, rede lenta ou aprovação formal do budget |
| FEA-032 | Parcial / HOLD integral | SPA atual passou `vue-tsc --noEmit`; os testes focados de Agenda/pacientes/AppPageHeader passaram 124/124, o módulo de auditoria passou 29/29 e o E2E integral serial `full-current12-20260909` fechou 420/420. A matriz cross-browser corrente fechou 72/72; a prova permanece bounded local e não substitui revisão humana, dispositivos/AT físicos, RUM ou UAT |
| FEA-033 | Pendente | UAT com cinco tarefas, métricas humanas, ata e revisão visual independente final ainda não existem |
| FEA-034 | HOLD / sem GO | Dossiê consolidado aqui; dependente de FEA-033 e dos gates `AAA-044/045/047`, sem encerramento dos tickets |

## Auditoria de freshness dos recortes browser — 08/09/2026

Uma checagem read-only comparou o mapa `after` de cada `continuity-*/report.json`
referenciado neste dossiê com os hashes dos mesmos arquivos no candidato atual.
Os recortes que permanecem fingerprintados no candidato são `continuity-yynX5t`,
`continuity-2sYsuE`, `continuity-DbZefI`, `continuity-wBIaTG`, `continuity-am2VhG`
e `continuity-k4TnSC`, além do relatório corrente de assets de login. A recaptura
Agenda `continuity-oaR48z` substitui o recorte anterior para FEA-007/014/019.
Os demais recortes `continuity-*` citados aqui são classificados como
`supporting/stale` quando há divergência de hash; eles preservam histórico e
cobertura, mas não sustentam sozinhos um PASS do código atual. A prova corrente
global bounded é o archive validado `full-current12-20260909`.

## Recaptura integral mais recente — 09/09/2026

O runner serial mais recente foi executado contra PostgreSQL nativo descartável
e Redis DB15, com migrações/seed reais, Chromium serial e inventário completo.
O archive validado é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current12-20260909/`:
Chromium 145.0.7632.6, `420/420` casos, zero skipped/unexpected/flaky, 150
rotas e 300 navegações. O validator confirmou
`inventoryDigest=c6e03c4ac969ce9a30fb0e4d04042c79a34ff3050c9aa0e34bf997f55dbf3a4c`.
Os hashes são `results.json=a20defbbe0611beb87e317e5d381f2002afe8c02ebfdffdd1d096cf207b259f2`,
`metadata.json=e4ab9914821b6642c4cff9d41801ceec76c49bdc9e27398756714b562aec12b`,
inventário `27a6ad63fc4aeb6a608d5d805d06d96fd61e2a47dfdc0dc85f12810da867a682` e
discovery `8a2e786ca1db6c0dc24c2aa52491bd06bc61e2754bb26d3b7acf31b8a3a9cdd6`.
O source digest é
`83503af1fc2f6e51c1a0171310937eb037974809149815f52a5a7865e55cad21`, com
2.295 arquivos fingerprintados. A base exata foi removida após verificação de
sessões; os 20 keys gerados no Redis DB15 foram removidos e o DB ficou em zero;
as portas E2E 3111/3112/6381 ficaram livres. É evidência `passed_bounded` local,
sem promoção dos gates humanos, de produção, dispositivos/AT, RUM/INP/CLS,
budget, provider PIX/reversão ou aceite dos 34 FEA.

## Recaptura integral anterior após correção do fingerprint e do adapter de auditoria — 09/09/2026

O runner serial foi repetido após `sourceState` passar a excluir explicitamente
evidências geradas em `docs/frontend/implementation/evidence/`, evitando que
novos relatórios alterem o fingerprint da própria execução. Após a correção do
`DatabaseAuditRepository`, que passou a gravar no mesmo client transacional do
caso de uso, o archive daquela rodada foi
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current9-20260909/`:
Chromium 145.0.7632.6, `420/420` casos aprovados, zero skipped/unexpected/
flaky, 150 rotas e 300 navegações. O validator confirmou inventário válido e
`inventoryDigest=70d76051c123fbcf5efa472b654d4d10433f34ce3557a8425f01c1e6cd9fcbeb`.
Os hashes são `results.json=4d85db418d225c05883b3c2aa75ad19de54ad870310a5e197f46bb2d1f21b317`,
`metadata.json=34e052fdc61e07d9898b7e0d7a7a971eb5d650ed368b787ac654587540ec0428`,
inventário `2ec71e9f586011639942bf4751d2035397ca5a411870f52d29105e52248bc9ea` e
discovery `c96ac89de35780704fb92d37ff3369764b5153cfe7f7089a4efdc36c3d1ad91f`.
O source digest daquela rodada é
`4c6423e2d8979b77876f482eed544d9acebb8e42d2e5afdb5a68afa2651c32b7`, com
2.295 arquivos fingerprintados.

O validator independente foi executado novamente contra os quatro artefatos e
passou. O ajuste foi verificado por `node --test
scripts/usability-test-inventory.test.mjs
scripts/usability-evidence-archive.test.mjs` (`40/40`). A base PostgreSQL
descartável foi removida após verificação de sessões; o Redis DB14 ficou em
zero e as portas E2E 3111/3112/6381 ficaram livres. A classificação é
`passed_bounded` local e não substitui UAT/participantes, revisão humana,
dispositivos/AT físicos, RUM/INP/CLS de campo, budget, provider PIX/reversão ou
aceite integral dos 34 FEA.

## Recaptura cross-browser corrente — 09/09/2026

O manifesto [`cross-browser-current5-20260909.manifest.json`](evidence/cross-browser-current5-20260909.manifest.json)
vincula o candidato atual aos dois specs críticos. Chromium, Firefox e WebKit
passaram `24/24` cada, total `72/72`, sem skipped/unexpected/flaky. O archive
é `artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/cross-browser-current5-20260909/`,
com `results.json` SHA `b4e36cbd714294ea3433a251396a1049cfcff03bb958e74db9299235562629a2`
e `metadata.json` SHA `685c6d35481a407bd0f1e6db897b72d0329d81d279f902b505833ed7476b8b03`.
O source digest é `83503af1fc2f6e51c1a0171310937eb037974809149815f52a5a7865e55cad21`,
com 2.295 arquivos; PostgreSQL descartável, Redis DB15 e portas E2E foram
removidos/verificados. A classificação é
`PASS_WITHIN_CONTRACT` somente para esta matriz, não para os 34 FEA.

## Recaptura recepção e conflito de duplicidade — 09/09/2026

O manifesto [`reception-current-20260909.manifest.json`](evidence/reception-current-20260909.manifest.json)
vincula `continuity-21Izko`, que passou `4/4` em `/reception`, claro/escuro e
1440/390, sem falhas e com `inputsStable=true`. A fila e os resultados ficaram
no fluxo inicial; a seleção produziu
`/appointments/new?ownerId=synthetic-owner-1`, e a busca mais recente pôde ser
limpa sem reintroduzir resposta antiga. O manifesto
[`duplicate-current-20260909.manifest.json`](evidence/duplicate-current-20260909.manifest.json)
vincula `continuity-rXZgpi`, que passou `8/8` em tutor/paciente, nos mesmos
temas e larguras, preservando draft, oferecendo manter o rascunho e exigindo
descarte explícito para navegar ao existente. Os relatórios têm SHAs
`7be5c799a1809f1b207bbb49309896d2a4782662239527598dffa480552e5318` e
`2cb149b150de8357b3d6317537dcb3bddcfbb6edb46caecdffbbc948232968ba`, ambos
com harness SHA `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
São provas bounded sintéticas; operação real, persistência/RLS, touch/zoom,
leitor de tela e UAT permanecem abertos.

## Críticas independentes fresh — 09/09/2026

Dois críticos I1 foram executados em contexto novo (`fork_context=false`),
read-only e sem acesso aos pareceres/documentos anteriores. Singer verificou
FEA-027/028/029/030 e Hypatia verificou FEA-009/014/016/019/021/030/033. Ambos
retornaram `BLOCKED`, sem aprovação ou score, porque a sessão externa não
alcançou rotas protegidas: `/auth/login` respondeu `401` e as rotas privadas
redirecionaram para `/login?next=...`. Os artefatos sanitizados são
[`critic-functional-current-20260909.json`](evidence/critic-functional-current-20260909.json)
e [`critic-visual-current-20260909.json`](evidence/critic-visual-current-20260909.json);
os probes brutos ficaram fora do repositório em `/tmp`, com hashes registrados
nos relatórios. A auditoria de mutação confirmou que não houve edição de fonte,
documentação, estado, banco, Redis ou portas pelos críticos. O bloqueio não
invalida as provas sintéticas bounded existentes, mas impede promovê-las como
aprovação independente até haver credenciais/fixture de UAT.

## Recaptura dashboard por função mais recente — 09/09/2026

O manifesto [`dashboard-current-20260909.manifest.json`](evidence/dashboard-current-20260909.manifest.json)
vincula a recaptura `continuity-Tt90aV` ao candidato atual. A matriz passou
`20/20` combinações em cinco perfis (Recepção, Enfermagem,
Médico-veterinário, Financeiro e Administração), claro/escuro e 1440/390, sem
falhas e com `inputsStable=true`. O recorte exercitou prioridade da função,
destino autorizado, shell/persistidos, command palette, notificações e estados
de acesso; os nove testes unitários de `DashboardPage` também passaram.
SHA do relatório: `653f599105e807514afe925c2690596585d74f95610fba8f2bc24f9a43110cb3`;
harness: `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
É evidência `PASS_WITHIN_CONTRACT` bounded: não prova papéis/RLS de produção,
touch/zoom nativos, leitor de tela, métricas humanas, UAT ou aceite integral.

## Recaptura Agenda/contexto mais recente — 09/09/2026

O relatório [`continuity-oaR48z/report.json`](evidence/continuity-oaR48z/report.json)
passou `30/30` linhas, sem falhas e com `inputsStable=true`, nos cinco aliases
da Agenda, claro/escuro e 1440/768/390. O recorte exercitou deep link, retorno
e reload do contexto estrutural, limpeza explícita do texto livre após reload,
cards de semana/dia ativáveis por Enter/Espaço, drawer com restauração de foco,
prioridade mobile e overflow local. SHA do relatório:
`825d72b207610e70df94245b1d02d0875cf006d98885b2b5f1533993b3180514`; o
harness tem SHA `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
As capturas desktop/mobile foram inspecionadas pelo Lead como evidência visual;
isso não é sign-off independente. O recorte usa respostas sintéticas e não
prova backend, persistência, touch/zoom nativos, leitor de tela ou UAT.

## Recaptura formulário de paciente mais recente — 09/09/2026

O relatório [`continuity-ltIKmD/report.json`](evidence/continuity-ltIKmD/report.json)
passou seis combinações e 38 interações em `/patients/new`, claro/escuro,
1440/390 e viewport CSS proxy 195×422, sem falhas e com `inputsStable=true`.
Foram exercitados o resumo de validação com foco no primeiro campo inválido,
troca de `ownerId` com rascunho, falha de persistência mantendo os campos,
sucesso sem confirmação de saída, desmontagem/desregistro e logout condicionado.
SHA do relatório:
`158f05c96e7c47f3c5ef7dd235ab18f264be42a5cabe81bfcd3c8b190a65f513`; o
harness é o mesmo `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
As capturas foram inspecionadas pelo Lead; o proxy estreito não prova zoom
nativo, touch, teclado virtual, leitor de tela, backend/RLS ou UAT.

## Evidência atual

- FEA-001: [`frontend-baseline-2026-09-07.json`](frontend-baseline-2026-09-07.json)
  foi gerado pelo [`capture-frontend-baseline.mjs`](../../../scripts/capture-frontend-baseline.mjs)
  contra o worktree atual. O relatório registra HEAD, hash do status, hashes
  scoped comparados ao snapshot histórico, 253 registros de rota (249
  autenticados, 4 públicos, 21 redirects), contratos, 690 arquivos frontend,
  163 alterações scoped, 88 assets declarados, estados e vinte artefatos de
  evidência (um `PROTOCOL_ONLY`)
  correntes. FE-01/02/03 estão indexados como reproduções bounded; a
  classificação integral de todos os achados, a baseline humana e os serviços
  reais permanecem lacunas explícitas.
- Harness browser sintético: `browser-continuity.mjs`, SHA
  `247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`,
  `inputsStable=true` nos relatórios finais desta retomada.
- FEA-003: [`performance-lab-2026-09-07.json`](performance-lab-2026-09-07.json)
  registra três execuções por `/`, `/login` e
  `/appointments?agendaDate=2026-09-07&agendaView=week` no build de produção,
  Chromium 145, 1440×900/DPR1, inventário de 492 arquivos, 253.272 B brutos/
  76.875 B gzip no HTML inicial, Agenda autenticada com duas marcações
  sintéticas e FCP/LCP laboratorial. O gzip foi observado via Resource Timing
  no servidor local e o inventário recebeu fingerprint SHA-256
  (`b3641b09…3c6f12`). O orçamento
  por rota foi explicitado e ficou dentro do alvo proposto; a decisão formal
  continua em HOLD_FOR_OWNER_APPROVAL. O relatório separa explicitamente laboratório de campo
  e não inventa INP/RUM.
- FEA-004: [`button-navigation-EcT9XZ/report.json`](evidence/button-navigation-EcT9XZ/report.json)
  passou 4/4 em Chromium, claro/escuro e 390/1440: `createWebHistory` com zero
  requests documentais em rota interna, `page.goBack/page.goForward`, Enter/Espaço,
  Alt/Ctrl/Meta/Shift e auxclick preservados, clique com Control em popup real,
  `target="_blank"`, URL externa efetiva, download, destino removido quando
  disabled e `type=button` sem submit acidental. O fixture é de contrato, não
  substitui todos os consumidores,
  serviços reais ou UAT.
- Storybook do design system: [`storybook-dsbutton-20260907/report.json`](evidence/storybook-dsbutton-20260907/report.json)
  passou o build 10.3.5 e a abertura real da story Primary no Chromium, com o
  texto `Primary Button` renderizado por default slot e sem erros de página.
- Agenda: `continuity-A6VXry/report.json`, 30/30 em `/appointments`,
  `/agenda`, `/agendamentos`, `/atendimento/agenda` e
  `/atendimento/atendimentos/agenda`, claro/escuro e 1440/768/390; as quatro
  interações exercitadas cobrem retorno/reload contextual, superfície nativa
  semanal com Enter e superfície nativa diária com Espaço, restaurando o foco
  após o drawer. A prova também confirma uma única trilha de página, ausência
  do contexto duplicado do shell e um único grupo KPI operacional; depois de
  alternar Semana/Dia, mede largura documental estável e rolagem local da grade;
  captura o
  drawer aberto nos três viewports e confirma que o texto livre fica somente
  em memória e é removido no reload.
- FEA-013: `apps/spa/src/composables/successRedirect.ts` centraliza os 18
  redirects de sucesso que antes aguardavam 900–1500 ms. O contrato usa uma
  janela consistente de 360 ms em movimento padrão e zero atraso relacionado a
  movimento quando `prefers-reduced-motion: reduce` está ativo; o teste
  `successRedirect.test.ts` passou junto dos testes de paciente, atendimento e
  agendamento (98/98). Isso comprova o helper e seus consumidores migrados,
  mas não substitui observação manual, device/cross-browser ou UAT.
- PIX corrente: `continuity-kPxWqj/report.json`, 4/4 em claro/escuro e 1440/390;
  interação confirmou POST `202`, `pending_dispatch`, chave de idempotência,
  refresh explícito, `settled` e QR renderizado. As respostas são sintéticas e
  não comprovam provider, DB, RLS ou persistência de produção.
- FEA-025 cash reversal corrente: `continuity-oIF3nA/report.json`, 4/4 em claro/escuro
  e 1440/390, sem erros de página ou overflow documental. O fluxo carrega o
  recebimento confirmado, bloqueia confirmação sem motivo, captura o POST `201`
  com `Idempotency-Key`, mostra estorno confirmado, atualiza o resumo financeiro
  e recupera o último recibo com metadados de reversão após refresh e reload. A
  suíte focalizada Encounter/serviço passou 35/35 e a rota API 11/11. O fixture
  é sintético: provider, RLS, replay transacional em banco e reconciliação
  continuam pendentes.
- FEA-026: `continuity-ohbW3A/report.json`, 8/8 em Estoque e Compras, claro/
  escuro e 1440/390. A seleção anuncia página/consulta, usa estado misto,
  limpa ao alterar a consulta e não cria ações para linhas invisíveis; a compra
  permanece um rascunho temporário declarado, com unidades `ampola`, `pacote` e
  `frasco 250 mL` legíveis. Lagrange fez a crítica fresh e classificou o recorte
  `PASS_WITHIN_CONTRACT`, sem S1/S2; os testes focalizados de inventário/compras
  passaram 27/27 e o `DataTable` 25/25. A prova não inclui mutação batch
  persistida, backend/RLS, touch/zoom nativos, leitor de tela nem UAT.
- FEA-028: `continuity-VF7bbr/report.json`, 12/12 fresh em claro/escuro e
  1440/390, com filtros `dateFrom`/`dateTo`/`search` preservados na URL e no
  retorno, execução server-side, exportação CSV auditada com indicação UTC,
  falha recuperável, vazio e retry. A tabela larga usa rolagem local com setas
  no viewport estreito; reconciliação/AbortSignal, execução dos subledgers
  financeiros e limites UTC também são cobertos por testes focados. O recorte
  browser continua sintético e não prova backend-to-DB ou UAT.
- FEA-021: `continuity-ipMcm8` passou 20/20 em 5 perfis × 2 temas ×
  1440/390; o teste inclui menus filtrados, links persistidos, paleta e
  ausência de Agenda em finance. O guard em `router/index.ts` bloqueia rota
  privada sem regra ou sem permissão, e a auditoria local encontrou 247 rotas
  privadas canônicas com regra explícita.
- FEA-022: `continuity-2Iakc3` passou 4/4 em 1440/390 e claro/escuro,
  cobrindo troca de identidade clínica, remoção de contexto obsoleto, estado
  esparso acionável e retorno com filtro de tutor.
- FEA-023: `continuity-VCI5AU` passou 4/4 em 1440/390 e claro/escuro,
  cobrindo anexos sanitizados, quarantine, download apenas após URL confirmada,
  falha de save sem perda do draft e confirmação posterior do ID criado na
  releitura. A correção também cobre chaves estáveis em create/update/archive,
  releitura autoritativa de arquivamento, locks de atendimento fechado,
  histórico longitudinal do paciente e anotação diagnóstica; `continuity-CDimfF`
  passou 4/4 na troca de contexto do detalhe do paciente.
- A11y: `continuity-0VvVeH`, 56 combinações em Chromium, 320/375/390/768/1024/1280/1440, claro e
  escuro, `prefers-reduced-motion`, zero violações Axe.
- Regressão SPA: 205 arquivos e 1.779 testes; typecheck SPA passou. Os testes
  focados do contrato de navegação, Agenda e design system passaram 3 arquivos/
  108 testes. Build de produção passou; a medição atual do HTML inicial é
  367.659 B brutos / 102.488 B gzip.
- Revisões independentes anteriores: Nash manteve o piloto FEA-012 como
  condicional e o aceite integral em HOLD; Turing manteve o recorte de
  formulários como parcial/review required e FEA-011/018 em HOLD. Lovelace
  encontrou inicialmente FAIL em FEA-021 e CONDITIONAL/HOLD em FEA-023; os
  gaps de Dashboard/rota, concorrência, retry/idempotência e ordenação foram
  tratados nesta retomada. Kuhn concluiu a revisão fresca somente leitura:
  FEA-021 CONDITIONAL, FEA-022 CONDITIONAL e FEA-023 HOLD; apontou limites
  residuais de isolamento de recentes/favoritos no logout, notificações,
  restauração parcial da lista e backend/RLS/scanner/UAT. Harvey fez uma
  segunda leitura fresca de FEA-023 e apontou lacunas no arquivamento,
  histórico longitudinal e confirmação diagnóstica; elas foram tratadas com
  releitura pós-mutação, validação de ID/status/conteúdo/versão, chaves
  estáveis e guards de rota. O parecer fresco de Meitner foi concluído como
  HOLD, não aprovação: encontrou necessidade de confirmação
  autoritativa do arquivamento, identidade exata em update, metadados/contexto
  nas confirmações diagnósticas e proteção contra corrida de spinners; essas
  salvaguardas foram implementadas e cobertas pelos testes focados. Permanecem
  lacunas de backend/RLS, persistência durável, UAT e contrato Pix completo.
- O crítico fresco Averroes revisou o estado pós-correções e concluiu Agenda
  `conditional`, PIX `HOLD` e rodada `HOLD`, sem aprovação global. Ele não
  encontrou P0/P1/P2 funcional residual na Agenda; apontou que seu snapshot de
  evidência PIX estava anterior ao rerun e registrou como P2 a affordance de
  elegibilidade financeira incompleta. Essa affordance foi corrigida depois,
  com bloqueio fail-closed para cobrança aberta, saldo integral e item; os
  relatórios `continuity-5CUlRx`/`continuity-z4HHAW` foram então regenerados.
  A conclusão permanece limitada à natureza sintética da prova e às lacunas de
  provider/RLS/DB/UAT.
- O crítico fresh-context final McClintock concluiu a rodada como `HOLD`, sem
  PASS/AAA/GO global. Ele confirmou os recortes bounded de Agenda e PIX, mas
  apontou P1 na semântica de no-show para itens potencialmente ligados à fila,
  P1 server-side no saldo financeiro integral e uma interpretação literal
  possível sobre as chaves de busca. Após esse parecer, a Agenda passou a
  chamar o contrato de no-show da fila quando há `queueEntryId`, e o comando
  PIX passou a bloquear na mesma transação a conta financeira sem pagamento e
  com saldo igual ao total; as provas focadas, build e relatórios sintéticos
  foram regenerados. A busca mantém seus controles em memória por contrato,
  mas `search`/`clientSearch` não são serializados na URL. Permanece uma
  apontou P2 na semântica do card focável com controles internos. O follow-up
  substituiu essa combinação por uma superfície `button` nativa, com ações
  operacionais fora dela, e a nova prova Chromium exercita Enter/Espaço e foco
  restaurado; permanecem a validação de leitor de tela/axe manual e as
  limitações de provider/RLS/DB.
- Newton, na crítica fresh-context somente leitura posterior, classificou
  FEA-003 como `HOLD` por orçamento ainda pendente de aprovação e ausência de
  evidência de campo, e FEA-004 como `PASS` dentro do contrato exercitado.
  O laboratório agora observa gzip no transporte e fingerprinta o `dist`; as
  stories adaptam explicitamente o `children` ao default slot e a Agenda
  captura o drawer aberto em claro/escuro e 1440/390. Isso não altera o aceite
  global.
- O teste PostgreSQL da nova guarda não pôde executar no runner atual: o banco
  explícito `cvg_his_v2` recusou `TRUNCATE accounts` por permissão. Isso deixa a
  validação transacional server-side pendente de um banco de teste autorizado;
  não é evidência de aprovação nem de falha do produto.
- E2E browser-to-database real: a execução atual terminou com API unhealthy
  após `ECONNREFUSED 127.0.0.1:5433`; o processo caiu para memória e
  `productionReady=false`. Isso não é evidência de produto e está detalhado em
  [real-e2e-blocker-2026-09-07.md](real-e2e-blocker-2026-09-07.md).

## Decisão de promoção

Recomendação: manter o candidato em validação, sem GO frontend e sem alterar
nenhum FEA para `DONE`. Próximos bloqueios objetivos: disponibilizar PostgreSQL
e repetir E2E real sem fallback; executar UAT e revisão visual independente;
completar pagamento Pix/reversão e demais contratos de domínio; fechar os gates
globais e obter parecer dos responsáveis.

## Atualização da retomada — FEA-008/009/013/015

Esta atualização substitui somente as contagens e recortes descritos acima;
mantém o estado global `ACTIVE/HOLD` e não transforma evidência bounded em
aceite integral.

- **FEA-008:** a lógica de apresentação da Agenda foi extraída para
  `apps/spa/src/pages/appointments/agendaPresentation.ts`, com getters de
  fonte explícitos para itens, blocks e profissionais. O detalhe de paciente
  recebeu a fronteira correspondente em
  `apps/spa/src/pages/patients/patientDetailPresentation.ts`. Os hotspots
  ficaram em 3.086/3.110 linhas (Agenda) e 4.075/4.124 (PatientDetail), sem
  alterar o manifesto; os testes novos de apresentação passaram 6/6 e as
  suítes das duas páginas passaram. ReportWorkbench e o servidor API ainda
  excedem seus limites históricos, portanto FEA-008 segue parcial.
- **FEA-009:** o mapa `cvgPulseTokens` e os temas `cvgPulseLightTheme`/
  `cvgPulseDarkTheme` apontam para os anchors reais de `variables.css`,
  mantendo os exports legacy azul/slate/Inter. O teste focalizado passou 41/41,
  o pacote passou 48/48 e o typecheck do design system passou. A implementação
  é candidata `REVIEW REQUIRED`: não há ainda prancha preenchida, medição de
  contraste por componente, confirmação de licença/disponibilidade da fonte ou
  revisão visual independente.
- **FEA-013:** a revisão independente fresh-context Euclid emitiu
  `PASS_WITHIN_CONTRACT`, severidade máxima S3, confiança 0,85, sem S1/S2.
  O controller agora separa `begin()` de `invalidate()`: uma resposta tardia
  após mudança de rota não consegue rearmar o timer, e um novo envio precisa
  abrir o ciclo explicitamente. O inventário cobre 18/18 consumidores legados,
  sem `setTimeout` direto nem uso direto do scheduler; a suíte focada de
  helpers/formulários passou 159/159 e a SPA completa passou 209 arquivos/
  1.805 testes. Os quatro formulários sem scheduler legado (Owner, Bed,
  Appointment e Triage) permanecem fora deste contrato bounded e são
  explicitamente tratados como redirects imediatos. Permanecem S3 de cobertura
  runtime completa por consumidor, branches Webhook/Laboratório em ambiente
  real e UAT.
- **FEA-015:** `clinicalLabels` concentra Tutor, Paciente, Atendimento,
  Agendamento, Agenda, Fila e Esteira; seis superfícies corrigem o drift visível
  de “cliente” para “tutor”, preservando identificadores técnicos e vocabulário
  financeiro. O inventário de glossário e as sete suítes direcionadas passaram
  113/113; `vue-tsc` também passou. Ainda falta validação com Operação e
  inventário integral da aplicação.

- **FEA-016:** o poster e o loop Blender foram copiados com hashes idênticos
  para `apps/spa/public/art/` e aplicados somente ao palco visual do login;
  o logo oficial continua separado no cabeçalho. A matriz Chromium
  `evidence/login-assets-20260907.json` passou 8/8 em 390/1440, claro/escuro
  e movimento normal/reduzido, sem overflow nem erros de página; com redução
  de movimento o vídeo é omitido e o poster permanece. Rede limitada, pausa
  manual, orçamento de transferência e revisão visual humana ainda são
  pendências, portanto o recorte é candidato e não aceite integral.

  **Correção posterior (08/09/2026):** a integração Blender foi revertida por
  decisão de identidade do produto. A SPA voltou ao logo institucional no
  palco (`hospital-logo-poster.webp`/`hospital-logo-loop.mp4`); os estudos
  Blender continuam preservados como material conceitual. A evidência corrente
  está em `evidence/login-assets-20260908.json`.

- **FEA-012:** o catálogo de referências de
  `LaboratoryAnalyticalWorkbench` deixou de renderizar uma mensagem isolada e
  passou a usar o contrato `DataTableFeedback` `unavailable`, com uma única
  superfície `role="alert"`, causa, retry nomeado e preservação dos valores do
  resultado selecionado. O retry é isolado da consulta principal e conserva
  registros/seleção enquanto aguarda ou falha. O teste analítico passou 24/24,
  o contrato geral do `DataTable` passou 25/25 e a crítica fresca Hilbert
  classificou o recorte `PASS_WITHIN_CONTRACT` com severidade máxima S3;
  permissões reais, indisponibilidade de serviço no browser, confirmação
  operacional e UAT seguem fora da prova.

- **FEA-011/018:** as matrizes `evidence/continuity-ty2R5x/report.json`
  (paciente, 6/6) e `evidence/continuity-JOB4sv/report.json` (tutor, 2/2)
  foram reexecutadas com o harness final em 1440×900, 390×844 e viewport CSS
  equivalente a 200% (195×422), claro/escuro. O novo recorte
  `evidence/continuity-niDPip/report.json` passou 8/8 para os fluxos de
  duplicidade de tutor/paciente em 1440/390 e claro/escuro: contrato 409
  explícito, alerta focalizado, rascunho preservado, ação de manter e
  confirmação de alterações não salvas antes de abrir o cadastro existente.
  Maxwell classificou a implementação `PASS_WITHIN_CONTRACT` com severidade
  máxima S3. O proxy de viewport não substitui zoom nativo, teclado virtual,
  touch, leitor de tela ou UAT; backend/RLS, persistência real e variações de
  erro 409 continuam fora da prova.

O baseline executável foi regenerado após estes recortes:
`frontend-baseline-2026-09-07.json` registra 253 rotas, 249 protegidas/4
públicas, 690 arquivos frontend rastreados, 148 arquivos-fonte alterados no
  worktree candidato, 88 assets e 20 artefatos de evidência. O worktree é
intencionalmente sujo e contém alterações de outros escopos; HEAD isolado não é
identidade suficiente do candidato.

### Atualização da retomada — protocolo de tarefas para FEA-002

FEA-002 agora possui o protocolo estruturado em
`task-baseline-2026-09-07.json` e a versão legível em
`task-baseline-2026-09-07.md`. O recorte define cinco tarefas prioritárias
(Recepção, Agenda, cadastro tutor/paciente, contexto clínico e cobrança PIX),
cinco perfis operacionais incluindo baixa familiaridade digital e plantão,
fixture totalmente sintético, conteúdo obrigatório, critérios de sucesso/erro,
ordem balanceada e as colunas para tempo, ativações, rolagem, erros e conclusão.

O dry-run registra zero observações humanas e não atribui métricas aos links
Chromium existentes. Recrutamento, OP, consentimento, sessões, análise de
distribuição e UAT continuam pendentes; portanto FEA-002 está com protocolo
pronto, mas permanece HOLD integral e FEA-033 continua aberto.

### Atualização da retomada — prancha CVG Pulse para FEA-009

FEA-009 recebeu a prancha canônica `CvgPulseTokens.stories.ts`, carregada pelo
Storybook real em `design-system-tokens-cvg-pulse--canonical-board`. Ela mostra
lado a lado os contratos `cvgPulseLightTheme` e `cvgPulseDarkTheme`, paleta
primitiva/semântica, inventário legado → API atual → runtime CSS, primeira página
preenchida, nomes longos com acentos, números `tabular-nums`, materiais/elevation,
movimento reduzido e decisão de UX. O board reatacha aliases e primitivas por
ilha de tema para que o dark não herde tokens light já computados no documento.

O capturador [cvg-pulse-tokens-browser.mjs](cvg-pulse-tokens-browser.mjs)
construiu o Storybook 10.3.5 (191 módulos) e executou Chromium 12/12 em
390/768/1440, claro/escuro e movimento normal/reduzido. O relatório
`evidence/cvg-pulse-tokens-OklWS0/report.json` registra overflow documental zero,
hashes estáveis e contraste medido por par: mínimo 5,52:1 no light e 10,85:1 no
dark para os pares de texto; a ação primária ficou em 6,14:1 e 13,01:1,
respectivamente. Os quatro screenshots desktop/mobile dos dois temas foram
inspecionados visualmente.

Este é um `PASS_WITHIN_CONTRACT` do recorte render/contraste, ainda sem
aprovação independente final no momento do registro. Disponibilidade/licença de
Aptos, dispositivos físicos, zoom/touch, leitor de tela, UAT e aceite integral
dos 34 FEA continuam fora da prova; FEA-009 permanece parcial/HOLD, sem DONE,
AAA ou GO.

O crítico fresh-context Dewey confirmou `PASS_WITHIN_CONTRACT`, severidade
máxima S3 e nenhum S1/S2. Ele verificou o ID real do Storybook, as duas ilhas
de tema no mesmo DOM, migration/filled page/tabular-nums/acentos nos quatro
PNGs, 12/12 combinações, mínimos 5,52:1 (light) e 10,85:1 (dark), além de
`body/document scrollWidth` igual à viewport. O probe não mede todos os
containers internos; permanecem os limites de Aptos, consumidores clínicos,
dispositivos/zoom/touch, leitor de tela e UAT.

### Continuação — FEA-025: recebimento em dinheiro e limite Pix

O detalhe do atendimento passou a exibir uma conferência financeira própria no
fechamento: recebimento confirmado, valor/ID/data, aviso de ação irreversível,
motivo obrigatório, confirmação explícita e estado final estornado. O comando
mantém uma chave de idempotência por intenção de estorno; falha transitória
preserva a chave para retry, e o resumo financeiro é relido após o commit.

O teste fresh de browser `evidence/continuity-WiebZn/report.json` passou 4/4
em Chromium, 1440/390, claro/escuro, com `inputsStable=true`, zero erros de
página e largura documental estável. Ele capturou o POST 201 sintético, motivo,
`Idempotency-Key`, alerta de sucesso, refresh do recebimento e recuperação do
estado estornado após reload por `includeReversed=true`; o motivo é nativamente
obrigatório, o foco retorna ao painel estável e o breadcrumb móvel não cria
overflow interno. Os testes focados de Encounter/serviço passaram 35/35, a rota
API 11/11 e o typecheck SPA passou. As capturas desktop/mobile dos dois temas
foram inspecionadas.

Avicenna, em revisão fresh-context somente leitura, classificou o recorte
`PASS_WITHIN_CONTRACT`, severidade máxima S3, sem S1/S2, e confirmou os quatro
achados acionáveis corrigidos. A prova não é browser-to-database: provider, RLS,
replay transacional, reconciliação e UAT continuam HOLD. O contrato de PIX segue
sem confirmação ou reversão manual no SPA, pois a API disponível expõe apenas
despacho/polling e o endpoint legado rejeita tentativas vinculadas ao atendimento.

### Continuação — FEA-026: escopo de seleção e compras

O relatório fresh `evidence/continuity-ohbW3A/report.json` passou 8/8 em
Chromium, cobrindo Estoque e Compras em claro/escuro e 1440/390, com
`inputsStable=true`, zero erros e largura documental estável. A matriz exercita
seleção por página/consulta com estado misto e limpeza ao alterar o filtro; a
interface não expõe ação batch para linhas invisíveis e mantém `ampola`, `pacote`
e `frasco 250 mL` legíveis. O rascunho de compra informa que é temporário e não
altera o estoque, evitando prometer persistência que o contrato atual não
oferece.

O recorte continua parcial/HOLD: ainda faltam mutação batch persistida,
integração real, teclado virtual/touch, zoom nativo, leitor de tela e UAT. A
revisão independente do recorte permanece necessária.

## Verificação final desta retomada

A regressão SPA completa terminou em `209` arquivos e `1.805` testes, sem falhas. O build de produção
passou com `806` módulos e `483` entradas de precache PWA; `docs:validate`, `validate:openapi`
(`413` paths/`518` schemas) e `git diff --check` também passaram. O check de complexidade continua
HOLD pelos dois hotspots conhecidos: `apps/api/src/server.ts` (`8.347 > 8.335`) e
`apps/spa/src/pages/reports/ReportWorkbenchPage.vue` (`3.205 > 3.186`). Isso não altera a
classificação bounded do FEA-009 nem autoriza PASS/AAA/GO global.

## Atualização posterior — FEA-027 e FEA-029

O recorte FEA-027 foi corrigido após a primeira crítica fresh: o
`LaboratoryAnalyticalWorkbench` distingue 403 de indisponibilidade nos três
workbenches, o browser comprova `closed=false` com exame `collected` sem valores
e ausência filtrada, e o Axe é repetido nos estados interativos. A evidência
`continuity-cFoZKq` passou 20/20 em Pedidos, Laudos, Hemogramas, Urina e
Bioquímico, claro/escuro e 1440/390, com zero erros, `inputsStable=true` e Axe
zero no render inicial, populated, modal, attachment, selected, pending,
no-results e forbidden. O veredito bounded permanece pendente da crítica fresh
final; backend/RLS/persistência/permissões reais, touch/zoom, leitor de tela e
UAT continuam fora da prova.

O FEA-029 corrente é `continuity-3NvGzS`, 4/4 em 1440/390 e claro/escuro, com
403 focalizado, retry, tabs, foco de edição, fieldsets e matriz. A crítica fresh
independente ainda está pendente. O estado global continua ACTIVE/HOLD, sem
DONE, AAA ou GO.

## Registro crítico — FEA-028

Hume classificou a revisão fresh do FEA-028 como `HOLD`, severidade máxima S2.
Os gaps registrados são ancoragem da exportação no `executionId` exibido,
timeout/reconciliação de operação persistente, intervalo de datas UTC,
contrato canônico de CSV, estado sem resultados e escopo server-side uniforme;
`continuity-UAGHyE` está stale para o código atual e deve ser regenerado após a
correção. O ticket permanece HOLD integral.

## Atualização corrente — FEA-027/028/029

Após as críticas fresh, os três recortes foram corrigidos e recapturados no
mesmo harness atual (`b7f1dac83d2298cbeb4fde043d5cb5f92265049c0dfbbda2a62a27934fe20e56`):

- FEA-027: `evidence/continuity-ObS9Nk/report.json` passou 20/20, com Axe 0
  no render inicial e nos estados de Pedidos/Laudos (populado, modal, anexo,
  sem resultados e 403) e nos três workbenches (selecionado, referências
  indisponíveis, pendente, sem resultados e 403). A matriz demonstra
  explicitamente `Solicitado`, `Coletado` e `Concluído`, retry do catálogo de
  referências e todas as capturas mobile com `scrollY=0`.
- FEA-028: `evidence/continuity-BQPOrz/report.json` passou 4/4. O export usa
  o `executionId` exibido sem novo POST, o timeout aborta a requisição e deixa
  a operação persistente em estado de reconciliação explícita, a auditoria usa
  intervalo UTC meio-aberto, o CSV local segue vírgula canônica e o vazio tem
  limpeza acionável. O recorte permanece sintético e com escopo server-side
  misto entre relatórios; a crítica fresh pós-correção ainda não o promove.
- FEA-029: `evidence/continuity-gPkUs4/report.json` passou 4/4, com Axe 0 em
  forbidden/resumo/usuários/grupos/setores/matriz, 403 sem vazio contraditório,
  `tabindex` roving, estados textuais `Sim/Não`, regiões de tabela móveis
  focáveis e overflow zero. Papéis reais, RLS, persistência e UAT continuam
  fora do contrato bounded.

Essas recapturas não alteram o parecer global: o candidato segue
`ACTIVE/HOLD`, sem DONE, AAA ou GO, e as limitações de backend real, UAT,
touch/zoom nativos e leitor de tela permanecem explícitas.

## Verificação corrente do checkpoint — 08/09/2026

Depois das correções, incluindo a guarda de geração do catálogo concorrente e
o contrato byte-a-byte de CSV, os três artefatos finais foram recapturados com
o mesmo harness, SHA
`0786242927a23457ae3dd550c6008c1a99209c0209dd3cbacb8163df653d8b11`:

- `evidence/continuity-G9h2nq/report.json`: FEA-027 passou 20/20 em cinco
  rotas laboratoriais, claro/escuro e 1440/390; a fixture de Bioquímica usa
  ALT, U/L e faixa bioquímica, e o cenário mantém solicitado/coletado/concluído,
  pendente, referência indisponível, sem resultados, 403, foco/teclado e Axe 0.
- `evidence/continuity-VF7bbr/report.json`: FEA-028 passou 12/12 incluindo
  Estoque, Contas a Pagar e Contas a Receber. O browser confirmou snapshot
  server-side, filtros aplicados como nova execução, exportação pelo mesmo
  `executionId` sem novo POST e CSV por vírgula; a falha HTTP de exportação é
  recuperável. Timeout/AbortSignal, reconciliação GET, chave idempotente e
  fronteiras UTC têm cobertura nos testes focados, não no fixture browser.
- `evidence/continuity-SZ8pvw/report.json`: FEA-029 passou 4/4 com 403 sem
  métricas falsas de zero, retry, cinco tabs com roving tabindex, fieldsets de
  vínculos, matriz com Sim/Não textual, foco de edição, Axe 0 e largura estável.

O baseline regenerado às `2026-09-08T02:39:51.055Z` registra 253 rotas,
249 protegidas/4 públicas, 690 arquivos frontend, 159 fontes alteradas, 88
assets, 20 evidências e nenhum arquivo ausente. A regressão SPA passou 209
arquivos/1.818 testes; a suíte API passou 576/576; o build de produção passou
com 806 módulos e 482 entradas de precache. O estado permanece `ACTIVE/HOLD`: a prova continua
synthetic-only, a complexidade mantém os dois hotspots acima do orçamento,
PostgreSQL/RLS/E2E browser-to-database, UAT, revisão humana, touch/zoom nativos
e leitor de tela continuam gates; não há declaração de DONE, AAA ou GO global.

## Verificação posterior à refatoração — 08/09/2026

O gate `complexity:check` passou após extrações funcionais: o workbench de
relatórios ficou com 3.142 linhas (limite 3.186) e o dispatcher da API com
8.333 (limite 8.335), sem reduzir cobertura ou escopo. `vue-tsc`, typecheck da
API, regressões completas, documentação, OpenAPI e `git diff --check` passaram.

Os artefatos browser pós-refatoração estão estáveis e sem falhas: FEA-027 em
`continuity-BaiCMr` (20/20), FEA-028 em `continuity-0gELAk` (12/12) e FEA-029
em `continuity-Ld6WtE` (4/4), com harness SHA
`0786242927a23457ae3dd550c6008c1a99209c0209dd3cbacb8163df653d8b11`. O baseline
de `2026-09-08T02:56:16.260Z` registra 253 rotas, 690 arquivos frontend, 161
fontes alteradas, 88 assets, 20 evidências e nenhum ausente. SPA 209/1.818,
API 576/576 e build 807 módulos/482 precaches. O veredito global permanece
`ACTIVE/HOLD`, pois a prova browser é sintética, a crítica fresh final ainda
é independente/pendente e os gates reais de PostgreSQL/RLS/E2E, UAT,
revisão humana, touch/zoom e leitor de tela não foram fechados.

## Verificação final com fingerprint completo — 08/09/2026

O harness agora inclui os dois módulos extraídos do workbench e
`apps/api/src/request-boundaries.ts`, com SHA
`2e47786aae669daebfc7bd04157b3516ab34f9a0543f5bcf0bcf153ad30f2a3e`. As
recapturas finais passaram sem falhas e com `inputsStable=true`: FEA-027 em
`continuity-P2Gxqb` (20/20), FEA-028 em `continuity-VQ6hGd` (12/12) e
FEA-029 em `continuity-gxcDmq` (4/4). O baseline de
`2026-09-08T03:11:50.262Z` registra 253 rotas, 249 protegidas/4 públicas,
690 arquivos frontend, 161 fontes alteradas, 88 assets, 20 evidências e
nenhum ausente. `complexity:check` passou; SPA 209/1.818, API 576/576 e
build 807 módulos/482 precaches. O estado global segue `ACTIVE/HOLD`: a
revisão fresh independente ainda não fechou e permanecem os gates reais de
PostgreSQL/RLS/E2E, UAT, revisão humana, touch/zoom e leitor de tela.

## Recaptura após hardening de catálogo e cobertura financeira — 08/09/2026

Após a normalização de `matrixSubjectId`, a ampliação da malha browser e a
inclusão de Pagamento Antecipado, os três artefatos atuais passaram com
`inputsStable=true` e o mesmo harness SHA
`0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`:

- `continuity-ExFscb/report.json`: FEA-027, 20/20; Pedidos e Laudos agora têm
  interações completas, além da continuidade analítica; 112 estados Axe foram
  executados sem violações.
- `continuity-D7FDxP/report.json`: FEA-028, 16/16; inclui Estoque, Contas a
  Pagar, Contas a Receber e Pagamento Antecipado. A exportação browser valida
  o catálogo de colunas retornado, compara todos os bytes ao artefato esperado,
  preserva BOM UTF-8, vírgulas, LF e ausência de newline final.
- `continuity-sdJGV7/report.json`: FEA-029, 4/4; 403/retry, cinco abas,
  matriz, foco, reflow e Axe 0. O teste unitário também prova que um refresh
  que remove o alvo selecionado não permite enviar o ID obsoleto ao grant.

O baseline regenerado às `2026-09-08T03:29:53.810Z` mantém 253 rotas,
249 protegidas/4 públicas, 690 arquivos frontend, 161 fontes alteradas, 88
assets, 20 evidências e nenhum ausente. O candidato permanece
`ACTIVE/HOLD` até a crítica fresh independente e os gates reais de
PostgreSQL/RLS/E2E, UAT, touch/zoom e leitor de tela.

## Recaptura final após hardening de concorrência — 08/09/2026

O refresh concorrente de Pedidos de Laboratório agora ignora respostas
obsoletas e a matriz de acesso bloqueia grants enquanto o catálogo está sendo
atualizado; os dois comportamentos têm cobertura unitária focada. As
recapturas finais usam o harness SHA
`0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`, com
`inputsStable=true` e `failures=[]`:

- `evidence/continuity-v2XVM5/report.json`: FEA-027, 20/20; Pedidos, Laudos,
  Hemogramas, Urina e Bioquímico, claro/escuro e 1440/390, 112 checks Axe sem
  violações.
- `evidence/continuity-udvwWj/report.json`: FEA-028, 16/16; Estoque, Contas a
  Pagar, Contas a Receber e Pagamento Antecipado; o CSV baixado coincide byte
  a byte com o artefato server-side, incluindo catálogo, BOM UTF-8, vírgula,
  LF e ausência de newline final.
- `evidence/continuity-4SjGml/report.json`: FEA-029, 4/4; 403/retry, cinco
  abas, matriz, foco, reflow e Axe 0.

A suíte SPA passou 209 arquivos/1.821 testes; `tsc` da API, build PWA,
`complexity:check`, documentação e OpenAPI passaram. O baseline final,
regenerado às `2026-09-08T04:27:10.563Z`, registra 253 rotas, 249 protegidas,
4 públicas, 690 arquivos frontend, 161 fontes alteradas, 88 assets, 20
evidências e nenhum ausente; o hash do status do worktree capturado coincide
com o estado atual. Os críticos fresh Kant e Einstein expiraram sem devolver
veredito e foram encerrados sem editar; a qualificação segue `ACTIVE/HOLD`, sem aprovação global,
até PostgreSQL/RLS/E2E real, UAT, touch/zoom e leitor de tela.

## Retomada Agenda e pacientes — 08/09/2026

Foi executada a etapa prioritária prevista no checkpoint. A integração browser
da Agenda passou 30/30 em cinco aliases, dois temas e 1440/768/390, cobrindo
deep link, retorno, reload do contexto estrutural, limpeza explícita do texto
livre, cards nativos com Enter/Espaço, drawer com restauração de foco e
overflow local sem overflow documental:
`evidence/continuity-NbXXN0/report.json`.

A proteção de edição de pacientes passou 36 interações (6 por viewport/tema)
em `evidence/continuity-2btgiv/report.json`, incluindo o caso anteriormente
pendente de troca de `ownerId` com rascunho sujo, continuar editando, descartar
e hidratar o novo tutor, validação/foco, falha recuperável, sucesso limpando o
dirty state, desmontagem e logout com consentimento. O viewport de 195×422
foi usado como proxy documentado de reflow/200%.

Ambos os relatórios estão sem falhas e com `inputsStable=true`, usando o
harness SHA `0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`.
Os testes focados Agenda/pacientes passaram 109/109 e `vue-tsc` passou. A
inspeção visual dos renders móveis não encontrou overflow ou regressão
material no escopo medido. A evidência continua sintética; backend/RLS,
dispositivo/touch, zoom nativo, leitor de tela, participantes e UAT continuam
fora do que foi provado.

## Atualização FEA-031 — separação do catálogo de autorização — 08/09/2026

O catálogo de permissões foi extraído para
`apps/spa/src/navigation-permission-catalog.ts`. O guard agora carrega somente
o contrato leve de rotas/aliases; a árvore visual com grupos, descrições e
palavras-chave permanece no chunk do shell autenticado. A paridade dos aliases
canônicos tem teste dedicado, e os guards/rotas passaram 39/39 no recorte.

O build PWA passou com 808 módulos e 482 entradas de precache. O laboratório
repetível em `performance-lab-2026-09-07.json` foi recapturado em Chromium 145,
três vezes por rota: o HTML inicial caiu para 349.438 B brutos / 97.936 B gzip
(contra 102.488 B antes; +5,98% sobre a baseline de 92.406 B), com gzip
observado no transporte, FCP/LCP máximos de 164 ms em `/`/`/login` e 128 ms na
Agenda, zero long task acima do limite e zero erro de página. O orçamento do
HTML permanece `HOLD_FOR_OWNER_APPROVAL`; a medição não é INP, RUM, rede lenta,
dispositivo físico, API/DB real ou campo.

O relatório browser corrente da Agenda, `evidence/continuity-zS51Zc/report.json`,
foi recapturado após incluir o catálogo no fingerprint do harness:
30/30 em cinco aliases, dois temas e 1440/768/390, `inputsStable=true` e
`failures=[]`. A inspeção do drawer mobile não encontrou regressão visual no
escopo exercitado. A regressão SPA completa passou 209 arquivos/1.822 testes.
O baseline foi regenerado às `2026-09-08T04:51:09.242Z`, com 253 rotas, 690
arquivos frontend, 162 fontes alteradas, 88 assets, 20 evidências e nenhum
ausente. O candidato continua `ACTIVE/HOLD`: FEA-031 melhorou no laboratório,
mas a promoção global ainda depende de aprovação de orçamento, campo, UAT,
backend/RLS/E2E real, touch/zoom nativos e leitor de tela.

## Atualização FEA-030 — matriz de acessibilidade recapturada — 08/09/2026

O modo `ACCESSIBILITY_CONTINUITY=1` foi recapturado depois da separação do
catálogo de autorização e do novo fingerprint do harness. O relatório
`evidence/continuity-BUIQ3Y/report.json` passou 56/56 combinações em
`/owners`, `/appointments`, `/reports/inventory` e `/access-control`, nos
breakpoints 320/375/390/768/1024/1280/1440, temas claro/escuro e
`prefers-reduced-motion`. Cada combinação passou Axe sem violações, skip-link,
foco, reflow e largura documental estável (`inputsStable=true`, falhas zero).

O relatório tem SHA `a5870e543a673ba2c285c4af636028d03372a03a42fc01b9a1315acdbb2632d7`
e usa o harness SHA
`6a95e1f1d3dd324ed60d55927f9773970aa4a0b1b26618afe73642030d9e1481`.
Os renders móveis de Tutores, Agenda e Grupos de Acesso foram inspecionados
visualmente sem regressão material no escopo observado. A evidência continua
bounded: não prova leitor de tela nativo, zoom/touch físico, contraste manual
exaustivo, outros navegadores ou UAT. O baseline foi atualizado às
`2026-09-08T04:56:52.478Z`, mantendo 253 rotas, 690 arquivos frontend,
162 fontes alteradas, 88 assets, 20 evidências e nenhum ausente.

## Atualização FEA-031 — serviços de guarda fora do entry público — 08/09/2026

Além do catálogo leve de autorização, o router passou a carregar `api.ts` e
`setup.ts` por import dinâmico somente quando a restauração/guarda precisa
deles. A política de autorização e o fluxo de setup permanecem os mesmos;
router/guards passaram 17/17 focados, `vue-tsc` passou e a regressão SPA
completa passou 209 arquivos/1.822 testes.

O build PWA passou com 808 módulos e 484 entradas de precache. O laboratório
recapturado em `performance-lab-2026-09-07.json` mediu 491 arquivos e reduziu
o HTML inicial para 346.131 B brutos / 96.440 B gzip, contra 97.936 B na rodada
anterior e 92.406 B na meta (`+4.034 B`, `+4,37%`, decisão
`HOLD_FOR_OWNER_APPROVAL`). FCP/LCP máximos foram 172/172 ms em `/`, 100/100
ms em `/login` e 132/132 ms na Agenda; long task máxima zero e erros de página
zero. O ganho é laboratorial e não infere INP, RUM, rede lenta ou campo.

A Agenda foi recapturada em `evidence/continuity-GIcnDP/report.json` (30/30,
cinco aliases, dois temas, 1440/768/390, falhas zero e entradas estáveis) e a
matriz FEA-030 em `evidence/continuity-kwfsaC/report.json` (56/56, quatro
rotas, sete breakpoints, claro/escuro, reduced motion e Axe zero). O baseline
foi regenerado às `2026-09-08T05:10:51.639Z`, com 253 rotas, 690 arquivos
frontend, 162 fontes alteradas, 88 assets, 20 evidências e nenhum ausente.
O candidato continua `ACTIVE/HOLD`; o budget ainda requer decisão do owner e
seguem pendentes backend/RLS/E2E real, UAT, touch/zoom nativos e leitor de tela.

## Atualização final FEA-030/031 — tabela privada de rotas e recaptura — 08/09/2026

Para reduzir o entry público sem alterar o contrato de navegação, as rotas
pré-autenticação foram isoladas em `apps/spa/src/router/public-routes.ts` e a
tabela privada continua em `apps/spa/src/router/routes.ts`, carregada uma única
vez quando um caminho deferred é visitado. O fallback foi mantido seguro para
aliases legados: após a hidratação, o Vue Router resolve a rota canônica/alias
e os guards normais de autenticação e permissão seguem ativos. A primeira
recaptura revelou aliases da Agenda caindo no `NotFound`; o reconhecimento foi
corrigido antes da recaptura final. O recorte de rotas passou 32/32 focados,
`vue-tsc` passou e a SPA completa passou 209 arquivos/1.822 testes.

O build PWA final passou com 809 módulos e 485 entradas de precache. O `dist`
tem 492 arquivos e 3.855.394 bytes; o HTML inicial soma 253.272 B brutos /
76.875 B gzip, contra o alvo laboratorial de 92.406 B (−15.531 B, −16,81%) e
contra 96.440 B da rodada anterior (−19.565 B). O relatório
`performance-lab-2026-09-07.json` usa o fingerprint de artefato
`b3641b09…3c6f12`, mediu FCP/LCP máximos de 172/172 ms na raiz, 84/84 ms no
login e 128/128 ms na Agenda, sem long task ou erro de página. O budget está
dentro do alvo observado, mas a decisão continua `HOLD_FOR_OWNER_APPROVAL` por
ser uma proposta laboratorial, não uma aprovação global.

A Agenda atual está em `evidence/continuity-wCJGZ6/report.json` (30/30 nos
cinco aliases, dois temas e três larguras, entradas estáveis, contexto,
drawers, foco e overflow local); a matriz FEA-030 está em
`evidence/continuity-tQnwrY/report.json` (56/56, quatro superfícies, sete
larguras, claro/escuro, reduced motion e Axe 0). Os renders móveis da Agenda,
Tutores e Controle de Acesso foram inspecionados visualmente sem regressão
material no recorte. O baseline foi regenerado às
`2026-09-08T05:40:00.520Z`, com 253 rotas, 690 arquivos frontend, 163 fontes
alteradas, 88 assets, 20 evidências e nenhum ausente. Permanecem fora do que
foi provado: backend/RLS/E2E integrado, campo/RUM/INP, zoom/touch nativos,
leitor de tela, cross-browser, participantes e UAT.

## Certificação E2E integral — 08/09/2026

Após o hardening dos fixtures e contratos de exportação, a execução integral
contra PostgreSQL/Redis reais terminou `420/420`, sem falhas, skipped ou flaky.
O inventário foi válido com 150 rotas e 300 navegações; a evidência está em
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/gauntlet-full-final-20260908T071316208Z/`, SHA
`a48d76a1835766da353f6c9618cf91d5c0fe6f87` e digest
`e624edb6623ae602988f7fa828f20bcf74226e842fc0adc54d992e24e68e2db0`.
O banco foi exclusivo, recebeu migrações 0000–0164/seed/RLS e foi descartado
ao término; o runtime reportou `productionReady=true`. Os recortes focados
passaram Agenda/billing/login `8/8`, exports `10/10` e visual `29/29`.

O laboratório de performance foi recapturado após o build atual: 492 arquivos,
3.855.614 B no `dist`, entry inicial 253.272 B/76.876 B gzip, dentro da meta
laboratorial de 92.406 B; FCP/LCP máximos 168/96/132 ms por rota e zero long
tasks/erros. A decisão continua `HOLD_FOR_OWNER_APPROVAL`, pois esse ensaio
não é RUM/INP/CLS de campo nem UAT. O estado global segue `ACTIVE/HOLD`: a
certificação E2E remove o bloqueio de infraestrutura local, mas permanecem
UAT, provider PIX/reversão de produção, métricas de campo, touch/zoom nativos,
leitor de tela e cross-browser.

## Recaptura FEA-024 — continuidade inpatient após crítica independente — 08/09/2026

A revisão fresh da FEA-024 rejeitou o recorte por quatro lacunas: rascunho de
Alta persistindo na troca de rota, repetição de contexto no detalhe,
vazios/falhas iniciais sem prova e tabela móvel fragmentada. O hardening
aplicado fecha essas lacunas bounded: troca de internação limpa modal/razão de
Alta, status e localização ficam no resumo, refresh transitório mantém o
snapshot confirmado e 403 o remove, o mapa separa erro de vazio, os cartões
navegam ao leito e a tabela móvel usa cards rotulados com largura limitada.

`INPATIENT_CONTINUITY=1` passou `16/16` combinações em
`evidence/continuity-dLYFRJ/report.json` (quatro rotas, claro/escuro,
1440×900 e 390×844), com nove IDs de interação, `failures=[]`,
`inputsStable=true` e zero erros de página. SHA do relatório:
`a20e17861cdfe14c1656248330fb75ac969ddbff07f579d94bd1880062ffe08`; SHA do
harness: `581c70cd1cd68db73a3db26fb1a3b58563548d572aa4e5a74fe7707b62cc23a8`.
O recorte focused inpatient passou `69/69`; os renders mobile foram
inspecionados visualmente sem overflow ou perda de legibilidade.

Isso é um bounded pass da FEA-024, não aprovação global. Permanecem UAT,
participantes, leitor de tela real, zoom/touch nativos, cross-browser,
RUM/INP/CLS, provider PIX/reversão produtiva e aceite integral dos 34 FEA.

## Recertificação posterior ao código — 08/09/2026

O candidato atual passou `vue-tsc`, documentação, OpenAPI (`414` paths),
complexidade e `git diff --check`; a SPA passou `209/1.830`. O build PWA passou
`809` módulos/`485` precaches e gerou `492` arquivos (`3.858.893` bytes). O
entry inicial foi `253.272` B bruto/`76.872` B gzip contra alvo `92.406` B
(`−16,81%`); a medição laboratorial observada em `2026-09-08T08:48:26.484Z`,
SHA `00848bc429e62f10ec444d573abe43463366c9bf0edd9f03017dbeb50d797304`, teve
FCP/LCP máximos `164/84/124` ms em raiz/login/Agenda, sem long task ou erro.
Decisão: `HOLD_FOR_OWNER_APPROVAL`, pois não substitui RUM/INP/CLS ou UAT.

A certificação Playwright posterior ao código passou `420/420` em Chromium 145,
sem skipped/unexpected/flaky, com PostgreSQL descartável novo, Redis nativo,
migrações `0000–0164`, seed/RLS e `productionReady=true`. Cobertura auditada:
`150` rotas/`300` navegações; SHA `a48d76a1835766da353f6c9618cf91d5c0fe6f87`,
digest `a5dad4becfc9cbb8f9daa0d2c9111dc821bd9fcd4ae9ea4489ca2e1667c5f827` e
artefato `artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/1b8b9d6c-7722-4e3b-ba4e-6ac398e2a0de/`.
O processo oficial terminou corretamente; somente o encapsulador de lifecycle
excedeu seu deadline default de 120 s antes de a suíte terminar. A base UUID da
rodada foi removida explicitamente e verificada ausente.

FEA-024 permanece bounded-pass após crítica fresh: `continuity-dLYFRJ` passou
`16/16` combinações (`failures=[]`, `inputsStable=true`) e o focused inpatient
passou `69/69`; renders mobile foram inspecionados. Não há promoção global:
UAT/participantes, provider PIX e reversão produtiva, RUM/INP/CLS, touch/zoom,
leitor de tela, cross-browser e aceite integral dos 34 FEA continuam pendentes.

## Recaptura corrente pós-zoom proxy — 08/09/2026

O proxy de zoom de `195×422` revelou uma quebra visual no breadcrumb do shell;
o ajuste responsivo em `AppLayout.vue` mantém o overline operacional e remove
apenas a trilha opcional em larguras extremas. O harness vigente
(`30185ccb4156b894da0a9b2fdaee0b86e549a74641cd5ba0933afe033b9850da`) confirmou
Agenda `30/30` (`continuity-WblISX`), pacientes `6/6` linhas com sete
interações (`continuity-FrR3ne`) e internação `16/16`
(`continuity-9TuPBV`), todos sem falhas e estáveis em claro/escuro. Os hashes
dos relatórios são, respectivamente, `54f1e0d502b1a500924852d6f4bd5a4622b2dae8663d50c9ee649cd40e514561`,
`4be892c92a18c88dee98720308c57927e2bbdea6f220577e7448c8096fd13f83` e
`79a2601a4d372ea9733c632289aa9e0f174290c36eb30e85bef4333bdbc81f4a`.

Após o ajuste, o focused `PatientFormPage+AppPageHeader` passou `67/67`, a SPA
passou `209/1.830`, `vue-tsc` passou e o build fechou em `809` módulos/`485`
precaches. Performance atual: `492` arquivos/`3.859.242` B, entry
`253.272` B/`76.877` B gzip, FCP/LCP máximos `164/88/136` ms e zero long
task/erro; relatório SHA `0cfeebfa4324f889b80ef2369635e5042498e1e213e9e9497540257fcb71ec1a`.
O budget segue `HOLD_FOR_OWNER_APPROVAL` e o E2E integral `420/420` é anterior
somente à regra extrema de `≤260px`; não é apresentado como recertificação
integral dessa alteração.

Decisão permanece `ACTIVE/HOLD`, sem promoção AAA: UAT/participantes, provider
PIX/reversão produtiva, RUM/INP/CLS, touch/zoom nativos, leitor de tela real,
cross-browser e aceite integral dos 34 FEA seguem pendentes.

## Matriz cross-browser — recorte anterior ao scheduler da FEA-013 — 08/09/2026

A fonte vigente naquele recorte passou `72/72` cenários Playwright sem skipped, unexpected ou
flaky: Chromium, Firefox e WebKit passaram `24/24` cada. A matriz cobriu seis
fluxos de acessibilidade e dezoito cenários responsivos por engine em
`320×568`, `768×1024` e `1024×768`, nos domínios owners, Agenda, prontuário,
billing, relatórios e access-control; Axe, landmark principal, skip-link e
foco por teclado passaram.

O relatório daquele recorte é `playwright-report/usability/results.json`, SHA
`86a1256dde08116df25c4f32c56dc499e098ef2b1f55f206302338c855d0233c`, concluído
às `2026-09-08T09:45:56.037Z`, com PostgreSQL descartável e Redis nativo. A
limpeza confirmou a base ausente (`remaining=0`). Trata-se de prova bounded da
fonte anterior ao scheduler atual da FEA-013 e não é usada como aprovação do
movimento dessa FEA; também não substitui leitor de tela físico, touch/zoom
nativos, participantes ou UAT. O status global permanece `ACTIVE/HOLD`, sem
promoção AAA.

## Recertificação FEA-013 após crítica — 08/09/2026

A crítica I1 fresh (`FEA-013-FC-20260908-I1`) encontrou três problemas no
candidato anterior: espera fixa de 360 ms, ausência de bloqueio explícito
durante o sucesso pendente e scroll suave incondicional no caminho de movimento
reduzido. A implementação integrada corrigiu os três pontos. O scheduler agora
usa rAF cancelável como fronteira de pintura (ou microtask em movimento
reduzido), sem `setTimeout`/`delayMs`; `successPending` bloqueia o CTA e
`begin()` recusa reenvio; o foco do erro do paciente troca para `auto` quando
`prefers-reduced-motion` está ativo.

O harness atual (`da59078ee71bacf15f5edce97465eb8efc72f43c76421d9baa55b240ad4d6ff8`)
gravou seis contextos WebM por modo e produziu:

- [`continuity-PLLoXB/report.json`](evidence/continuity-PLLoXB/report.json),
  SHA `6b4d60a6d0afcf39c5497d078d3a670275b9ab47e3e37a98414a5bf0d82f6202`,
  movimento padrão, 6/6, zero falhas, botão desabilitado durante o sucesso e
  um rAF antes do redirect;
- [`continuity-HRBnIM/report.json`](evidence/continuity-HRBnIM/report.json),
  SHA `4eeae9bebdd4976554467b496c19a4906252707376dae342e54a6dd5d80aa244`,
  movimento reduzido, 6/6, zero falhas, `prefers-reduced-motion=true` e zero
  rAF de deslocamento.

O focused passou 11/11, a SPA 211/1.852 e `vue-tsc --noEmit`; a medição atual de
performance registra entry inicial 76.878 B gzip, FCP/LCP máximos 176/88/128 ms,
zero long task/erro e decisão laboratorial `HOLD_FOR_OWNER_APPROVAL` (SHA
`f0facb40ab563eb0f6c656b71efb4a9e5bb32110c650e1038486f5999e4be820`). O
resultado é `bounded pass` apenas neste recorte: a prova cobre Patient em
runtime e os 18 consumidores por inventário estático, não uma execução browser
de cada formulário. A crítica I2 fresh (`FEA-013-FC-20260908-I2`) foi encerrada
como `UNAVAILABLE_TIMEOUT_SHUTDOWN` após janelas de espera e follow-up sem
mensagem final; nenhuma aprovação é inferida. Não há promoção global, AAA ou GO.

## Recertificação FEA-013 — flash pós-navegação e E2E nativo — 08/09/2026

O feedback de sucesso foi separado em duas fases: a mensagem genérica é
persistida antes do callback para sobreviver a reload completo; em navegação SPA,
o `router.push` dos consumidores retorna sua Promise e o alerta do shell só é
ativado depois de a navegação terminar e de um frame da tela de destino. Isso
removeu a duplicidade observada entre o alerta local do formulário e o alerta
global, sem reintroduzir `setTimeout` ou uma espera por duração. O reduced motion
continua no caminho de microtask, e a cópia persistida não contém dados de
paciente, tutor ou payload clínico.

O recorte nativo executado pelo runner oficial `infra/scripts/run-e2e-spa.sh`
passou `23/23` no Chromium: login + tutor/paciente `4/4`, webhooks `2/2`, cinco
rotinas hospitalares `5/5` e a matriz de papéis/registros `12/12`. O setup usou
PostgreSQL descartável nativo com migrações `0000–0164`, seed multi-tenant/RLS e
prova de reinicialização canônica aprovada; Redis nativo isolado também foi
limpo ao final, e a base foi removida. O relatório sanitizado do recorte é
[`success-redirect-e2e-20260908.json`](evidence/success-redirect-e2e-20260908.json).

Os testes focados do scheduler/formulário passaram `11/11`, incluindo a
resolução assíncrona da navegação, e `vue-tsc --noEmit` passou. Esta é uma
recertificação bounded do candidato atual, não o arquivo integral de 420 casos:
cross-browser, touch/zoom físico, leitor de tela real, UAT, RUM/INP/CLS e o
parecer independente fresh continuam gates externos. A crítica fresh em curso
permanece o gate de aceitação; não há promoção de FEA-013, AAA ou GO global.

## Atualização corrente — FEA-007, FEA-012 e FEA-013 — 08/09/2026

FEA-013 recebeu a correção de ciclo que faltava na recertificação anterior:
`AppLayout` mantém o alerta global como superfície única durante o redirect e
suprime o alerta local visível enquanto a mensagem está pendente/persistida; os
consumidores de formulário usam `invalidate()` no desmontagem normal depois de
`router.push`, sem apagar uma navegação bem-sucedida. A animação do shell usa
geração para impedir continuation obsoleta em A→B→C. O Chromium corrente
passou 6/6 em padrão (`continuity-UNgisr`, SHA de relatório
`6a5ef29c0d48afaae5c467de6de565d102308a2f69bd38ffb438e2ea4834147a`) e 6/6 em
reduced motion (`continuity-w8uHmC`, SHA
`1289182f3f9029c21b2f7be9b6b02a08fa54a9d72104cae89e6c54c4ece0c854`), com
`failures=[]` e `inputsStable=true`. O recorte nativo passou 23/23; a base
descartável foi removida, Redis DB 15 foi esvaziado e as portas foram
verificadas livres. Os hashes atuais dos fontes estão registrados no relatório
sanitizado `evidence/success-redirect-e2e-20260908.json`.

FEA-007 teve hardening de foco/retorno: limpeza de identidade sem chave,
coordenadas de scroll local por histórico, geração contra frames stale e espera
orientada a mutações para linhas/alvos assíncronos, com fallback bounded. A
suíte dedicada passou 32/32 e o focused combinado FEA-007/012/013 passou 98/98.
FEA-012 agora distingue estados terminais de tabela, mapeia 403 para proibido,
timeout/5xx para indisponível com retry, mantém linhas confirmadas em falha de
refresh e evita expor mensagens brutas do backend. Essa qualificação permanece
bounded à tabela e à lista de usuários; autorização/RLS real, todos os
consumidores, touch/zoom físico, leitor de tela, UAT e cross-browser posterior
ao scheduler seguem externos.

A regressão SPA corrente passou 211 arquivos e 1.852 testes, com
`vue-tsc --noEmit` aprovado. O aceite integral dos 34 FEA não é inferido:
mantêm-se `ACTIVE/HOLD`, sem `DONE`, `AAA` ou `GO`, até o veredito fresh
independente, UAT/participantes, métricas de campo e os gates financeiros e de
provider já listados no plano.

## Atualização posterior — identidade semântica de rolagem FEA-007 — 08/09/2026

O `DataTable` passou a identificar regiões locais por `scrollKey`/`caption`,
com derivação conservadora pelo título semântico do `DsCard` para tabelas
legadas. O `useRouteFocus` conserva a ocorrência dentro da chave e resolve a
coordenada por identidade antes do fallback global, evitando troca entre
tabelas reordenadas. O teste dedicado passou `59/59`; a recaptura Chromium
`continuity-8pJS03` passou `4/4`, em claro/escuro e 1440/390, com scroll/foco
restaurados, entradas estáveis e zero requests documentais.

Esse avanço reduz o risco técnico bounded do FEA-007, mas não prova todos os
módulos, engines, guards, dispositivos, leitor de tela ou UAT. O estado global
continua `ACTIVE/HOLD`.

## Recaptura cross-browser corrente — 08/09/2026

A matriz crítica foi executada novamente após o scheduler atual da FEA-013 e o
hardening de identidade do `DataTable`: `72/72`, sem skipped, unexpected ou
flaky — Chromium, Firefox e WebKit `24/24` cada. O recorte cobre seis jornadas
de acessibilidade e dezoito cenários responsivos em 320/768/1024, com
PostgreSQL descartável nativo, migrações 0000–0164, seed/RLS e Redis isolado.

O relatório congelado está em
`evidence/cross-browser-current-20260908/report.json`, SHA
`c203d8a45d287a21407c4c07bc0c322eb2854fb3960ec9320bcb3a0ac41e3755`; o
manifesto registra cleanup (`databaseRemaining=false`, Redis DB 14 vazio,
portas 3111/3112 livres). É uma prova bounded de responsividade/Axe/foco e
não substitui leitor de tela real, touch/zoom físico, UAT, RUM/INP/CLS ou
aceitação global dos 34 FEA.

## Verificação corrente pós-identidade de rolagem — 08/09/2026

O candidato atual foi recapturado depois do hardening de `DataTable` e
`useRouteFocus`. A regressão SPA passou `211/211` arquivos e `1.853/1.853`
testes; o build passou `809` módulos transformados, `vue-tsc --noEmit` e `487`
precaches PWA. `pnpm docs:validate`, `git diff --check` e a leitura dos 1.220
JSONs sob `docs/frontend/implementation` também passaram.

Uma tentativa de E2E integral foi executada contra PostgreSQL nativo
descartável e Redis isolado. Até o encerramento, 415 casos foram observados
como aprovados, mas o processo recebeu SIGTERM e terminou com código `143`
antes do fechamento do Playwright. O archive
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/2026-09-08T14-53-42-565Z/`
foi preservado; seu validator marcou a evidência como inválida por falha do
fechamento/inventário e ela não é contada como PASS. O banco temporário foi
removido, Redis DB 15 ficou com zero chaves e as portas 3111/3112 foram
verificadas livres.

Não há promoção global: o estado continua `ACTIVE/HOLD`, sem `DONE`, `AAA` ou
`GO`. Permanecem UAT/revisão humana, participantes, RUM/INP/CLS, touch/zoom
nativos, leitor de tela real, provider PIX/reversão produtiva e aceite integral
dos 34 FEA.

## Recaptura visual corrente — 08/09/2026

A suíte `e2e/spa/visual/visual-regression.spec.ts` passou `29/29` em Chromium,
sem skipped, unexpected ou flaky, depois da identidade semântica de rolagem.
O relatório está em
`evidence/visual-current-20260908/report.json`, SHA
`edad8cbf1be9b03a2252b052c8ae58e41c1053532ded770a4b426d9de861de23`, com
manifesto e PostgreSQL/Redis/portas de teste limpos e verificados. É uma prova
bounded de snapshots dos estados visuais cobertos; não substitui revisão
humana, UAT, touch/zoom nativos, leitor de tela ou aceite global.

Uma segunda tentativa da suíte integral, com os mesmos 420 casos e dois
workers, não foi aceita: a contenção compartilhada de autenticação/`networkidle`
produziu 23 aprovados, 4 falhas, 2 interrompidos e 391 não executados antes do
encerramento manual (`130`). O archive
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/2026-09-08T15-16-49-940Z/`
foi preservado como inválido por ausência do audit completo. Nenhuma dessas
tentativas altera a classificação das provas bounded ou promove o candidato.

## Correção FEA-007 e recaptura corrente — 08/09/2026

Dalton, em revisão fresh somente leitura, identificou S2 na divergência entre a
chave semântica capturada e a chave usada na restauração. A correção em
`useRouteFocus` centraliza a resolução no título do `DsCard` quando não há
`data-scroll-key`, mantendo chave explícita e ocorrência por identidade. O
regressivo de cartões legados reordenados passou; o focused `useRouteFocus` +
`DataTable` passou `60/60` e a SPA passou `211/211` arquivos / `1.854/1.854`
testes. O build/typecheck passou com `809` módulos e `487` precaches.

`REPORT_CONTINUITY=1` recapturou `evidence/continuity-ZOBZNO/report.json` em
`16/16` combinações, com `failures=[]` e `inputsStable=true`, exercitando as
tabelas reais dos cartões titulados nas superfícies de relatórios e os estados
preenchido/vazio/falha/retry. SHA do relatório:
`bd6c6fcd73a9b588e006f5771bb3b574dc4226bd295305879c90d04b0b7cc7c3`; SHA do
harness: `46ca1c43be20a4afbd60a288fc216eca0388fe3126a96d3dd0772b82b1f654e1`.
Isso reduz o risco bounded do FEA-007, mas não é aceite global nem prova
cross-device/AT/UAT.

O caso isolado `report-registration-exports.spec.ts` que travou na execução
integral passou `1/1` em `6,9 s` no runtime nativo, com exportação 200 e
cleanup. As tentativas integrais interrompidas permanecem inválidas e não são
contadas como PASS. FEA-012 continua HOLD até uma matriz browser corrente da
superfície de usuários/estados DataTable; o parecer fresh pós-correção ainda é
um gate independente separado. Global `ACTIVE/HOLD`, sem `DONE/AAA/GO`.

## Recaptura FEA-012 — matriz browser de usuários — 08/09/2026

O modo `USERS_CONTINUITY=1` do harness passou `4/4` em Chromium, claro/escuro
e 1440/390. A prova percorreu populado, no-results, 503 com linhas
confirmadas mantidas e retry, e 403 com limpeza dos rows/contadores e ação de
retorno sem retry enganoso; mensagens internas do backend não chegaram à
árvore visível. Não houve erro de página, overflow horizontal ou instabilidade
de inputs.

O relatório corrente é `evidence/continuity-tdvKP0/report.json`, SHA
`61c90dcec8e2cd4f376a2bd2cf65e3a04d37efd5cb8f7ea678d147b537d2eed2`, com
harness SHA `247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`.
O recorte eleva a evidência bounded do FEA-012, mas não transforma fixture
sintético em prova de RLS, persistência, todos os consumidores, AT física ou
UAT. Global permanece `ACTIVE/HOLD`, sem `DONE/AAA/GO`.

## Recertificação corrente pós-revisão independente — 08/09/2026

As evidências que tinham vínculo stale foram recapturadas com o harness atual
(`247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`):

- FEA-007: `continuity-XHWFs6/report.json`, SHA
  `3f02aed439c294c963f484331e6c99ef7dc4832446d2836d68264e756369e158`, passou
  4/4 em Chromium. O cenário `native-history-scroll-and-route-focus` retornou
  exatamente 623 px no desktop e 1.643 px no mobile, restaurou o foco em
  `Cancelar` e registrou zero requests documentais. O focused
  `useRouteFocus` + `DataTable` passou 60/60. A matriz crítica também foi
  recapturada após o hardening: `cross-browser-current-20260908/report.json`,
  SHA `c203d8a45d287a21407c4c07bc0c322eb2854fb3960ec9320bcb3a0ac41e3755`,
  com Chromium/Firefox/WebKit 24/24 cada.
- FEA-012: `continuity-tdvKP0/report.json` permanece atual, 4/4 e estável,
  cobrindo populado, no-results, 503/retry com rows confirmados preservados e
  403 com rows/contadores zerados. A revisão independente classificou este
  recorte como `PASS_WITHIN_CONTRACT`, severidade máxima S3; o limite continua
  sendo Users/DataTable com fixture sintético, não autorização/RLS, persistência,
  todos os consumidores, AT física ou UAT.
- FEA-013: padrão `continuity-UNgisr/report.json`, SHA
  `6a5ef29c0d48afaae5c467de6de565d102308a2f69bd38ffb438e2ea4834147a`, e
  reduced motion `continuity-w8uHmC/report.json`, SHA
  `1289182f3f9029c21b2f7be9b6b02a08fa54a9d72104cae89e6c54c4ece0c854`,
  passaram 6/6 cada em 1440/390/195 CSS proxy, claro/escuro, com zero falhas,
  alerta global único, zero alerta local, 2/0 rAF e limpeza de drafts. O
  registro consolidado é `success-redirect-e2e-20260908.json`; ainda é prova
  bounded, sem provider PIX/reversão produtiva, todos os consumidores,
  dispositivo real, AT, UAT ou GO.
- Visual: `visual-current-20260908/report.json`, SHA
  `edad8cbf1be9b03a2252b052c8ae58e41c1053532ded770a4b426d9de861de23`, passou
  29/29 em Chromium, sem skipped/unexpected/flaky. A captura é bounded e não
  substitui revisão visual humana.

Goodall concluiu a revisão read-only corrente sem mutação: FEA-007 permanece
`HOLD` (max S2) por cobertura de consumidores, teclas/URL compartilhável e
gates externos; FEA-012 é `PASS_WITHIN_CONTRACT` (max S3) no recorte bounded;
FEA-013 permanece `HOLD` (max S2) por gates de escopo/aceite. Nenhuma aprovação
global, AAA ou GO foi inferida. A tentativa integral serial continua inválida
por SIGTERM antes do fechamento do Playwright (`415` observados, código 143),
e a tentativa paralela continua não aceita (`23/4/2/391`).

O estado permanece `VERIFY / ACTIVE / HOLD`. Permanecem necessários UAT com
participantes, revisão humana final, confirmação de budget, RUM/INP/CLS,
touch/zoom e leitor de tela reais, validação de provider PIX/reversão e
fechamento integral dos 34 FEA.

## Tentativa integral serial final — não aceita — 08/09/2026

A execução serial dos 420 casos, com PostgreSQL/Redis nativos descartáveis,
terminou diagnosticamente em `56 passed`, `2 failed`, `1 interrupted` e
`361 did not run`. Os casos `clients` e `patients` de
`report-registration-exports` atingiram timeout de 90 s (`networkidle`/teardown
e `authSession`); `services` foi interrompido por Ctrl-C antes do fechamento.
O archive
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/2026-09-08T16-50-20-994Z/`
foi rejeitado pelo validator por ausência de `master-usability-audit.json`.
Não é evidência de PASS. O cleanup foi verificado: banco ausente, Redis DB 15
em zero e portas 3111/3112 livres. O status global segue `VERIFY / ACTIVE / HOLD`.

## E2E integral serial corrente — bounded pass — 08/09/2026

A execução `full-final-20260908` concluiu os 420 casos em Chromium contra
PostgreSQL/Redis nativos descartáveis: `420 passed`, `0 failed`, `0 interrupted`,
`0 did not run`, sem skipped, unexpected ou flaky. O validator fechou a
evidência com 150 rotas, 300 navegações e inventário válido. O archive é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-final-20260908/`
(`results.json` SHA
`3995a45143b4fbb2ced709aaac352b3a231c84894406a66737b229223818e837`).

O banco temporário foi removido e verificado ausente, Redis DB 15 foi
verificado em zero e não restaram portas/processos E2E. O resultado é
`passed_bounded` no estado durável: prova atual de fechamento do runner
browser/fixture, sem promoção para aprovação do produto. Permanecem fora do
recorte UAT/participantes, revisão visual/humana, touch/zoom/leitor de tela
físicos, RUM/INP/CLS, aprovação do budget, provider PIX/reversão e o aceite
global dos 34 FEA. O controle segue `VERIFY / ACTIVE / HOLD`, sem DONE/AAA/GO.

## Recertificação corrente antes do fechamento integral — 08/09/2026

FEA-007 recebeu hardening bounded para três lacunas observáveis: estado
terminal não permanece pendente, loading sem resolução cai para heading/body em
1 s e uma navegação push não herda rolagem local da página anterior. A prova
`evidence/continuity-7uj2zj/report.json` passou 4/4 em Chromium, com foco
restaurado em `Cancelar`, retorno de 623 px/1.643 px e fallback terminal e de
loading preso; o focused `useRouteFocus` + `DataTable` passou 63/63. O relatório
tem SHA `bffd12bfa28bd4bf27da9ba0e55247291aee3026e52bda8a38c8978ee7d1722f` e o
harness tem SHA
`ae3029ee5d1f78c18bcf06c99a5e895f65742996d42080529fcaba39407f690a`.

A matriz cross-browser final fingerprintada passou `72/72` (`24/24` em cada
Chromium, Firefox e WebKit), sem skipped/unexpected/flaky. O manifesto é
`evidence/cross-browser-final-20260908.manifest.json` e registra cleanup do
PostgreSQL descartável, Redis DB 14 em zero e portas livres. Isso permanece
bounded: não fecha UAT, revisão humana, touch/zoom físico, leitor de tela,
RUM/INP/CLS, provider PIX/reversão ou aceite global dos 34 FEA.

O workspace será congelado, após o veredito fresh independente e as
validações, para `full-final2-20260908` (Chromium serial, PostgreSQL nativo,
Redis DB 15, inventário integral de 420 casos). A classificação do dossiê
continua `ACTIVE/HOLD`, sem `DONE`, `AAA` ou `GO`.

## Recaptura final de continuidade antes do congelamento — 08/09/2026

FEA-007 recebeu uma recaptura ampliada no relatório
[`continuity-qKojY5`](evidence/continuity-qKojY5/report.json): 8/8 combinações
Chromium, 30/30 interações, zero falhas e entradas estáveis. A prova corrente
usa browser history real sem `scrollTo` manual, exige `history.state.scroll.top`,
foco por `Enter`, cobre fallback terminal e loading com deadline, reset de
rolagem local em push, diálogo dirty, logout, deep link, revogação de permissão
e uma DataTable real de Users com `scrollLeft` preservado em retorno SPA.
O focused `useRouteFocus` + `DataTable` passou 63/63 e o harness tem SHA
`322e6d689e03e151813e692a9eae6ca3168e4fcb244f87352d8eb2ff2d169c4d`.

O manifesto cross-browser final foi alinhado a esse source hash e continua em
72/72 (24/24 por Chromium/Firefox/WebKit). O crítico fresh ainda está em
execução; portanto a classificação continua bounded/ACTIVE/HOLD, sem promoção
de FEA-007 nem aprovação global dos 34 FEA. Após o crítico, o workspace será
congelado para `full-final2-20260908` e nenhum JSON de evidência/estado será
alterado durante o runner.

As duas tentativas de crítica fresh posteriores à recaptura (`Rawls` e `Euler`)
foram encerradas como `UNAVAILABLE` após esperas bounded. Portanto a evidência
`continuity-qKojY5` permanece uma qualificação bounded sem PASS independente
fresh posterior; o parecer adversarial anterior que rejeitou a prova circular
continua registrado e não foi apagado. Nenhum resultado foi promovido para
DONE, AAA, GO ou aprovação global.

## Recertificação corrente de FEA-019, FEA-007 e FEA-031 — 08/09/2026

FEA-019/Agenda foi recapturado depois do ajuste final de responsividade do
`AppPageHeader`. O relatório [`continuity-am2VhG/report.json`](evidence/continuity-am2VhG/report.json), SHA
`68712ccc24b7194da9d71242bf211f6372c4d7fd7fd47995fd0eb27ddaf2b37b`, usa o
harness SHA
`6247df8fb9a4649a290b125cc378a41596a1ac47794736195fa66d114f363644` e passou
30/30 combinações/linhas, em cinco aliases da Agenda, 1440/768/390 e ambos os
temas, com `failures=[]` e `inputsStable=true`. Em mobile, o primeiro
agendamento permanece no viewport inicial (topo 623,77 px; base 823,58 px em
viewport de 844 px); a ação primária é única e as ações secundárias ficam sob
`Mais ações`. Em desktop, `Acompanhar check-ins`, `Atualizar` e o formulário
completo permanecem acessíveis sem duplicar a ação dominante.

FEA-007 tem a recaptura corrente [`continuity-k4TnSC/report.json`](evidence/continuity-k4TnSC/report.json),
SHA `2d38b7063ef5b69d6e974ccc46af3a254e920b85edc8af74fd9bdb63d3a7e03d`:
8/8 combinações e 12 interações passaram. A DataTable real foi exercitada com
`ArrowRight`/`ArrowLeft`, foco na tabela, retorno nativo da rota e link de
detalhe; a rolagem voltou a 394 px após sair de 394 px, e houve zero requests
documentais. Isso complementa, mas não substitui, a evidência cross-browser
crítica separada e a cobertura de todos os consumidores.

FEA-031 teve medição laboratorial corrente em [`performance-lab-2026-09-07.json`](performance-lab-2026-09-07.json),
SHA `757d5b47c455eefa047e6604c8a70f2b890da7468f45d47ceba914b95cbd938a`, com
harness SHA `5a52ef1647141a36cfae8a746855816a96115aed39aed364823d1586040c29dc`.
O build tem 494 arquivos, 3.882.719 B e fingerprint
`27554f339943a519eaee331155a3669d491100cfc3f41320e9ca17f2065f42b8`; os
assets HTML iniciais somam 76.910 B gzip. Nos três percursos, os máximos
FCP/LCP foram 220/220 ms (`/`), 128/128 ms (`/login`) e 196/196 ms (Agenda),
com maior long task de 54 ms e zero erros. O budget laboratorial está dentro
do alvo, mas permanece `HOLD_FOR_OWNER_APPROVAL`; não é RUM/INP, latência real,
estudo com participantes ou UAT.

Os testes focados de `AppPageHeader`, Agenda, `DataTable` e `useRouteFocus`
passaram 116/116; lint e
`git diff --check` passaram. O candidato continua `VERIFY / ACTIVE / HOLD`:
essas recapturas não encerram revisão humana, participantes, touch/zoom e
leitor de tela físicos, RUM/INP/CLS, budget aprovado, provider PIX/reversão ou
aceite global dos 34 FEA.

## Recertificação corrente após baseline visual e E2E integral — 08/09/2026

O harness corrente `browser-continuity.mjs` tem SHA
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
FEA-019/Agenda foi recapturado em
[`continuity-DbZefI/report.json`](evidence/continuity-DbZefI/report.json), SHA
`d9e8ac74401eba183e8ec729203a1b62becb8f86c00359f80a90ccc863db61cc`: `30/30`,
cinco aliases, 1440/768/390, claro/escuro, `failures=0` e
`inputsStable=true`. Além da prioridade do primeiro agendamento no viewport
mobile (623,77–823,58 px em 844 px), a captura comprova com teclado nativo o
disclosure `Mais ações` inicialmente fechado, abertura/fechamento por `Enter`,
clique real em `Abrir formulário completo`, ida a `/appointments/new` e
retorno à Agenda.

FEA-007/Users foi alinhado em
[`continuity-wBIaTG/report.json`](evidence/continuity-wBIaTG/report.json), SHA
`7dd9bd3c6f4341fcd800d43b2dbc2687a7b8cc27f6c58ae2d530d5c42dce6fbc`:
`8/8`, `failures=0`, `inputsStable=true`. A DataTable real respondeu a
`ArrowRight` (286 px) e `ArrowLeft` (0 px), saiu com scroll local em 394 px e
retornou com 394 px, restaurou o foco conectado no link de detalhe e não fez
requests documentais. Isso continua sendo evidência bounded de browser/fixture,
não prova de todos os consumidores, RLS, persistência, leitor de tela ou
dispositivo físico.

Os quatro baselines visuais deliberadamente alterados após inspeção humana do
diff foram verificados sem `--update-snapshots`: a suíte visual fechou `29/29`
em Chromium. Os SHA dos PNGs são, respectivamente, desktop claro
`d402c5eb830228ad72cd7b057f62648918c8db552e2bf49fbf34b02c4e6b485d`, desktop
escuro `22293f35809175f43da42ee366e033e40cdb4a14d1f151a38d47d8880fecc1f5`,
mobile claro `9f5bc7dde3d9eb13f69af236b4d362e6052f9ec0571b64ac4dec4c18431ee300`
e mobile escuro
`bc61b94f4003bce32110fd422d47ef8942cf87a3d2521ea62475694351112a1b`.

O E2E integral corrente foi congelado no archive
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current3-20260908/`:
Chromium 145.0.7632.6, `420 passed`, `0` skipped/unexpected/flaky, 150 rotas
e 300 navegações. O validator confirmou a evidência (`inventoryDigest=
0a367536628f7390a20d5a952fa9cd5f4b627e8f47c46443a931f82e1dc973b3`). Os
hashes são `results.json=
dec7e2a0ce7f73c67a59d09df84e562b18dd5515df2167d4935427d1cabc3883`,
`metadata.json=b8a47c62d2aee55197e4d98fdbc2942a3a93b9f75a1688d9fce90b85918db978`
e inventário `1ac424812ba9ed0b5b235a36b570399ff8a418bb6a2982557a4c25f27d40f592`.
O banco E2E exato e Redis privado foram removidos e verificados ausentes; as
portas 3111/3112/6381 ficaram livres.

Os testes focados atuais de `AppPageHeader`, Agenda, `DataTable` e
`useRouteFocus` passaram `116/116`; `node --check` do harness, lint e
`git diff --check` passaram. A revisão independente fresh mais recente
permanece `HOLD` — sem rejeição fatal — por lacunas de aceitação e cobertura:
UAT com participantes, aprovação humana do budget, RUM/INP/CLS, touch/zoom e
leitor de tela reais, backend/RLS/persistência, provider PIX/reversão e aceite
global dos 34 FEA. Portanto esta rodada promove apenas `passed_bounded` do
runner local; o dossiê permanece `VERIFY / ACTIVE / HOLD`, sem `DONE`, `AAA`
ou `GO`.

## Recaptura cross-browser vinculada ao candidato atual — 08/09/2026

A matriz crítica foi repetida sem alteração de fonte nos dois specs
`critical-responsive-matrix.spec.ts` e `critical-journeys-accessibility.spec.ts`.
O manifesto corrente é
`evidence/cross-browser-current3-20260908.manifest.json`: Chromium, Firefox e
WebKit passaram `24/24` cada, total `72/72`, sem skipped, unexpected ou flaky,
contra PostgreSQL nativo descartável com `productionReady=true` e Redis isolado.
O archive é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/cross-browser-current3-20260908/`;
`results.json` tem SHA
`282a8ebe3027bd0a9b78820958b5ae2bee0f23f77dc9c4fdcec0cc4cf2e9e4b9` e
`metadata.json` SHA
`37b5cbb304da877098d99b3a6d3de602abafe5abd2f8fe134c0a36201c17b0a7`.

O manifesto também fixa os hashes atuais do `AppPageHeader`, Agenda, DataTable,
`useRouteFocus`, shell, rotas e os dois specs. Banco, Redis e portas foram
limpos e verificados ao final. Isso reduz a lacuna de recaptura stale e sustenta
`PASS_WITHIN_CONTRACT` apenas para essa matriz delimitada; não substitui o E2E
integral de 420 casos, touch/zoom físicos, leitor de tela real, participantes,
UAT, RUM/INP/CLS, provider PIX/reversão ou aprovação global dos 34 FEA.

## Recaptura integral corrente com fingerprint completo — 08/09/2026

Como o manifesto cross-browser foi criado depois do archive integral anterior,
o runner serial foi repetido com esse JSON já presente no workspace. O archive
imutável corrente é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current6-20260908/`:
Chromium 145.0.7632.6, `420/420` casos aprovados, zero skipped/unexpected/
flaky, 150 rotas e 300 navegações. O validator independente confirmou:
`inventoryDigest=c5fe2c9bfb9bb0e562891e21206134ad47c1b1a008793087a50d1837fe63a19c`.
Os hashes são `results.json=90176e48e9951b598c0eb6700c350344c16a010bb0fab47e6de211987d207690`,
`metadata.json=1d8d32427bdc1742c22add2fc26ed7089d8c7c820e6444169ba58c85b1c2d6fc`,
inventário `b2b4cb9e298803dda81ea4b26e837fc0eba5011f42ae5f484d1884cff39a4fdb` e
discovery `6a20f7d3baf0fae185b9ca4f7f2fd4a5b0fd0a3ecd6fded44f962f4356e4776e`.
O source digest congelado é
`ab5c46348dcb33fd6ff55ae8d28582b3b17481ca1877485facbcd2222722c33e`, incluindo
o manifesto `cross-browser-current3-20260908.manifest.json` antes da execução.

O banco descartável `cvg_his_v2_e2e_native_full_current6_20260908` foi removido
e verificado ausente; Redis DB 14 e as portas E2E 3111/3112/6381 também ficaram
livres. Essa é a prova integral mais recente do browser/fixture local, não uma
aprovação de produto: UAT/participantes, revisão humana, touch/zoom e leitor de
tela reais, RUM/INP/CLS, aprovação do budget, provider PIX/reversão e aceite dos
34 FEA permanecem gates externos. O dossiê segue `VERIFY / ACTIVE / HOLD`, sem
`DONE`, `AAA` ou `GO`.

## Crítica fresh final do candidato atual — 08/09/2026

Sagan (34 FEA) e Mill (visual/acessibilidade) receberam pacotes blindados,
read-only e sem histórico. Depois de janelas bounded e interrupção controlada,
ambos foram encerrados sem retorno final (`UNAVAILABLE`). Nenhum score ou
aprovação é inferido; a avaliação permanece limitada aos artefatos e provas
observadas. O sentinel identificou somente as alterações documentais
autorizadas desta reconciliação e o cache transitório do Vitest. Status:
`VERIFY / ACTIVE / HOLD`.

## Reconciliação do controle de execução — 08/09/2026

A recuperação encontrou `.agent/state.json`, `.agent/backlog.json` e os
ledgers auxiliares ausentes. O `.gauntlet/state.json` existente preserva a
execução histórica, mas `gauntlet_state.py validate --check-drift` o classifica
como incompatível com o schema atual por campos legados e fase `VERIFY`; ele
não foi sobrescrito. A realidade corrente é vinculada pelo ExecPlan, pelo bar
v1, pelo archive `full-current7-20260909` e pelos manifestos atuais. O plano
foi reconciliado para `FEA-external-uat-gate`; não se rebaixa a régua nem se
promove o estado enquanto os gates externos permanecem abertos.
