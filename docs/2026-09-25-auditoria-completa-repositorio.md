# Auditoria completa do estado de construção — CVG HIS V4

**Data:** 25 de setembro de 2026, America/Sao_Paulo.  
**Objeto:** código, configuração e testes do workspace `/home/ricardo/cvg-his-v4`.  
**HEAD observado:** `ad2f0373f68635f2579253b013a4382219906921`.  
**Nota geral:** **69/100** — média ponderada de **68,86**, arredondada.  
**Estágio:** desenvolvimento funcional avançado, com necessidade de correções, estabilização e homologação operacional.  
**Decisão técnica:** a evidência desta auditoria não sustenta liberar o conjunto completo para produção hospitalar nem qualificá-lo como release AAA certificada.

Este é um relatório complementar sobre os bytes locais auditados. Não substitui automaticamente os documentos canônicos de governança nem constitui aprovação de release. O backlog desta revisão contém exatamente **50 ações: 20 de prioridade Alta, 25 Média e 5 Baixa**.

**Entregáveis:** [50 ações detalhadas e critérios de conclusão](2026-09-25-backlog-50-acoes-auditoria.md), [notas e fórmula em JSON](audits/2026-09-25/scorecard.json), [resultados consolidados dos testes](audits/2026-09-25/execution-summary.json), [índice das evidências](audits/2026-09-25/README.md).

## 1. Parecer executivo

O repositório já possui um núcleo clínico e administrativo expressivo: cadastro, agenda, prontuário, prescrição, internação, diagnóstico, estoque, faturamento e caixa têm implementação, persistência e testes. O build completo passou. A suíte principal passou, incluindo 3.152 testes no recorte root e 1.959 no workspace SPA. Na repetição com ambiente de navegador corrigido, 328 de 329 casos passaram, incluindo cinco rotinas hospitalares por persona e 300 visitas a entradas de navegação. Esses resultados demonstram funcionamento substancial, dentro das condições e dos cenários executados. [Evidência de execução](audits/2026-09-25/execution-summary.json).

Os principais limites aparecem nas fronteiras que determinam a confiabilidade operacional: MFA voluntário fora do ramo de autenticação; compensação de upload que pode remover objeto já confirmado; conclusão de solicitações de privacidade sem o efeito correspondente; Pix vinculado ao atendimento ainda composto com provedor sintético; lembretes e alguns históricos de comunicação sem durabilidade suficiente; incompatibilidade entre a configuração aceita e o emissor fiscal; recuperação de banco externo e S3 sem demonstração. Essas conclusões têm diferentes níveis de prova, discriminados nas seções seguintes e no [backlog](2026-09-25-backlog-50-acoes-auditoria.md).

**69/100 é uma estimativa de maturidade demonstrada, não “69% do programa pronto”.** Não há uma especificação de escopo total congelada que permita medir percentagem de conclusão. Uma média também não compensa um defeito grave de segurança ou integridade: os bloqueios de maior impacto precisam de resolução individual e evidência de regressão.

## 2. Escopo, método e identidade do que foi auditado

Foram combinadas inspeção de código e composição de runtime, inventário do monorepo, execução de build e verificadores, testes unitários/de contratos, integração com PostgreSQL/Redis, testes de processo e navegador, análise dos resultados terminais e inspeção somente leitura do catálogo dos bancos descartáveis. A revisão considerou trilhas felizes e casos negativos existentes, persistência, isolamento entre contas, reinício, duplicação e coerência entre documentação, configuração e comportamento. [Inventário](audits/2026-09-25/inventory.json); [execuções](audits/2026-09-25/execution-summary.json).

| Identificação do recorte | Observação |
|---|---|
| Pacotes do workspace | 68, além do manifesto raiz |
| Módulos de domínio | 46 |
| Arquivos de fonte contados pelo inventário | 1.397; 361.333 linhas, segundo os filtros do inventário |
| Arquivos de testes contados | 931; a quantidade não informa cobertura executada |
| Estado inicial do Git | 185 entradas rastreadas modificadas e 482 arquivos não rastreados, todos preexistentes |
| Identidade efetiva | HEAD mais o conteúdo local; o SHA isolado não representa as alterações não commitadas |
| Integridade durante a revisão | 2.603 arquivos de código/configuração conferidos por SHA-256, sem mudança em relação ao início |
| Runtime de verificação | Node 22.23.2 e pnpm 10.33.0; o shell padrão tinha outra versão de Node |
| Dados e serviços | PostgreSQL/Redis exclusivos da auditoria, com dados sintéticos; não houve homologação externa |

As quantidades de arquivos são medidas de inventário, não garantias de completude funcional. O snapshot foi preservado em [manifesto de fontes](audits/2026-09-25/source-manifest-before.json) e [verificação de identidade](audits/2026-09-25/snapshot-verification.json). A árvore inicial não foi limpa, commitada ou revertida para obter um resultado verde.

### Classes de evidência

**Executado:** há resultado terminal ou consulta observada. **Estático:** o comportamento ou risco decorre de ramos de código e composição inspecionados, sem reprodução do incidente no alvo. **Lacuna de prova:** há implementação ou intenção, mas falta executar e registrar o cenário no ambiente apropriado. **Problema de configuração do teste:** o teste falhou por uma condição de seu ambiente; isso não é automaticamente um defeito do produto.

A revisão auxiliar de operações e integrações foi concluída. As revisões auxiliares de arquitetura e segurança não produziram pareceres independentes completos; o material parcial de segurança foi conferido pelo responsável pela consolidação. Não se reivindica uma aprovação independente de três especialistas. O relatório final se apoia nos resultados locais e nas referências explícitas, não em alegações de execução feitas por revisores auxiliares.

## 3. Notas por área e regra de cálculo

Cada área recebe quatro avaliações de 0 a 100: **I**, implementação e coerência funcional; **R**, robustez, persistência e integração; **V**, verificação efetivamente demonstrada; **O**, operação e manutenção. A nota da área é `arredondar(0,35 × I + 0,25 × R + 0,25 × V + 0,15 × O)`. Os componentes são julgamentos técnicos fundamentados, não medições estatísticas.

A nota geral é a média das notas de área com os pesos abaixo, que somam 100. Os pesos priorizam persistência, segurança, operação clínica e pagamentos. O cálculo utiliza as notas inteiras mostradas na tabela: `Σ(nota × peso) / 100 = 68,86`, arredondado para **69**. Valores na faixa de 80 indicam maturidade local forte com limites operacionais; valores em torno de 40–60 indicam lacunas relevantes. A autorização para produção depende também dos bloqueios, independentemente da média.

| ID | Área analisada | Nota / 100 | Peso | Fundamentação resumida |
|---|---|---:|---:|---|
| A01 | Arquitetura e modularidade | **78** | 4 | Monorepo modular funcional; composição e páginas ainda concentradas. |
| A02 | Build, tipos e dependências | **89** | 4 | Build e auditoria de dependências passaram; Vue fora do lint semântico e 161 avisos. |
| A03 | API, contratos e fronteiras de domínio | **80** | 3 | OpenAPI e contratos exercitados; reduzir concentração e completar deadlines. |
| A04 | Banco, migrações e integridade estrutural | **84** | 5 | Migrações e integridade testadas em banco novo; upgrade e restore do alvo pendentes. |
| A05 | Autenticação, MFA e sessão | **67** | 5 | Sessão e desafios persistentes existem; MFA voluntário fora do ramo de login. |
| A06 | Autorização, tenant e controles de segurança | **86** | 5 | RLS e testes de isolamento fortes; scanner/storage e enforcement externo não homologados. |
| A07 | Recepção, agenda, triagem e atendimento | **84** | 3 | Jornadas e persistência exercitadas; lembrete externo e UAT humana pendentes. |
| A08 | Prontuários e histórico clínico | **84** | 4 | Vínculos, revisões e integridade exercitados; complexidade de telas e UAT pendentes. |
| A09 | Internação, cirurgia e alta | **79** | 5 | Módulos e jornadas automatizadas existem; profundidade desigual e aceitação hospitalar pendente. |
| A10 | Prescrição e execução de medicação | **85** | 4 | Contratos de execução e persistência testados; falta homologação operacional do uso real. |
| A11 | Diagnóstico, laboratório e imagem | **77** | 4 | Ordens, laudos e ingresso testados; equipamento efetivo não homologado. |
| A12 | Produtos, estoque e suprimentos | **79** | 3 | Regras de estoque e venda testadas; migração e operação real precisam aceitação. |
| A13 | Faturamento, caixa e financeiro interno | **79** | 4 | Persistência e contratos testados; fechamento com provedores e capacidade no alvo pendentes. |
| A14 | Pagamentos externos: Pix e cartões | **45** | 6 | Cartão possui trilha durável; Pix vinculado sintético e criação direta com risco de duplicação. |
| A15 | Fiscal e NFS-e | **41** | 3 | Ciclo fiscal implementado; guard de credenciais incoerente e homologação ausente. |
| A16 | WhatsApp, email, SMS e Calendar | **41** | 5 | Adapters existem; durabilidade, credenciais e atualização remota têm lacunas. |
| A17 | Anexos, armazenamento e inspeção | **59** | 4 | Controles presentes; compensação de reenvio ameaça objetos já confirmados. |
| A18 | Privacidade, consentimento e auditoria | **47** | 3 | Trilha de auditoria presente; conclusão de solicitações não garante efeito persistido. |
| A19 | Eventos, outbox, workers e concorrência | **75** | 4 | Claims/retries e cadeia durável funcionam em teste configurado; readiness não mede progresso recente. |
| A20 | Interface, navegação e acessibilidade | **79** | 4 | 300 visitas de navegação passaram; fechamento do menu compacto falhou. |
| A21 | Testes, cobertura e confiabilidade das suítes | **73** | 4 | Grande base de testes; cobertura crítica atual e execução visual completa não comprovadas. |
| A22 | Observabilidade, tracing e alertas | **56** | 3 | Instrumentação local validada; labels, razão de erros e entrega de alertas exigem trabalho. |
| A23 | Implantação, backup e recuperação | **54** | 4 | Infra e scripts existem; hook inicial e recuperação do banco externo/S3 pendentes. |
| A24 | Release, documentação e coerência de evidências | **56** | 3 | Governança explícita; candidato local não consolidado e P0 bloqueado corretamente. |
| A25 | Automação analítica, heurísticas e OCR/ML | **39** | 1 | Parsing e heurísticas existem; extração de imagem e calibração não demonstradas. |
| A26 | Desempenho, resiliência e capacidade no alvo | **45** | 3 | Mecanismos presentes; faltam carga/endurance e identidade do deployment medido. |

Os componentes I/R/V/O e a ligação de cada área com as ações corretivas estão preservados no [scorecard auditável](audits/2026-09-25/scorecard.json). As notas de diagnóstico e cirurgia, por exemplo, não significam validação médica: avaliam o software e a prova de seus fluxos.

## 4. Testes e verificações efetivamente realizados

### 4.1 Resultado consolidado

| Verificação | Resultado observado | Interpretação e limite |
|---|---|---|
| `pnpm run build` | PASS; 146,03 s | Build canônico completo, incluindo verificação de tipos Vue e bundle SPA. Não houve execução separada de `pnpm typecheck`. |
| `pnpm run lint` | PASS; 59,68 s; **161 avisos** | O lint semântico possui escopo reduzido e não inclui arquivos `.vue`; aprovação não significa ausência de dívida de qualidade. |
| `pnpm audit --json` | **0 avisos de vulnerabilidade reportados**, 1.040 dependências | Resultado pontual do registro consultado; não demonstra ausência de toda vulnerabilidade possível. |
| Secretlint | PASS nos globs configurados | Não equivale a uma análise completa do histórico Git ou de todo documento. |
| `pnpm test` | PASS; 1.192,24 s | Inclui root: **302 arquivos / 3.152 casos**; SPA: **240 arquivos / 1.959 casos**; demais workspaces concluídos. Há sobreposição entre recortes. |
| Varredura com `vitest.integration.config.ts` | **4.169 passaram / 1 falhou**, de 4.170; 423 resultados de arquivo | A configuração mescla inclusões do root. Nem todos são casos exclusivos de integração. A suíte completa permaneceu reprovada. |
| Repetição isolada da cadeia API–worker | Falhou novamente sem a configuração obrigatória do worker | Reproduziu a deficiência da configuração do teste. |
| Prova discriminante da mesma cadeia | PASS; 1 caso; 18,94 s, com token sintético de métricas declarado | Demonstra que a cadeia executa no ambiente corrigido. Não altera retroativamente o resultado da suíte inteira. |
| Navegador: primeira execução | 436 casos: 79 passaram, 48 falharam, 309 não executados | Falhas de servidor/configuração invalidam atribuir os 48 resultados a defeitos do produto. |
| Navegador: repetição corrigida | **328 passaram / 1 falhou**, 329 casos; zero flaky | Recorte de oito arquivos em Chromium. A falha persistente é o fechamento do menu compacto. Não é aprovação de todos os 436 casos originais. |
| Rate limiter com Redis explícito | **26/26 passaram**, zero skip/todo | No agregado havia dois skips do recorte Redis; a execução focal os cobriu. |
| Contrato de runtime de produção | **3/3 passaram** | Exercita invariantes modeladas; não substitui deploy no alvo. |
| Tracing | **6/6 passaram** | Instrumentação local, contexto e sanitização de atributos. Coletor remoto não validado. |
| Contrato de backup/restore | **6/6 passaram**, mais verificações estáticas | O próprio resultado declara que não executou restore, rollback nem medição de RPO/RTO. |
| P0 registry / identidade do candidato | **FAIL** | Exige worktree limpo e congelado. O bloqueio foi preservado, sem ocultar alterações. |

Fonte dos resultados, horários, estados por arquivo e casos do navegador: [execution-summary.json](audits/2026-09-25/execution-summary.json). Não se somaram root, workspaces, varredura de integração e repetições como se fossem testes únicos. O código de saída 143 de um wrapper interrompido não foi tratado como resultado da integração: o processo de teste prosseguiu e escreveu seu JSON terminal, com um caso reprovado.

Também passaram os verificadores de **OpenAPI, namespaces, fontes de migração, contrato de ambientes, fluxo clínico, documentação, snapshot documental, política de dependências, observabilidade, complexidade, cadeia de fornecimento, pacote de remediação e política de skips**. O OpenAPI validado contém 431 paths, 41 tags e 527 schemas. O verificador de cadeia de fornecimento conferiu 132 referências de actions, 14 imagens de workflows, 15 de Compose, seis bases e quatro imagens usadas em scripts. São controles de fonte/configuração, não certificações do funcionamento de provedores ou do ambiente de produção. [Resumos dos verificadores](audits/2026-09-25/validator-summary.json).

### 4.2 Falha de integração: diagnóstico sem atribuição indevida ao produto

O caso `public-api-worker-event-chain.test.ts` inicia um worker com `NODE_ENV=staging`, mas não declara `METRICS_AUTH_TOKEN`, exigido pelo guard de métricas. O worker encerra na inicialização; a asserção de saída no `finally` pode esconder o erro original. O caso falhou no conjunto e na repetição isolada. Sem alterar a aplicação ou o teste, uma nova execução com a configuração sintética obrigatória passou. Classificação: **defeito da configuração e do diagnóstico do teste**, ação 48. [Teste](../tests/integration/process/public-api-worker-event-chain.test.ts#L182); [guard](../apps/worker/src/metrics-auth.ts#L31); [resultados](audits/2026-09-25/execution-summary.json).

Essa evidência não justifica afirmar que a outbox está quebrada ou que o encerramento normal do worker é defeituoso. Também não autoriza declarar a varredura completa aprovada: apenas o caso focal foi repetido com a configuração corrigida.

### 4.3 Falha de navegador reproduzida: menu compacto

No relatório de cancelamentos, a consulta persistida, a exportação CSV e a recarga avançam. Depois do redimensionamento para 390 × 844, o clique em “Recolher menu lateral” não ocorre: o botão está dentro do cabeçalho que recebe `inert` enquanto o menu está aberto. O mesmo caso falhou nas duas execuções. O menu não oferece controle de fechar exposto dentro da região ativa; Escape continua funcionando, portanto não se trata de aprisionamento absoluto do usuário. [Layout](../apps/spa/src/layouts/AppLayout.vue#L18); [botão](../apps/spa/src/layouts/AppLayout.vue#L36); [regressão](../e2e/spa/deleted-sales-report-flow.spec.ts#L143).

A correção deve alinhar o controle visível, o foco e o comportamento modal, mantendo o teste operável sem `force-click`. Classificação: **defeito reproduzido de usabilidade/acessibilidade**, ação 20. A auditoria não alterou o layout para mascarar a falha.

## 5. Estrutura e estado de construção

### 5.1 Organização arquitetural

A organização observada é a de um **monólito modular com processos separados de API, SPA e worker**. Os pacotes de domínio representam fronteiras de negócio, e não 46 serviços independentes já implantados. Há contratos e bibliotecas compartilhadas, repositórios de persistência, composição por configuração, migrações e mecanismos de eventos. As referências V2 preservadas em nomes de pacotes e infraestrutura pertencem à compatibilidade e identidade técnica documentadas do V4; não são, por si, sinal de dois produtos desconexos. [Workspace](../pnpm-workspace.yaml); [composição da API](../apps/api/src/bootstrap.ts); [consumidores do worker](../apps/worker/src/consumer-composition.ts); [README](../README.md).

O desenho permite seguir fluxos desde a interface até handlers, serviços, repositórios e efeitos posteriores. O ponto fraco é a distribuição desigual da complexidade: extrações e contratos coexistem com arquivos que concentram muitas responsabilidades. Passar no verificador de orçamento de complexidade não demonstra baixo acoplamento. [Inventário](audits/2026-09-25/inventory.json); [verificador](../scripts/check-complexity-hotspots.mjs).

| Arquivo | Linhas observadas | Consequência de manutenção |
|---|---:|---|
| `apps/spa/src/pages/patients/PatientDetailPage.vue` | 4.007 | Estado, formulários e navegação clínica concentrados. |
| `apps/api/src/server.ts` | 3.473 | Composição e dispatch com grande alcance de mudança. |
| `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue` | 3.002 | Revisão e evolução do prontuário exigem examinar muitos comportamentos juntos. |
| `apps/spa/src/router/routes.ts` | 2.920 | Catálogo de rotas, aliases e metadados extenso. |
| `apps/spa/src/layouts/AppLayout.vue` | 2.803 | Navegação, estado responsivo e foco compartilham um arquivo grande. |

Esses números sustentam ações de decomposição por responsabilidade, sem recomendar reescrita geral ou fragmentação puramente para diminuir linhas. O núcleo já testado deve ser preservado durante a extração.

### 5.2 Banco e integridade

Nos dois bancos de navegador criados para a auditoria, a inspeção do catálogo encontrou **189 tabelas, 43 enums e 530 chaves estrangeiras**, com **zero FK não validada e zero índice inválido**. Havia 173 tabelas com RLS habilitada e 171 com RLS forçada. As diferenças para o total de tabelas exigem análise da natureza de cada tabela; tabelas globais podem ter tratamento legítimo diferente. Não se inferiu vazamento entre contas apenas desses totais. [Consultas e resultados](audits/2026-09-25/database-inspection.json).

Há migrações com transação por arquivo, checksum e advisory lock, além de testes de atomicidade, isolamento e imutabilidade. A linha de migrações alcança `0177_clinical_evidence_cascade_immutability`. O conjunto executado inclui casos de RLS de prontuário, estoque e caixa, atomicidade de prescrição, outbox por tenant e fronteiras de internação. [Migrações](../packages/db/src/migrate.ts#L148); [RLS](../tests/integration/rls/rls-isolation.test.ts); [prescrição](../tests/integration/database/prescription-repository-atomicity.test.ts); [outbox](../tests/integration/database/outbox-tenant.test.ts); [resultados por arquivo](audits/2026-09-25/execution-summary.json).

Esse é um ponto forte real. Ainda falta demonstrar a atualização a partir da release efetivamente instalada e a recuperação coordenada do banco com seus anexos no armazenamento adotado. Migração em banco novo e validação de contrato de backup têm escopos diferentes desses ensaios.

### 5.3 Eventos, persistência e concorrência

O worker possui consumidores registrados, entrega de webhooks com claim/lease, retries e estados persistidos. Existem provas de processo e cenários de restart/SIGKILL em trilhas de internação e recebimento, além de contratos de criação durável de cartão. Isso indica investimento consistente em integridade e retomada. [Consumidores](../apps/worker/src/consumer-composition.ts#L52); [claims de webhook](../packages/modules/webhooks/src/index.ts#L612); [testes de processo](../tests/integration/process/inpatient-clinical-financial-restart.test.ts); [cartão durável](../tests/integration/card-creation-durable.test.ts).

Essa robustez não se propaga automaticamente a todos os efeitos. O lembrete WhatsApp ainda é disparado fora de uma cadeia equivalente de retomada; os acompanhamentos de email/SMS/Calendar da API são instanciados em memória; a readiness do worker consulta erro anterior sem impor idade máxima do progresso. As ações 7, 9 e 11 tratam dessas diferenças. Um destinatário externo também precisa deduplicar a identidade estável: a entrega de webhook não é promessa universal de efeito remoto exatamente uma vez.

## 6. Trilhas de uso verificadas

A tabela distingue fluxo exercitado de prova operacional pendente. A expressão “passou” se refere aos cenários automatizados e aos dados sintéticos utilizados, não a todas as variações possíveis do trabalho hospitalar. As cinco personas foram executadas no navegador, sem participação de profissionais reais. [Casos do navegador e de integração](audits/2026-09-25/execution-summary.json).

| Trilha | Evidência de funcionamento | Estado e lacuna principal |
|---|---|---|
| Tutor/animal → agenda → esteira → comanda | Persona de recepção passou, com cadastros e fechamento. | Funcional em teste; lembretes externos e UAT pendentes. |
| Histórico → anamnese → prescrição → impressão → orçamento | Persona de veterinário clínico passou. | Funcional em teste; revisar complexidade das telas e aceitação real. |
| Prescrição → execução e registro persistente | Testes de execução, atomicidade e integridade passaram no recorte executado. | Base consistente; validação do processo de trabalho cabe aos responsáveis clínicos. |
| Internação → leito → evolução → cobrança/alta | Navegação de internação e testes verticais clínico-financeiros, restart e concorrência executados. | Evidência local forte; operação contínua e UAT no alvo pendentes. |
| Cirurgia → persistência/hidratação → alta | Testes dos módulos de cirurgia e alta passaram. | Profundidade da evidência é menor que a dos fluxos clínicos centrais; não foi simulada cada cirurgia operacional. |
| Laboratório → equipamento/catálogo → resultado liberado | Persona de patologista passou; ingresso estruturado tem testes de persistência. | Fluxo interno demonstrado; bridge/equipamento efetivo pendente. |
| Ultrassom → modelo → laudo/anexo → impressão | Persona de ultrassonografista passou. | Fluxo demonstrado; armazenamento real e correção da compensação de anexos pendentes. |
| Administração → equipe → perfis/permissões | Persona de administrador e 12 casos de cadastros/perfis passaram. | Fluxo demonstrado; corrigir condição de MFA e executar UAT de privilégios. |
| Estoque → movimentação → venda/consumo → relatórios | Suites de estoque e testes PostgreSQL de suprimentos/relatórios passaram. | Base funcional; migração e reconciliação da operação real não certificadas. |
| Cancelamento → histórico persistido → CSV → recarga | Os passos de dados avançaram; um caso completo passou e outro falhou no controle responsivo. | Corrigir o menu compacto, preservando o resultado de dados já observado. |
| Configuração de webhooks → criar/editar/desativar | Dois casos de interface passaram; executor tem testes de persistência. | Gestão interna demonstrada; receptor externo ainda requer contrato/homologação. |
| Navegação desktop e móvel | 150 entradas visitadas em duas dimensões, totalizando 300 visitas; gate agregado passou. | Prova de acesso/renderização das entradas, não de todo CRUD de cada página. |

O protocolo existente de aceitação hospitalar exige execução humana e vínculo ao candidato. Esta auditoria não converte testes por persona em assinatura de aceite dos usuários. [Protocolo de UAT](operations/HOSPITAL_UAT_PROTOCOL.md#L10).

## 7. Integrações: implementação, conexão e homologação

**Nenhum provedor externo foi homologado nesta auditoria.** Código HTTP e testes com transporte simulado são evidência de implementação; não comprovam credenciais, contrato vigente, entrega, autorização fiscal ou transação aceita no ambiente do fornecedor. Os resultados locais aplicáveis estão no [resumo de testes](audits/2026-09-25/execution-summary.json).

| Integração | Implementação/conexão observada | Pendência objetiva |
|---|---|---|
| Pix direto Pagar.me | Adapter HTTP e persistência local; endpoint direto recusa o vínculo legado ao faturamento. | Identidade antes do efeito remoto e homologação de criação/consulta/retry. [Fonte](../apps/api/src/payment-gateway.ts#L408). |
| Pix do atendimento | Tentativa, dispatch e settlement duráveis, com provider local/sintético na composição inspecionada. | Conectar o provider real a essa trilha; preservar bloqueio do sintético em produção. [Fonte](../apps/worker/src/bootstrap.ts#L274). |
| Cartões Pagar.me | Criação com identidade de operação, persistência, captura e reconciliação; captura tem timeout. | Homologar autorização, captura, recusa e resposta ambígua. [Fonte](../apps/api/src/payment-gateway.ts#L517). |
| NFS-e | Emissor HTTP XML genérico, ciclo documental e recusa de resposta sem autorização. | Configuração aceita certificado isolado que o emissor não suporta; homologar município/provedor efetivo. [Fonte](../packages/modules/fiscal/src/nfse-emitter.ts#L389). |
| WhatsApp de saída | Adapters Twilio/360dialog; seleção no runtime. | Credenciais Twilio, lembrete durável, templates, entrega e retorno de status. [Fonte](../packages/modules/notifications-whatsapp/src/adapters.ts#L229). |
| WhatsApp de entrada | Endpoint próprio com segredo e ações condicionadas por flag. | Demonstrar o bridge com o formato e a autenticação reais do fornecedor. [Fonte](../apps/api/src/routes/whatsapp-routes.ts#L165). |
| Email transacional da API | Adapter Resend; histórico instanciado em memória. | Persistir acompanhamento e demonstrar entrega/retomada. [Fonte](../apps/api/src/server.ts#L1026). |
| Relatórios do worker por email | Provider próprio com deadline e identidade estável por entrega. | Validar composição, remetente e entrega no alvo; não compartilha necessariamente a deficiência do histórico da API. [Fonte](../apps/worker/src/report-delivery-provider.ts#L77). |
| SMS | Adapter HTTP com configuração insuficientemente separada e histórico em memória. | Conferir contrato oficial de conta/autenticação/payload, persistência e entrega. Não houve verificação externa desse contrato nesta revisão. [Fonte](../apps/api/src/sms-gateway.ts#L45). |
| Google Calendar | Adapter HTTP com token recebido por configuração; POST para agendamentos ativos. | Atualização/reconciliação de evento existente, renovação de credencial e histórico durável. [Fonte](../apps/api/src/google-calendar-gateway.ts#L50). |
| Webhooks genéricos de saída | Validação DNS/endereço, deadline, ID estável e claims persistidos. | Homologar o receptor e a deduplicação do efeito remoto. [Fonte](../packages/modules/webhooks/src/index.ts#L570). |
| Laboratório/equipment-bridge | Ingresso próprio com schema, assinatura, limites e persistência. | Demonstrar compatibilidade com o equipamento e mapeamento das unidades/identidades. [Fonte](../apps/api/src/laboratory-provider-ingress.ts#L4). |
| S3/MinIO e ClamAV | Adapters reais e guards de aptidão de produção. | Corrigir compensação de reenvio; demonstrar IAM, isolamento, inspeção, indisponibilidade e recuperação no alvo. [Fonte](../apps/api/src/index.ts#L268). |
| Vault | Provider com AppRole, cache de token e timeout; configuração Helm. | Policies, disponibilidade, rotação e recuperação no serviço instalado não foram demonstradas. [Fonte](../packages/secrets/src/providers/vault-secrets.provider.ts#L43). |

As buscas nominais em `apps/` e `packages/` não localizaram adapters Evolution/Chatwoot. Isso descreve apenas este repositório; não permite inferir o estado de outros projetos ou da estrutura de comunicação do hospital.

## 8. Achados de maior impacto

### 8.1 Segurança e integridade dos dados

**MFA voluntário ignorado no login de papéis não críticos — Alta, estático.** O desafio está dentro de `isMfaRequired(roleCodes)`; a verificação de fator ativo ocorre somente nesse ramo. Assim, habilitar fator em um papel fora da lista obrigatória não leva necessariamente ao desafio. A resolução é exigir o fator ativo em qualquer papel e conservar o fluxo de cadastro para os papéis obrigatórios sem fator. Não foi realizada exploração em produção. [Autenticação](../packages/modules/auth/src/index.ts#L195); [sessão direta](../packages/modules/auth/src/index.ts#L240); ações 1 e 45.

**Reenvio de anexo pode atingir o objeto de um envio anterior — Alta, risco estático.** A chave S3 inclui conta, entidade, prefixo do checksum e nome. O reenvio do mesmo conteúdo pode compartilhar a chave; os caminhos de compensação por checksum declarado divergente ou falha ao salvar metadados apagam essa chave. A tentativa precisa ter identidade/propriedade de limpeza que não alcance um objeto já confirmado. O risco foi identificado por código, sem remoção de objeto real nesta revisão. [Chave](../packages/modules/attachments/src/file-storage.ts#L365); [compensação](../packages/modules/attachments/src/index.ts#L444); [persistência](../packages/modules/attachments/src/index.ts#L507); ação 2.

**Conclusão de solicitação de privacidade não comprova execução — Alta, estático.** O serviço muda o estado para concluído depois de construir um resultado; os ramos de eliminação/anonimização geram plano operacional e o de revogação lista candidatos. É necessário distinguir plano, execução, decisão de retenção e efeitos de revogação. Essa conclusão é sobre a semântica do software, sem definir obrigação legal ou recomendar apagar registros sujeitos à retenção. [Conclusão](../packages/modules/lgpd/src/service.ts#L351); [plano](../packages/modules/lgpd/src/service.ts#L440); [revogação](../packages/modules/lgpd/src/service.ts#L477); ações 3 e 4.

### 8.2 Efeitos externos e consistência operacional

**Pix tem trilhas com maturidades diferentes — Alta, estático/lacuna.** A existência do adapter direto não completa o caminho vinculado ao atendimento. Além disso, o caminho direto efetua a chamada remota antes de persistir a identidade local, criando risco de duplicação ou operação órfã quando há retry ou interrupção. A criação durável de cartões é um controle positivo específico e não deve ser tratada como se tivesse o mesmo problema. [Pix direto](../packages/modules/pix/src/adapters/pagarme.adapter.ts#L99); [gateway](../apps/api/src/payment-gateway.ts#L417); [dispatch](../apps/worker/src/bootstrap.ts#L274); ações 5, 6 e 37.

**Comunicação não possui durabilidade uniforme — Alta, estático.** O lembrete de agenda é lançado de forma assíncrona no processo da API. Os repositórios de acompanhamento de email, SMS e Calendar são instanciados em memória mesmo com adapters externos, enquanto a configuração de produção prevê múltiplas réplicas. A perda de processo pode perder acompanhamento ou trabalho pendente, conforme o caminho. Separar credenciais Twilio e implementar atualização Calendar são correções adicionais específicas. [Lembretes](../apps/api/src/runtime.ts#L493); [repositórios](../apps/api/src/server.ts#L1026); [réplicas](../infra/helm/cvg-his-v2/values.prod.yaml#L6); ações 7–9, 18, 19, 34 e 39.

**Configuração fiscal aceita capacidade não implementada — Alta, estático.** O guard aceita API key ou certificado, mas o emissor rejeita o certificado isolado por não oferecer o transporte com assinatura PFX. Validar os mesmos requisitos no início e no emissor evita um serviço aparentemente configurado que falha ao emitir. [Guard](../apps/api/src/server.ts#L583); [emissor](../packages/modules/fiscal/src/nfse-emitter.ts#L389); ações 10 e 38.

### 8.3 Disponibilidade, implantação e recuperação

**Worker pode permanecer pronto sem progresso recente — Alta, risco estático.** O estado de prontidão depende de ausência de erro e não impõe a atualidade de `lastTickAt`. Uma operação suspensa depois de um ciclo saudável pode conservar o HTTP de saúde positivo. É uma inferência sobre o código, não um travamento reproduzido no alvo. [Health](../apps/worker/src/health.ts#L60); ação 11.

**Hook Helm depende de conta ainda não criada — Alta, estático.** O job `pre-install/pre-upgrade` referencia a ServiceAccount emitida como recurso normal do chart. Na primeira instalação em namespace vazio, essa dependência não está disponível pela ordem indicada. A existência prévia da conta pode mascarar o problema. Não foi instalado um cluster para reproduzi-lo. [Hook](../infra/helm/cvg-his-v2/templates/database-maintenance-jobs.yaml#L10); [ServiceAccount](../infra/helm/cvg-his-v2/templates/serviceaccount.yaml#L1); ação 12.

**Backup local não comprova recuperação da arquitetura de produção — Alta, lacuna.** O script monta bundle de banco Compose e diretório local; o perfil Helm utiliza banco externo e S3. É preciso recuperar os objetos e seus metadados de forma consistente, medir perda admissível de dados e tempo de recuperação, e verificar o destino e a proteção do bundle. O dump de globals pode conter verificadores de roles; hashes asseguram integridade, não confidencialidade. A proteção pode existir fora do script, mas não foi demonstrada. [Backup](../infra/scripts/backup-v2.sh#L103); [perfil de produção](../infra/helm/cvg-his-v2/values.prod.yaml#L84); ações 14, 15 e 32.

### 8.4 Coerência da medição e dos sinais operacionais

**Alertas podem ficar menos sensíveis do que aparentam — Média, estático.** O scrape fornecido usa label `development`, enquanto alertas específicos selecionam `production/staging`; alertas genéricos continuam existindo. Outro cálculo divide a taxa de erros por uma taxa total limitada inferiormente a 1: com 0,002 erros/s e 0,2 requisições/s, a razão correta de 1% vira 0,2%. São problemas distintos de seleção e matemática, sem alegação de incidente real. [Labels](../infra/observability/prometheus.yml#L26); [regras](../infra/observability/prometheus-alerts.yml#L25); ações 21 e 22.

**Capacidade medida precisa da identidade do serviço medido — Alta, lacuna de evidência.** O workflow associa o artifact a um SHA solicitado, mas mede uma URL independente, sem demonstrar o SHA/digest servido antes e depois da carga. Um relatório válido precisa vincular candidato, alvo e recursos. Não houve execução de k6/endurance nesta rodada. [Workflow](../.github/workflows/performance-certification.yml#L92); [benchmark](../benchmarks/k6/api-benchmark.js#L365); ações 24 e 33.

## 9. Coerência entre promessa, interface e implementação

### 9.1 Controles existentes que devem ser preservados

O projeto contém guards que recusam provedores sintéticos e componentes inadequados em produção, limitações explícitas nos documentos de recuperação, validação de identidade de candidato, referência de imagens fixada e entrega durável de webhooks. A falta de um segredo de produção ou um provider intencionalmente desabilitado não é, por si, um defeito: pode ser a recusa correta de uma configuração incompleta. [Guards](../apps/api/src/server.ts#L549); [callback sintético](../apps/api/src/routes/pix-provider-webhook-routes.ts#L243); [pipeline de promoção](../.github/workflows/release-artifacts.yml#L338).

A aprovação do verificador documental de snapshot não supera o bloqueio do P0 registry. Há regras legítimas para diferenças documentais entre commits, mas elas não certificam as centenas de alterações locais de implementação. O candidato atual registra SHA histórico e campos de CI/release sem identidade concluída. Esta auditoria vincula sua conclusão aos bytes preservados, não transfere automaticamente os resultados anteriores mencionados no README. [Identidade](triple-a/CURRENT_CANDIDATE_IDENTITY.json); [checagem de candidato](../scripts/lib/candidate-binding.mjs); [resultado P0](audits/2026-09-25/validator-summary.json).

### 9.2 Heurísticas, OCR e interpretação clínica

O módulo denominado OCR fiscal recebe `rawText` e extrai campos com expressões regulares; isso não demonstra extração a partir de imagem. As rotinas de previsão e agendamento usam fórmulas e incrementos fixos, incluindo valores de confiança que não demonstram calibração estatística. A detecção de anomalias laboratoriais inspecionada também exige avaliação específica de contexto, unidade e aplicabilidade clínica. [Parsing fiscal](../packages/modules/ml/src/ocr-fiscal.service.ts#L143); [previsão](../packages/modules/ml/src/demand-forecasting.service.ts#L83); [agendamento](../packages/modules/ml/src/smart-scheduling.service.ts#L185).

A recomendação é descrever o escopo real na interface e documentação, medir erro em amostras representativas e submeter uso decisório clínico ao responsável competente. Não foi avaliada a correção médica dos resultados, nem se afirma que um modelo clínico foi treinado ou homologado. Ação 49.

### 9.3 Cobertura e análise estática

O limiar da cobertura geral aplica-se a um subconjunto: há exclusões de rotas, repositórios e domínios críticos. O manifesto de cobertura crítica permanece como proposta não certificada e prevê execução em shards separados. Não foi produzido um percentual atual de cobertura total nesta rodada. Os 161 avisos de lint e a ausência de `.vue` no lint semântico também precisam aparecer ao lado do PASS, sem apagar a verificação de tipos realizada pelo build. [Configuração geral](../vitest.config.ts#L62); [escopo crítico](engineering/critical-coverage-scope.json); [lint](../scripts/run-semantic-lint.mjs#L19); ações 25–27 e 50.

## 10. Lista de 50 ações e ordem recomendada

A lista completa está em [Backlog — 50 ações priorizadas](2026-09-25-backlog-50-acoes-auditoria.md). Cada entrada contém etiqueta **Alta/Média/Baixa**, natureza do achado, impacto, localização de evidência, áreas afetadas e critério verificável de conclusão. A numeração é estável; a ordenação de execução segue criticidade e dependências, não apenas o número.

**Alta:** bloqueios ou riscos relevantes de segurança, integridade, dinheiro, continuidade ou aceitação do uso hospitalar. **Média:** defeitos e lacunas importantes de confiabilidade, usabilidade e capacidade de prova. **Baixa:** melhorias de manutenção, documentação e eficiência com menor impacto imediato. Uma homologação só é requisito de liberação da integração ou arquitetura efetivamente adotada; desabilitar explicitamente uma funcionalidade fora do escopo não equivale a homologá-la.

| Etapa | Resultado buscado | Ações principais |
|---|---|---|
| 1. Preservar identidade e corrigir integridade | Candidato revisável; MFA, anexos e solicitações de privacidade com semântica correta. | 13, 1–4. |
| 2. Fechar efeitos e retomada | Pagamentos vinculados, comunicação persistida, configuração fiscal e progresso do worker coerentes. | 5–11, 17–19, 34. |
| 3. Preparar o alvo e a recuperação | Instalação inicial, upgrade suportado, storage/scanner e recuperação conjunta demonstrados. | 12, 14, 15, 32, 35. |
| 4. Homologar o que será utilizado | UAT humana, provedores, equipamento, capacidade e sinais operacionais com evidência do mesmo candidato. | 16, 24, 33, 36–41. |
| 5. Completar regressão e reduzir dívida | Menu corrigido, testes autossuficientes, cobertura crítica, navegadores/visual e manutenção controlados. | 20–23, 25–31, 42–50. |

As etapas se relacionam e podem conter trabalho paralelo. Por exemplo, a correção de um teste ou do menu não precisa aguardar uma homologação externa. A liberação exige retestar os fluxos afetados e recompor as evidências do candidato resultante; as correções deste backlog não foram implementadas durante a auditoria.

## 11. Limites da conclusão

Não foram certificados nesta rodada: o conjunto completo dos 436 casos Chromium em uma execução corrigida; toda a regressão visual; Firefox/WebKit; percentuais atuais de cobertura crítica; carga e endurance no servidor escolhido; deploy Helm em namespace vazio; atualização a partir da última release suportada; restauração real com PostgreSQL externo/S3; RPO/RTO; entrega de alertas e retenção remota de traces; políticas e rotação do Vault instalado; sandbox de fornecedores; UAT humana; proteção de branch ou execução do CI remoto. A ausência dessas provas foi refletida nas notas e nas ações, sem ser tratada como falha já ocorrida em produção.

Os testes utilizaram recursos dedicados e dados sintéticos, porém certos caminhos da aplicação carregam `.env` explicitamente; por isso não se afirma isolamento universal de dotenv. A verificação não incluiu pentest externo completo, revisão de todo histórico de segredos, parecer jurídico, validação médica ou certificação regulatória. Não há evidência nesta auditoria de vazamento efetivo de dados, cobrança real duplicada ou perda de arquivo em produção.

Não foram feitos commit, push, merge, deploy, envio de mensagens ou transações em provedores reais. Foram gerados build e evidências locais. Os serviços temporários inequivocamente pertencentes à auditoria tiveram encerramento registrado em [cleanup.json](audits/2026-09-25/cleanup.json), preservando os demais processos e containers.

## 12. Evidências e encerramento

O [pacote de evidências](audits/2026-09-25/README.md) preserva resultados terminais sanitizados, casos e estados por arquivo, notas/fórmula, 50 ações em JSON, inventário, consultas do banco, hashes das fontes, verificações de consistência e encerramento dos recursos temporários. Os logs brutos e traces locais ficam em `/tmp/cvg-audit-20260925`; a permanência de `/tmp` não é garantida, portanto o conjunto sanitizado foi incorporado ao repositório.

**Conclusão:** há um ERP funcionalmente avançado, com bons mecanismos de persistência e uma base de testes relevante. O trabalho restante de maior valor está em corrigir os defeitos concretos, completar a durabilidade das integrações e comprovar instalação, recuperação, capacidade e aceitação humana sobre um candidato reproduzível. A nota **69/100** reconhece o que já funciona e mantém visíveis os bloqueios que os testes verdes, isoladamente, não eliminam.
