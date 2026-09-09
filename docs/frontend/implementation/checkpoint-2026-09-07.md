# Checkpoint de retomada — frontend premium

Salvo em 07/09/2026 a pedido do usuário para reiniciar a sessão. Raiz: `/home/ricardo/cvg-his-v4`. Este é um registro de continuidade, não uma entrega final, commit ou backup. Os arquivos de trabalho foram preservados.

## Instrução para a próxima sessão

Leia este checkpoint, `.agent/plans/frontend-premium-execplan.md`, os quatro documentos canônicos abaixo e a régua de qualidade. Confira o estado real dos arquivos antes de editar. A Agenda/pacientes já têm recapturas correntes; a próxima ação executável é coordenar os gates externos de UAT/aceite, sem reduzir o backlog integral. Preserve todas as alterações locais, inclusive as de outras frentes. Não execute reset, clean ou descarte de arquivos. Não considere testes históricos como validação do código que mudou depois deles.

O objetivo continua sendo implementar e qualificar as **34 entregas frontend**, com aparência sofisticada, movimento, texturas, controles customizados e usabilidade premium. Não reduzir o escopo ao checkpoint. Foram solicitadas as skills `gauntlet-loop`, `orchestrate`, `engineering-framework` e `design-director`; ler suas instruções na retomada. Nenhum ticket completo foi declarado DONE nesta execução. Não há aprovação global AAA nem rodada completa PASS do Gauntlet.

## Fontes canônicas

- [Auditoria](../../2026-09-06-auditoria-frontend-usabilidade-estetica.md).
- [Plano executivo](../../2026-09-06-plano-executivo-frontend-premium.md).
- [Roadmap](../../2026-09-06-roadmap-frontend-premium.md).
- [Backlog](../../2026-09-06-backlog-frontend-premium.md).
- [Índice frontend](../README.md), `quality-bar-v1.json` e `goal.txt` nesta pasta.
- `.gauntlet/state.json` e `.gauntlet/progress.md`: run `frontend-premium-20260907`; o state histórico preservado usa campos legados e fase `VERIFY`, rejeitados pelo validator atual. Não sobrescrever o arquivo nem marcar objetivo concluído ou bloqueado por causa da reinicialização.

O programa ERP AAA-* é independente: uma fatia frontend não encerra seus aceites. `.agent/state.json` não existia na última inspeção; não inventar estado anterior. Referências a `legado/artifacts/frontend-audit-2026-09-06` são históricas; essa pasta estava ausente na última inspeção.

## Estado preservado e concorrência

Há muitas alterações locais, incluindo trabalho alheio em API, worker, migrations, testes de banco e documentação ERP. O inventário está em `checkpoint-2026-09-07-worktree.txt`. O manifest JSON adjacente contém HEAD e hashes dos arquivos alterados/não rastreados no momento da captura; não comprova autoria nem substitui backup. O próprio checkpoint e a atualização posterior do ExecPlan estão fora dessa captura.

Os três agentes da última frente terminaram/congelaram: `agenda_request_order`, `agenda_context_codec_critic` e `patient_dirty_protection`. O agente de pacientes confirmou ausência de sessões de teste em execução; a sessão 92218 terminou. A sessão raiz 76471, do codec, também terminou. Não há teste conhecido desta frente a aguardar. Isso não afirma que outros processos do usuário estejam parados. Agentes/handles da sessão anterior não devem ser presumidos reutilizáveis após reiniciar.

## Alterações mais recentes e limites da verificação

### Agenda: concorrência e contexto

Arquivos principais: `apps/spa/src/pages/appointments/AppointmentsListPage.vue`, seus testes, `agendaContext.ts` e `__tests__/agendaContext.test.ts`; provider de memória no `AppLayout.vue`.

Requisições têm identidade e invalidação ao desmontar/perder permissão. Respostas, erros, loading e enriquecimento antigos não podem sobrescrever o período atual. Uma falha não deixa linhas antigas sob o novo cabeçalho. O contexto estrutural usa URL e memória do workspace: data, modo, status, profissional, serviço, unidade, especialidade e marcador. Texto livre permanece apenas em memória. URL externa restaura contexto sem carga duplicada; mudanças locais preservam parâmetros alheios. Há datas civis locais e `data-focus-key` estável nas linhas.

**Validação:** builder reportou 34/34 testes da página e typecheck SPA aprovados. Raiz observou 6/6 testes do codec, log `agenda-context-codec.log`. Critic independente do codec/provider não encontrou bloqueador; não revisou a integração da página. Writer pressupõe entradas normalizadas; reader normaliza e limita strings. Parâmetros alheios preexistentes são preservados, não sanitizados por esse helper.

**Pendente:** navegador da integração atual, revisão independente da página e validação com serviços reais. Texto livre se perde ao recarregar por contrato atual; não afirmar persistência integral dos filtros nem aprovação de UAT desse comportamento.

`browser-continuity.mjs` ganhou modo `AGENDA_CONTEXT=1`, ainda NÃO executado. Verifica deep link, profissional/data, retorno nativo com texto em memória e reload mantendo contexto estrutural enquanto limpa texto. Inspecionar os seletores caso falhe; não presumir defeito do produto nem afrouxar assertions sem diagnóstico.

### Pacientes: proteção contra perda de edição

Builder modificou somente `apps/spa/src/pages/patients/PatientFormPage.vue` e `__tests__/PatientFormPage.test.ts`. Integra `useUnsavedChanges` e `DsModal`, baseline limpa após hidratação, snapshot efetivamente submetido marcado limpo somente após resposta válida, proteção de navegação e coordenação de logout. Preservar paginação/staging de tutores, hidratação espécie/raça, locks, permissões e guards de geração que já existiam.

**Validação:** builder reportou 51/51 testes focados aprovados, incluindo sete testes comportamentais novos com router real. Depois desse teste adicionou a opção `resetsForm` para mudança de `query.ownerId`. **Essa edição final não foi retestada e não houve typecheck final de pacientes.** Não declarar o estado final validado.

Raiz alterou `apps/spa/src/composables/useUnsavedChanges.ts`: opção `resetsForm?: (to, from) => boolean` permite proteger query que recarrega o formulário; mudanças de path continuam protegidas e o comportamento padrão é preservado. O teste específico de mudança de ownerId com edição pendente ainda precisa ser escrito/executado. Cobrir também aceite de descarte no logout; evitar testes que apenas espelhem implementação.

## Fatias anteriores já implementadas

- DsButton: navegação SPA preservando semântica nativa/modificadores, estados disabled/loading, materiais e movimento reduzido, largura estável durante loading; tokens e contrato visual. Evidência `evidence/button-material-3N7MXC` e regressões adjacentes. Aceite integral ainda pendente.
- `useListData`: controle de requisição atual e descarte após unmount, 19 testes aprovados na fatia.
- Formulário de tutor e coordenador de saída: snapshots corretos, retry de hidratação, confirmação de saída/logout; nenhum rascunho pessoal persistido em storage. Owner 13 e composable 8 testes na fatia anterior, navegador de logout/retorno em quatro variantes.
- Scroll e foco de navegação: retorno nativo, identidade estável, h1/workspace no destino, proteção de modais/foco intencional; `preserveNavigationFocus` é contrato explícito para guards anteriores. Não prometer restauração assíncrona de todos os módulos. Testes focados e revisão independente anteriores registrados nos logs.
- Recepção: busca/resultados priorizados, fila antes de indicadores secundários recolhidos, resposta antiga de busca invalidada. 17 testes focados e navegador `evidence/continuity-11pldJ`. Fluxos reais completos e refinamento de conteúdo ainda pendentes.
- Agenda visual: lista cronológica padrão, toolbar compacta, filtros recolhíveis e ações secundárias; drawer com Escape, ciclo de Tab e retorno de foco. Evidência anterior `evidence/continuity-cD1EER` em quatro variantes: primeiro item y523 mobile/y390,75 desktop. Drawer 6 testes; integração anterior 55 testes. **Alterações posteriores de contexto/concorrência invalidam esses hashes para comprovar a página atual.** Ainda há duplicidade de heading shell/página e qualificação funcional/visual a concluir.

Navegador de continuidade anterior: `evidence/continuity-oLC0j2` e `continuity-Jvds8h`. As evidências usam Chromium e APIs sintéticas; não equivalem a UAT, persistência real ou cobertura de todos os navegadores. Build anterior e estimativas gzip são baseline histórica, não métricas atuais de campo.

## MCPs e materiais visuais

- **Open Design indisponível:** última tentativa `get_active_context` retornou `Transport closed`; terceira falha registrada em `open-design-availability.json`. O MCP está listado, mas não houve execução bem-sucedida ou artefato gerado. Revalidar conexão na nova sessão; não afirmar uso concluído.
- **ComfyUI concluído:** job `0836ac61-05c9-443d-9853-d044ac6fac39`; imagem obtida e inspecionada em `docs/frontend/assets/images/0836ac61_000.png` (384×224). Arco metálico azul, fundo mineral e luz champagne: conceito de pequena resolução, sem aceite de produção.
- **Blender:** fonte editável `cvg-pulse-orbit.blend`, poster e vídeo de três segundos registrados no manifest de assets; autoria via MCP, render CPU local. `docs/frontend/caderno-visual.html` é caderno conceitual, não integração final na SPA.
- Metadados e procedência em `docs/frontend/assets/README.md`, `manifest.json` e `assets/evidence/`.

## Próximas ações, em ordem

1. Reinspecionar diff/status e ler as instruções locais/skills. Preservar mudanças alheias e conferir os hashes apenas para detectar diferenças, nunca para reverter automaticamente.
2. Revisar o guard `resetsForm` e a integração de pacientes. Acrescentar caso comportamental de query ownerId com formulário sujo; executar testes focados finais e typecheck.
3. Executar testes de Agenda/codec e o navegador `AGENDA_CONTEXT=1`; diagnosticar resultados. Verificar ausência de reescrita de URL do destino, de cargas duplicadas e de perda de contexto no retorno.
4. Submeter as integrações a crítica independente, corrigir defeitos e registrar evidência fresca vinculada às fontes. Comparações visuais materiais exigem as revisões previstas nas skills.
5. Atualizar backlog/ExecPlan/Gauntlet com o resultado real e prosseguir nas 34 entregas. Ainda faltam variantes/estados do sistema visual, qualificação completa das jornadas, clínica, financeiro, estoque, laboratório, relatórios, administração, acessibilidade, performance, regressão, UAT e dossiê final.

Comandos de retomada (a partir da raiz; não rodar Vitest diretamente na raiz):

```bash
pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientFormPage.test.ts src/composables/__tests__/useUnsavedChanges.test.ts src/pages/appointments/__tests__/AppointmentsListPage.test.ts src/pages/appointments/__tests__/agendaContext.test.ts --maxWorkers=1
pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit
AGENDA_CONTEXT=1 node docs/frontend/implementation/browser-continuity.mjs > docs/frontend/implementation/agenda-context-browser.log 2>&1
pnpm docs:validate
```

O harness cria Vite/browser próprios e encerra seus recursos. Aguarde o término real de qualquer sessão iniciada; timeout de observação não autoriza duplicar execução. A próxima sessão deve continuar deste estado, sem tratar o checkpoint como conclusão do objetivo.

## Atualização da retomada — 07/09/2026

As pendências imediatas do checkpoint foram executadas. A proteção `resetsForm`
do `ownerId` foi revalidada; a Agenda agora cobre as cinco aliases canônicas,
remove as chaves de URL `search`/`clientSearch` legadas, invalida a corrida
check-in/no-show e oferece superfícies nativas de card com Enter/Espaço nos cards
de semana/dia. O no-show de itens
com `queueEntryId` usa o contrato próprio da fila. O fechamento do drawer usa
alvo mínimo 44×44. A fatia PIX foi integrada ao detalhe financeiro com
elegibilidade frontend e server-side fail-closed, oito estados duráveis,
`202`/idempotência, restauração da última tentativa por atendimento, refresh
explícito e retry de polling.

Checks atuais: focused Encounter/PIX 43/43; Agenda/no-show e codec 47/47; SPA 204 arquivos/1.777
testes; focused Agenda/DsButton/design-system 108/108; typecheck SPA; build SPA exit 0; build e
rota PIX API 11/11; OpenAPI e documentação válidos. `continuity-WnxPrE` passou
20/20 na Agenda com três interações distintas, `continuity-qW2Gvv` 4/4 no PIX e
`button-navigation-EcT9XZ` 4/4 no `DsButton`, todos em claro/escuro e
1440/390, `inputsStable=true`. O laboratório de performance repetiu três
rotas, incluindo Agenda autenticada com massa sintética, em Chromium 145.

O candidato continua `ACTIVE/HOLD`, sem `DONE`, `AAA`, `PASS` ou `GO` global.
O crítico fresco Averroes classificou Agenda como `conditional`, PIX como
`HOLD` e a rodada como `HOLD`; seu snapshot PIX era anterior ao último rerun,
e a affordance financeira apontada foi corrigida depois. O crítico final
McClintock também concluiu `HOLD`, apontando no-show de fila, guarda
server-side do saldo e semântica P2 do card; os dois P1 foram corrigidos e o
card foi convertido para uma superfície `button` nativa com ações irmãs, com
regressão e browser regenerados, mas a suíte PostgreSQL não executou por
permissão de `TRUNCATE accounts` no banco explícito do runner. Permanecem
E2E browser-to-database sem fallback por PostgreSQL indisponível, UAT/revisão
humana, provider/RLS, touch/dispositivo, zoom 200%, leitor de tela real,
FEA-001–002 e o ciclo PIX/reversão integrado.

## Continuação — baseline de performance e contrato de navegação

FEA-001 recebeu um inventário executável do candidato atual em
`frontend-baseline-2026-09-07.json`: 253 registros de rota, 249 protegidos,
4 públicos, 21 redirects, 686 arquivos frontend rastreados, 98 alterações
scoped, 88 assets declarados e oito relatórios correntes. O capturador registra
HEAD, hash do status, comparação com o snapshot histórico e as reproduções
bounded de FE-01/02/03; a baseline humana, reconciliação semântica completa e
serviços reais continuam explicitamente pendentes.

FEA-003 recebeu um artefato reproduzível em
`performance-lab-2026-09-07.json`/`.md`: o build de produção foi servido e
medido três vezes por rota em Chromium 145, 1440×900, DPR1 e contextos com
`serviceWorkers: 'block'`; a Agenda foi carregada com sessão/API sintéticas e
duas marcações controladas. O inventário atual tem 486 arquivos,
3.757.259 B no `dist` e 367.659 B brutos/102.488 B gzip nos assets iniciais;
o gzip de transporte foi observado via Resource Timing e o inventário recebeu
fingerprint SHA-256 (`2a1e266b…9a65e`); FCP/LCP são sinais de laboratório. O
orçamento por rota
foi registrado e o alvo do HTML inicial está em HOLD por +10,91%. Não foram
alegados INP, RUM, rede lenta, participantes ou aceite de campo.

FEA-004 recebeu prova browser real do contrato `DsButton` em
`evidence/button-navigation-EcT9XZ/report.json`: quatro combinações claro/
escuro e 390/1440 passaram `createWebHistory` com rota interna por Enter sem
navegação documental, back/forward do browser, Espaço em comando,
Alt/Ctrl/Meta/Shift, auxclick e modificadores com popup real, `target="_blank"`,
URL externa, download, disabled e sem submit acidental. A story do componente
agora adapta explicitamente o `children` ao
default slot; o build 10.3.5 do Storybook e a abertura real da story Primary
renderizaram `Primary Button` sem erros. A prova permanece
bounded; não encerra consumidores, revisão humana ou os 34 FEA.

## Continuação — FEA-014 e matriz de composição da Agenda

A faixa FEA-014 foi ajustada nos arquivos
`apps/spa/src/layouts/AppLayout.vue` e
`apps/spa/src/pages/appointments/AppointmentsListPage.vue`: em rotas com
`pageOwnsHeader`, o shell mantém histórico/suporte mas não repete o contexto
da página; a Agenda mantém uma única trilha visível, um único grupo de KPI no
resumo da grade e um subtítulo sem a trilha duplicada. Aliases, query, filtros,
ações, payloads, drawer e superfícies de teclado foram preservados.

O relatório `evidence/continuity-6EFhzA/report.json` passou 30/30 em cinco
aliases × dois temas × 1440/768/390, com `inputsStable=true`, zero erros e
largura documental igual à viewport. As três interações seguem cobertas:
retorno/reload contextual, card semanal com Enter e card diário com Espaço,
incluindo restauração de foco e capturas do drawer. A matriz visual foi
inspecionada em 768 e mobile; a evidência continua sintética/bounded e não
encerra revisão humana, touch/dispositivo, zoom 200%, leitor de tela,
contraste medido, backend/RLS ou UAT.

## Continuação — FEA-013 e redirects de sucesso

Os redirects pós-sucesso dos 18 formulários que aguardavam 900–1500 ms foram
migrados para `apps/spa/src/composables/successRedirect.ts`. A janela padrão
agora é 360 ms para a mensagem de confirmação e fica em 0 ms quando o usuário
solicita `prefers-reduced-motion`; os guards/cancelamentos já existentes e os
destinos de cada cadastro foram preservados. O teste do helper e os fluxos de
paciente, atendimento e agendamento passaram 98/98, com typecheck SPA verde.

Esta é uma melhoria de contrato bounded, não uma aprovação integral da FEA-013:
faltam observação manual de movimento, cross-browser/device, leitor de tela,
integração real e UAT.

## Continuação — sonda de layout pós-interação da Agenda

A sonda read-only posterior à composição executou a matriz completa em cinco
aliases, claro/escuro e 1440/768/390. A primeira versão do critério foi
intencionalmente preservada em `evidence/continuity-JS7LMj/report.json`: ela
falhou 10 linhas ao exigir overflow local da grade diária em 768px, embora a
medição observada fosse `clientWidth=744` e `scrollWidth=744` nesse breakpoint.
O critério foi corrigido para exigir overflow diário apenas em 390px, mantendo
overflow semanal após a troca de view; `evidence/continuity-A6VXry/report.json`
então passou 30/30, `inputsStable=true`, com quatro IDs de interação, largura
documental igual à viewport e foco restaurado do drawer. A matriz continua
bounded/sintética e não substitui UAT, touch, zoom, leitor de tela, contraste,
serviços reais ou revisão visual humana.

## Continuação — FEA-008, FEA-009, FEA-013 e FEA-015

Após a sonda de Agenda, a decomposição de FEA-008 foi aplicada sem mudar o
comportamento do domínio: `agendaPresentation.ts` concentra rótulos,
derivações de slot e estado operacional; `patientDetailPresentation.ts`
concentra formatação e rótulos clínicos. Os arquivos críticos ficaram abaixo
dos limites do manifesto: Agenda 3.086/3.110 e PatientDetail 4.075/4.124.
Testes de apresentação novos passaram 6/6; ReportWorkbench e API ainda são
hotspots acima do limite e permanecem trabalho aberto.

FEA-009 recebeu uma implementação candidata de baixo risco: `cvgPulseTokens`
e os temas CVG Pulse claro/escuro apontam para as variáveis CSS atuais, sem
alterar exports legacy. O teste focalizado passou 41/41, o pacote 48/48 e o
typecheck do design system passou. Render de página preenchida, contraste,
licença/disponibilidade de fonte e revisão visual independente continuam
pendentes.

FEA-013 foi revisado novamente por Euclid em fresh-context e passou
`PASS_WITHIN_CONTRACT` no recorte bounded, sem S1/S2 e severidade máxima S3.
O controller distingue `begin()` de `invalidate()`, portanto um retorno
assíncrono após troca de rota/contexto não reativa o redirect obsoleto; os 18
consumidores legados foram inventariados e não usam scheduler/setTimeout direto.
O teste de redirect tem 7/7 casos, a suíte focada de helpers/formulários
159/159 e a SPA completa 208 arquivos/1.792 testes. Os quatro formulários que
não tinham scheduler legado (Owner, Bed, Appointment e Triage) permanecem
explicitamente fora deste contrato bounded, com redirect imediato. Cobertura
runtime por cada consumidor, ambiente real Webhook/Laboratório, observação de
movimento e UAT ainda são lacunas.

FEA-015 recebeu o glossário `clinicalLabels` e a migração de strings visíveis
de “cliente” para “tutor” nas seis superfícies previstas, preservando nomes de
campos/API e termos financeiros. O inventário de vocabulário e as sete suítes
focadas passaram 113/113; validação com Operação e inventário completo ainda
não existem.

FEA-016 recebeu uma integração candidata dos estudos Blender na tela de
login: `cvg-pulse-orbit.webp` e `cvg-pulse-orbit.mp4` foram copiados para
`apps/spa/public/art/`, com os mesmos hashes dos arquivos de origem, sem
misturar o logo oficial ao material. A matriz `evidence/login-assets-20260907.json`
passou 8/8 em 390/1440, claro/escuro e movimento normal/reduzido; com a
preferência reduzida o vídeo não monta e o poster permanece disponível.
Rede limitada, pausa manual, orçamento de transferência e revisão visual
humana ainda estão pendentes; FEA-016 segue parcial.

**Correção de identidade em 08/09/2026:** após a inspeção do produto, a
integração candidata foi revertida porque a órbita era um estudo abstrato sem
relação suficiente com a identidade do ERP. A tela de login voltou a consumir
o logo institucional (`hospital-logo-poster.webp` e `hospital-logo-loop.mp4`),
enquanto os arquivos `cvg-pulse-orbit.*` permanecem preservados somente como
estudo conceitual. A validação corrente está em
`evidence/login-assets-20260908.json`.

FEA-012 também recebeu um alinhamento bounded no consumidor
`LaboratoryAnalyticalWorkbench`: a falha do catálogo de referências agora usa
`DataTableFeedback` com estado `unavailable`, causa explícita, uma única ação
`Tentar novamente` e preservação dos resultados estruturados. O retry é isolado
da consulta principal e mantém registros/seleção durante pending e falha. A
suíte analítica passou 24/24 e o `DataTable` passou 25/25; a crítica fresca
Hilbert classificou o recorte `PASS_WITHIN_CONTRACT` com severidade máxima S3.
Indisponibilidade/permissão real, confirmação operacional e UAT permanecem
pendentes.

FEA-011/018 receberam uma revalidação bounded com o harness final: paciente em
`evidence/continuity-ty2R5x/report.json` (6/6) e tutor em
`evidence/continuity-JOB4sv/report.json` (2/2), nos dois temas, 1440×900,
390×844 e viewport CSS equivalente a 200% (195×422). Os fluxos preservam
conteúdo, focam o primeiro erro, mostram loading/falha e mantêm ações sticky
sem overflow documental. O viewport reduzido é proxy de reflow; zoom nativo,
touch/teclado virtual, leitor de tela, duplicidade, backend/RLS e UAT continuam
fora da prova. O harness também corrigiu o seletor obsoleto do CTA do tutor;
`continuity-z5FzeJ` e `continuity-8wg68C` permanecem como falhas históricas
por esse seletor e não foram sobrescritos.

O baseline atual foi regenerado depois dessas alterações: 253 rotas (249
protegidas/4 públicas), 686 arquivos frontend rastreados, 138 arquivos-fonte
alterados no worktree candidato, 88 assets e 13 relatórios correntes. O
worktree segue deliberadamente sujo por conter alterações de outros escopos;
isso não é uma autorização para limpar/resetar mudanças.

## Continuação — FEA-018 e conflitos de duplicidade

Os cadastros de tutor e paciente agora interpretam somente o contrato explícito
`409 + code=CONFLICT + details.ownerId/patientId + mensagem de duplicidade`.
O erro não reseta nem marca o formulário como limpo: uma superfície warning
focalizada informa que nada foi criado, oferece `Manter este rascunho` e, se o
operador escolher abrir o registro existente, a guarda de alterações não salvas
exige confirmação antes da navegação. Conflitos 409 de outra natureza continuam
como erro comum.

O teste do utilitário passou 4/4; as suítes dos formulários passaram 16/16
(tutor) e 54/54 (paciente). A matriz Chromium sintética
`evidence/continuity-niDPip/report.json` passou 8/8, sem falhas, em
1440×900/390×844 e claro/escuro, com duas respostas 409 por fluxo, draft
preservado, manter rascunho e navegação protegida. O crítico fresco Maxwell
classificou o recorte `PASS_WITHIN_CONTRACT`, severidade máxima S3. Persistência,
RLS, leitor de tela e variações de erro 409 ainda exigem validação real/UAT;
FEA-018 permanece parcial/HOLD no nível integral.

## Continuação — prancha CVG Pulse e contraste de FEA-009

O story canônico `packages/design-system/stories/CvgPulseTokens.stories.ts`
agora é indexado pelo Storybook real como
`design-system-tokens-cvg-pulse--canonical-board`. A prancha renderiza duas
ilhas explícitas (`light`/`dark`) no mesmo documento e inclui inventário
legado→atual→runtime, uma primeira página preenchida com decisão de UX,
acentos/nomes longos, amostra numérica `tabular-nums`, paleta semântica,
materiais/elevation e movimento reduzido. Os aliases e primitivas são
reatados no board para impedir herança acidental do tema externo.

`docs/frontend/implementation/cvg-pulse-tokens-browser.mjs` construiu o
Storybook 10.3.5 (191 módulos) e gerou
`evidence/cvg-pulse-tokens-OklWS0/report.json`: 12/12 em 390/768/1440, claro/
escuro e normal/reduced motion, overflow documental zero e hashes estáveis.
Os pares de contraste mediram no mínimo 5,52:1 no light e 10,85:1 no dark;
os screenshots de ambos os temas foram inspecionados. O pacote continuou
48/48, o teste de contrato de tokens 41/41 e o typecheck passou.

O crítico independente fresh-context para este recorte ainda é a etapa de
revisão em andamento. A prova não cobre licença/disponibilidade jurídica de
Aptos, dispositivo físico, zoom/touch, leitor de tela, UAT ou aceite integral;
FEA-009 segue parcial/HOLD, sem DONE/AAA/GO. O baseline após incluir a pasta
de stories e este relatório registra 253 rotas, 690 arquivos frontend
rastreados, 147 arquivos-fonte alterados, 88 assets e 14 relatórios correntes.

O crítico fresh-context Dewey emitiu `PASS_WITHIN_CONTRACT`, severidade máxima
S3, sem S1/S2. Confirmou o story real indexado/renderizado, as duas ilhas
light/dark no mesmo DOM, migration/filled page/tabular-nums/acentos, 12/12
combinações, mínimos de contraste 5,52:1/10,85:1 e ausência de overflow
documental. O limite residual é que o probe não mede todos os containers
internos; licença/disponibilidade Aptos, consumidores clínicos, dispositivos,
zoom/touch, leitor de tela e UAT continuam pendentes.

## Continuação — protocolo FEA-002

Foi criado o protocolo sanitizado `docs/frontend/implementation/task-baseline-2026-09-07.json`,
com versão legível em `.md`. Ele define cinco tarefas prioritárias, cinco perfis (incluindo baixa
familiaridade digital e plantão), 10 sessões-alvo, massa fictícia, sucesso/erro e colunas para
tempo, ativações, rolagem, erros, assistência e conclusão. O dry-run tem zero observações humanas;
os links `continuity-*` são apenas referências Chromium sintéticas. FEA-002/033 seguem pendentes
até OP recrutar participantes, obter consentimento e produzir métricas agregadas.

## Verificação final da retomada

Regressão SPA completa: `209` arquivos / `1.802` testes aprovados. Build SPA: `806` módulos e
`483` entradas de precache PWA; documentação, OpenAPI (`413` paths/`518` schemas) e diff passaram.
O orçamento de complexidade continua com dois bloqueios explícitos — `server.ts` em `8.347/8.335`
e `ReportWorkbenchPage.vue` em `3.205/3.186` — e o aceite global dos 34 FEA permanece ACTIVE/HOLD.

## Continuação — FEA-025: reversão de recebimento em dinheiro

O detalhe do atendimento agora permite conferir o recebimento em dinheiro no
passo de fechamento e solicitar estorno com aviso de irreversibilidade, motivo
obrigatório, confirmação explícita e chave de idempotência própria. A falha
transitória preserva a mesma chave no retry; após o POST 201 o resumo financeiro
é relido e a UI mostra o estado estornado sem oferecer um segundo estorno.

`evidence/continuity-cZ40h6/report.json` passou 4/4 em Chromium, 1440/390,
claro/escuro, com `inputsStable=true`, zero erros e largura documental igual à
viewport. As capturas reais desktop/mobile dos dois temas foram inspecionadas.
Os testes focados de Encounter/serviço passaram 35/35, a rota API passou 11/11 e
o typecheck SPA passou. A consulta durável `includeReversed=true` recupera o
último recebimento com metadados de reversão; o fluxo visual foi confirmado após
refresh e reload. O fixture é sintético: não comprova replay, provider, RLS,
reconciliação ou browser-to-database.

O scout fresh-context confirmou que PIX não possui contrato seguro para
confirmação/reversão manual: o SPA deve permanecer em despacho/polling, sem
promover estado financeiro localmente. FEA-025 continua parcial/HOLD e o estado
global permanece ACTIVE/HOLD, sem DONE/AAA/GO.

## Continuação — FEA-026: escopo de seleção e compras

`evidence/continuity-ohbW3A/report.json` passou 8/8 em Chromium, 1440/390,
claro/escuro, com seleção limitada à página/consulta, limpeza ao filtrar,
unidades críticas legíveis e rascunho de compra explicitamente temporário, sem
mutação de estoque. A matriz permanece bounded/HOLD por falta de mutação batch
persistida, integração real, touch/zoom, leitor de tela e UAT.

Lagrange executou a revisão fresh-context somente leitura e classificou o
recorte bounded como `PASS_WITHIN_CONTRACT`, severidade máxima S3, sem S1/S2.
Confirmou o estado misto, a seleção restrita à consulta/página visível, a
limpeza ao filtrar/recarregar, os estados de erro/vazio/retry, a rolagem local
por setas e a ausência de chamadas persistentes no rascunho temporário. Os
testes focalizados de Estoque/Compras passaram 27/27 e o contrato do `DataTable`
25/25. Isso não prova backend/RLS/persistência, toque/zoom nativos, leitor de
tela ou UAT, nem altera o HOLD integral ou o aceite global.

## Correção posterior — FEA-025 e regressão

Após a crítica fresh, o fluxo de caixa passou a anunciar o motivo com
`required`/`aria-required`, devolver foco ao painel estável após o modal remover
o gatilho e avisar quando uma releitura 404 mantém temporariamente uma reversão
já confirmada. O breadcrumb móvel agora quebra e abrevia sem scroll interno.
`continuity-WiebZn/report.json` passou novamente 4/4, com
`documentWidth=viewport` e `scrollContainers=[]` nos quatro cenários; a matriz
também comprovou `includeReversed=true` após reload. Encounter/serviço passou
35/35, API 11/11, a regressão SPA 209/1.805 e o baseline 17 relatórios/148
fontes alteradas. As limitações de backend/RLS/DB real, PIX, UAT e leitor de
tela continuam HOLD.

Avicenna fez a revisão fresh-context somente leitura e classificou FEA-025
`PASS_WITHIN_CONTRACT`, severidade máxima S3, sem S1/S2, confirmando os quatro
achados acionáveis corrigidos. Isso é aprovação apenas do recorte bounded; a
aceitação financeira real e o aceite global dos 34 FEA continuam ACTIVE/HOLD.

## Continuação — FEA-028: execução server-side e exportação

O harness foi executado novamente contra o candidato atual em
`evidence/continuity-UAGHyE/report.json`: 4/4 em Chromium, claro/escuro e
1440/390, com `inputsStable=true`, zero erros e largura documental igual à
viewport. O fluxo preserva `dateFrom`, `dateTo` e `search` na URL e no retorno
à tela, solicita a execução no servidor, exporta CSV com nome/colunas esperados
e indicação UTC, e deixa falha de exportação recuperável. A matriz também
passou por estado preenchido, vazio, falha de carregamento e retry; no viewport
estreito a tabela fornece rolagem local por setas.

O recorte continua condicional/HOLD: fixtures sintéticos não provam
reconciliação financeira, execução browser-to-database, operação real,
touch/zoom nativos, leitor de tela ou UAT. A revisão independente fresh-context
do FEA-028 permanece em andamento.

## Correção e verificação — FEA-027: contrato laboratorial completo

O `LaboratoryAnalyticalWorkbench` agora diferencia autorização negada de falha
temporária nos três workbenches analíticos, preserva a ação de retry somente
quando aplicável e não exibe referências como se o acesso ao exame tivesse sido
concedido. O fluxo aberto (`closed=false`) mantém pedidos `collected` visíveis
com a mensagem explícita de valores ainda não estruturados; ausência filtrada
usa uma superfície `no-results`. Pedidos e laudos continuam exibindo valores,
unidades, referências, situação, ação de anexo com URL curta protegida e estados
403 próprios.

O artefato fresh `evidence/continuity-cFoZKq/report.json` passou 20/20 em
Pedidos, Laudos, Hemogramas, Urina e Bioquímico, claro/escuro e 1440/390, com
`inputsStable=true`, zero erros de página e Axe zero no render inicial e nos
estados interativos: populated, modal, attachment, selected, pending,
no-results e forbidden. A matriz exercitou foco/retorno do modal, Tab, Enter,
setas e refresh; o hash do harness é
`1b2f50c3be2231731a29e5643a9f981f00a67e54597ecdc404314b265dacd846`.

Os testes SPA laboratoriais passaram 46/46, o módulo de diagnósticos passou 34
testes (uma integração PostgreSQL segue skip por ambiente), as rotas API de
laboratório passaram 21/21, `vue-tsc`, builds de diagnósticos/API e a recaptura
do baseline passaram. O baseline atual registra 253 rotas, 690 arquivos
frontend, 149 fontes alteradas e 20 relatórios. A evidência segue bounded:
fixtures sintéticos não provam backend/RLS/persistência, permissões de produção,
browser-to-database, toque/zoom nativos, leitor de tela ou UAT.

A primeira crítica fresh de Schrodinger encontrou S2 nos workbenches (403
genérico) e dois gaps S3; todos foram corrigidos e a matriz foi regenerada. A
crítica fresh final sobre `continuity-cFoZKq` está em andamento. FEA-027 não é
promovido a aceite integral e o estado global permanece ACTIVE/HOLD, sem
DONE/AAA/GO.

## Registro da crítica — FEA-028: HOLD bounded

Hume revisou fresh o recorte `continuity-UAGHyE` e classificou FEA-028 como
`HOLD`, severidade máxima S2, sem aprovação global. Os achados acionáveis são:
exportação que pode refazer a execução em vez de ancorar no `executionId`
exibido; timeout sem cancelamento/reconciliação de operação persistente, com
risco de duplicar execução/artefato no retry; datas da auditoria sem intervalo
UTC meio-aberto explícito; além de contrato de CSV/estado sem resultados/escopo
server-side ainda não uniforme. A evidência antiga também ficou stale após as
mudanças e deve ser regenerada depois da correção. FEA-028 permanece HOLD e não
deve ser tratado como PASS por causa dos 4/4 sintéticos anteriores.
## Continuação — FEA-029: permissões e configurações

O artefato corrente `evidence/continuity-3NvGzS/report.json` passou 4/4 em
1440/390 e claro/escuro, cobrindo 403 focalizado, retry, navegação por tabs,
foco de edição, fieldsets explícitos de usuários/grupos/setores e controles da
matriz. O recorte permanece bounded: papéis de produção, backend/RLS,
persistência, toque/zoom, leitor de tela e UAT ainda não estão provados; uma
crítica fresh independente do código e da evidência corrente continua pendente.

## Atualização corrente — FEA-027/028/029

As correções posteriores às críticas foram implementadas e recapturadas no
harness atual, SHA
`b7f1dac83d2298cbeb4fde043d5cb5f92265049c0dfbbda2a62a27934fe20e56`:

- `evidence/continuity-ObS9Nk/report.json`: FEA-027 passou 20/20 em Pedidos,
  Laudos, Hemogramas, Urina e Bioquímico, nos dois temas e em 1440/390. Axe
  passou nos estados de consulta, populated, modal, anexo, selecionado,
  solicitado/coletado, referências indisponíveis, sem resultados e 403; as
  capturas mobile registram `scrollY=0`.
- `evidence/continuity-BQPOrz/report.json`: FEA-028 passou 4/4; o export usa
  o `executionId` exibido sem novo POST, timeout abortável com indicação de
  reconciliação, auditoria UTC meio-aberta, CSV canônico, vazio acionável e
  retry recuperável. O escopo server-side continua misto entre contratos e
  backend/DB/UAT não estão cobertos.
- `evidence/continuity-gPkUs4/report.json`: FEA-029 passou 4/4 com 403 sem
  vazio contraditório, Axe 0 no forbidden e em resumo/usuários/grupos/setores/
  matriz, roving tabindex, Sim/Não textual, regiões móveis focáveis e overflow
  zero.

Também foi corrigido o trap de foco do `DsModal` para excluir controles
desabilitados; a suíte do modal passou 5/5 e a de Access Control 12/12. O
baseline atualizado (`frontend-baseline-2026-09-07.json`) registra 253 rotas,
690 arquivos frontend, 158 fontes alteradas e 20 relatórios, sem evidência
ausente. O objetivo maior permanece em `ACTIVE/HOLD`, sem declaração de DONE,
AAA ou GO global; a crítica fresh pós-correção dos três recortes ainda é uma
etapa independente necessária.

## Verificação corrente — 08/09/2026

O harness foi ampliado para exercitar também os subledgers server-side de
Contas a Pagar e Contas a Receber, mantendo o estoque e os estados de falha/
vazio existentes. Após o hardening de concorrência e do contrato CSV, os três
recortes foram recapturados com o mesmo SHA
`0786242927a23457ae3dd550c6008c1a99209c0209dd3cbacb8163df653d8b11`:

- `evidence/continuity-G9h2nq/report.json`: laboratório 20/20, cinco rotas,
  claro/escuro e 1440/390, com fixture Bioquímica semântica (`ALT`, `U/L` e
  faixa própria), solicitado/coletado/concluído, pendente, indisponível, vazio,
  403, retry, teclado, foco e Axe zero.
- `evidence/continuity-VF7bbr/report.json`: relatórios 12/12, cobrindo estoque,
  contas a pagar e contas a receber. O browser comprova nova execução somente
  ao aplicar filtros, tabela e CSV ancorados no mesmo `executionId`, cabeçalhos
  completos e delimitador por vírgula; a falha HTTP de exportação permanece
  recuperável.
- `evidence/continuity-SZ8pvw/report.json`: acesso 4/4, com 403 focalizado,
  retry, tabs roving, vínculos de usuário, matriz textual, Axe zero e reflow
  sem overflow documental.

O baseline regenerado às `2026-09-08T02:39:51.055Z` registra 253 rotas,
249 protegidas/4 públicas, 690 arquivos frontend, 159 fontes alteradas, 88
assets, 20 evidências e nenhum ausente. A regressão SPA passou 209 arquivos/
1.818 testes; o build passou com 806 módulos e 482 precaches PWA. A suíte API
completa passou 576/576. O objetivo
global dos 34 FEA continua `ACTIVE/HOLD`, pois a evidência browser é sintética,
os dois hotspots de complexidade permanecem acima do orçamento, e ainda faltam
PostgreSQL/RLS/E2E real, UAT, revisão humana, touch/zoom nativos e leitor de tela.

## Verificação posterior à refatoração — 08/09/2026

O gate `complexity:check` passou após extrações funcionais: modelos e fábrica
de especificações saíram do `ReportWorkbenchPage.vue` (3.142 linhas, limite
3.186) e os limites de requisição saíram do `server.ts` (8.333 linhas, limite
8.335). Typechecks, regressão completa e build continuaram verdes.

As recapturas pós-refatoração estão sem falhas e com `inputsStable=true`:
`continuity-BaiCMr` (FEA-027, 20/20), `continuity-0gELAk` (FEA-028, 12/12) e
`continuity-Ld6WtE` (FEA-029, 4/4), com harness SHA
`0786242927a23457ae3dd550c6008c1a99209c0209dd3cbacb8163df653d8b11`. O baseline
de `2026-09-08T02:56:16.260Z` registra 253 rotas, 249 protegidas/4 públicas,
690 arquivos frontend, 161 fontes alteradas, 20 evidências e nenhum ausente.
SPA: 209 arquivos/1.818 testes; API: 576/576; build: 807 módulos/482
precaches PWA. O candidato continua `ACTIVE/HOLD`: a crítica fresh independente
segue pendente e permanecem os gates de PostgreSQL/RLS/E2E real, UAT, touch/zoom
nativos e leitor de tela; não há DONE, AAA ou GO global.

## Verificação final com fingerprint completo — 08/09/2026

O harness passou a incluir explicitamente os módulos extraídos do workbench e o
helper de limites da API. Com o novo SHA
`2e47786aae669daebfc7bd04157b3516ab34f9a0543f5bcf0bcf153ad30f2a3e`, as
recapturas finais estão sem falhas e com `inputsStable=true`:
`continuity-P2Gxqb` (FEA-027, 20/20), `continuity-VQ6hGd` (FEA-028, 12/12)
e `continuity-gxcDmq` (FEA-029, 4/4). O baseline de
`2026-09-08T03:11:50.262Z` registra 253 rotas, 249 protegidas/4 públicas,
690 arquivos frontend, 161 fontes alteradas, 20 evidências e nenhum ausente.
A complexidade segue válida (8.333/8.335 no `server.ts`, 3.142/3.186 no
workbench), SPA 209/1.818, API 576/576 e build 807 módulos/482 precaches PWA.
O candidato permanece `ACTIVE/HOLD`: a revisão fresh independente está em
andamento e os gates de PostgreSQL/RLS/E2E real, UAT, touch/zoom nativos e
leitor de tela continuam abertos.

## Recaptura após hardening de catálogo e cobertura financeira — 08/09/2026

Os três recortes foram recapturados após a última alteração de código, usando
o mesmo harness fingerprintado (`0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`):
`continuity-ExFscb` cobre FEA-027 em 20/20, incluindo interações completas de
Pedidos e Laudos e 112 checks Axe sem violações; `continuity-D7FDxP` cobre
FEA-028 em 16/16, com Pagamento Antecipado e comparação byte-for-byte do CSV
browser com catálogo/BOM/LF/no-final-newline; `continuity-sdJGV7` cobre FEA-029
em 4/4, e o teste unitário impede grant para alvo de matriz removido por
refresh. Baseline: `2026-09-08T03:29:53.810Z`, 253 rotas, 249 protegidas,
690 arquivos frontend, 161 fontes alteradas, 20 evidências, nenhum ausente.
O estado segue `ACTIVE/HOLD` até crítica fresh, PostgreSQL/RLS/E2E real, UAT,
touch/zoom e leitor de tela.

## Recaptura final após hardening de concorrência — 08/09/2026

As últimas alterações protegeram o refresh concorrente de Pedidos de
Laboratório contra respostas obsoletas e bloquearam mutações da matriz de
acesso durante a atualização do catálogo; ambos os cenários têm teste focado.
As recapturas pós-código estão sem falhas e com `inputsStable=true`, usando o
harness SHA
`0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`:

- `continuity-v2XVM5/report.json`: FEA-027, 20/20; Pedidos, Laudos,
  Hemogramas, Urina e Bioquímico em 1440/390 × claro/escuro, com 112 checks
  Axe sem violações.
- `continuity-udvwWj/report.json`: FEA-028, 16/16; Estoque, Contas a Pagar,
  Contas a Receber e Pagamento Antecipado, com catálogo de colunas e CSV
  browser byte-for-byte contra o artefato server-side.
- `continuity-4SjGml/report.json`: FEA-029, 4/4; 403/retry, cinco abas,
  matriz, foco, reflow e Axe 0.

A regressão SPA passou 209 arquivos/1.821 testes; API `tsc`, build PWA,
complexidade, documentação e OpenAPI passaram. O baseline foi regenerado às
`2026-09-08T04:27:10.563Z`: 253 rotas (249 protegidas/4 públicas), 690
arquivos frontend, 161 fontes alteradas, 88 assets, 20 evidências e nenhum
ausente; o hash de status do worktree capturado coincide com o estado atual.
Os críticos fresh Kant e Einstein não devolveram parecer após os prazos e foram
encerrados sem edições; isso não é aprovação. O candidato permanece `ACTIVE/HOLD`, sem
`DONE`, `AAA` ou `GO` global, aguardando os gates reais de PostgreSQL/RLS/E2E,
UAT, touch/zoom e leitor de tela.

## Retomada prioritária — Agenda e pacientes — 08/09/2026

O modo `AGENDA_CONTEXT=1` foi executado no navegador real com respostas
sintéticas e gerou `evidence/continuity-NbXXN0/report.json`: 30/30, cinco
aliases (`/appointments`, `/agenda`, `/agendamentos`, `/atendimento/agenda` e
`/atendimento/atendimentos/agenda`), dois temas e 1440/768/390. Deep link,
retorno, reload estrutural, limpeza do texto livre, ativação Enter/Espaço,
drawer/foco e overflow local passaram sem falhas.

O modo `PATIENT_CONTINUITY=1 FORM_ZOOM_PROXY=1` gerou
`evidence/continuity-2btgiv/report.json`: seis interações por combinação,
incluindo troca de `ownerId` com rascunho sujo, continuar/descartar, falha e
sucesso de save, desmontagem e logout; 1440/390 e proxy 195×422 em claro/escuro.
Ambos os relatórios têm `inputsStable=true`, `failures=[]` e o harness SHA
`0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`.

Os testes focados de Agenda/pacientes passaram 109/109 e `vue-tsc` passou. A
inspeção visual móvel não encontrou regressão material no escopo exercitado.
Isto melhora a evidência bounded, mas não fecha backend/RLS, device/touch,
zoom nativo, leitor de tela, participantes ou UAT; os 34 FEA continuam
`ACTIVE/HOLD`.

## Otimização de entrada e recaptura — FEA-031 — 08/09/2026

O mapa de autorização foi separado da árvore visual em
`apps/spa/src/navigation-permission-catalog.ts`, sem mudar o fail-closed do
router ou os aliases legados. O teste de paridade navegação↔catálogo passou,
assim como o recorte de guards em 39/39.

Após o build PWA (808 módulos/482 precaches), o laboratório em
`performance-lab-2026-09-07.json` mediu três vezes `/`, `/login` e a Agenda em
Chromium 145: 349.438 B brutos/97.936 B gzip no HTML inicial, redução de 4.552 B
gzip sobre a captura anterior e desvio reduzido de +10,91% para +5,98% contra a
baseline de 92.406 B. FCP/LCP máximos foram 164/164/128 ms, long task máxima
zero e não houve erro de página; o budget continua HOLD para decisão técnica.
Essa prova segue laboratorial, sem INP/RUM/rede lenta/dispositivo/API/DB real.

O harness passou a fingerprintar o catálogo e a Agenda foi recapturada em
`evidence/continuity-zS51Zc/report.json`: 30/30, sem falhas, entradas estáveis,
cinco aliases, dois temas e 1440/768/390. A SPA completa passou 209 arquivos/
1.822 testes. Baseline: `2026-09-08T04:51:09.242Z`, 253 rotas, 690 arquivos,
162 fontes alteradas, 88 assets e 20 evidências sem ausentes. O candidato
permanece `ACTIVE/HOLD`; não há DONE/AAA/GO global e continuam abertos os gates
de aprovação de orçamento, PostgreSQL/RLS/E2E real, UAT, touch/zoom nativos e
leitor de tela.

## Recaptura FEA-030 — acessibilidade — 08/09/2026

`ACCESSIBILITY_CONTINUITY=1` passou 56/56 em quatro superfícies (`/owners`,
`/appointments`, `/reports/inventory` e `/access-control`), sete breakpoints
(320/375/390/768/1024/1280/1440), claro/escuro e reduced motion. Axe ficou em
zero em todas as combinações; skip-link, foco, reflow, largura documental e
estabilidade das entradas passaram. Relatório:
`evidence/continuity-BUIQ3Y/report.json`, SHA
`a5870e543a673ba2c285c4af636028d03372a03a42fc01b9a1315acdbb2632d7`, harness
`6a95e1f1d3dd324ed60d55927f9773970aa4a0b1b26618afe73642030d9e1481`.
Renders móveis foram inspecionados sem regressão material no recorte. Leitor
de tela real, zoom/touch nativos, outros navegadores e UAT seguem pendentes;
o baseline corrente é `2026-09-08T04:56:52.478Z`, com 20 evidências indexadas.

## FEA-031 — segunda otimização do entry público — 08/09/2026

Além do catálogo leve de autorização, `apps/spa/src/router/index.ts` passou a
carregar `api.ts` e `setup.ts` dinamicamente apenas durante restauração de
sessão/guarda. O contrato fail-closed permaneceu intacto: router focado 17/17,
`vue-tsc` passou e a SPA completa passou 209 arquivos/1.822 testes.

O build PWA passou 808 módulos/484 precaches. O laboratório recapturado mediu
491 arquivos e 346.131 B brutos/96.440 B gzip no entry inicial, contra 97.936 B
na rodada anterior e 92.406 B na meta: redução de 1.496 B e desvio atual de
4.034 B (4,37%), ainda `HOLD_FOR_OWNER_APPROVAL`. FCP/LCP máximos foram
172/172 ms na raiz, 100/100 ms no login e 132/132 ms na Agenda; long task e
erros de página ficaram em zero. A medição não prova campo, INP, RUM ou rede
lenta.

Agenda pós-código: `evidence/continuity-GIcnDP/report.json`, 30/30, cinco
aliases, dois temas, 1440/768/390, estável e sem falhas. Acessibilidade
pós-código: `evidence/continuity-kwfsaC/report.json`, 56/56, Axe 0, sete
breakpoints, claro/escuro e reduced motion. Baseline regenerado às
`2026-09-08T05:10:51.639Z`, 253 rotas, 690 arquivos, 162 fontes alteradas,
88 assets, 20 evidências sem ausentes; o plano segue ACTIVE/HOLD.

## FEA-031 — tabela privada de rotas e evidência final — 08/09/2026

O router agora mantém apenas MFA/login/setup e um fallback leve no entry
público; `apps/spa/src/router/routes.ts` é carregado uma vez no primeiro caminho
deferred e então adiciona a tabela privada ao Vue Router. A primeira captura
detectou que os aliases da Agenda não estavam sendo classificados pelo fallback
e exibiu `NotFound`; a hidratação foi ajustada para todos os caminhos deferred,
sem remover o deny-by-default depois que a tabela é instalada. O recorte passou
32/32 testes de rota/guard, `vue-tsc` passou e a regressão SPA passou 209/1.822.

O build final passou com 809 módulos/485 precaches; `dist` tem 492 arquivos e
3.855.394 bytes. O entry inicial passou a 253.272 B brutos/76.875 B gzip, abaixo
do alvo de 92.406 B (−15.531 B, −16,81%) e 19.565 B abaixo da rodada de 96.440 B.
O laboratório registrou FCP/LCP máximos de 172/172 ms na raiz, 84/84 ms no
login e 128/128 ms na Agenda, sem long task ou erros; o relatório permanece
laboratorial e `HOLD_FOR_OWNER_APPROVAL` até decisão do owner.

Evidência atual: Agenda `continuity-wCJGZ6` 30/30 nos cinco aliases, dois
temas e 1440/768/390, sem falhas e com entradas estáveis; acessibilidade
`continuity-tQnwrY` 56/56 em quatro superfícies, sete larguras, claro/escuro,
reduced motion e Axe 0. Baseline de `2026-09-08T05:40:00.520Z`: 253 rotas,
690 arquivos frontend, 163 fontes alteradas, 20 evidências sem ausentes.
O estado continua ACTIVE/HOLD: backend/RLS/E2E real, RUM/INP, UAT,
cross-browser, touch/zoom nativos e leitor de tela seguem pendentes.

## Certificação E2E final e recaptura de performance — 08/09/2026

O candidato foi certificado em execução integral contra API/SPA reais, banco
PostgreSQL descartável isolado e Redis nativo. A execução aplicou migrações
0000–0164, seed/RLS, `productionReady=true` e removeu o banco exclusivo ao
final. O Playwright encerrou com `420/420` testes, sem falhas, skipped ou
flakiness; o inventário validou `150` rotas e `300` navegações. Artefato
autoritativo: `artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/gauntlet-full-final-20260908T071316208Z/`, run
`gauntlet-full-final-20260908T071316208Z`, SHA de evidência
`a48d76a1835766da353f6c9618cf91d5c0fe6f87` e digest do inventário
`e624edb6623ae602988f7fa828f20bcf74226e842fc0adc54d992e24e68e2db0`.

O hardening que fechou a execução inclui `Idempotency-Key` automática e
reutilizada no fixture de mutações, locators alinhados ao shell atual da
Agenda e reuso do `executionId` exibido nos exports financeiros, sem POST
duplicado. O recorte focused de Agenda/billing/login passou `8/8`, o recorte
de exports passou `10/10` e a matriz visual passou `29/29`. Os snapshots que
mudaram foram atualizados somente depois de inspeção visual dos renders atuais
(incluindo o material CVG Pulse/orbit e o shell page-owned); isso registra o
estado intencional do produto e não constitui aprovação global.

Após o build PWA (`809` módulos, `485` entradas de precache), o laboratório
recapturado em `performance-lab-2026-09-07.json` registrou `492` arquivos,
3.855.614 B no `dist` e `253.272 B` brutos/`76.876 B` gzip no entry inicial,
`−16,81%` contra a meta de 92.406 B. Os máximos FCP/LCP foram 168/168 ms em
`/`, 96/96 ms em `/login` e 132/132 ms na Agenda; long tasks e erros de página
ficaram em zero. O budget observado está dentro do alvo, mas segue
`HOLD_FOR_OWNER_APPROVAL`: a medição é laboratorial/sintética para a Agenda e
não mede RUM, INP/CLS de campo, API real, participante ou UAT.

Esta certificação remove o bloqueio anterior de E2E local, mas não fecha os
gates externos: UAT/participantes, provider PIX e ciclo de confirmação/
reversão de produção, RUM/INP/CLS, touch/zoom nativos, leitor de tela real e
cross-browser. Portanto os 34 FEA permanecem `ACTIVE/HOLD`, sem autoatribuir
`DONE`, `AAA` ou `GO` global.

## Recaptura FEA-024 — inpatient após crítica fresh — 08/09/2026

A crítica independente fresh encontrou e rejeitou quatro lacunas bounded:
rascunho de Alta atravessando troca de rota, repetição da hierarquia no detalhe,
estados vazio/erro/retry sem prova e leitura móvel fragmentada. O código foi
corrigido sem reduzir o escopo: `resetChartState()` agora fecha e limpa o modal
de Alta em toda troca de internação; o detalhe mantém status/localização no
resumo e evita repetição; refresh transitório preserva lista/ocupação
confirmadas e 403 remove o snapshot autorizado; o mapa não combina alerta de
erro com estado vazio; cartões do mapa têm navegação direta para o leito e
`BedDetailPage` diferencia `occupied/maintenance/blocked/available` por
variante semântica; a tabela de internações vira cards rotulados em viewport
móvel sem `min-width` residual.

O harness foi ampliado para falha inicial/retry, vazio de lista/mapa, 403,
quatro status de leito e troca de rota com rascunho destrutivo. A recaptura
Chromium em claro/escuro, 1440×900 e 390×844 passou `16/16` linhas, `9`
interações, `failures=[]` e `inputsStable=true`:
`docs/frontend/implementation/evidence/continuity-dLYFRJ/report.json`,
gerado em `2026-09-08T08:32:26.554Z`, SHA
`a20e17861cdfe14c1656248330fb75ac969ddbff07f579d94bd1880062ffe08`; harness
SHA `581c70cd1cd68db73a3db26fb1a3b58563548d572aa4e5a74fe7707b62cc23a8`.
Os renders mobile claro/escuro foram inspecionados: valores dos cards, status
e ações permanecem legíveis, sem overflow horizontal documental.

O recorte focado inpatient passou `69/69` e a regressão SPA anterior passou
`209/1.823`. Esta evidência fecha o gap bounded da FEA-024, mas não promove o
status global: continuam externos UAT/participantes, leitor de tela real,
zoom/touch nativos, cross-browser, RUM/INP/CLS, provider PIX/reversão de
produção e aceite integral dos 34 FEA.

## Recertificação do candidato após FEA-024 — 08/09/2026

Após a recaptura bounded da internação, a validação posterior ao código passou
`vue-tsc`, documentação, OpenAPI (`414` paths), complexidade e `git diff --check`.
A regressão SPA completa passou `209` arquivos/`1.830` testes. O build PWA passou
`809` módulos/`485` entradas de precache, com `492` arquivos e `3.858.893` bytes
em `apps/spa/dist`; o entry inicial ficou em `253.272` B brutos/`76.872` B gzip,
`15.534` B (`16,81%`) abaixo do alvo laboratorial de `92.406` B. O laboratório
recapturado em `performance-lab-2026-09-07.json` (SHA
`00848bc429e62f10ec444d573abe43463366c9bf0edd9f03017dbeb50d797304`, observado
às `2026-09-08T08:48:26.484Z`, fingerprint de build
`d0076b8231c85421934467d6a0f4bf4f46d457f958524afe13dedc03c6617db6`) mediu
FCP/LCP máximos de `164/164` ms em `/`, `84/84` ms em `/login` e `124/124` ms
na Agenda, sem long task ou erro de página. O budget observado permanece
`HOLD_FOR_OWNER_APPROVAL` por ser laboratório, não RUM/INP/CLS ou UAT.

O E2E integral posterior ao código passou `420/420`, sem skipped, unexpected ou
flaky, contra PostgreSQL nativo descartável novo, Redis nativo, migrações
`0000–0164`, seed/RLS e `productionReady=true`. Inventário: `150` rotas e `300`
navegações; SHA `a48d76a1835766da353f6c9618cf91d5c0fe6f87`, digest
`a5dad4becfc9cbb8f9daa0d2c9111dc821bd9fcd4ae9ea4489ca2e1667c5f827`; artefato:
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/1b8b9d6c-7722-4e3b-ba4e-6ac398e2a0de/`.
O runner oficial terminou com sucesso e arquivou a evidência; a camada de
encapsulamento nativo atingiu o deadline padrão de 120 s antes do término da
suíte, por isso esse detalhe fica registrado separadamente e não é contado
como falha de teste. A base UUID exata foi removida depois e confirmada ausente.

As mudanças FEA-024 continuam provadas bounded por
`continuity-dLYFRJ/report.json` (`16/16`, nove interações, dois temas e
1440/390, `failures=[]`, `inputsStable=true`, relatório SHA
`a20e17861cdfe14c1656248330fb75ac969ddbff07f579d94bd1880062ffe08`, harness SHA
`581c70cd1cd68db73a3db26fb1a3b58563548d572aa4e5a74fe7707b62cc23a8`) e pelo
recorte focused inpatient `69/69`. O estado permanece `ACTIVE/HOLD`: UAT,
participantes, provider PIX/reversão produtiva, RUM/INP/CLS, touch/zoom nativos,
leitor de tela real, cross-browser e aceite integral dos 34 FEA continuam gates
externos.

## Recaptura corrente após hardening de zoom proxy — 08/09/2026

A inspeção visual do fluxo de pacientes encontrou quebra real no proxy de
`195×422`: a trilha opcional do shell ocupava o espaço restante e quebrava o
contexto em uma letra por linha. `apps/spa/src/layouts/AppLayout.vue` agora
mantém o overline compacto e oculta somente a trilha opcional até `260px`; o
harness também verifica esse contrato, sem reduzir o contexto operacional.

O fingerprint vigente do harness é
`30185ccb4156b894da0a9b2fdaee0b86e549a74641cd5ba0933afe033b9850da`. Com ele,
Agenda passou `30/30` em cinco aliases, dois temas e 1440/768/390
(`continuity-WblISX`, SHA `54f1e0d502b1a500924852d6f4bd5a4622b2dae8663d50c9ee649cd40e514561`);
pacientes passou seis linhas em 1440/390/195, dois temas e sete interações,
incluindo o reflow compacto (`continuity-FrR3ne`, SHA
`4be892c92a18c88dee98720308c57927e2bbdea6f220577e7448c8096fd13f83`); e
internação passou `16/16` com nove interações (`continuity-9TuPBV`, SHA
`79a2601a4d372ea9733c632289aa9e0f174290c36eb30e85bef4333bdbc81f4a`). Todos
ficaram com `failures=[]` e `inputsStable=true`; os renders representativos
foram inspecionados em claro/escuro.

O focused `PatientFormPage+AppPageHeader` passou `67/67`, a SPA completa passou
`209/1.830`, `vue-tsc` passou e o build PWA fechou em `809` módulos/`485`
precaches. A performance foi recapturada às `2026-09-08T09:21:05.865Z`:
`492` arquivos/`3.859.242` B, entry `253.272` B/`76.877` B gzip, FCP/LCP
máximos `164/88/136` ms e zero long task/erro; relatório SHA
`0cfeebfa4324f889b80ef2369635e5042498e1e213e9e9497540257fcb71ec1a`, ainda
`HOLD_FOR_OWNER_APPROVAL` por ser laboratório.

O E2E integral `420/420` continua como certificação anterior ao ajuste isolado
de `≤260px`; as matrizes atuais de browser acima são a prova fresh da fonte
vigente para as superfícies afetadas. O estado global permanece `ACTIVE/HOLD`:
UAT/participantes, provider PIX/reversão produtiva, RUM/INP/CLS, touch/zoom
nativos, leitor de tela real, cross-browser e aceite dos 34 FEA continuam
externos.

## Matriz cross-browser — recorte anterior ao scheduler da FEA-013 — 08/09/2026

A fonte vigente naquele recorte passou a matriz crítica bounded nos três engines
Playwright: `72/72`, sem skipped, unexpected ou flaky — Chromium `24/24`,
Firefox `24/24` e WebKit `24/24`. Foram exercitados os seis fluxos de
acessibilidade e os dezoito cenários responsivos nos viewports
`320×568`, `768×1024` e `1024×768`, cobrindo owners, Agenda, prontuário,
billing, relatórios e access-control; Axe, landmark principal, skip-link e
foco por teclado passaram.

O resultado daquele recorte está em `playwright-report/usability/results.json`, SHA
`86a1256dde08116df25c4f32c56dc499e098ef2b1f55f206302338c855d0233c`, concluído
às `2026-09-08T09:45:56.037Z`. A execução usou PostgreSQL descartável e Redis
nativo; o banco foi removido e a checagem final confirmou `remaining=0`.
Isto é evidência cross-browser bounded da fonte anterior ao scheduler atual da
FEA-013; não é usada como aprovação do movimento dessa FEA e não substitui
leitor de tela físico, touch/zoom nativos, participantes ou UAT. A decisão
global continua `ACTIVE/HOLD`, sem `DONE/AAA/GO`.

## FEA-013 — recaptura pós-crítica e remoção de espera artificial — 08/09/2026

A crítica fresh I1 (`FEA-013-FC-20260908-I1`) rejeitou a versão anterior por
manter `setTimeout` de 360 ms, não bloquear o submit enquanto o sucesso estava
pendente e não respeitar movimento reduzido no foco de erro. Essas observações
foram tratadas no candidato atual: `successRedirect.ts` agora usa um único
`requestAnimationFrame` cancelável para movimento padrão e `queueMicrotask` para
`prefers-reduced-motion`, sem `setTimeout`/`delayMs`; `begin()` recusa novo envio
durante `successPending`; os 18 consumidores ligam esse estado ao CTA; e o
scroll de erro do paciente usa `auto` quando o movimento é reduzido.

Prova atual do navegador real da SPA:

- padrão: `evidence/continuity-PLLoXB/report.json`, SHA
  `6b4d60a6d0afcf39c5497d078d3a670275b9ab47e3e37a98414a5bf0d82f6202`, seis
  combinações 1440/390/195 × claro/escuro, zero falhas, inputs estáveis, oito
  interações e seis vídeos WebM; o trace confirma botão desabilitado no estado
  de sucesso e um único rAF antes do redirect;
- movimento reduzido: `evidence/continuity-HRBnIM/report.json`, SHA
  `4eeae9bebdd4976554467b496c19a4906252707376dae342e54a6dd5d80aa244`, mesmas
  seis combinações e seis vídeos; `prefers-reduced-motion=true` e zero rAF de
  deslocamento antes do redirect;
- o harness atualizado é `browser-continuity.mjs`, SHA
  `da59078ee71bacf15f5edce97465eb8efc72f43c76421d9baa55b240ad4d6ff8`.

O focused `successRedirect/useFormValidation` passou `9/9`, a regressão SPA
passou `210/1.832`, `vue-tsc --noEmit` passou e o build/performance atual
passou com `809` módulos, `485` precaches, `492` arquivos, `3.860.541` B,
entry inicial `253.272` B/`76.878` B gzip, FCP/LCP máximos `176/88/128` ms e
zero long tasks/erros. O relatório é
`performance-lab-2026-09-07.json`, SHA
`f0facb40ab563eb0f6c656b71efb4a9e5bb32110c650e1038486f5999e4be820`, e segue
`HOLD_FOR_OWNER_APPROVAL` por ser medição laboratorial.

Esta é uma aprovação bounded do recorte Patient + inventário estático dos 18
consumidores, não aprovação global: ainda faltam uma execução de sucesso em
cada consumidor, timeline em dispositivo real, observação cross-browser do
movimento, leitor de tela/touch/zoom nativos, participantes e UAT. A nova
crítica I2 está sendo executada sobre o código integrado; até seu retorno o
estado permanece `ACTIVE/HOLD`, sem `DONE/AAA/GO`. A crítica I2 fresh
(`FEA-013-FC-20260908-I2`) foi encerrada como
`UNAVAILABLE_TIMEOUT_SHUTDOWN` após janelas de espera e follow-up sem mensagem
final. Portanto não há aprovação independente do candidato atual nem promoção
para `DONE/AAA/GO`.

## Recorte corrente — FEA-007, FEA-012 e FEA-013 — 08/09/2026

### FEA-013 — dono único do sucesso e ciclo de navegação

O candidato atual mantém a cópia genérica persistida antes de redirects de
documento e, em navegação SPA, aguarda a Promise real de `router.push` antes de
ativar o flash no `AppLayout`. O shell é o dono da superfície global; durante a
pendência e enquanto o flash persistido está visível, o alerta local de sucesso
do formulário é ocultado para não duplicar a mensagem na árvore visual ou
acessível. Os cinco consumidores de formulário que limpam o coordinator no
`onBeforeUnmount` usam `invalidate()` durante a navegação, preservando o ciclo
bem-sucedido; cancelamento continua reservado para uma tentativa realmente
abortada. A geração da animação também invalida continuations antigas em
sequências rápidas A→B→C.

A prova Chromium atual passou 6/6 em movimento padrão
(`evidence/continuity-dY28sf/report.json`, SHA
`31e0f4388e2434d310cfd1a3338670776699acb908b73ee643d1fa2a13da1602`) e 6/6
em `prefers-reduced-motion`
(`evidence/continuity-osPx7r/report.json`, SHA
`f3f962c31675ad1d49724111abc495289ff5a4a331da7052d9fe54bea9d9407c`), ambos
sem falhas e com inputs estáveis. O focused que reúne sucesso, foco/scroll,
metadados de lista, tabela e usuários passou 98/98; a SPA inteira passou
211 arquivos e 1.852 testes; `vue-tsc --noEmit` passou. O E2E nativo do runner
oficial passou 23/23 com PostgreSQL descartável/RLS e Redis isolado; o relatório
sanitizado está em `evidence/success-redirect-e2e-20260908.json` e a limpeza
confirmou banco ausente, Redis DB 15 vazio e portas 3111/3112 livres.

O recorte é bounded: ainda não cobre todos os consumidores em runtime,
Firefox/WebKit após o scheduler, touch/zoom físico, leitor de tela real, UAT,
RUM/INP/CLS ou os gates de provider PIX/reversão. A aceitação independente
fresh segue separada; o estado global continua `ACTIVE/HOLD`, sem `DONE`, `AAA`
ou `GO`.

### FEA-007 — foco de rota, retorno e rolagem local

`useRouteFocus` agora limpa identidades antigas antes de qualquer saída sem
chave, salva `scrollLeft`/`scrollTop` dos containers locais por posição de
histórico, restaura somente controles estruturais ainda elegíveis e invalida
callbacks de frames anteriores. Quando o alvo de retorno ou as linhas ainda
não chegaram, um `MutationObserver` reprocessa a restauração enquanto a página
está ocupada/carregando; há fallback limitado por rAF para ambientes sem
observer. O branch forward também descarta entradas de foco/scroll que não são
mais alcançáveis.

O arquivo de testes dedicado passou 32 casos, incluindo stale callback,
identidade não estável, retorno assíncrono, coordenadas locais e guard de foco
explícito. O contrato continua deliberadamente limitado: guards que executam
antes do composable devem declarar `preserveNavigationFocus`, e a cobertura de
todos os módulos, browsers, leitor de tela e UAT ainda não é inferida desses
testes.

### FEA-012 — estados terminais seguros da tabela

`useListData` expõe status HTTP/código estruturado sem alterar o contrato de
texto existente. `DataTable` diferencia vazio, sem resultados, erro,
indisponibilidade e proibido; erros transitórios mantêm as linhas já confirmadas
ao lado de um feedback compacto com retry. `UsersListPage` mapeia 403 para
proibido sem retry, 408/5xx e códigos de transporte para indisponível com retry,
e usa cópia genérica segura para os demais erros sem interpolar payload bruto.
O focused de DataTable, UsersListPage e metadata de lista ficou incluído no
recorte 98/98 acima; a suíte SPA 211/1.852 também passou.

Essa é uma qualificação bounded de componentes e da superfície de usuários,
não uma prova de autorização real, RLS, políticas por tenant, persistência,
todos os consumidores ou UAT. O estado global permanece `ACTIVE/HOLD` e aguarda
o parecer fresh independente e os gates externos registrados no plano.

## Continuação corrente — identidade semântica de rolagem FEA-007 — 08/09/2026

Para eliminar a ambiguidade entre tabelas que mudam de ordem, o `DataTable`
passou a emitir `data-scroll-key` a partir de `scrollKey`/`caption`, e o
`useRouteFocus` deriva a chave do título semântico do `DsCard` quando uma tabela
legada não fornece os atributos. Snapshots agora guardam a ocorrência dentro
da chave e resolvem por identidade antes do fallback global. O teste de duas
regiões reordenadas passou; o recorte `useRouteFocus` + `DataTable` ficou em
`59/59` testes.

O harness browser corrente `continuity-8pJS03` passou `4/4` combinações em
claro/escuro e 1440/390, sem falhas, com `inputsStable=true`, scroll vertical
restaurado e foco de retorno em `Cancelar`, sem requests documentais. O SHA do
relatório é `e2790bf5f63c6d1707f5313cc92f7a36da3208045c5fc225c176a0db25864e79`;
essa prova continua bounded a Chromium/API sintética e não cobre leitor de
tela, touch/zoom físico ou UAT.

## Recaptura cross-browser corrente — 08/09/2026

Depois do scheduler vigente da FEA-013 e do hardening semântico de rolagem, a
matriz crítica foi executada nos três engines: `72/72`, sem skipped, unexpected
ou flaky; Chromium, Firefox e WebKit passaram `24/24` cada. O artefato
congelado é `evidence/cross-browser-current-20260908/report.json`, SHA
`03699965186823f6ef95a5daf8e87ae40098704b793efbf6f6213c528c3e3485`, com
PostgreSQL nativo descartável (0000–0164), Redis DB 14 e cleanup confirmado.
Isto atualiza a matriz anteriormente marcada como stale, mas permanece bounded:
não cobre leitor de tela real, touch/zoom físico, UAT, RUM/INP/CLS ou promoção
global.

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

O status continua `ACTIVE/HOLD`, sem `DONE`, `AAA` ou `GO`: o recorte não
substitui UAT, revisão humana, participantes, RUM/INP/CLS, touch/zoom nativos,
leitor de tela real, provider PIX/reversão produtiva ou aceite integral dos 34
FEA.

## Recaptura visual corrente — 08/09/2026

A suíte `e2e/spa/visual/visual-regression.spec.ts` passou `29/29` em Chromium,
sem skipped, unexpected ou flaky, depois da identidade semântica de rolagem.
O relatório está em
`evidence/visual-current-20260908/report.json`, SHA
`e8ba7cedd4ab3348ce2544b554fe3385e7ee9e940cad0b786df37eb451ee2969`, com
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

## Correção FEA-007 e recaptura de relatórios — 08/09/2026

A crítica fresh de Dalton encontrou um S2 concreto: a captura de rolagem já
derivava a chave pelo título do `DsCard`, mas a restauração filtrava somente
`data-scroll-key` explícito. Tabelas legadas dentro de cartões titulados podiam
portanto perder sua coordenada após reordenação. `useRouteFocus` agora usa a
mesma função semântica nos dois caminhos, preservando prioridade da chave
explícita e ocorrência dentro da chave. O teste regressivo de cartões legados
passou `60/60` no focused `useRouteFocus` + `DataTable`; a regressão SPA passou
`211/211` arquivos e `1.854/1.854` testes; `vue-tsc` e o build passaram com
`809` módulos e `487` precaches.

O browser harness corrente `REPORT_CONTINUITY=1` gerou
`evidence/continuity-ZOBZNO/report.json` (SHA
`bd6c6fcd73a9b588e006f5771bb3b574dc4226bd295305879c90d04b0b7cc7c3`):
`16/16` combinações em relatórios reais da SPA, claro/escuro e 1440/390,
`failures=[]` e `inputsStable=true`, incluindo tabelas dentro de `DsCard` e os
estados preenchido/vazio/falha/retry. O harness tem SHA
`46ca1c43be20a4afbd60a288fc216eca0388fe3126a96d3dd0772b82b1f654e1`. A
recaptura é bounded e não substitui o teste de histórico em dispositivo,
leitor de tela, touch/zoom nativos ou UAT.

O teste isolado do relatório de pacientes que havia excedido o timeout concluiu
`1/1` em `6,9 s` contra PostgreSQL/Redis nativos, com exportação HTTP 200 e
limpeza dos registros temporários. A execução integral anterior continua
inválida: `415` casos observados antes de SIGTERM/código `143`, sem fechamento
do Playwright. O estado permanece `ACTIVE/HOLD`, sem `DONE`, `AAA` ou `GO`.

## Recaptura FEA-012 — matriz browser de usuários — 08/09/2026

Para fechar a lacuna apontada por Dalton, o harness ganhou o modo
`USERS_CONTINUITY=1` com a superfície real `UsersListPage`. A execução passou
`4/4` em claro/escuro e 1440/390, sem erros e com `inputsStable=true`, cobrindo
estado populado, filtro sem resultados, indisponibilidade 503 com linhas
confirmadas preservadas e retry, e mudança posterior para 403 com linhas e
contadores zerados, sem retry enganoso ou detalhes do servidor expostos. O
artefato é `evidence/continuity-tdvKP0/report.json`, SHA
`61c90dcec8e2cd4f376a2bd2cf65e3a04d37efd5cb8f7ea678d147b537d2eed2`; o
harness atual tem SHA
`247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`.

Essa é uma prova bounded da composição browser/fixture da tela de usuários e
DataTable. Não comprova autorização/RLS/persistência reais, todos os
consumidores, leitor de tela físico, touch/zoom, participantes ou UAT. O
estado global permanece `ACTIVE/HOLD`, sem `DONE`, `AAA` ou `GO`.

## Recertificação posterior do candidato corrente — 08/09/2026

Depois da revisão fresh de Goodall, os vínculos stale foram eliminados com o
harness `browser-continuity.mjs` na versão SHA
`247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`.

FEA-007 tem agora `evidence/continuity-XHWFs6/report.json` (SHA
`3f02aed439c294c963f484331e6c99ef7dc4832446d2836d68264e756369e158`): 4/4
combinações Chromium, zero falhas, inputs estáveis e interação
`native-history-scroll-and-route-focus` com retorno exato de scroll (623 px
desktop/1.643 px mobile), foco em `Cancelar` e zero requests documentais. O
focused `useRouteFocus` + `DataTable` passou 60/60. A matriz de críticos foi
recapturada após o mesmo conjunto de fontes: `evidence/cross-browser-current-20260908/report.json`,
SHA `c203d8a45d287a21407c4c07bc0c322eb2854fb3960ec9320bcb3a0ac41e3755`,
Chromium/Firefox/WebKit 24/24 cada, total 72/72.

FEA-013 tem recaptura padrão em `evidence/continuity-UNgisr/report.json`, SHA
`6a5ef29c0d48afaae5c467de6de565d102308a2f69bd38ffb438e2ea4834147a`, e
reduced motion em `evidence/continuity-w8uHmC/report.json`, SHA
`1289182f3f9029c21b2f7be9b6b02a08fa54a9d72104cae89e6c54c4ece0c854`: 6/6
cada, claro/escuro, 1440/390/195 CSS proxy, zero falhas, alerta global único,
zero alerta local e 2/0 rAF. FEA-012 mantém a matriz `continuity-tdvKP0`
4/4, com populado/no-results/503-retry/403 e limpeza segura de rows/contadores.

A suíte visual `visual-current-20260908/report.json` foi recapturada em
Chromium com 29/29, sem skipped/unexpected/flaky, SHA
`edad8cbf1be9b03a2252b052c8ae58e41c1053532ded770a4b426d9de861de23`. Todas
essas provas são bounded. Goodall classificou FEA-007 como HOLD S2, FEA-012
como PASS_WITHIN_CONTRACT S3 no recorte Users/DataTable e FEA-013 como HOLD S2;
não houve aprovação global/AAA/GO. Permanecem UAT, revisão humana, participantes,
RUM/INP/CLS, touch/zoom/leitor de tela reais, provider PIX/reversão e uma
execução integral de 420 casos com fechamento válido.

## Tentativa integral serial final — diagnóstico de runtime — 08/09/2026

A tentativa integral corrente foi executada com os 420 casos inventariados,
Chromium, PostgreSQL nativo descartável e Redis DB 15 isolado. Ela terminou
com `56 passed`, `2 failed`, `1 interrupted` e `361 did not run`. Os casos
`clients` e `patients` de `report-registration-exports` falharam por timeout
explícito de 90 s — respectivamente no fechamento/networkidle e na fixture
`authSession` — e o caso `services` foi interrompido antes do fechamento do
Playwright.

O archive é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/2026-09-08T16-50-20-994Z/`.
O validator rejeitou-o porque `master-usability-audit.json` não estava
presente; o resultado é `not_accepted` e não conta como PASS. Após a tentativa,
o banco temporário foi removido, Redis DB 15 ficou em `0` e as portas 3111/3112
foram verificadas livres. O estado durável permanece `VERIFY / ACTIVE / HOLD`.

## Execução integral serial encerrada com evidência válida — 08/09/2026

A rodada serial corrente foi concluída contra PostgreSQL nativo descartável e
Redis DB 15 isolado, com Chromium e os 420 casos inventariados. O runner
terminou com `420 passed`, `0 failed`, `0 interrupted` e `0 did not run` em
11,9 minutos. O validator confirmou `tests=420`, `routes=150`,
`navigations=300` e `inventoryDigest=7ccdcd0adb2af787fe3fd08e7dbfff8b1a34081dda558dceb1ec93117321c83c`.

O archive válido é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-final-20260908/`.
Seu `results.json` tem SHA `3995a45143b4fbb2ced709aaac352b3a231c84894406a66737b229223818e837`
e `metadata.json` tem SHA
`f5eac1f39fcb40ee8fec63b0b1cdb62b5b5fa4b66dcc3db9eac2df95d7e533ba`.
O banco exato `cvg_his_v2_e2e_native_full_final_20260908` foi removido e
verificado ausente; Redis DB 15 ficou em `0`; as portas 3111/3112 e os
processos E2E ficaram livres.

Esta é uma evidência bounded válida de fechamento do runner browser/fixture
local. Não equivale a aprovação global dos 34 FEA, AAA, GO ou prontidão de
produção: continuam abertos UAT e revisão humana com participantes, touch/zoom
e leitor de tela reais, RUM/INP/CLS de campo, budget, provider PIX e ciclo
durável de confirmação/reversão. O controle global permanece
`VERIFY / ACTIVE / HOLD`.

## FEA-016 — fallback de mídia em rede limitada — 08/09/2026

O estágio de identidade do login agora mantém o poster e não monta o vídeo
quando `navigator.connection.saveData` está ativo ou quando
`effectiveType` é `2g`/`slow-2g`; mudanças posteriores de conexão também
cancelam a reprodução e a interação 3D. A matriz browser
`evidence/login-assets-20260908.json` foi recapturada em 24/24 combinações
(390/1440, claro/escuro, movimento normal/reduzido e rede normal/Save-Data/2G),
com poster em todos os casos, MP4 omitido nos modos reduzido/limitado, zero
overflow e zero erros de console. O source hash de `LoginPage.vue` é
`d6005cf5d08eacaf639f97fcb4b959ef78235d7324c692f95e5fc2504545873d` e o
relatório tem SHA `86f8bfc7ffa7d670f2c013a3390beb45f3dc117ed96ba63f1a9a4f4a48eed0d6`.

O focused SPA passou `211` arquivos/`1.855` testes e `vue-tsc --noEmit`
passou. A prova é bounded Chromium com Network Information sintético; não
substitui rede limitada real, revisão visual humana, dispositivos, UAT ou
aprovação global. O estado continua `VERIFY / ACTIVE / HOLD`.

## Atualização final antes do congelamento integral — FEA-007 e cross-browser — 08/09/2026

O hardening corrente de FEA-007 removeu o estado terminal da fila de espera,
limitou loading sem resolução a 1 s e resetou regiões locais em novas
navegações push. `continuity-7uj2zj/report.json` passou 4/4 em Chromium, claro/
escuro e 1440/390, com retorno nativo exato de 623/1.643 px, foco em
`Cancelar`, fallback terminal quando o controle foi removido e fallback
bounded após 1.183 ms quando o loading permaneceu ocupado. O focused
`useRouteFocus` + `DataTable` passou 63/63. O harness atual tem SHA
`ae3029ee5d1f78c18bcf06c99a5e895f65742996d42080529fcaba39407f690a`.

A matriz crítica final está em
`evidence/cross-browser-final-20260908.manifest.json`: 72/72, com Chromium,
Firefox e WebKit em 24/24 cada, sem skipped/unexpected/flaky e cleanup
confirmado. As limitações continuam explícitas: evidência sintética/bounded,
sem erro/403/permission em cada consumidor, UAT, touch/zoom físico, leitor de
tela real ou aceite global.

Depois da crítica independente fresh e das validações, o runner integral será
congelado no run `full-final2-20260908`, Chromium serial, PostgreSQL nativo e
Redis DB 15 descartáveis. Não será feita alteração documental durante o run;
o archive gerado pelo próprio runner será a fonte imutável do resultado.

## Recaptura ampliada final de FEA-007 — 08/09/2026

`continuity-qKojY5/report.json` passou 8/8 em Chromium, 1440/390 e
claro/escuro, com `failures=[]`, `inputsStable=true` e 30/30 interações. O
relatório tem SHA `68385305f32afde7653e20b2c523eec656b4911aa37479fc5832527373b7333a`
e o harness corrente tem SHA
`322e6d689e03e151813e692a9eae6ca3168e4fcb244f87352d8eb2ff2d169c4d`.
Além dos casos de formulário e diálogo, a captura verifica retorno nativo sem
`scrollTo` manual (`scrollY` e `history.state.scroll.top`), ativação por Enter,
fallback terminal/loading bounded, deep link/reload, logout, permissão e
DataTable real com `scrollLeft` 180→180 após navegação SPA. O focused
`useRouteFocus` + `DataTable` é 63/63.

O manifesto `cross-browser-final-20260908.manifest.json` foi re-fingerprintado
com o harness corrente; a matriz crítica permanece 72/72 (Chromium, Firefox e
WebKit 24/24 cada). A revisão fresh independente ainda deve ser registrada
antes do runner `full-final2-20260908`. O controle permanece
`VERIFY / ACTIVE / HOLD`, sem DONE/AAA/GO.

As tentativas de crítica fresh pós-recaptura (Rawls e Euler) foram encerradas
como `UNAVAILABLE` após janelas bounded; não há aprovação independente final.
O resultado anterior de Confucius foi uma rejeição adversarial e permanece a
base registrada para as correções. Essa limitação está mantida no estado
durável e não altera o plano de executar o runner integral sem editar fonte ou
JSON após o congelamento.

## Atualização corrente de verificação — 08/09/2026

Após o último ajuste do `AppPageHeader`, a Agenda passou 30/30 no relatório
`evidence/continuity-am2VhG/report.json` (SHA
`68712ccc24b7194da9d71242bf211f6372c4d7fd7fd47995fd0eb27ddaf2b37b`; harness
`6247df8fb9a4649a290b125cc378a41596a1ac47794736195fa66d114f363644`) em seus
cinco aliases, três larguras e dois temas. O mobile mantém o primeiro item no
viewport inicial e reduz as ações secundárias a `Mais ações`; desktop/tablet
mantêm a fila operacional acessível.

O recorte corrente de navegação/FEA-007, `evidence/continuity-k4TnSC/report.json`
(SHA `2d38b7063ef5b69d6e974ccc46af3a254e920b85edc8af74fd9bdb63d3a7e03d`),
passou 8/8. A tabela real respondeu a teclado horizontal e preservou 394 px
na volta nativa, com foco conectado no detalhe e zero navegação documental.

A medição corrente de performance foi atualizada no build fingerprintado de
494 arquivos (`27554f339943a519eaee331155a3669d491100cfc3f41320e9ca17f2065f42b8`),
76.910 B gzip iniciais, FCP/LCP máximos 220/128/196 ms por rota e long task
máxima de 54 ms, sem erros. O relatório é `HOLD_FOR_OWNER_APPROVAL` e não
substitui RUM/INP/CLS ou UAT. O estado continua `VERIFY / ACTIVE / HOLD`, sem
`DONE`, `AAA` ou `GO`; aguardam também o veredito fresh independente e a
qualificação integral atualizada.

## Fechamento corrente do runner — 08/09/2026

Após o hardening final do cabeçalho e da DataTable, o harness
`browser-continuity.mjs` foi alinhado ao SHA
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
Agenda passou `30/30` em
`evidence/continuity-DbZefI/report.json` (SHA
`d9e8ac74401eba183e8ec729203a1b62becb8f86c00359f80a90ccc863db61cc`),
incluindo disclosure mobile aberto/fechado por teclado, clique real no
formulário e retorno à Agenda. Owners/Users passou `8/8` em
`evidence/continuity-wBIaTG/report.json` (SHA
`7dd9bd3c6f4341fcd800d43b2dbc2687a7b8cc27f6c58ae2d530d5c42dce6fbc`), com
DataTable real e retorno de scroll/foco.

Os baselines visuais atualizados passaram `29/29` sem atualização de snapshot.
O E2E integral foi congelado em
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current3-20260908/`:
`420/420`, 150 rotas, 300 navegações, zero skipped/unexpected/flaky, validator
válido. O banco e Redis descartáveis foram removidos/verificados ausentes e as
portas E2E ficaram livres.

O resultado é `passed_bounded` do browser/fixture local, não aprovação global.
A revisão independente fresh permanece `HOLD` sem rejeição fatal; seguem
pendentes UAT/participantes, revisão humana, budget, RUM/INP/CLS, dispositivos
reais/touch/zoom/leitor de tela, provider PIX/reversão e aceite dos 34 FEA.
O controle durável permanece `VERIFY / ACTIVE / HOLD`, sem `DONE`, `AAA` ou
`GO`.

## Recaptura cross-browser do candidato atual — 08/09/2026

Para eliminar a dúvida de vínculo da matriz anterior, os dois specs críticos
foram executados novamente nos três engines instalados. O manifesto
`evidence/cross-browser-current3-20260908.manifest.json` registra `72/72`
(`24/24` em Chromium, Firefox e WebKit), sem skipped, unexpected ou flaky, com
os hashes atuais do cabeçalho, Agenda, DataTable, foco, shell, rotas e specs.
O archive correspondente é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/cross-browser-current3-20260908/`;
o banco PostgreSQL descartável, Redis isolado e portas E2E foram limpos e
verificados.

Esta é uma recaptura `PASS_WITHIN_CONTRACT` da matriz crítica, não uma aprovação
global: continua sem touch/zoom nativos, leitor de tela real, UAT/participantes,
RUM/INP/CLS de campo, provider PIX/reversão e aceite integral dos 34 FEA.

## Recaptura integral corrente com manifesto já fingerprintado — 08/09/2026

O runner serial integral foi repetido após o manifesto cross-browser corrente
estar presente na fonte fingerprintada. O archive
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current6-20260908/`
fechou `420/420` em Chromium 145.0.7632.6, sem skipped/unexpected/flaky, com
150 rotas e 300 navegações; o validator confirmou inventário válido e
`inventoryDigest=c5fe2c9bfb9bb0e562891e21206134ad47c1b1a008793087a50d1837fe63a19c`.
`results.json` SHA `90176e48e9951b598c0eb6700c350344c16a010bb0fab47e6de211987d207690`,
`metadata.json` SHA `1d8d32427bdc1742c22add2fc26ed7089d8c7c820e6444169ba58c85b1c2d6fc`,
inventário SHA `b2b4cb9e298803dda81ea4b26e837fc0eba5011f42ae5f484d1884cff39a4fdb`.
O source digest é `ab5c46348dcb33fd6ff55ae8d28582b3b17481ca1877485facbcd2222722c33e`.

O banco exato foi removido e verificado ausente; Redis privado e portas E2E
ficaram livres. A classificação permanece `passed_bounded` para o runner
local. Não há promoção global: continuam pendentes UAT, participantes,
revisão humana, dispositivos/AT físicos, RUM/INP/CLS, budget, PIX/reversão e
aceite dos 34 FEA; estado `VERIFY / ACTIVE / HOLD`.

## Regressão SPA após a retomada — 08/09/2026

`pnpm --filter @cvg-his-v2/spa test -- --reporter=dot` passou `211/211`
arquivos e `1.859/1.859` testes; `pnpm --filter @cvg-his-v2/spa lint`
(`vue-tsc --noEmit`) também passou. Essa regressão confirma o estado local,
mas não substitui UAT, participantes, revisão visual/AT humana, dispositivos
reais, RUM/INP/CLS, budget ou provider PIX/reversão.

## Crítica fresh final do candidato atual — 08/09/2026

Dois pacotes selados read-only foram enviados em contexto novo: Sagan para os
34 FEA e Mill para visual/acessibilidade. As janelas bounded, o follow-up e a
interrupção controlada terminaram sem mensagem final; os agentes foram
encerrados sem qualquer parecer. Isso é `UNAVAILABLE`, nunca PASS. A auditoria
do sentinel separou as mudanças autorizadas no ExecPlan/progresso e o cache
Vitest das fontes do candidato; o status continua `VERIFY / ACTIVE / HOLD`.

## Reconciliação de controle — 08/09/2026

A recuperação encontrou `.agent/state.json`, `.agent/backlog.json` e os
ledgers auxiliares ausentes. O `.gauntlet/state.json` existente preserva a
execução histórica, mas `gauntlet_state.py validate --check-drift` o classifica
como incompatível com o schema atual por campos legados e fase `VERIFY`; ele
não foi sobrescrito. A realidade corrente é vinculada pelo ExecPlan, pelo bar
v1, pelo archive `full-current12-20260909` e pelos manifestos atuais. O plano
foi reconciliado para `FEA-external-uat-gate`; não se rebaixa a régua nem se
promove o estado enquanto os gates externos permanecem abertos.

## Auditoria corrente de rastreabilidade da matriz — 08/09/2026

Uma checagem direta comparou os 34 IDs do `quality-bar-v1.json` com a matriz
de qualificação. A tabela agora tem uma linha individual para cada critério;
`FEA-016`, `FEA-017`, `FEA-018` e `FEA-019` deixaram de estar agrupados. A
separação melhora a rastreabilidade, mas não muda nenhum status: os quatro
continuam `Parcial / HOLD integral`, com as lacunas humanas, reais e de
produção explicitadas.

## Auditoria de freshness dos recortes browser — 08/09/2026

Uma comparação read-only dos hashes `after` dos relatórios referenciados com o
candidato atual classificou como fingerprintados na versão corrente:
`continuity-yynX5t`, `continuity-2sYsuE`, `continuity-DbZefI`,
`continuity-wBIaTG`, `continuity-am2VhG`, `continuity-k4TnSC` e o relatório de
assets de login. Os demais `continuity-*` do dossiê são `supporting/stale` se
algum arquivo de entrada diverge; não são usados como PASS corrente. O archive
`full-current7-20260909` permanece a prova global bounded validada.

## Recaptura corrente de duplicidade em formulários — FEA-018 — 08/09/2026

O modo `DUPLICATE_CONTINUITY=1 FORM_ZOOM_PROXY=1` passou `8/8` em
`/owners/new` e `/patients/new`, 1440/390, claro/escuro, com zero falhas e
`inputsStable=true`. O relatório `evidence/continuity-2sYsuE/report.json`
tem SHA `6d11f1425ad2d17d901414b5eb4fac701014de3d8a13a62ea4e4503c2a5f8f21` e
o harness tem SHA
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
Tutor e paciente preservaram draft, abriram o registro existente e exigiram
descarte explícito para sair. Isso atualiza a prova bounded de duplicidade;
persistência/RLS, dispositivos reais, zoom nativo, leitor de tela e UAT ainda
não estão demonstrados.

## Recaptura corrente da Recepção — FEA-017 — 08/09/2026

Para substituir a captura supporting `continuity-11pldJ`, o modo
`RECEPTION_POPULATED=1` foi executado contra o candidato atual. O relatório
`evidence/continuity-yynX5t/report.json` passou `4/4` em 1440×900 e 390×844,
claro/escuro, com `inputsStable=true`, zero falhas, busca populada, fila
priorizada, descarte da resposta antiga e link de início conservando
`ownerId=synthetic-owner-1`. SHA do relatório:
`09ed0098b5c6d29df5a4fef414b9d036da7751a0ef656525eb67d393fe690a86`;
harness SHA `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c997dc7a11ef543a72f57b78`.
É evidência bounded sintética: comparação FE-04, operação clínica,
participantes, UAT, touch/zoom nativos e leitor de tela continuam pendentes.

## Recaptura integral anterior após correção do fingerprint — 09/09/2026

O runner serial foi repetido depois que `sourceState` passou a excluir
explicitamente `docs/frontend/implementation/evidence/` do fingerprint, para
que a geração de evidências não altere a fonte congelada. O archive validado é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current7-20260909/`:
Chromium 145.0.7632.6, `420/420` casos, zero skipped/unexpected/flaky, 150
rotas e 300 navegações. O validator reportou
`inventoryDigest=d89335ba209954d098c16a42780087dd41d3cb5231e68e966e91da8321a8511c`.

Hashes: `results.json=d7211bc2a9ea0486300db4230abe3a584f82b87f1e6d3f2284f00cdb3ce20ee3`,
`metadata.json=df77d26d1d41a3a013a27f276f9f9ff0a6a152119fa060e2a3667403ea40bbde`,
inventário `0c70337d428063308e9ea71d700bc1f9e228ab19160d3dae75c5b262cdda6cf8` e
discovery `1fb0d7af840df090354613fffc1abfb75cd06228602e3f7740d731b0d87e98c8`.
O source digest é
`ecac579b2869b49afb57eebdfcb61e8c7f5d31c0580357807c57dc5bf6530e6e`, com
2.295 arquivos. A correção passou nos testes dos scripts de inventário/archive
(`40/40`). A base PostgreSQL descartável foi removida após verificação de
sessões, Redis DB14 ficou em zero e as portas E2E 3111/3112/6381 ficaram livres.
Isso é `passed_bounded` local e não substitui os gates humanos, de campo,
dispositivo/AT, budget, PIX/reversão e aceite dos 34 FEA.

## Atualização de fechamento local anterior — 09/09/2026

O archive integral anterior foi
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current9-20260909/`:
`420/420` em Chromium 145.0.7632.6, zero skipped/unexpected/flaky, 150 rotas
e 300 navegações. O validator confirmou
`inventoryDigest=70d76051c123fbcf5efa472b654d4d10433f34ce3557a8425f01c1e6cd9fcbeb`;
`results.json` SHA `4d85db418d225c05883b3c2aa75ad19de54ad870310a5e197f46bb2d1f21b317`.
O source digest é
`4c6423e2d8979b77876f482eed544d9acebb8e42d2e5afdb5a68afa2651c32b7`, com
2.295 arquivos.

A causa do bloqueio observado no `full-current8` foi corrigida em
`DatabaseAuditRepository`: a auditoria agora usa o client do escopo
transacional quando o caso de uso está dentro de uma transação. O módulo de
auditoria passou 29/29, lint e build; o `full-current9` passou inclusive os
fluxos de relatórios que haviam formado o deadlock.

A matriz cross-browser atualizada em
`evidence/cross-browser-current4-20260909.manifest.json` passou `72/72`,
`24/24` em Chromium/Firefox/WebKit. A Agenda foi recapturada em
`evidence/continuity-RyjBB1/report.json` com `30/30`, zero falhas e entradas
estáveis; as telas light/dark e drawer semanal foram inspecionadas pelo Lead.
O focused atual passou `124/124` (Agenda, pacientes e `AppPageHeader`), e os
testes de inventário/archive passaram `40/40`.

Os críticos fresh Agenda e all-34/visual continuaram indisponíveis após janelas
bounded e foram encerrados sem parecer, score ou aprovação. O estado permanece
`VERIFY / ACTIVE / HOLD`; UAT/participantes, owner acceptance, RUM/INP/CLS de
campo, touch/zoom/AT reais, provider PIX/reversão e aceite formal dos 34 FEA
continuam gates externos.

## Recaptura FEA-024 corrente — 09/09/2026

Após a recertificação integral local, a jornada de internação/leitos foi
executada novamente com `INPATIENT_CONTINUITY=1`. O relatório
[`continuity-scpRq4/report.json`](evidence/continuity-scpRq4/report.json) passou
`16/16` combinações nas rotas `/inpatient`, `/inpatient/board`, detalhe de
internação e detalhe de leito, em 1440×900 e 390×844, claro/escuro, com nove
interações, zero falhas e `inputsStable=true`. SHA do relatório:
`e204a048854ed627cb03a0013b6ff939cf649608de312631fe1bf10217597736`; harness:
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
As três suítes focadas das páginas inpatient passaram `72/72`.

O Lead inspecionou a lista mobile, o mapa de leitos desktop e o detalhe mobile
em tema escuro; não foi inferida aprovação independente. A evidência usa dados
sintéticos e servidor Vite próprio, portanto não prova touch/zoom nativos,
leitor de tela, persistência/RLS, operação clínica, participantes ou UAT.
FEA-024 permanece `Condicional no piloto / HOLD integral`; o próximo passo
singular continua obter o responsável, participantes e data do UAT.

## Recaptura FEA-025 corrente — 09/09/2026

O fluxo PIX foi executado novamente em
[`continuity-kPxWqj/report.json`](evidence/continuity-kPxWqj/report.json):
`4/4` em 1440×900 e 390×844, claro/escuro, com POST `202`, estado
`pending_dispatch`, chave de idempotência, refresh, `settled` e QR renderizado.
O relatório tem SHA
`7b89d80f0ef24683ebc9aa229986fd59e250338404e025c3edc83da81b066c47`.

O fluxo de recebimento em dinheiro e reversão foi executado em
[`continuity-oIF3nA/report.json`](evidence/continuity-oIF3nA/report.json):
`4/4` nas mesmas condições, com motivo obrigatório, POST `201`, idempotência,
refresh do resumo, estado `reversed` e recuperação após reload. SHA:
`c9d0b6e55cb02edc7bdf05c2b3865938cc80eb45299ae940a7cb311701529a53`.
O Lead inspecionou render financeiro mobile; não foi inferida aprovação
independente. A API disponível não define confirmação/reversão manual segura de
PIX, então o SPA permanece em despacho/polling. Provider, RLS, replay em banco,
reconciliação, UAT e aceite global continuam HOLD.

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

## Recaptura cross-browser mais recente — 09/09/2026

O manifesto corrente é
`evidence/cross-browser-current5-20260909.manifest.json`. Os dois specs críticos
passaram `72/72`, com `24/24` em Chromium, Firefox e WebKit, sem
skipped/unexpected/flaky. O archive é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/cross-browser-current5-20260909/`;
`results.json` SHA
`b4e36cbd714294ea3433a251396a1049cfcff03bb958e74db9299235562629a2` e
`metadata.json` SHA
`685c6d35481a407bd0f1e6db897b72d0329d81d279f902b505833ed7476b8b03`.
O source digest é
`83503af1fc2f6e51c1a0171310937eb037974809149815f52a5a7865e55cad21`, com
2.295 arquivos. A base PostgreSQL descartável foi removida e verificada ausente;
Redis DB15 ficou em zero e as portas E2E 3111/3112/6381 ficaram livres. A
classificação é `PASS_WITHIN_CONTRACT` somente para esta matriz crítica; não há
promoção global, UAT ou aceite dos 34 FEA.

## Recaptura Agenda/contexto mais recente — 09/09/2026

`evidence/continuity-oaR48z/report.json` passou `30/30` linhas, sem falhas e
com `inputsStable=true`, nos cinco aliases da Agenda, claro/escuro e
1440/768/390. A execução cobriu deep link, retorno e reload do contexto
estrutural, limpeza do texto livre após reload, cards de semana/dia por
Enter/Espaço, drawer com restauração de foco, prioridade mobile e overflow
local. SHA do relatório:
`825d72b207610e70df94245b1d02d0875cf006d98885b2b5f1533993b3180514`; harness:
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
Capturas reais desktop/mobile foram inspecionadas pelo Lead, sem sign-off
independente. O recorte permanece sintético/bounded e não prova backend,
persistência, touch/zoom nativos, leitor de tela ou UAT.

## Recaptura formulário de paciente mais recente — 09/09/2026

`evidence/continuity-ltIKmD/report.json` passou seis combinações e 38
interações em `/patients/new`, claro/escuro, 1440/390 e viewport CSS proxy
195×422, sem falhas e com `inputsStable=true`. A execução cobriu resumo de
validação com foco no primeiro campo inválido, troca de `ownerId` com rascunho,
falha mantendo os campos, sucesso sem confirmação de saída,
desmontagem/desregistro e logout condicionado. SHA do relatório:
`158f05c96e7c47f3c5ef7dd235ab18f264be42a5cabe81bfcd3c8b190a65f513`; harness:
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
Capturas reais foram inspecionadas pelo Lead, sem sign-off independente; o
proxy estreito não prova zoom nativo, touch, teclado virtual, leitor de tela,
backend/RLS ou UAT.

## Recaptura dashboard por função mais recente — 09/09/2026

O manifesto `evidence/dashboard-current-20260909.manifest.json` vincula a
recaptura `continuity-Tt90aV` ao candidato atual. A matriz passou `20/20`
combinações em cinco perfis (Recepção, Enfermagem, Médico-veterinário,
Financeiro e Administração), claro/escuro e 1440/390, sem falhas e com
`inputsStable=true`. O recorte exercitou prioridade da função, destino
autorizado, shell/persistidos, command palette, notificações e estados de
acesso; os testes unitários de `DashboardPage` passaram `9/9`.
SHA do relatório:
`653f599105e807514afe925c2690596585d74f95610fba8f2bc24f9a43110cb3`;
harness:
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`.
É evidência `PASS_WITHIN_CONTRACT` bounded: não prova papéis/RLS de produção,
touch/zoom nativos, leitor de tela, métricas humanas, UAT ou aceite integral.

## Recaptura recepção e conflito de duplicidade — 09/09/2026

`evidence/reception-current-20260909.manifest.json` vincula
`continuity-21Izko`, que passou `4/4` em `/reception`, claro/escuro e 1440/390,
sem falhas e com `inputsStable=true`. A fila e os resultados ficaram no fluxo
inicial; a seleção preservou `ownerId` em
`/appointments/new?ownerId=synthetic-owner-1`, e a busca mais recente foi
limpa sem reintroduzir resposta antiga. O relatório tem SHA
`7be5c799a1809f1b207bbb49309896d2a4782662239527598dffa480552e5318`.

`evidence/duplicate-current-20260909.manifest.json` vincula
`continuity-rXZgpi`, que passou `8/8` em tutor/paciente, claro/escuro e
1440/390, preservando draft, oferecendo manter o rascunho e exigindo descarte
explícito para navegar ao existente. O relatório tem SHA
`2cb149b150de8357b3d6317537dcb3bddcfbb6edb46caecdffbbc948232968ba`.
Ambos usam o harness SHA
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78` e são
provas bounded sintéticas; operação real, persistência/RLS, touch/zoom,
leitor de tela e UAT continuam abertos.

## Críticas independentes fresh — 09/09/2026

Dois críticos I1, em contexto não herdado (`fork_context=false`), fizeram
inspeções read-only contra o runtime atual. Singer the 2nd (funcional) e
Hypatia the 2nd (visual/UX) não puderam autenticar o serviço nativo: o login
retornou `401 AUTHENTICATION_ERROR`, e rotas privadas redirecionaram para
`/login?next=...`. Ambos retornaram `BLOCKED`, sem aprovação inferida; os
pareceres sanitizados estão em
`evidence/critic-functional-current-20260909.json` e
`evidence/critic-visual-current-20260909.json`. O Lead confirmou que nenhum
crítico alterou fonte, estado `.gauntlet`, banco, filas ou portas; os artefatos
brutos e seus hashes estão referenciados nesses registros. Isso confirma uma
lacuna de autenticação/runtime para a validação independente, sem invalidar as
provas sintéticas bounded nem constituir rejeição do produto.

## Recaptura de performance mais recente — 09/09/2026

Após reconstruir o `apps/spa/dist`, o relatório
`evidence/performance-current-20260909.json` foi gerado pelo
`scripts/measure-spa-performance.mjs` e conferido contra cada arquivo do
artefato. O relatório tem SHA
`4742bea9cd24933c1e0dc601b2c2778d3b7d988400bf12ef1b5cf0b3e63355d4` e o
harness tem SHA
`5a52ef1647141a36cfae8a746855816a96115aed39aed364823d1586040c29dc`.
O build coincide em `494` arquivos, `3.882.751 B` e fingerprint
`f97a8535841c6af7de4e7157d362ce4b069c8c26039cb378e8964fa36f0a7540`; o entry
inicial mede `253.369 B` brutos/`76.924 B gzip`, com compressão observada e
`−16,75%` contra a meta de `92.406 B`.

As três rotas foram medidas três vezes em Chromium headless, viewport
1440×900/DPR1, contexto novo e service workers bloqueados. Os máximos FCP/LCP
foram `232/232 ms` em `/`, `124/124 ms` em `/login` e `188/188 ms` na Agenda;
long tasks e erros ficaram em zero, e todas as rotas ficaram dentro dos alvos
laboratoriais. A decisão continua `HOLD_FOR_OWNER_APPROVAL`: não há RUM/INP/CLS
de campo, rede lenta real, participantes ou aprovação formal do budget. O
relatório canônico de 07/09 foi preservado como histórico para não reescrever
o digest do archive integral já validado.
