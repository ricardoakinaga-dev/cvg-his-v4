# Contrato de navegação e continuidade — FEA-007

Atualizado em 07/09/2026. Escopo de implementação em andamento; não constitui aceite integral.

| Evento | Comportamento requerido |
| --- | --- |
| Primeira abertura | Preservar a orientação inicial da página; não roubar autofocus |
| Nova página após navegação bem-sucedida | Foco no h1 disponível, ou região de conteúdo com nome; sem deslocar scroll por efeito do foco |
| Alteração apenas de query/hash | Preservar o controle em uso; âncora resolve ID com segurança |
| Navegação cancelada por formulário | Manter rota, título e acessos recentes da tarefa atual |
| Navegação rápida ou desmontagem | Invalidar orientação pendente para o destino anterior |
| Modal ou controle que recebe foco durante a transição | Preservar sua prioridade sobre a orientação automática |
| Voltar/avançar nativo | Restaurar coordenadas salvas; retornar a controle estável de origem quando disponível e elegível |
| Controle de origem removido, oculto ou desabilitado | Não restaurar controle inválido; usar orientação da página |
| Saída do workspace | Liberar listeners e memória temporária de retorno |

A memória de retorno deve conter apenas identidade de elemento/entrada de histórico, nunca valores de campo, textos clínicos ou cópias de formulários. Não usar localStorage, sessionStorage ou envio de telemetria para esse mecanismo. Identidade de link não comprova autorização: a rota continua sujeita aos guards e o alvo deve existir no conteúdo renderizado atual.

## Evidência e pendências

A prova inicial `continuity-MAFctW` confirmou em Chromium, com API sintética, orientação de nova página, zero GET documental e retorno de rolagem exato a 1.491 px (desktop) e 3.193 px (mobile), nos dois temas. Ela antecede a restauração do controle de origem e não a comprova.

A revisão I1 da primeira versão encontrou disputa com foco em controle externo ao workspace durante a transição. Essa versão não recebeu aceite final. A próxima prova deve exercitar o controle restaurado e a correção dessa disputa, além de preservar a evidência de navegação cancelada.

Fora da prova atual: filtros e seleção específicos de todos os módulos, elementos inseridos de forma assíncrona após a orientação, permissões reais alteradas em homologação, leitores de tela e matriz Firefox/WebKit. Esses casos permanecem no backlog e não são substituídos por testes unitários de retorno de coordenadas.

## Reexecução com fontes congeladas

[Report continuity-Jvds8h](evidence/continuity-Jvds8h/report.json): quatro casos Chromium, claro/escuro e 390/1440, zero falhas, hashes estáveis. A ida foca o título e começa no topo; Back restaura Cancelar (inclusive ocorrência correta entre links duplicados) dentro do viewport, com scroll exato e zero requests documentais. Casos de saída cancelada e logout mantiveram os contratos. Dados sintéticos, sem conclusão sobre backend ou UAT.

A correção de details distingue conteúdo recolhido da primeira summary. O snapshot de foco agora antecede guards posteriores ao hook do composable e beforeResolve. Guards globais mais antigos e guards de saída que executam antes desse hook continuam uma lacuna de ordenação; não há garantia universal para seus efeitos de foco. O retorno usa identidade estrutural e até 50 entradas em memória; controles sem identidade estável usam fallback e listas com inserção assíncrona ainda exigem prova própria.

## Responsabilidade explícita de foco em guards

Guards que direcionam foco intencionalmente podem chamar `preserveNavigationFocus(router, to, target)`, exportado por useRouteFocus. O helper focaliza o alvo elegível e registra a responsabilidade apenas para o objeto exato da tentativa. A orientação automática respeita a declaração enquanto o alvo continuar conectado, disponível, habilitado e ativo; a declaração é consumida ao concluir ou rejeitar a tentativa. Redirecionamentos são novas tentativas e exigem declaração própria. Não há garantia de detecção automática de chamadas arbitrárias a focus em guards anteriores.

Foram adicionados casos de guard global anterior ao shell, guard real de saída, rejeição seguida de navegação normal e invalidação do alvo antes do frame. A primeira revisão encontrou um caminho genérico que preservava alvo invalidado; corrigido e coberto por hidden, aria-disabled e remoção do elemento.

## Estado corrente do recorte de implementação — 08/09/2026

Além da identidade de foco, o helper mantém snapshots de `scrollLeft` e
`scrollTop` somente para containers marcados com `data-scroll-container="local"`
e associados à posição de histórico. A restauração é rejeitada quando o
container ou o controle de origem não está elegível; não há persistência em
storage nem envio de conteúdo clínico. Callbacks de rAF carregam a geração da
navegação, e mudanças de DOM reprocessam retornos cujo alvo/linhas ainda estão
carregando (`aria-busy`, estado de tabela ou mensagem de carregamento). Um
fallback bounded reencaminha frames apenas em ambientes sem `MutationObserver`.

O teste dedicado corrente passou 32 casos, incluindo callback stale, foco sem
chave, retorno assíncrono e coordenadas horizontais/verticais. Isso não elimina
a limitação já registrada sobre guards que executam antes do composable, nem
constitui prova de todos os módulos, engines, dispositivos, leitores de tela
ou UAT.

## Identidade semântica de rolagem — 08/09/2026

Regiões locais recebem `data-scroll-key` quando a tabela tem `scrollKey` ou
`caption`; em tabelas legadas sem esses atributos, `useRouteFocus` deriva uma
identidade do título semântico do `DsCard`. A captura registra a ocorrência
dentro da mesma chave, e a restauração resolve primeiro por chave antes de
usar a ocorrência global como fallback bounded. Isso evita que duas tabelas
reordenadas recuperem a coordenada uma da outra; regiões sem identidade ainda
mantêm o comportamento conservador de não prometer estabilidade estrutural.

O teste de reordenação passou junto do recorte `useRouteFocus`/`DataTable`
(`2` arquivos, `59/59` testes). A recaptura browser corrente do contrato em
`evidence/continuity-8pJS03/report.json` passou `4/4` combinações Chromium,
claro/escuro e 390/1440, com `failures=[]`, `inputsStable=true`, retorno de
scroll vertical exato, foco em `Cancelar` e zero requests documentais. Essa
prova ainda é bounded: não substitui cross-browser posterior à mudança,
leitor de tela real, touch/zoom físico ou UAT.

## Recaptura corrente após a correção semântica — 08/09/2026

O relatório atual é [`continuity-XHWFs6/report.json`](evidence/continuity-XHWFs6/report.json),
SHA `3f02aed439c294c963f484331e6c99ef7dc4832446d2836d68264e756369e158`, com
harness SHA `247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`.
As quatro combinações Chromium (claro/escuro, 1440/390) passaram estáveis;
`native-history-scroll-and-route-focus` restaurou 623 px no desktop e 1.643 px
no mobile, devolveu foco a `Cancelar` e não emitiu requests documentais.
O focused `useRouteFocus` + `DataTable` passou 60/60. O resultado continua
bounded à SPA com fixture sintético: todos os consumidores, guards anteriores,
Firefox/WebKit para este fluxo, touch/zoom físico, leitor de tela e UAT seguem
gates separados.

## Recaptura após deadline bounded e reset de regiões locais — 08/09/2026

O relatório corrente é [`continuity-7uj2zj/report.json`](evidence/continuity-7uj2zj/report.json), SHA
`bffd12bfa28bd4bf27da9ba0e55247291aee3026e52bda8a38c8978ee7d1722f`, gerado
com o harness SHA
`ae3029ee5d1f78c18bcf06c99a5e895f65742996d42080529fcaba39407f690a`.
As quatro combinações Chromium (claro/escuro, 1440/390) passaram com
`failures=[]` e `inputsStable=true`. O retorno nativo restaurou exatamente
623 px no desktop e 1.643 px no mobile, devolveu foco a `Cancelar` e não
emitiu requests documentais.

O recorte também exercitou `missing-return-control-terminal-state-fallback`:
com o controle removido, o estado terminal vazio orientou o foco para
`Cadastrar Novo Tutor`; e `stuck-loading-return-control-bounded-fallback`:
com o workspace ainda ocupado, a orientação caiu para o heading após 1.183 ms
sem mascarar o `aria-busy`. O focused
`useRouteFocus` + `DataTable` passou `63/63`.

Na implementação corrente, estados terminais (`.state-message`) não bloqueiam
indefinidamente a orientação; carregamentos sem resolução têm deadline de 1 s
e usam o heading/body como fallback. Navegações push novas zeram regiões
`data-scroll-container="local"` na página de destino para não carregar
coordenadas da rota anterior. A prova continua bounded: o harness ainda não
exercita erro/403/permission em cada consumidor nem substitui guards
anteriores, cross-browser específico deste fluxo, touch/zoom físico, leitor de
tela ou UAT.

## Recaptura ampliada final antes do congelamento — 08/09/2026

O relatório atual é [`continuity-qKojY5/report.json`](evidence/continuity-qKojY5/report.json),
SHA `68385305f32afde7653e20b2c523eec656b4911aa37479fc5832527373b7333a`,
gerado pelo harness SHA
`322e6d689e03e151813e692a9eae6ca3168e4fcb244f87352d8eb2ff2d169c4d`. As oito
combinações Chromium (1440/390, claro/escuro) passaram com 30 interações, sem
falhas e com entradas estáveis. O retorno documental não usa restauração manual:
o teste usa `goBack()`, verifica `scrollY` e `history.state.scroll.top`, retorna
foco a `Cancelar` por ativação `Enter` e registra zero requests documentais.

O mesmo recorte exercita reset de regiões locais em navegação push, estados
terminal e loading preso com deadline observado de 1.183 ms, continuar/descartar
em diálogo dirty com foco, logout consentido, deep link recarregável, mudança de
permissão e uma DataTable real de Users: `scrollLeft` 180→180 após retorno por
rota SPA, tabela focável e zero navegação documental. O focused
`useRouteFocus` + `DataTable` passou 63/63. A matriz cross-browser final
fingerprintada permanece 72/72, mas é um recorte crítico separado; não infere
cross-browser integral desta jornada.

Esta evidência é bounded e aguarda a revisão fresh independente. Não fecha todos
os consumidores, backend/RLS, UAT, participantes, touch/zoom físico, leitor de
tela real, RUM/INP/CLS, provider PIX/reversão ou aceite global dos 34 FEA.

## Revisão independente pós-recaptura — 08/09/2026

Duas tentativas fresh, Rawls e Euler, foram encerradas como `UNAVAILABLE` após
esperas bounded sem resposta final. Não houve execução de artefatos nem mutação
observada, mas também não se deve tratar a ausência de resposta como aprovação.
O parecer Confucius anterior continua registrado como rejeição adversarial que
levou às correções de circularidade, deadline, DataTable real e cenários de
deep-link/permissão. Assim, `continuity-qKojY5` é evidência corrente bounded,
sem um PASS independente posterior; o contrato global permanece HOLD.

## Recaptura corrente após hardening do header e DataTable — 08/09/2026

O relatório corrente é [`continuity-k4TnSC/report.json`](evidence/continuity-k4TnSC/report.json), SHA
`2d38b7063ef5b69d6e974ccc46af3a254e920b85edc8af74fd9bdb63d3a7e03d`, gerado
com o harness SHA
`6247df8fb9a4649a290b125cc378a41596a1ac47794736195fa66d114f363644`. O
recorte de Owners/Users passou 8/8 combinações Chromium, claro/escuro e
1440/390, com `failures=[]`, `inputsStable=true` e 12 interações.

O caso de `DataTable` real agora usa teclado Playwright sobre a região focável:
`ArrowRight` moveu a rolagem horizontal para 286 px, `ArrowLeft` retornou a
zero e a volta nativa recuperou a coordenada de saída 394 px. O link de detalhe
voltou conectado, com foco e href `/users/synthetic-user-admin`; a navegação
foi SPA e registrou zero requests documentais. O cabeçalho da Agenda também
foi verificado com ações secundárias visíveis em desktop/tablet e disclosure
`Mais ações` fechado inicialmente no mobile.

Esse relatório continua uma prova bounded da composição browser/fixture: não
fecha todos os consumidores, permissões/RLS reais, persistência, cross-browser
integral deste recorte, touch/zoom físico, leitor de tela, revisão humana ou
UAT. O controle global segue `VERIFY / ACTIVE / HOLD`.

## Recaptura corrente com prova de disclosure mobile — 08/09/2026

O relatório de Agenda alinhado ao harness final é
[`continuity-DbZefI/report.json`](evidence/continuity-DbZefI/report.json), SHA
`d9e8ac74401eba183e8ec729203a1b62becb8f86c00359f80a90ccc863db61cc`, com
harness SHA
`c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`. As 30
combinações dos cinco aliases, três larguras e dois temas passaram sem falhas
e com entradas estáveis. No caso canônico mobile, o disclosure iniciou fechado,
abriu e fechou por `Enter`, e o link interno foi clicado de fato até
`/appointments/new`, com retorno à Agenda confirmado.

O recorte de Owners/Users correspondente é
[`continuity-wBIaTG/report.json`](evidence/continuity-wBIaTG/report.json), SHA
`7dd9bd3c6f4341fcd800d43b2dbc2687a7b8cc27f6c58ae2d530d5c42dce6fbc`: 8/8
combinações, zero falhas e entradas estáveis. A DataTable real respondeu às
setas, preservou 394 px de scroll local no retorno, restaurou foco/href do
detalhe e não produziu requests documentais.

O contrato continua bounded: a execução usa Chromium, fixtures e desktop host;
não substitui cross-browser integral, zoom/touch nativos, leitor de tela real,
RLS/persistência/guards em todos os consumidores, participantes, UAT ou
aprovação global.
