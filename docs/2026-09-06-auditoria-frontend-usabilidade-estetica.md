---
document_status: audit
document_kind: frontend-audit
effective_date: 2026-09-06
scope: frontend, usabilidade, direção visual e qualidade de interação
---

# Auditoria do frontend — CVG-HIS V4 / CVG Pulse

**Parecer:** existe uma base visual reconhecível e uma superfície funcional extensa, mas a experiência observada ainda exige uma evolução importante de ergonomia, continuidade e acabamento para alcançar a ambição de excelência solicitada. **Não há evidência para classificar o frontend inteiro como AAA.**

O login já apresenta materialidade, movimento e identidade do hospital. O ambiente de trabalho mantém a paleta, mas perde parte dessa intenção na repetição de cabeçalhos grandes, blocos explicativos, cartões e ações. A oportunidade principal é transformar essa identidade em uma experiência operacional rápida e coesa.

Esta auditoria entrega diagnóstico e proposta. Não implementa o redesenho, não atualiza baselines visuais e não concede aceite de produção. O termo “AAA” expressa aqui a ambição de qualidade do produto; não significa certificação de conformidade WCAG AAA.

## 1. Escopo, método e limites

Foi avaliado o worktree local em `/home/ricardo/cvg-his-v4`, com HEAD `132d0f6eb8e1721ff15ee26fd4ea3f9c6ce5c75c` e alterações locais preexistentes. Esse SHA, isoladamente, **não identifica todos os bytes auditados**.

O inventário documental registrou **1.551 arquivos**: 1.092 Markdown, 136 JSON, 67 HTML, 255 PNG e um GZip. Os 1.295 arquivos textuais receberam varredura de conteúdo e classificação; o inventário contém caminhos, tamanhos e hashes. Houve leitura dirigida dos documentos de arquitetura, navegação, produto premium, auditorias, backlogs, implementação, certificação e correções recentes relevantes ao frontend.

**Limite de leitura:** varredura textual não equivale a leitura semântica integral de todos os documentos. Não foi feita nova inspeção individual das 255 imagens do acervo Vetus nem leitura integral de cada arquivo histórico. `docs/docs2` foi tratado como histórico, conforme a governança local. As telas Vetus não foram atribuídas ao CVG-HIS. Inventário documental (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/docs-inventory.json`).

No código foram inspecionados shell, roteador, navegação, tokens, CSS global, componentes compartilhados, autenticação visual, formulários, listas, Agenda, Recepção, paciente, prontuário, internação e infraestrutura de testes. O diretório de páginas contém **201 componentes Vue**; esse número não representa 201 jornadas certificadas.

No navegador, a SPA atual foi aberta com Playwright/Chromium, servidor Vite isolado, autenticação sintética e API interceptada. Foram cobertas **10 rotas distintas**: `/login`, `/`, `/owners`, `/owners/new`, `/patients`, `/reception`, `/appointments`, `/inpatient`, `/bed-map` e `/master-search`. Os retornos entre rotas são interações adicionais, não novas rotas.

As capturas principais usam **1440 × 900 e 390 × 844**, nos dois temas. A Agenda recebeu também uma reprodução em 1280 × 720 e 375 × 812. Foram examinadas capturas representativas em tamanho de viewport; capturas completas ficam disponíveis para investigar conteúdo abaixo da primeira tela.

Os dados são vazios ou sintéticos, com Agenda preenchida e uma rodada adicional de dashboard, tutores e pacientes preenchidos. Isso permite avaliar composição e comportamento da interface, mas não comprova banco, integrações, permissões reais ou resultados de negócio. A data visível nas imagens deriva do relógio do navegador; não foi usada para auditar regras de calendário.

Tipos de evidência utilizados:

| Tipo | Significado |
|---|---|
| Observado em navegador | Reprodução atual da SPA, dentro das fixtures declaradas |
| Observado em código/componente | Implementação inspecionada ou função real executada isoladamente |
| Documentado | Resultado de rodada anterior; não reexecutado nesta auditoria |
| Inferido | Consequência provável que requer reprodução adicional |
| Proposto | Direção de melhoria; ainda não implementada |

Não foram executados nesta rodada: suíte integral com PostgreSQL, matriz completa Firefox/WebKit, leitor de tela, UAT humano, medição de desempenho de produção ou revisão independente. A confiança é alta para os achados reproduzidos, parcial para a avaliação global de produto.

## 2. O que já está bem encaminhado

1. **Identidade própria.** O hospital está presente de forma reconhecível. O login combina fundo material, logotipo em vídeo, profundidade e um formulário legível. Existe controle de pausa e tratamento de movimento reduzido no código.
2. **Base de componentes reutilizáveis.** Cabeçalho, botões, campos, modal, cartões, tabelas, skeletons, alertas e badges oferecem uma fundação útil para padronizar o produto.
3. **Temas claro e escuro efetivamente renderizados.** Ambos estão implementados; não são apenas uma intenção documental. A paleta de azul profundo e ciano já sustenta uma direção reconhecível.
4. **Busca por comandos funcional no recorte testado.** `Ctrl+K` abriu a paleta, o campo recebeu foco e `Esc` fechou o modal. Há navegação por teclado e componentes próprios para busca.
5. **Cuidados de acessibilidade existentes.** Skip link, foco visível, labels, modal e controle de movimento reduzido já aparecem na implementação. O problema histórico de dois landmarks principais não deve ser repetido como se fosse automaticamente atual.
6. **Estados mais honestos em internação e leitos.** As correções recentes documentam separação entre carregamento, vazio e erro, além de carregamento independente de nomes complementares.
7. **Estrutura de testes relevante.** O projeto possui E2E, regressão visual, matrizes responsivas, Axe, testes de componentes e contratos de certificação. Falta completar e alinhar as evidências ao candidato final.

Esses elementos devem ser preservados e aprimorados. A identidade do hospital não precisa ser substituída para elevar a qualidade.

## 3. Reconciliação do que os documentos dizem estar aberto

Os documentos têm idades e alcances diferentes. O relatório master de 02/09 registra falhas que foram corrigidas em rodadas posteriores. Ele não deve ser copiado integralmente como backlog atual.

| Tema | Evidência posterior | Situação para esta auditoria |
|---|---|---|
| Dois `main`, campos sem nome, alvos e overflows de 02/09 | Relatório de implementação e certificação posterior | Não tratados como defeitos atuais sem reprodução |
| Três rodadas de 404 testes e 28 snapshots | Dossiê de 03/09, em SHA anterior | Evidência histórica útil; não certifica o worktree atual |
| 24 diferenças visuais da rodada posterior de 416 casos | Índice de triagem com 24/24 casos classificados | Triagem concluída; aprovação dos baselines continua separada |
| Compressão do título em larguras intermediárias | Correção do `AppPageHeader`, com matriz própria | Não reabrir como falta de implementação; integrar na regressão final |
| Item ativo fora da área visível do menu móvel | Correção e revisão específicas | Preservar a correção; não atribuir o defeito antigo ao estado atual |
| Ocupação, carregamento e nomes de internação/leitos | Correções e provas delimitadas de 06/09 | Escopo local melhorado; módulo inteiro ainda exige homologação |
| R05-006 e R05-007 — paciente e agenda | Registro estruturado em `REVIEW` | Extrações e verificações parciais não encerram a evolução arquitetural |
| R05-013 — SPA atual | `REVIEW` | Matriz final e vínculo com o candidato continuam necessários |
| R05-044 — visual, UAT e acessibilidade | `REVIEW` | Aceites completos ainda não comprovados |
| R05-014 e R05-045 — checkpoint e recertificação | `DOING` | Não há liberação global a declarar |
| R05-049 — concentração arquitetural | `REVIEW` | Componentes ainda muito extensos; melhorias adicionais continuam pertinentes |

Fontes: implementação de usabilidade (histórico arquivado: `legado/docs/2026-09-02-implementacao-usabilidade-playwright-cvg-his-v4.md`), dossiê hospitalar (histórico arquivado: `legado/docs/2026-09-03-dossie-certificacao-playwright-rotinas-hospitalares.md`), backlog de consolidação (histórico arquivado: `legado/docs/2026-09-05-backlog-consolidacao-cvg-his-v4.md`), tickets estruturados (histórico arquivado: `legado/artifacts/consolidacao-2026-09-05/tickets.json`), triagem visual consolidada (histórico arquivado: `legado/artifacts/consolidacao-2026-09-05/browser-visual-review/summary-final.json`).

## 4. Achados prioritários de usabilidade e navegação

### FE-01 — Navegação interna ainda recarrega o documento

**Prioridade P1 · observado em navegador e código.**

No cadastro de tutor, o botão Cancelar gera uma nova requisição de documento para `/owners`. O `DsButton` resolve `to` como uma âncora com `href`, sem integrar por si mesmo a navegação do Vue Router. Há 64 ocorrências textuais de `href="/` nas páginas; esse número é uma lista de candidatos à revisão, não 64 defeitos comprovados.

O cabeçalho compartilhado já possui tratamento de navegação interna em parte das ações. O problema é a aplicação desigual desse contrato, sobretudo nos slots e usos diretos de `DsButton`.

**Efeito:** reconstrução do shell, novas cargas de sessão e interrupção da continuidade entre tarefas. A intensidade da demora depende do ambiente e não foi cronometrada em produção.

**Aceite proposto:** links internos elegíveis fazem navegação SPA sem nova requisição de documento, preservando abertura em nova aba e teclas modificadoras. Downloads, impressão e links externos mantêm seus comportamentos próprios.

Fontes: [DsButton](../packages/design-system/src/vue/DsButton.vue), [formulário de tutor](../apps/spa/src/pages/owners/OwnerFormPage.vue), prova de navegação (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/navigation-kOAnF9/report.json`).

### FE-02 — Sair do formulário pelo menu descarta o trabalho em edição

**Prioridade P1 · observado em navegador.**

Foi digitado um nome no cadastro de tutor; em seguida, a navegação pelo menu para Agenda concluiu sem proteção observada. Ao reabrir o cadastro, o campo estava vazio. O teste de Cancelar também descartou o valor, mas o caso mais relevante é sair pela navegação geral durante uma interrupção.

Não foi encontrada uma política transversal de `onBeforeRouteLeave`, `beforeunload` ou recuperação de rascunhos nas fontes pesquisadas. Isso não prova que todo formulário perde dados da mesma maneira.

**Aceite proposto:** política comum para formulários alterados, com opções claras de permanecer, descartar ou recuperar rascunho quando aplicável. Para conteúdo clínico, rascunho e registro final precisam de contratos distintos de autoria, versão e armazenamento. Não usar armazenamento local indiscriminado para dados sensíveis.

Fonte: reprodução de saída e retorno (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/navigation-kOAnF9/report.json`).

### FE-03 — Respostas antigas podem substituir resultados mais recentes

**Prioridade P1 · observado na execução do componente compartilhado; alcance nas jornadas ainda inferido.**

O `useListData` não controla geração de requisição. Na execução da função real com duas promises controladas, a segunda consulta retornou “resultado novo”; depois, a primeira substituiu o conteúdo por “resultado antigo”. O indicador de carregamento também ficou falso enquanto a primeira requisição permanecia pendente.

Há consumidores em usuários, triagem, atendimentos, prontuários e orçamentos. A possibilidade concreta de consultas sobrepostas deve ser verificada em cada tela, sem assumir que todos os consumidores expõem o mesmo gatilho.

**Aceite proposto:** a última intenção do usuário prevalece; resultados obsoletos não alteram a tela; o estado de carga corresponde à consulta válida. Repetir com ordem invertida, falha tardia e desmontagem.

Fontes: [useListData](../apps/spa/src/composables/useListData.ts), reprodução isolada (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/list-race.json`).

### FE-04 — A busca principal da Recepção fica abaixo da primeira tela no celular

**Prioridade P1 · observado em navegador.**

Em 390 × 844, o campo “Buscar tutor ou paciente...” começa em aproximadamente **y = 851 px**. Antes dele aparecem o shell, trilhas, título, descrição, cinco indicadores, explicação de próximo passo e cinco ações.

O próprio cabeçalho declara que o próximo passo é buscar. A composição dá precedência a outros elementos e obriga o usuário a rolar antes de executar essa tarefa.

**Aceite proposto:** busca visível e utilizável no primeiro viewport móvel, seguida dos resultados. Cadastros rápidos e ações contextuais aparecem conforme a busca e a seleção. Os indicadores secundários ficam recolhidos ou mais compactos.

Fontes: [Recepção](../apps/spa/src/pages/reception/ReceptionGatewayPage.vue), medidas (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/focused-qyROrO/report.json`), captura móvel (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/current-5uJXn8/_reception-390-light-viewport.png`).

### FE-05 — Agenda privilegia controles e horários vazios sobre os compromissos

**Prioridade P1 · observado em navegador e código.**

No cenário sintético, o primeiro compromisso começa em cerca de **y = 1.528 px no desktop** e **y = 1.965 px no celular**. A página móvel inteira mede aproximadamente **4.363 px**. O componente gera 23 faixas horárias, de 0 a 22, e a matriz apresenta rolagem horizontal local no celular: 370 px disponíveis para 434 px de conteúdo.

Não houve overflow global nesse cenário. A rolagem é local e permite alcançar a coluna; o problema observado é a ergonomia, a descoberta da rolagem e a distância até a tarefa. Os horários dos compromissos pertencem à fixture e não representam a agenda real do hospital.

**Aceite proposto:** janela horária configurável por unidade; entrada no horário relevante; opção de mostrar horários vazios; visão móvel de compromissos em lista; filtros em painel sob demanda; data e profissional preservados ao abrir e fechar um detalhe.

Fontes: [Agenda](../apps/spa/src/pages/appointments/AppointmentsListPage.vue), medidas da matriz (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/current-5uJXn8/report.json`).

### FE-06 — Continuidade de foco, posição e filtros não possui contrato uniforme

**Prioridade P1 · foco observado; restante identificado no código e sujeito a teste por jornada.**

Após navegar do formulário para Agenda pelo menu, o foco continuou no link da navegação. Isso não é, isoladamente, uma declaração de violação WCAG, mas demonstra que a nova tarefa não recebe uma orientação de foco nesse caminho.

O roteador não define `scrollBehavior`. O shell renderiza `<router-view />` diretamente, sem uma política comum de transição. A existência de recentes e favoritos não equivale a restaurar posição, filtro e seleção de uma lista.

**Aceite proposto:** ida lista → detalhe → voltar restaura a pesquisa, posição e item; navegações para uma tarefa nova anunciam o destino e aplicam foco apropriado; alterações de tema e painéis não roubam foco.

Fontes: [roteador](../apps/spa/src/router/index.ts), [shell](../apps/spa/src/layouts/AppLayout.vue), prova de foco (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/navigation-kOAnF9/report.json`).

## 5. Achados de composição, aparência e acabamento

### FE-07 — A interface repete informação antes de mostrar trabalho útil

**P2, com impacto operacional alto em mobile · observado.**

O dashboard repete Agenda, Comandas e Vendas em atalhos e indicadores. Na sessão sintética com permissões amplas, sua página móvel chega a **5.990 px**. Essa altura depende do perfil e do conteúdo; não é uma medida universal de todos os usuários.

Na lista de tutores, cabeçalho, filtros e três cartões de instrução precedem o primeiro resultado. Com apenas um tutor sintético, o cartão começa em **y = 643 px no desktop** e **y = 1.132 px no celular**. Os números mostram espaço ocupado; não são medições de tempo de tarefa.

**Melhoria:** dashboard por função com prioridades reais do plantão; instruções dispensáveis recolhidas após aprendizado; resultados imediatamente após a busca; resumo de lista denso e detalhe sob demanda.

### FE-08 — Cabeçalhos e ações competem entre si

**P2 · observado.**

A aplicação combina topbar, barra de contexto, breadcrumb de página, subtítulo explicativo e painéis de ação. Em Recepção, cinco ações no cabeçalho competem com Buscar. Em Tutores e Internação vazios, a CTA do estado vazio pode competir visualmente com a CTA do cabeçalho.

**Melhoria:** variantes compacta, detalhe e visão geral do cabeçalho; uma ação de maior ênfase por estado; menu de ações secundárias; apenas uma trilha de localização quando as duas não agregam contexto distinto. O cabeçalho deve crescer por necessidade do conteúdo.

### FE-09 — O formulário de tutor exige leitura e rolagem excessivas

**P2 · observado.**

O formulário vazio mede **2.391 px no desktop e 4.277 px no celular**. Campos de legado, endereço, informações financeiras e pontos são apresentados em seções abertas. O primeiro telefone está em cerca de y = 1.170 px no celular. A lateral de resumo e guia acrescenta mais informação ao fluxo.

**Melhoria:** cadastro inicial orientado ao mínimo necessário para a rotina; enriquecimento posterior; campos legados em seção própria; salvamento acessível sem atravessar toda a página; indicação única de obrigatoriedade. O campo Nome hoje mostra dois asteriscos porque o label já contém `*` e o componente acrescenta o marcador de `required`.

As validações e exigências reais do cadastro devem orientar o desenho. Não remover campos obrigatórios de negócio apenas para encurtar a tela.

### FE-10 — A tipografia não tem uma hierarquia aplicada de forma uniforme

**P2 · observado em fontes e capturas.**

Os tokens definem uma pilha de fontes do sistema, começando em Aptos/Segoe UI, e Georgia/Times para display. Diferentes páginas, cartões e estados vazios alternam sans e serif com pesos e proporções distintos. O README do design system ainda descreve Inter como fonte, divergindo dos tokens atuais.

**Melhoria:** definir e aplicar papéis tipográficos: interface, título, dado numérico, texto clínico e marca. Usar numerais tabulares em valores e horários. A escolha entre fonte local e fonte licenciada auto-hospedada precisa considerar consistência entre sistemas e custo de carregamento. O objetivo é uma hierarquia reconhecível em todas as rotinas.

### FE-11 — A materialidade está concentrada no login

**P2 · observado; direção estética proposta.**

O login já oferece textura, luz e profundidade. No workspace, o acabamento depende sobretudo de gradiente radial, sombra de cartão, borda e faixa ciano. Esses elementos se repetem muito, reduzindo sua força hierárquica.

**Melhoria:** levar a linguagem material para o shell com contenção: fundo fosco, contornos finos, luz discreta nas superfícies elevadas e sobreposição com função clara. Reservar a textura mais perceptível ao login e às áreas sem dados. Tabelas, valores, texto clínico e alertas devem permanecer sobre fundos estáveis e legíveis.

### FE-12 — Falta uma linguagem de movimento entre tarefas

**P2 · observado no código; qualidade temporal global não medida.**

Já existem transições de cor, hover, menu móvel, skeleton e movimento no login. O que falta é um contrato consistente de continuidade: abrir detalhe preservando origem, trocar uma aba, filtrar uma lista e acompanhar uma mudança de status.

**Melhoria:** definir padrões por intenção, com duração e direção previsíveis. A transição deve informar origem, destino e resultado. Priorizar interrupção imediata, preservação do foco e resposta ao comando; não atrasar ações para terminar animações.

### FE-13 — Vocabulário técnico e nomes concorrentes enfraquecem o acabamento

**P2 · observado.**

Exemplos: `OPERATIONS OS`, `Console Enterprise`, “Busca federada”, “Busca Mestre”, “Central executiva Premium”, “handoffs”, “Ver clientes” versus “Tutores”. Algumas diferenças podem ser intencionais por contexto, mas a gramática não está clara ao usuário.

**Melhoria:** glossário operacional aplicado a menu, busca, títulos, CTAs, mensagens e documentos. Exemplos a validar com a equipe: “Passagens de plantão”, “Buscar em todo o sistema”, “Visão da operação”. Retirar qualificadores promocionais das rotinas diárias.

### FE-14 — A busca está fragmentada em várias superfícies

**P2 · observado.**

Há busca de módulo no menu, paleta de rotas, Busca Mestre e busca da Recepção. São capacidades diferentes, mas o usuário precisa aprender onde procurar uma rotina e onde localizar uma pessoa ou paciente.

**Melhoria:** um ponto de entrada com grupos claros — pacientes, tutores, rotinas e documentos — e ações compatíveis com contexto e permissão. Reutilizar os serviços existentes. Manter o campo local de filtro quando ele ajuda a trabalhar dentro de uma lista.

### FE-15 — O design system convive com muitas decisões locais

**P2 · observado em código.**

O CSS global tem **1.538 linhas**, além dos tokens e estilos locais. O shell tem **2.490 linhas**; paciente, **4.124**; Agenda, **3.110**; vendas de balcão, **3.468**; workbench de relatórios, **3.163**. Tamanho não prova defeito visual, mas aumenta o custo de aplicar padrões e investigar regressões.

A tabela compartilhada oferece semântica, skeleton e rolagem local. Ordenação, paginação, densidade e estado ficam distribuídos nos consumidores; a presença do componente não garante experiência uniforme.

**Melhoria:** consolidar tokens semânticos, variantes de cabeçalho, ferramentas de lista, mensagens de erro, ações e contratos de navegação. Extrair componentes por responsabilidade e testar comportamento; cumprir um teto de linhas não substitui simplificação real.

## 6. Visão por domínio

| Superfície | Avaliação e melhoria prioritária | Evidência desta rodada |
|---|---|---|
| Login | Região visualmente mais diferenciada; preservar marca/materialidade, validar pausa, erro, recuperação de acesso e consistência com o interior | Render claro/escuro desktop/mobile; código; Axe móvel |
| Início | Boa base visual; remover duplicação e priorizar urgências por função; distinguir visão clínica, recepção e gestão | Render sintético preenchido; código; Axe móvel |
| Recepção | Busca deve comandar a composição; resultados e próximo passo contextual antes de painéis explicativos | Render, medidas e movimento reduzido |
| Tutores e pacientes | Reduzir cartões e indicadores antes da lista; busca, seleção, vínculo e cadastro rápido com continuidade | Render vazio/preenchido; formulário e navegação |
| Agenda e fila | Agenda móvel em lista, horário relevante e filtros compactos; fila precisa de sinalização clara de espera e próxima ação | Agenda renderizada; fila dependente de evidência documental/código |
| Paciente e prontuário | Contexto clínico existe; transformar cabeçalho/contexto em base persistente, reduzir blocos e saltos de rota; esclarecer rascunho versus publicação | Código e documentos; detalhes clínicos não reexecutados com banco |
| Internação e leitos | Preservar correções recentes; evoluir para tarefas por turno, alertas e passagem de plantão com contexto | Render vazio atual; provas anteriores de estados preenchidos |
| Laboratório | Priorizar fila de trabalho, identificação de amostra, resultado/validação/liberação e pendências; manter ações de risco distintas | Código/documentação; jornada integral não executada aqui |
| Financeiro e vendas | Totais, saldo, status de processamento e reconciliação devem ser imediatamente compreensíveis; concentrar ações de caixa | Código/documentação; pagamentos e integrações não executados |
| Estoque e compras | Comparação densa, lote/validade e filtros preservados; edição e conferência sem perder posição | Componentes e documentação; não houve nova rotina ponta a ponta |
| Relatórios | Filtros, período, fonte, atualização e limite de exportação visíveis; drill-down consistente e estados de geração recuperáveis | Código/documentação; exportação real não reexecutada |
| Administração, RH e comunicação | Reduzir exposição de detalhes de plataforma na operação; manter permissões compreensíveis e disponibilidade honesta | Shell/documentação; sem homologação de cada módulo |

Esta tabela explicita o alcance da auditoria. Domínio sem reprodução atual não recebeu aprovação implícita.

## 7. Acessibilidade, responsividade e desempenho

### FE-16 — Acessibilidade precisa de fechamento manual dos casos inconclusivos

**P1 para homologação · observado.**

Foram executadas **10 análises Axe**, em cinco rotas móveis e dois temas: login, início, cadastro de tutor, Recepção e Agenda. Não houve violações automáticas reportadas no recorte configurado. Entretanto, todas as análises retornaram itens `incomplete`, incluindo contraste e atributos ARIA; o login também retornou inspeção pendente de autoplay de áudio.

Esses resultados **não comprovam conformidade integral** e tampouco confirmam que o login toca áudio. São itens que o motor não resolveu automaticamente. A inspeção manual deve verificar contraste real sobre gradientes, nomes e estados ARIA, mídia, foco e mensagens.

O teste de movimento reduzido na Recepção confirmou transição de botão em `0,00001 s`. A paleta abriu com foco e fechou com Esc. Não houve teste com NVDA/VoiceOver nesta rodada.

A WCAG 2.2 acrescenta critérios relevantes para este produto, como foco não oculto e tamanho mínimo de alvo. O mínimo AA de alvo considera 24 × 24 CSS px e exceções; 44 × 44 é uma meta de ergonomia recomendada aqui para controles frequentes de toque. [W3C: novidades da WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [W3C: tamanho de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Fonte da execução: resultado Axe (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/accessibility-7GCzMt/report.json`).

### FE-17 — A validação responsiva precisa medir utilidade, além de overflow

**P1/P2 conforme a rotina · observado.**

As capturas atuais mantiveram a largura do documento dentro dos viewports medidos. Mesmo assim, a Recepção esconde a busca inicial e a Agenda exige deslocamentos extensos. O CSS global usa `overflow-x: clip/hidden`; por isso, medir apenas `document.scrollWidth` não é suficiente para concluir que todos os elementos estão acessíveis.

**Aceite proposto:** verificar cada controle relevante, rolagem local alcançável, foco sem ocultação, primeira ação útil, zoom, teclado virtual e orientação. Completar 320, 375/390, 768, 1024, 1280/1440 e largura ampla, nos estados e dispositivos de uso efetivo.

### FE-18 — Desempenho percebido ainda não possui prova atual suficiente

**P1 para a promessa de fluidez · lacuna de evidência.**

O código utiliza carregamento de páginas sob demanda e separa o fornecedor Vue no build. Existem recursos de cache e PWA. Isso é favorável, mas não demonstra tempo de resposta real.

Não foi encontrada instrumentação de Core Web Vitals na busca dirigida em `apps/spa/src`. Não foram medidos nesta rodada INP, LCP, CLS, fluidez de animação sob carga ou latência real de jornadas. As capturas usam Vite de desenvolvimento e API sintética; seus tempos não devem ser apresentados como desempenho de produção.

**Aceite proposto:** build de produção em aparelho representativo; LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 no percentil 75 para os contextos aplicáveis; complementar com tempo de abertura de paciente, retorno à lista e resposta a filtro. Esses limiares vêm da documentação de Web Vitals, não foram alcançados por medição nesta auditoria. [Web Vitals](https://web.dev/articles/vitals?hl=en).

Medir também rede lenta, sessão expirada, falha parcial e conteúdo extenso. Priorizar requisições essenciais e não bloquear a superfície principal por enriquecimento opcional.

## 8. Direção proposta: CVG Pulse como ambiente de trabalho contínuo

**Tese de design:** um hospital vivo, organizado e preciso, com a identidade acolhedora do Guarapiranga e um ambiente operacional que mantém o contexto do paciente durante o trabalho.

### Linguagem visual

| Elemento | Direção proposta |
|---|---|
| Moldura | Azul profundo existente, menos caixas e separadores concorrentes; navegação por função e domínio |
| Área de trabalho clara | Superfícies minerais claras, contraste firme e maior densidade útil |
| Área de trabalho escura | Elevação por luminosidade e contorno; texto secundário legível; cores clínicas preservadas |
| Materialidade | Textura discreta no fundo/shell; luz e profundidade em painéis sobrepostos; dados em superfícies estáveis |
| Tipografia | Hierarquia comum, números tabulares, títulos operacionais compactos, marca com voz própria |
| Ícones | Família visual consistente, alinhamento óptico e legenda quando o significado não for evidente |
| Cor | Ciano para interação e identidade; estados clínicos e financeiros com semântica própria, também expressos em texto |
| Densidade | Modos confortável e compacto onde úteis; a preferência não pode reduzir alvos móveis essenciais |

### Movimento com intenção

As durações abaixo são **valores iniciais propostos**, sujeitos a teste, e não regras universais:

| Situação | Tratamento |
|---|---|
| Hover, foco e pressionamento | Feedback imediato; transição de 100–150 ms |
| Abrir detalhe rápido | Painel lateral em 180–240 ms, origem espacial clara, foco transferido e retorno ao acionador |
| Trocar aba ou filtro | Conteúdo em 120–180 ms, altura estável quando possível; resposta antiga nunca reaparece |
| Mudança de status | Ênfase breve na linha/cartão alterado, preservando posição e identidade |
| Carregamento | Skeleton com geometria compatível; atualização não desmonta desnecessariamente toda a página |
| Movimento reduzido | Remover deslocamentos decorativos; manter estado, leitura e feedback de conclusão |

Não propor reordenação automática de uma fila enquanto alguém está interagindo com um paciente. Atualizações operacionais precisam preservar a seleção e comunicar o que mudou.

### Três experiências que podem tornar o produto memorável

**1. Recepção que acompanha a chegada.** A tela abre com busca pronta. Selecionar tutor revela seus animais; selecionar o animal mantém ambos em contexto e oferece o próximo passo permitido. Cadastro rápido acontece em painel, sem abandonar a busca. O usuário vê o paciente avançar para a fila com confirmação de estado e sem redigitar vínculos.

**2. Contexto clínico persistente.** Identificação, tutor, risco e atendimento ativo permanecem visíveis enquanto exames, prescrições e histórico são abertos em painéis. A tela preserva rascunho e posição. O movimento deixa clara a relação entre o registro e o painel, e o fechamento retorna exatamente à tarefa anterior.

**3. Plantão orientado a prioridades.** Internação apresenta pacientes, tarefas próximas, atrasos, responsável e passagem de turno. A equipe filtra por setor e horário; uma execução confirmada recebe feedback discreto e atualiza o estado correspondente. Recursos clínicos ou integrações ainda não disponíveis devem permanecer explicitamente dependentes da implementação e homologação necessárias.

Essas propostas aprofundam a visão já registrada no plano de produto premium (histórico arquivado: `legado/docs/2026-07-11-plano-produto-premium-erp-veterinario.md`). Não representam funcionalidades implementadas por esta auditoria.

## 9. Sequência recomendada de melhoria

| Etapa | Entregas | Critério de saída |
|---|---|---|
| 1 — Continuidade e proteção | FE-01, FE-02, FE-03 e FE-06: navegação, formulários, concorrência e retorno | Jornadas reproduzidas sem recarga indevida, perda silenciosa ou resultado obsoleto |
| 2 — Fluxos de maior frequência | FE-04, FE-05, FE-07–09: Recepção, Agenda, listas e formulário | Primeira tarefa útil visível; menos rolagem/etapas medidos em cenários equivalentes |
| 3 — Sistema visual e movimento | FE-10–15: tipografia, materialidade, componentes, busca e motion | Protótipo funcional de Recepção → paciente → tarefa aprovado visualmente; padrões aplicáveis aos demais domínios |
| 4 — Expansão e homologação | FE-16–18 e R05-013/044/045 | Matriz atual, falhas/estados, desempenho, três engines e aceites aplicáveis no candidato final |

A etapa 3 pode começar pela definição visual enquanto se resolvem defeitos de continuidade, mas a difusão do redesenho precisa usar componentes e comportamentos estáveis. Não recomendo um pacote isolado de efeitos visuais antes de estabilizar os fluxos principais.

O backlog FE deste relatório é **proposto**. Deve ser reconciliado com os tickets R05 existentes, sem duplicar atividades já implementadas nem alterar seus estados automaticamente. Produto/design responde pela direção e prioridades; frontend pela implementação; QA pela prova; profissionais das rotinas pelo aceite de uso.

## 10. Como demonstrar a qualidade pretendida

Uma avaliação de excelência precisa conseguir reprovar uma interface bonita que dificulta a tarefa. A próxima rodada deve exigir:

1. Identificação e próxima ação compreensíveis no primeiro viewport das rotinas prioritárias.
2. Busca, seleção, edição e retorno sem perder contexto ou trabalho.
3. Estados preenchido, vazio, carregando, erro, parcial, sem permissão e conflito, quando aplicáveis.
4. Navegação por teclado, foco/restauração, zoom, contraste manual e leitor de tela.
5. Temas e larguras relevantes com dados longos e volume operacional representativo.
6. Animação observada em execução, com interrupção e movimento reduzido; screenshot sozinho não avalia movimento.
7. Desempenho medido em build e equipamento representativos.
8. Tarefas observadas com recepção, clínica, laboratório, enfermagem e administração conforme o escopo; medir sucesso, erros, retorno e tempo, sem fabricar metas já alcançadas.
9. Revisão independente de Produto/UX sobre o candidato e evidências atuais. Aceites históricos delimitados não aprovam o sistema inteiro.

O [runbook de certificação](usability-certification-runbook.md) já estabelece parte relevante dessa governança. O relatório acrescenta ergonomia, continuidade, materialidade e movimento à barra de avaliação.

## 11. Evidências produzidas e limitações finais

| Pacote | Resultado e alcance |
|---|---|
| Capturas principais (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/current-5uJXn8/report.json`) | 32 combinações capturadas; 31 registros completos e um timeout de seletor na interação do formulário, preservado no relatório |
| Reprodução dirigida (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/focused-qyROrO/report.json`) | Seis registros completos; medidas e movimento reduzido. O registro inicial de navegação SPA foi refinado na prova abaixo |
| Navegação refinada (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/navigation-kOAnF9/report.json`) | Confirma recarga de documento no Cancelar, perda de campo ao sair pelo menu e foco no link de Agenda |
| Estados preenchidos e Busca Mestre (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/populated-lneKJG/report.json`) | 16 registros completos, dois temas e dois tamanhos; dados sintéticos, sem erro de página registrado |
| Acessibilidade automatizada (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/accessibility-7GCzMt/report.json`) | Dez análises; zero violações automáticas reportadas e itens inconclusivos que exigem inspeção manual |
| Concorrência do carregador (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/list-race.json`) | Resposta antiga sobrescreveu a nova na função real executada isoladamente |
| Galeria visual (histórico arquivado: `legado/artifacts/frontend-audit-2026-09-06/galeria.html`) | Capturas atuais, com filtros e acesso às imagens completas; não é protótipo de redesenho |

O primeiro timeout ocorreu porque o seletor esperava o label exato `Nome *`, enquanto o campo renderizava marcadores duplicados. A reprodução seguinte usou o identificador do campo. Essa falha do harness não foi apresentada como falha de carregamento da página, e o arquivo original foi preservado.

Os harnesses verificaram estabilidade dos 13 inputs originalmente fixados entre início e fim de cada execução. Isso não é um hash de todo o produto. Os servidores próprios foram fechados ao final. Não foram alterados código funcional, banco, snapshots de referência ou tickets existentes.

**Conclusão técnica:** a auditoria está entregue; a evolução do frontend permanece aberta. O maior ganho imediato vem de continuidade de navegação, proteção do trabalho e composição orientada à tarefa. A identidade CVG Pulse pode sustentar um produto sofisticado quando esses comportamentos forem tão bem cuidados quanto o login.
