---
document_status: proposed
document_kind: frontend-executive-plan
effective_date: 2026-09-06
scope: frontend CVG Pulse; subprograma do ERP
---

# Plano executivo frontend — CVG Pulse / Precisão sensível

**Decisão proposta:** investir primeiro em continuidade de trabalho e hierarquia operacional; transformar essa base em uma experiência autoral de materiais, tipografia, botões e movimento. A direção chama-se **Precisão sensível**: confiança clínica, acolhimento e acabamento tátil. A beleza deve continuar presente durante o atendimento mais corrido.

Este documento desdobra a [auditoria de frontend](2026-09-06-auditoria-frontend-usabilidade-estetica.md), com 18 achados, em execução. É complementar ao [programa executivo ERP](2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md), sem substituir suas decisões, escopo ou gates. O [roadmap](2026-09-06-roadmap-frontend-premium.md) organiza a sequência; o [backlog](2026-09-06-backlog-frontend-premium.md) é a fonte dos estados e dependências. O [caderno visual](frontend/caderno-visual.html) materializa uma exploração inicial; não é tela homologada.

## 1. Resultado que queremos produzir

Ao chegar, a pessoa reconhece o hospital pela identidade e pela luz. Ao trabalhar, encontra a ação relevante de imediato. Ao abrir um paciente, conserva o contexto da fila. Ao voltar, filtros e posição permanecem. Ao salvar, recebe confirmação inequívoca do resultado real. O movimento explica essas mudanças em frações de segundo. A interface trata seus dados e sua atenção com cuidado.

A proposta se apoia em quatro assinaturas:

1. **Luz de cuidado:** azul petróleo acetinado e mineral claro, com ciano usado como indicação de ação. Materialidade concentrada nas áreas de identidade e em pequenos detalhes dos controles.
2. **Mesa de trabalho contínua:** cabeçalho compacto, identidade do paciente persistente, painéis de contexto e retorno previsível. Navegação com teclado e histórico do navegador igualmente completos.
3. **Botão lapidado:** geometria própria, borda luminosa discreta, relevo de um pixel, pressão curta e estados operacionais explícitos. A superfície nunca prejudica o texto.
4. **Movimento com memória:** seleção, expansão e retorno usam direção e distância consistentes. O usuário percebe de onde veio e o que mudou.

Não há evidência atual para declarar o produto State of Art ou Triplo AAA. São metas de excelência. Este trabalho entrega o plano e estudos; a implementação e a certificação continuam abertas.

## 2. Base factual e fronteiras da avaliação

A auditoria observou dez rotas com dados sintéticos, nos dois temas, desktop e celular; a galeria reúne 48 capturas. Encontrou recarga documental por link interno, perda de formulário ao mudar de módulo e corrida de respostas em uma função de listas. Recepção e Agenda têm conteúdo operacional tarde demais na página; na Agenda preenchida, o primeiro compromisso observado estava em y=1.965 no celular. Isso fundamenta a prioridade de continuidade e densidade.

Há qualidades a preservar: identidade CVG Pulse, login com materialidade e vídeo leve, navegação responsiva e correções recentes de semântica e overflow. A varredura de 1.295 arquivos textuais não equivale a leitura integral do acervo. Dez casos automatizados de acessibilidade sem violações não certificam todas as rotas. O estado do ERP mudou durante a consolidação documental; os achados são vinculados ao snapshot da auditoria, e precisam ser reproduzidos no candidato de implementação.

As demais áreas entram como **escopo de inventário e evolução**, não como defeitos visualmente comprovados: caixa, financeiro, estoque, compras, laboratório, relatórios, configurações e permissões. Cada uma ganha baseline antes de receber alterações.

## 3. Direção de arte executável

### Paleta e materiais

| Camada | Proposta inicial | Aplicação e restrição |
| --- | --- | --- |
| Mineral | `#F3F1EA` / branco aquecido | Fundo claro e superfícies de identidade; campos e linhas com separação nítida |
| Petróleo | `#103D48` / `#0B2028` | Texto forte, ações primárias e tema escuro; evitar grandes áreas saturadas nas tabelas |
| Ciano | `#64D7DE` | Realce, seleção e detalhe de luz; texto escuro sobre ciano; contraste a validar por par |
| Champagne | `#B99B67` | Acento editorial raro; nunca substitui cor de alerta ou indica prioridade clínica |
| Semântica | Tokens próprios de sucesso, aviso, erro e informação | Cor sempre acompanhada por texto/ícone; estados não herdam cores decorativas |

São candidatos, não tokens aprovados. Medir contraste em todos os pares reais, inclusive hover, seleção, disabled e foco. No tema escuro, reduzir brilho e distinguir superfície por luminância e borda; evitar simplesmente inverter o tema claro.

A textura será um grão fino de baixa amplitude, restrito a um plano editorial. O produto operacional usa superfícies silenciosas. Sombras distinguem elevação de menu, popover e drawer; cartões comuns podem usar apenas borda. Gradiente e vidro exigem função clara. Nada de textura atrás de informação clínica ou animação contínua no campo de trabalho.

### Tipografia, espaço e iconografia

Uma única família de interface, com licença e hospedagem local verificadas, deve substituir a mistura acidental. Testar primeiro a família já disponível no ambiente e uma candidata humanista; escolher pela legibilidade de acentos, dosagens, números e nomes longos. Não baixar fontes como etapa implícita deste plano. Usar números tabulares em horários, valores e medidas. Reservar uma eventual serifada de marca ao login/editorial, depois de comparação renderizada.

Escala inicial: texto operacional 14–16 px, metadados 12–13 px, títulos de página 24–28 px, display editorial 40–56 px. Esses valores são hipóteses para validar com zoom e dispositivos reais. Grade de espaçamento 4/8 px; raios pequenos nos controles, médios nos painéis e grandes apenas nas áreas editoriais. Ícones SVG da família existente, com espessura e alinhamento óptico consistentes. Rótulos funcionais continuam visíveis.

### Botões customizados

| Variante | Construção e comportamento |
| --- | --- |
| Primário | Petróleo, texto claro, borda interna de luz, sombra curta; uma ação dominante por região de tarefa |
| Secundário | Superfície mineral, contorno claro e hover discreto; mesma altura e peso do primário |
| Terciário | Texto e ícone sem bloco pesado; usado para ações de baixa frequência |
| Perigo | Semântica explícita e verbo específico; confirmação proporcional à irreversibilidade |
| Ícone | Nome acessível, tooltip complementar, foco visível e área de toque suficiente |
| Dividido | Ação padrão separada do menu de alternativas; dois alvos de teclado, nunca zona ambígua |

Contrato obrigatório: default, hover, focus-visible, pressed, loading, disabled, success e error. A largura não pode saltar ao carregar. O clique não deve duplicar comando. Estado de sucesso só aparece após confirmação do contrato real. `to` usa navegação interna adequada; `href` respeita destino externo; `button` recebe tipo correto. Tooltip não substitui nome. Proposta de alvo confortável de 44×44 px, com alternativa densa analisada separadamente.

### Gramática de movimento

| Evento | Hipótese de duração | Movimento e finalidade |
| --- | --- | --- |
| Hover/foco | 100–140 ms | Cor/borda; resposta imediata, sem deslocar layout |
| Pressão | 70–100 ms | Translação de até 1 px; não encolher texto nem perder nitidez |
| Expandir detalhe | 160–220 ms | Revelar conteúdo perto da origem; preservar âncora e foco |
| Drawer contextual | 200–260 ms | Deslocamento lateral pequeno e opacidade; fechar devolve foco |
| Troca de módulo | 140–180 ms | Dissolver conteúdo com deslocamento de até 6 px, shell estável |
| Salvar | Dependente da operação | Feedback imediato de processamento; conclusão vinculada à resposta |
| Identidade/login | Loop breve, opcional | Poster inicial e controle de pausa; fora da jornada operacional |

Curva candidata de entrada `cubic-bezier(.2,.8,.2,1)`, saída mais curta. Esses números são orçamento de design, não latência artificial: nunca atrasar resultado para terminar animação. Com `prefers-reduced-motion`, remover deslocamentos e desativar vídeo automático; preservar mudanças de estado e mensagens. A animação deve ser interrompível por ação seguinte, suportar cliques rápidos e não deslocar o alvo sob o cursor.

## 4. Experiência por jornada

| Jornada | Transformação proposta | Prova esperada |
| --- | --- | --- |
| Início por função | Resumo curto do turno e fila de trabalho, com indicadores secundários recolhíveis | A tarefa principal aparece no primeiro viewport por função; dados e permissões reais |
| Recepção | Busca no topo; próximo atendimento legível; cadastro mínimo e complementação posterior | Buscar tutor e iniciar fluxo sem atravessar cartões; perda de dados zero |
| Agenda | Abrir no dia/horário relevante; lista como alternativa mobile; filtros compactos | Compromisso relevante visível sem rolagem inicial; remarcação também por teclado |
| Tutor/paciente | Identificação e contato primeiro; dados fiscais/legados progressivos | Criar registro válido com campos essenciais; erro leva ao campo correto |
| Prontuário | Identidade e contexto clínico persistentes; leitura cronológica clara | Não confundir paciente ao mudar abas; salvar e recuperar contexto sem perda |
| Internação/leitos | Resumo do plantão, prioridade textual e detalhes sob demanda | Leito, paciente e condição legíveis em tela pequena; atualizações sem saltos |
| Caixa/financeiro | Valores alinhados, totais persistentes, estado de pagamento inequívoco | Pending/failed não exibem sucesso; reconciliação visual com resultado real |
| Estoque/compras | Densidade ajustável e ações de linha coerentes | Estoque, unidade e lote distinguíveis; seleção não se perde silenciosamente |
| Laboratório | Status e datas comparáveis; distinção entre pendência e resultado | Estados definidos pelo contrato; resultado acessível sem depender de cor |
| Relatórios | Filtros recuperáveis, preview e exportação com feedback | Contexto de filtro preservado; tabela e arquivo coerentes |
| Administração | Permissões compreensíveis e mudanças com escopo explícito | Acesso negado útil; interface não promete ação indisponível |

O trabalho sobre domínios clínicos/financeiros preserva regras existentes e requer revisão dos responsáveis. Painel contextual não deve esconder decisões extensas em um drawer apertado: quando a tarefa pede leitura longa, usar página dedicada com retorno contextual.

## 5. Arquitetura e entrega incremental

Evoluir o design system existente, sem criar uma biblioteca paralela. Centralizar tokens, estados de controles e padrões de composição; retirar estilos duplicados progressivamente. Decompor shell e páginas críticas por responsabilidade e contrato, associado ao item global `AAA-007`. Não transformar contagem de linhas em objetivo isolado.

Definir uma política de navegação: links internos, foco após mudança, título, restauração de scroll, filtros na URL quando apropriado, proteção de formulário alterado e retorno contextual. Rascunhos clínicos não devem ser gravados indiscriminadamente em armazenamento persistente do navegador: definir escopo, expiração, usuário, descarte e suporte do backend antes de autosave durável. O primeiro incremento pode proteger a saída e preservar estado em memória com comportamento explicitado.

Uma resposta antiga não pode vencer a consulta atual. Cancelamento ou identificação de requisição deve controlar dados, loading e erro; cobrir resolução e rejeição fora de ordem e desmontagem. Esqueleto corresponde à forma final; erro oferece recuperação específica; vazio distingue ausência de registros, filtros sem resultado e falta de permissão.

Promover por grupos de rotas com mecanismo de reversão definido em cada entrega. Baselines visuais mudam apenas após revisão do diff. Rollback de UI não desfaz comandos de negócio e não pode descartar rascunhos. Testes automatizados usam fixtures sanitizadas; homologação posterior usa serviços dedicados e dados controlados.

## 6. Régua de qualidade e medição

| Dimensão | Meta proposta | Como comprovar |
| --- | --- | --- |
| Continuidade | Zero recarga interna indevida e zero perda de formulário nas jornadas aprovadas | Navegador, requests de documento, voltar/avançar, falha e troca de módulo |
| Clareza | Uma ação dominante; busca e primeiro item relevante na primeira tela das jornadas prioritárias | Capturas preenchidas em desktop/mobile, por função e estado |
| Usabilidade | ≥95% de conclusão das tarefas prioritárias; zero erro crítico; mediana de tempo pelo menos 20% menor que baseline | Estudo comparativo com cenários equivalentes e participantes por função; registrar amostra e dispersão |
| Satisfação | SUS ≥85 como meta exploratória, sem inferir significância de amostra pequena | Aplicação consistente após tarefas; relatar respostas e tamanho da amostra |
| Acessibilidade | WCAG 2.2 AA no escopo declarado; melhorias selecionadas além de AA | Automação + teclado, zoom, contraste, leitor de tela e processos completos |
| Performance | LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 no p75 de campo | Instrumentação sanitizada, janela e volume explícitos; laboratório antes de campo |
| Arte e consistência | Zero defeito visual bloqueador e padrões coerentes entre módulos | Revisão humana independente, ambos os temas, estados e densidades |
| Movimento | Sem bloqueio de interação; redução de movimento completa | Timeline, cliques rápidos, teclado, CPU limitada e preferência do SO |

As metas de Web Vitals seguem a [referência primária do web.dev](https://web.dev/articles/vitals). Com pouco tráfego, registrar insuficiência de amostra; resultado de laboratório não é percentil real de usuários. A meta de conformidade usa a [WCAG 2.2 do W3C](https://www.w3.org/TR/WCAG22/). “Triplo AAA” do programa não equivale ao nível WCAG AAA.

Orçamentos iniciais a validar em baseline: imagem editorial ≤180 KB WebP/AVIF; loop decorativo ≤500 KB na versão de entrega; nenhum vídeo necessário à primeira interação; poster reservado sem CLS. JavaScript inicial e por rota não devem crescer acima da baseline sem análise e benefício medido. Monitorar transferência comprimida, memória, tarefas longas e custo dos filtros com volumes realistas. Nenhum dado de tutor, paciente ou texto clínico entra em telemetria de performance.

## 7. Investimento, responsáveis e governança

Premissa de planejamento: **2 FE, 1 QA e 0,5 UX**, com Produto/Operação e responsável de arquitetura disponíveis para revisões; artista 3D em intervenções pontuais. Isso não é alocação confirmada. O programa ERP menciona 1 FE: a capacidade extra precisa ser negociada no planejamento global. Com apenas 1 FE, reduzir trabalho simultâneo e reestimar a janela; não manter datas fictícias.

Estimativa inicial do backlog: **84–144 dias de execução principal**, distribuídos entre os papéis, sujeito à descoberta. Reservar 25% da capacidade para integração, revisão e correções; custo financeiro depende das taxas reais, não estimadas aqui. Limitar a duas entregas em desenvolvimento e uma em revisão por frente. Nomear pessoas antes de iniciar; papéis abaixo não são designações pessoais.

- Produto/Operação: tarefas, prioridades, terminologia e aceite de uso.
- UX/direção de arte: composição, tokens, conteúdo e revisão perceptiva.
- FE/LT: implementação, contratos, continuidade, desempenho e reversão.
- QA: evidência comportamental, dispositivos, acessibilidade e regressão.
- BE/Segurança: contratos reais, rascunhos e telemetria quando aplicável.

Reunião semanal curta decide a partir de uma jornada executável, diff e evidência. Gate visual precisa de avaliador que não construiu a entrega. Os itens frontend alimentam `AAA-007`, `AAA-044` e `AAA-045`; não os encerram automaticamente. A decisão final segue a Quality Bar global e seus aprovadores.

## 8. Riscos e decisões práticas

| Risco | Resposta e responsável |
| --- | --- |
| Refinamento bonito ampliar o tempo de tarefa | UX mede tarefa antes/depois; FE reduz decoração e latência antes da promoção |
| Cabeçalho compacto omitir informação clínica | Operação define conteúdo obrigatório e testa casos extremos |
| Mudanças concorrentes invalidarem auditoria | QA registra SHA, diff e hashes; reproduz achados antes de corrigir |
| Refatoração extensa atrasar ganho perceptível | LT separa contratos e entrega fatias verticais com regressão |
| Backend incompleto mascarado por mock | QA identifica modo sintético em toda evidência; promoção exige ambiente real |
| Vídeo degradar mobile ou causar desconforto | FE usa poster, carregamento opcional, pausa e movimento reduzido |
| GPU compartilhada impedir geração | Arte limita fila e resolução; preservar workflow e registrar falha sem interferir em outros trabalhos |
| Escopo sem capacidade | Produto define onda e funções do release; roadmap relativo permanece proposta |

A primeira decisão de execução é confirmar capacidade e cinco jornadas de maior volume. Isso não bloqueia a documentação nem os estudos já solicitados. A sequência recomendada é reproduzir FE-01/02/03, corrigir continuidade, fechar o sistema de controles e aplicar uma fatia completa Recepção → tutor/paciente → Agenda.

## 9. Artefatos produzidos com este plano

O [caderno visual interativo](frontend/caderno-visual.html) apresenta a direção proposta com dados fictícios, tema claro/escuro, botões customizados, estados de processamento simulados, abas por teclado e contexto modal. Foi inspecionado em Chromium a 390 e 1440 px; não houve overflow global ou erro JavaScript nos casos executados. Foco, vídeo e movimento reduzido foram verificados. Isso valida o estudo, não as rotas da SPA.

O MCP Blender criou a cena própria de órbitas em petróleo, mineral e champagne. Foram produzidos [vídeo de três segundos](frontend/assets/video/cvg-pulse-orbit.mp4), [poster](frontend/assets/images/cvg-pulse-orbit.webp) e fonte editável. A geração ComfyUI está **pendente na fila compartilhada**, com workflow gravado e validado para uma imagem de estudo 384×224. Não há imagem ComfyUI aprovada ou incorporada ao caderno nesta entrega. O [registro dos assets](frontend/assets/README.md) explica execução, cancelamentos, limitações e retomada.

O relatório de auditoria permanece em `docs`; seus links de evidência foram reconciliados com a movimentação preexistente para `legado/artifacts`. Não houve implantação deste redesenho na aplicação.
