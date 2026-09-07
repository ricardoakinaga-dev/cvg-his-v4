# R05-010 — Evidência instrumentada de cobertura de processos

## Registro e prontidão

- ID: `SPEC-R05-010-INSTRUMENTATION`, versão0.1, 2026-09-06.
- Owner técnico: engenharia/QA da consolidação.
- Estado: **PROPOSED — não pronto para integração no produtor**.
- Origem: [Quality Bar](QUALITY_BAR.md), R05-010 e
  replanejamento de implementação (histórico arquivado: `legado/docs/engineering/CVG_HIS_V4_CONSOLIDATION_IMPLEMENTATION_PLAN.md`).
- Esta especificação não substitui critérios de produto, o manifesto de fontes
  críticas nem a autorização necessária para operações externas.

## Resultado e restrições

Medir statements, funções e branches por evidência de execução que distinga
avaliação de expressão de chamada da função produzida. Preservar coordenadas de
fontes originais, zeros, isolamento de processos e autenticidade dos artefatos.
Não inferir um contador que os dados brutos não permitem observar.

A [reconciliação revisada](CRITICAL_SOURCE_IDENTITY_RECONCILIATION.md) conserva
575 fontes ativas e 41 identidades de cópias geradas retiradas, sem perder fontes
canônicas. Mantêm-se cinco shards e85% por componente/métrica. Qualquer input novo
de instrumentação, dependência, configuração ou teste do pipeline integrado
precisa constar no manifesto. Não usar este experimento para publicar cobertura.

## Arquitetura atual e proposta

**OBSERVED:** o preload captura fontes executadas. O checkpoint chama
`capture.flush()` e `takeCoverage()` antes de confirmar ao processo pai que ele
pode executar SIGKILL. O coletor soma intervalos V8 resetados; o leitor abre
registros pelo diretório fixado antes dos produtores e rejeita nomes inesperados.

**OBSERVED:** Inspector não distingue alguns ramos de argumento padrão; roots de
inicializadores estáticos/de instância podem cruzar legitimamente. O experimento
`artifacts/consolidacao-2026-09-05/coverage-scope/instrumentation-observability-experiment.mjs`
obtém contadores adicionais em processos descartáveis, mas não implementa um
instrumentador geral nem persistência de checkpoints.

**PROPOSED:** transformação de medição produz código e mapa autenticados, um
registro imutável dos pontos de medição e contadores cumulativos de execução.
O produtor persiste snapshots; o coletor valida sua sequência e converte as
métricas para as fontes originais. V8 permanece evidência auxiliar, sem substituir
os novos contadores nem ser somado a eles para a mesma métrica.

## Componentes e responsabilidades propostas

| Fronteira | Responsabilidade | Estado |
| --- | --- | --- |
| Transformação | Código, mapa e posições semânticas, sem colisão de nomes ou mudança de comportamento | Apenas experimento de dez fixtures |
| Registro de artefato | Associar fonte/configuração/transformação/mapa e pontos de medição | Não implementado |
| Snapshot | Copiar contadores cumulativos e publicar registro completo antes do ACK | Fixture experimental com checkpoint/SIGKILL; não integrada |
| Leitor/coletor | Validar identidade, forma, sequência e orçamento; selecionar último acumulado válido | Contrato experimental; leitor produtivo não integrado |
| Gate | Autenticar cadeia até fonte original e reconciliar cinco shards | Pipeline atual insuficiente |

## Contrato candidato de registros e estados

Não existe endpoint de produto ou nova API externa neste desenho. Os registros
são exclusivamente locais ao diretório de evidência de um runner autorizado.
O schema definitivo depende dos testes do próximo marco.

- Identidade de execução: invocation ID, PID, thread ID e geração do produtor.
  PID sozinho não distingue reutilização ou reinicialização de contadores.
- Registro imutável por artefato: hashes de fonte/configuração/instrumentador,
  código transformado, mapa e tabela de IDs/posições/forma dos contadores.
  O identificador não pode depender circularmente do próprio código que o embute.
- Snapshot: versão, identidade do produtor, número de sequência, motivo do
  checkpoint e mapas de contadores por artefato registrado.
- Contadores: inteiros seguros não negativos, sem overflow do formato consumidor;
  forma estável e monotonicidade entre snapshots da mesma geração.
- Um artefato pode aparecer quando carregado; não pode desaparecer de snapshots
  posteriores nem trocar mapa/IDs na mesma geração.
- Duplicata conflitante, regressão de contador, geração desconhecida, forma
  divergente ou fonte não autenticada invalidam a coleta; não reparar em silêncio.
- O agregado de um produtor é o último acumulado válido, **não a soma dos seus
  snapshots**. Somente identidades de produtores independentes são somadas,
  conferindo overflow e compatibilidade de fonte/forma.

## Persistência, concorrência e falhas

Sem migration de banco ou alteração de dados clínicos/financeiros. A única escrita
prevista é evidência técnica local, sem payloads de negócio ou credenciais.

- Publicação de snapshot deve ser completa e não sobrescrever registros prévios.
  Escrita parcial, erro de disco ou falha de flush devem impedir ACK positivo.
- O pai só pode aceitar um SIGKILL planejado depois do checkpoint confirmado;
  encerramento prematuro sem confirmação não deve produzir cobertura certificada.
- O leitor continua exigindo produtores encerrados, diretório previamente fixado,
  arquivo regular, UTF-8 estrito, ausência de symlink e estabilidade pré/pós leitura.
- A extensão dos padrões de nomes não pode aceitar arquivos arbitrários nem
  ignorar resíduos parciais para transformar falha em sucesso.
- Orçamentos atuais de registros/bytes devem ser medidos com o novo formato;
  serialização limitada não equivale a limite de RSS.
- Snapshots cumulativos permanecem distintos dos intervalos V8 durante transição;
  não reutilizar o algoritmo de soma de V8 para esse protocolo.

## Decisões técnicas ainda abertas

### Evidência experimental do protocolo

`artifacts/consolidacao-2026-09-05/coverage-scope/instrumented-snapshot-contract.mjs`
e seu `.test.mjs` exercitam27casos: publicação temporária exclusiva, fsync,
link sem sobrescrita, ACK, SIGKILL/exit observados pelo pai, escrita parcial sem
ACK, metadados adulterados, sequência/monotonicidade, overflow e budgets.
Metadados de catálogo, produtor e término são copiados e validados antes de
consumir iteradores, impedindo troca posterior de hash/forma/ACK pelo chamador.
O contrato seleciona o último acumulado de cada produtor e só então soma
produtores independentes. Limites experimentais:256registros,1MiB por registro,
16MiB totais,256artefatos e10mil contadores por artefato.

Esses limites ainda não foram medidos na carga do ERP. A fixture usa metadados de
mapa explicitamente não certificados; ela testa vinculação a um catálogo esperado,
não remapeamento. O leitor de arquivos da fixture não substitui o leitor produtivo
fixado e endurecido. A observação terminal fornecida ao coletor é autoridade do
supervisor; não é uma mensagem confiável emitida pelo produtor. A crítica
independente Aristotle aprovou somente o experimento de protocolo, com27/27
testes e oito controles adicionais. O achado inicial que proibia novos artefatos
foi retirado após confronto com o requisito preexistente de carregamento tardio:
estabilidade vale para a forma de cada artefato, não para a composição inicial.
Hashes conferidos pelo Lead: contrato45ccde0d e testeb4c9bb83. A aprovação não
cobre leitor integrado, mapas certificados, instrumentação geral ou autenticação
criptográfica do produtor. O agente foi encerrado sem alterações nos arquivos.

### Bloqueios para a integração geral

### Experimento de preservação de nomes — retomada de 06/09

O candidato isolado adapta o visitor Istanbul 6.0.3 sem alterar dependências
instaladas ou o lockfile do ERP. Usa avaliação nativa de propriedade de objeto
para preservar nomes de funções/classes em argumentos padrão e campos de
classe com chave estática. Mantém o nó original, seus locais e os contadores.

A versão inicial passou 84 comparações e 16 controles de rejeição, mas foi
**REJECT** pelo crítico independente `critic_named_evaluation` (I1, contexto
vazio): chaves bigint hexadecimais/octais inferiam nomes com a grafia da fonte,
em vez da chave decimal observada em runtime. Seus hashes pré/pós permaneceram
iguais. A versão 2 normaliza essas chaves com `BigInt(...).toString()` e adiciona
regressão para bases e inteiros maiores que o limite seguro de `Number`.

O Lead repetiu 88/88 comparações JS/TS × CJS/ESM e 16 rejeições explícitas de
campos anônimos com chave computada; também repetiu o caso bigint do crítico,
agora com igualdade de resultados. Mapas de statements/functions/branches são
comparados ao upstream, e as contagens originais de default e campos permanecem
exigidas. Na continuação, o crítico fresco `critic_instrumentation_v2` (I1)
aprovou o experimento após repetir88/88+16rejeições e quatro combinações
independentes de nomes/chaves/contadores. Hashes pré/pós intactos. Essa aprovação
não cobre integração, persistência de snapshots, threads, exit tardio ou mapas
autenticados. A rejeição da versão1 permanece histórica e preservada.

Arquivos experimentais em `artifacts/consolidacao-2026-09-05/coverage-scope/`:

- `istanbul-named-evaluation-candidate-v2.mjs`, SHA256
  `beb4cf45f72f5f323442754047ea1bf573c839da812ed10807a4eed9a5e5fd6e`;
- `istanbul-named-evaluation-experiment-v2.mjs`, SHA256
  `12490e276f187a2419a5430af2623a12b588d816443b2410470bbbc75e5b5451`;
- `istanbul-named-evaluation-evidence-v2.json`, SHA256
  `54314f0fc6649818f1454fc854a2edcb3c9066e7313326f71154981f247381c5`.

Inventário sintático v3: 616 entradas preservadas, 378 analisadas (incluindo
25 scripts Vue), 197 SQL sem análise JavaScript e 41 caminhos `.js` ausentes
explicitamente não resolvidos. Entre as fontes analisadas há um argumento
padrão afetado em `packages/modules/encounters/src/index.ts`, e nenhum campo
anônimo afetado. Isso não prova ausência nas entradas não resolvidas nem nas
transformações de loaders. Os caminhos ausentes precisam ser reconciliados
com a fonte canônica antes de qualquer alteração do manifesto; não foram
removidos do denominador naquela rodada. A reconciliação posterior, vinculada
acima, comprovou que os41caminhos eram cópias geradas de originais já medidos;
foram movidos para registro histórico após revisão independente. Campos computados
seguem rejeitados e os demais
bloqueios de integração abaixo continuam abertos.

### Pendências obrigatórias

O novo experimento `istanbul-snapshot-vertical.mjs` liga os contadores reais
do candidato aprovado ao contrato cumulativo existente. Em JS/TS × CJS/ESM,
4/4casos passaram com8produtores sequenciais,36snapshots e28controles negativos.
O pai confere os bytes publicados antes do SIGKILL planejado e observa a saída
do filho antes de agregar. São preservados default1/0, campos2/1/2/1, zeros de
funções não chamadas, resultados do programa e remapeamento das posições da
fixture. Snapshots repetidos não são somados; gerações independentes são.
O Lead repetiu o experimento e a regressão27/27do contrato. Hash do novo harness:
`e99f5e13cd10e453cce59de5db8ce2cc03ec3ecd6d300693ecd2c4ad00a11af9`.
A evidência persistida `istanbul-snapshot-evidence.json` tem SHA256
`89cebd470b2083681dcd71c57c3c73739f1c814f69187321e7f721e2825c611a`.
O crítico fresco `critic_snapshot_vertical` (I1, somente leitura) aprovou esta
ligação delimitada após repetir4/4cenários e executar44asserções independentes
de sequência, largura/valores dos contadores, integridade de ACK e posições.
Hashes do harness, candidato e coletor permaneceram intactos. A integridade
depende da conferência de ACK/hash pelo supervisor confiável: o coletor isolado
não detecta falsificação plausível de um contador crescente. A aprovação não
cobre callbacks tardios de exit, worker threads, leitor produtivo ou mapas
gerais autenticados.

### Experimento de publicação após listeners síncronos de exit

O experimento `istanbul-exit-dispatch-experiment-v2.mjs` passou 26/26 cenários
CJS/ESM, com 16 terminais aceitos e 10 rejeitados. Ele envolve `process.emit`
e publica em `finally` depois da emissão nativa de exit; término aninhado sem
publicação, listener que lança, código não zero e falha de escrita não geram
evidência aceita. A comparação com o programa sem instrumentação cobre traces,
status e todos os contadores de função dessas fixtures. Não constitui um oracle
completo de statements/branches.

O crítico independente `billing_persistence_scout`, que não construiu o
experimento, repetiu os 26 casos e acrescentou 12 casos de registro em
beforeExit, adição/remoção durante dispatch, throw undefined, exit aninhado
não zero e restauração de exitCode. Aprovou somente esse envelope no Node
24.20.0. Harness SHA256 `e7cdafcd7ab1108e8663d28e41d2b8b5e0c956f2f293a36c16a66fff06c7693d`;
evidência `istanbul-exit-dispatch-results-v2.json`, SHA256
`7b5f14b67e2d8d4d38a0cda7044337ae85fdb236c5cdf6d9db1a10f923b36c0b`.
Probe e resultados independentes estão em `coverage-scope/exit-critic-*` dentro
dos artefatos da consolidação. Inputs e preload foram fixados por hash antes e
reconferidos depois; o experimento v1 permanece histórico.

A dependência de `process._exiting`, API privada, impede presumir suporte ao
Node 22 declarado no projeto. A identidade de process.emit muda; monkeypatch,
threads, tarefas assíncronas e falhas nativas não estão cobertos. O terminal
único não está integrado ao coletor cumulativo e ao leitor produtivo. ESM
tardio significa import concluído antes de exit, não import assíncrono dentro
de exit. Portanto a pendência de publicação produtiva continua aberta.

### Compatibilidade terminal medida em dois runtimes

O mesmo harness de exit v2 passou26/26 no Node22.23.2 e24.20.0 Linux x64.
O Node22 foi obtido do arquivo oficial e seu SHA256 comparado com o manifesto
HTTPS oficial, sem alegar verificação OpenPGP. Os relatórios originais foram
preservados em `terminal-runtime-exit-v*.json`; a limitação textual antiga
"only Node24" nesses outputs não substitui seu campo node e a nova evidência.
Resultados, fontes oficiais e limites estão em
`artifacts/consolidacao-2026-09-05/coverage-scope/terminal-runtime-findings.md`.

A proposta isolada `terminal-runtime-contract.mjs` admite somente esses dois
binários medidos, com versão, plataforma, arquitetura e hash exatos, e exige
purpose test explícito. Lead repetiu8rejeições e4contraexemplos de APIs públicas
em cada runtime. Purpose não é autorização nem barreira de segurança; pinning
não torna process._exiting público. Engines de produção permanecem inalterados.
O guard ainda precisa ser chamado pelo runner e confirmado pelo supervisor
antes de instalar o preload e aceitar resultados. Não está integrado.

O crítico independente thread_snapshot_experiment aprovou essa proposta
delimitada após repetir os guards nos dois binários e o harness26/26 no Node22,
conferindo416hashes de artefatos e52resultados brutos arquivados. Aprovação de
elegibilidade de teste não implica integração aprovada.

### Threads reais — candidato v2 aprovado no envelope experimental

O novo `istanbul-thread-snapshot-experiment-v2.mjs` passou CJS/ESM com6produtores
aceitos,28snapshots e26controles de rejeição. Workers simultâneos compartilham
PID, mas têm threadId e geração distintos. O supervisor confere o hash dos
bytes publicados antes de terminate e observa o evento exit; uma saída
inesperada após checkpoint não recebe terminal aceito. A soma usa somente o
último snapshot de cada produtor, mantendo default1/0, campos2/1/2/1 e seis
funções não chamadas com zero. As fontes/catálogo/mapas são fixados por hash.

Lead identificou import anterior ao registro de hashes no v1; esse artefato
permanece histórico. No v2, candidato e coletor são importados dinamicamente
depois dos hashes iniciais, somente no main. Harness SHA256
`790a3b623adf439294b69a031c640de35970963322c5b0df614360361c79bfa3`;
evidência SHA256 `076d6bee093268a4851c9666cee2da9caeaa0f03a63fed362d7387e96a97dcfa`.
A lista completa de workers lançados pertence ao supervisor: omitir produtor,
todos os seus registros e terminal exige essa conferência externa, pois o
coletor isolado não conhece workers omitidos. O crítico independente
report_requirements_read repetiu2/2 e acrescentou24mutações negativas;
aprovou somente esse envelope. Probes e resultados estão em
`coverage-scope/thread-critic-*`. Ele reproduziu as duas fronteiras de confiança:
contador crescente adulterado exige comparação com ACK, e omissão integral de
produtor exige a lista externa. Lead repetiu2/2 no Node22.23.2,6produtores e
28snapshots; `thread-lead-node22.json` registra a execução. A crítica independente
de threads acima foi no Node24, sem aprovação adicional implícita de runtime.
Nenhuma promoção do gate foi feita.

Esse experimento fecha um finish explícito e quiescente; não integra o wrapper
de exit tardio, TS/loaders, múltiplos vm contexts, leitor seguro ou mapas gerais.
O contrato atual limita catálogo a256artefatos, enquanto o escopo congelado tem
353fontes javascript-metrics e222fontes especializadas. O desenho produtivo
precisa dimensionar budgets e preservar fontes não carregadas com zeros; não
pode reduzir o manifesto para caber no limite experimental.

### Composição terminal/threads/leitor — envelope mínimo aprovado

`istanbul-composed-supervisor-v2.mjs`, com child/worker v2, liga o runtime guard,
o dispatcher terminal adaptado e o coletor cumulativo ao leitor real
`scripts/lib/pinned-process-records.mjs`. O novo kind instrumented usa namespace
separado de V8, com PID/thread/geração/sequência no nome. A lista de produtores
é registrada antes da entrega da tarefa, o descriptor do diretório é aberto
antes do lançamento, e o reader é esgotado após término observado. Bytes,
nome/envelope, lista de produtores e ACK são conferidos; falha de leitura não
admite fallback. ACK terminal usa arquivo síncrono em diretório de controle
separado; não presume entrega de IPC assíncrono durante exit.

O leitor passou12testes,31adjacentes e8probes independentes. Esses8probes ficaram
apenas no transcript, sem script/log arquivado; essa limitação está em
`artifacts/consolidacao-2026-09-05/instrumented-reader/evidence.json`.
O novo experimento composto passou28/28: CJS/ESM, processo/worker e sete modos
de término,12aceitos e16rejeitados. São148controles de rejeição, incluindo72
mutações reais de arquivos após parada. O crítico independente repetiu28/28
no Node24.20.0 e adicionou32verificações, com scripts/logs em
`coverage-scope/composition-critic/`. Lead repetiu28/28Node22.23.2; a crítica
independente de composição foi no Node24.

Supervisor SHA256 `b38b1c610f0cbb8b36c5221ddd66e12d1b0c6729fbdeca982dc3b5f71d7f7e51`;
evidência v2 SHA256 `c2b90087a654f5d2129330c16d92d2c36fe5b0b7cd4a236a0cde18bceaa10e57`.
V1 permanece histórico. A prova cobre fixture JS mínima, workers lançados pelo
mesmo supervisor, funções late com checkpoint0/final1 e aggregate final por
produtor. Não cobre topologia de worker lançado por um child, contextos vm,
TS/loaders, mapas gerais, auth de produtor hostil ou pipeline ERP. O reader
delimita os registros; arquivos de controle e catálogo ainda exigem desenho
produtivo de orçamento e validação. Não há claim de sandbox/atomic snapshot.

### Orçamentos separados — candidato de contrato aprovado

`instrumented-snapshot-budget-contract.mjs` separa limites de artefatos,
produtores, registros, bytes e slots numéricos retidos. O perfil proposto permite
512artefatos,256produtores,1024registros,1MiBpor registro,16MiBde entrada e
1.048.576slots. O contrato original permanece intacto. As27regressões originais
redirecionadas e10novas passaram; crítico acrescentou9probes e aprovou o
envelope. A reserva inclui largura do catálogo para aggregate e todos os
contadores retidos. São limites de rejeição, não prova de adequação de RSS/heap.
Compatibilidade mudou explicitamente: maxRecords não limita mais inventários,
e reserva conservadora pode rejeitar entradas antes aceitas, inclusive catálogo
grande não usado.

A evidência v2 fixa inputs antes do import e reconfere depois.353hashes de fontes
JS foram verificados, sem exclusões;222fontes especializadas não foram medidas.
Separadamente, execução sintética de353artefatos preservou353zeros/706slots de
aggregate,435.940bytes serializados e2.824slots reservados/retidos. Nenhum mapa,
code hash ou site table fictício foi associado às fontes reais. O crítico
reconstruiu a execução e os hashes. Evidência SHA256
`239a290dd628ed46dd93ad008302a91a3b351422ae479eb6294cbdbf2a4cc2e5`;
contrato SHA256 `37b91ad946db076418892931be2df523b5a521c7f1d6abba6063f018f60be0ab`.
Scripts/logs independentes: `coverage-scope/budget-critic/`. Próximo trabalho:
derivar catálogo/site counts/mapas autênticos das fontes congeladas e medir
bytes reais antes de integrar esse perfil na primeira suíte real.

Estas pendências impedem declarar `TECHNICALLY_SPECIFIED`:

1. Instrumentador completo e integração com CJS/ESM/TS/build/loaders, incluindo
   transparência de nomes, strict mode, eval e comportamento observável.
2. Publicação que cubra callbacks síncronos de `exit` executados depois do primeiro
   listener do preload. Copiar contadores apenas nesse primeiro listener é insuficiente.
3. Inicialização, geração e checkpoint de worker threads e múltiplos contexts.
4. Schema estrito, recuperação de escrita parcial e limite de custo de snapshots.
5. Remapeamento completo dos pontos instrumentados e preservação de métricas zero
   em fontes carregadas e não carregadas conforme o escopo congelado.

## Verificação e implantação

Primeiro exercitar registros reais em processos descartáveis: default avaliado
1/0, campos intercalados2/1/2/1, snapshots repetidos, contador regressivo, sequência
ausente, artefato adulterado, fonte/mapa trocados, overflow, crash e checkpoint ACK.
Depois integrar uma suíte real com restart/SIGKILL e obter crítica independente
antes do novo controlador integral. Nenhum resultado do experimento promove o gate.

O opt-in deve permanecer restrito ao runner de testes e à fixture staging explícita
já autorizada; não habilitar instrumentação em produção ou usar serviços externos.
Falha de integração preserva os artefatos para diagnóstico e impede publicação.
Rollback da ferramenta não torna os antigos contadores suficientes nem certifica53956.

O plano de execução continua no documento vinculado acima. Próximo gate:
`TECHNICALLY_SPECIFIED`, ainda não atingido. Próxima ação de especificação:
derivar catálogo de artefatos/mapas/site counts reais do escopo congelado e medir
os budgets antes de integrar o supervisor à primeira suíte real. Preservar as
aprovações restritas já obtidas; mapas gerais, loaders, múltiplos contexts,
arquivos de controle e denominadores zero continuam requisitos abertos.
