---
document_status: proposed
document_kind: frontend-backlog
effective_date: 2026-09-06
---

# Backlog frontend — execução da experiência CVG Pulse

**34 entregas propostas**, derivadas dos 18 achados da [auditoria](2026-09-06-auditoria-frontend-usabilidade-estetica.md). Este é o registro de trabalho do subprograma frontend; `FEA-*` não substitui os tickets globais `AAA-*`. [Plano executivo](2026-09-06-plano-executivo-frontend-premium.md) · [Roadmap](2026-09-06-roadmap-frontend-premium.md).

## 1. Regras de execução

O planejamento inicial começou com todos os tickets em **PROPOSTO**. Em 07/09 iniciou-se a execução autorizada; o estado abaixo passa a refletir implementação e evidência, sem confundir revisão parcial com aceite integral. Os artefatos conceituais são insumos de FEA-016, sem encerrar sua integração/revisão. Dependências indicam ordem técnica, não evidência de conclusão. Estado permitido: PROPOSTO → READY → DOING → REVIEW → DONE; BLOCKED exige motivo, responsável e condição de desbloqueio. READY requer escopo e dependências suficientes; DONE exige o aceite abaixo e a definição comum.

Prioridade P1: continuidade, operação e fundação necessária; P2: expansão e acabamento planejado. P0 será usado para bloqueador crítico confirmado do candidato, sem fabricar criticidade a partir de uma preferência estética. P2 ainda pode ser obrigatório para o escopo final. Papéis: FE frontend, UX experiência/arte, QA qualidade, LT arquitetura, OP operação/produto, BE backend. São responsáveis propostos, a nomear. Esforço é faixa em **dias úteis de execução principal**, não prazo de calendário; revisão, coordenação e dependências precisam de capacidade própria. Reestimar após F0.

| ID | Onda | Pri. | Estado | Owner | Dias | Dependências FEA |
| --- | --- | --- | --- | --- | --- | --- |
| FEA-001 | F0 | P1 | DOING | QA/LT | 1–2 | — |
| FEA-002 | F0 | P1 | PROPOSTO | UX/OP | 2–3 | 001 |
| FEA-003 | F0 | P1 | DOING | FE/QA | 2–3 | 001 |
| FEA-004 | F1 | P1 | REVIEW | FE | 1–2 | 001 |
| FEA-005 | F1 | P1 | DOING | FE/OP | 3–5 | 001,004 |
| FEA-006 | F1 | P1 | REVIEW | FE | 2–3 | 001 |
| FEA-007 | F1 | P1 | DOING | FE/UX | 2–4 | 004,005 |
| FEA-008 | F1 | P1 | REVIEW | FE/LT | 3–5 | 001,006 |
| FEA-009 | F2 | P1 | REVIEW | UX/FE | 2–4 | 002 |
| FEA-010 | F2 | P1 | REVIEW | FE/UX | 2–3 | 004,009 |
| FEA-011 | F2 | P1 | PROPOSTO | FE/UX | 2–4 | 005,009,010 |
| FEA-012 | F2 | P1 | PROPOSTO | FE/UX | 2–3 | 006,009,010 |
| FEA-013 | F2 | P2 | REVIEW | FE/UX | 2–3 | 007,009,010 |
| FEA-014 | F2 | P1 | DOING | FE/UX | 2–4 | 002,007,009 |
| FEA-015 | F2 | P1 | REVIEW | UX/OP | 1–2 | 002 |
| FEA-016 | F2 | P2 | REVIEW | UX/FE | 2–4 | 009,013 |
| FEA-017 | F3 | P1 | DOING | FE/UX | 3–5 | 010,012,014,015 |
| FEA-018 | F3 | P1 | PROPOSTO | FE/UX | 3–5 | 005,011,014,015 |
| FEA-019 | F3 | P1 | DOING | FE/UX | 5–8 | 007,008,012,014 |
| FEA-020 | F3 | P1 | PROPOSTO | FE/UX | 3–5 | 007,014,015 |
| FEA-021 | F3 | P2 | PROPOSTO | FE/UX | 2–4 | 012,014,015 |
| FEA-022 | F3 | P1 | PROPOSTO | FE/LT | 3–5 | 008,014,018 |
| FEA-023 | F4 | P1 | PROPOSTO | FE/OP | 4–7 | 005,011,012,022 |
| FEA-024 | F4 | P1 | PROPOSTO | FE/OP | 3–5 | 012,014,022 |
| FEA-025 | F5 | P1 | PROPOSTO | FE/OP | 3–5 | 010,011,012,014 |
| FEA-026 | F5 | P2 | PROPOSTO | FE/OP | 3–5 | 010,012,014 |
| FEA-027 | F5 | P2 | PROPOSTO | FE/OP | 2–4 | 012,014,022 |
| FEA-028 | F5 | P2 | PROPOSTO | FE/UX | 3–5 | 007,012,014 |
| FEA-029 | F5 | P2 | PROPOSTO | FE/OP | 2–4 | 011,014,015 |
| FEA-030 | F6 | P1 | PROPOSTO | QA/UX | 3–5 | 017,018,019,020,021,022,023,024,025,026,027,028,029 |
| FEA-031 | F6 | P1 | PROPOSTO | FE/QA | 3–5 | 003,016,019,022,023,024,025,026,027,028,029 |
| FEA-032 | F6 | P1 | PROPOSTO | QA/FE | 3–5 | 030,031 |
| FEA-033 | F6 | P1 | PROPOSTO | UX/OP/QA | 3–5 | 002,032 |
| FEA-034 | F6 | P1 | PROPOSTO | QA/LT/OP | 2–3 | 033 |

A soma inicial é **84–144 dias de execução principal**, distribuídos entre os papéis; não equivale a dias FE nem a duração do programa. Acessibilidade, responsividade e testes relevantes são parte de cada entrega; os tickets finais consolidam a matriz completa. Nenhuma dependência implica acesso automático a produção. Integrações que não estiverem disponíveis devem gerar BLOCKED para o aceite real, mantendo protótipo e evidência sintética rotulados.

## 2. F0 e F1 — conhecimento e continuidade

### FEA-001 — Congelar baseline e reconciliar a auditoria

**Origem:** todos os achados; integração `AAA-001`. Inventariar rotas, funções, contratos, dispositivos, estados e assets do candidato. Registrar HEAD + diff/hashes, pois worktree sujo não é identificado apenas pelo SHA. Reproduzir FE-01/02/03; classificar divergências atuais e preservar evidência histórica.

**Aceite:** inventário com cobertura e lacunas; cada achado confirmado, não reproduzido ou resolvido por evidência identificada. Nenhuma conclusão histórica atribuída automaticamente ao código novo. **Prova:** manifesto e passos reproduzíveis.

### FEA-002 — Baseline de tarefa e informação

**Origem:** FE-04/05/07/08/09/13/14/17. Mapear as cinco tarefas prioritárias, perfis e conteúdos obrigatórios com OP. Registrar cliques, tempo, rolagem, erros e taxa de conclusão em cenários equivalentes. Incluir pouca familiaridade digital e uso em plantão.

**Aceite:** roteiro, dados, participantes previstos, sucesso/erro definidos e baseline medida com limitações de amostra. **Prova:** planilha sanitizada e vídeos de sessão consentidos quando aplicável; sem dados clínicos reais nos artefatos.

### FEA-003 — Medir performance antes de decorar

**Origem:** FE-18. Levantar transferência comprimida, rotas pesadas, tarefas longas e métricas em build de produção. Projetar telemetria sem conteúdo pessoal e distinguir laboratório de campo.

**Aceite:** baseline repetível com aparelho/rede/build registrados; orçamento por rota e desenho de coleta aprovado tecnicamente. Não declarar INP de campo usando apenas teste local. **Prova:** traces e relatório de medição.

### FEA-004 — Corrigir links internos do design system

**Origem:** FE-01. Ajustar o contrato de `DsButton` e consumidores entre rota, URL externa e comando.

**Aceite:** navegação interna sem GET de documento; voltar/avançar, modificadores e abrir nova aba preservados quando cabíveis; botão de formulário não submete acidentalmente. **Prova:** teste de navegação real, sem apenas verificar tag renderizada.

### FEA-005 — Proteger formulários e definir rascunhos

**Origem:** FE-02/09. Definir dirty state, salvar, descartar, permanecer, expiração e escopo por usuário. Resolver primeiro saída entre módulos e retorno. Autosave durável depende de contrato e política de dados definidos com BE.

**Aceite:** trocar rota, voltar, fechar e falhar no save têm resultado explícito; salvar limpa dirty apenas após sucesso; erro conserva entrada; nenhum rascunho vaza entre usuários. Documentar limites de refresh/crash quando a solução for só em memória. **Prova:** cenários de recuperação e falha, incluindo logout.

### FEA-006 — Impedir respostas antigas em listas

**Origem:** FE-03. Controlar identidade/cancelamento de requisição em `useListData` e usos afetados.

**Aceite:** A lenta/B rápida e rejeições fora de ordem não sobrescrevem dados/erro/loading de B; desmontagem não altera tela; retry preserva contexto. **Prova:** testes de concorrência com promises controladas e uma jornada de filtro real.

### FEA-007 — Contrato de foco, histórico e retorno

**Origem:** FE-06/14/17. Definir destino do foco por navegação, fechar drawer/dialog, voltar a lista, recuperar filtros/scroll e título de documento.

**Aceite:** foco nunca fica em conteúdo removido; voltar restaura posição relevante; navegação nova tem início previsível; deep link recarrega estado suportado; permissão alterada não restaura acesso. **Prova:** teclado + browser history + URL compartilhável.

### FEA-008 — Extrair responsabilidades das páginas críticas

**Origem:** FE-15; contribuição a `AAA-007`. Extrair controle de dados e composição de Agenda/PatientDetail em fatias, com fronteiras de estado explícitas.

**Aceite:** contratos e comportamento anterior preservados; complexidade reduzida sem relaxar regra para passar; nenhuma refatoração massiva misturada a mudança de domínio. **Prova:** diff revisável, testes de fluxo e comparação visual antes/depois.

## 3. F2 — sistema autoral

### FEA-009 — Tokens, tipografia e materiais

**Origem:** FE-10/11/15. Consolidar paleta semântica, escala, espaçamento, raios, elevação e família tipográfica. Verificar licença da fonte escolhida e aplicar fallback consistente.

**Aceite:** inventário mapeia tokens antigos/novos; ambos os temas e números tabulares renderizados; nomes longos e acentos legíveis; contraste medido por par. **Prova:** prancha renderizada e primeira página preenchida, com decisão de UX.

### FEA-010 — Família de botões lapidados

**Origem:** FE-01/11/12/16. Implementar as variantes e oito estados definidos no plano, dentro do design system existente.

**Aceite:** sem salto de largura, duplo comando ou foco invisível; nome acessível; áreas de toque validadas; loading e sucesso refletem operação real; hover não é único indicador. **Prova:** matriz interativa, teclado, rede lenta e ambos os temas.

### FEA-011 — Formulários progressivos e claros

**Origem:** FE-02/09/16/17. Padrões de campo, ajuda, erro inline, resumo de erros, seções e barra de ações compatível com teclado virtual.

**Aceite:** rótulo obrigatório único; erro associado e focalizável; conteúdo digitado preservado; 200% zoom e celular sem ação coberta; validação não depende só de cor. **Prova:** cadastro preenchido, inválido, envio em curso e falha.

### FEA-012 — Estados de dados e feedback

**Origem:** FE-03/07/08/16. Unificar skeleton, vazio, sem resultados, erro, indisponibilidade, permissão e confirmação.

**Aceite:** cada estado explica causa conhecida e próxima ação; nenhuma mensagem de sucesso simulada; `aria-live` sem anúncios repetitivos; skeleton não causa salto relevante. **Prova:** matriz de estados com interações de retry e lentidão.

### FEA-013 — Transições customizadas com continuidade

**Origem:** FE-06/12/16. Implementar tokens de movimento e aplicar em rota, drawer, detalhe, seleção e botões.

**Aceite:** duração dentro do orçamento; ação seguinte interrompe transição; foco preservado; movimento reduzido remove deslocamento e autoplay; nenhuma espera artificial. **Prova:** gravação, timeline de performance e preferência reduzida.

### FEA-014 — Cabeçalho compacto e composição operacional

**Origem:** FE-04/05/07/08/11/17. Definir três padrões: lista, detalhe e workspace. Reduzir blocos duplicados; manter contexto obrigatório e uma ação dominante.

**Aceite:** primeiro item/busca relevante visível nas jornadas escolhidas; títulos longos e alertas não colidem; densidade confortável/compacta mantém legibilidade. **Prova:** mesma massa em 390/768/1440 e nos dois temas.

### FEA-015 — Linguagem do hospital

**Origem:** FE-13/14. Glossário único, nomes por tarefa, verbos específicos, mensagens úteis; remover jargão sem valor operacional.

**Aceite:** navegação, busca e tela usam o mesmo termo; erro explica recuperação; status não promete resultado incerto. **Prova:** inventário de strings e validação com OP, incluindo “tutor”, “paciente” e “atendimento”.

### FEA-016 — Assets próprios e integração visual responsável

**Origem:** FE-11/12/18 e pedido explícito do usuário. Usar os estudos ComfyUI/Blender em `frontend/assets` para decidir materialidade; selecionar imagem/poster/loop e recortes. Manter marca original separada.

**Aceite:** fonte, workflow, seed, modelo, dimensões e hashes registrados; imagem sem artefatos; loop sem salto perceptível; orçamento do plano; poster e pausa; redução de movimento e rede limitada; nenhum vídeo na tabela clínica. Revisão humana independente no contexto da interface. **Prova:** assets finais, página real, rede e aprovação. Os estudos entregues com este backlog são conceituais e não encerram este ticket.

## 4. F3/F4 — jornadas principais

### FEA-017 — Recepção orientada ao próximo atendimento

**Origem:** FE-04/07/08. Busca no início, fila legível, ação relevante e resumo do turno compacto.

**Aceite:** buscar e selecionar tutor sem rolar em 390×844 com massa pactuada; fila preenchida e vazia coerentes; iniciar atendimento conserva contexto. **Prova:** jornada completa e comparação com baseline FE-04.

### FEA-018 — Cadastro de tutor/paciente essencial primeiro

**Origem:** FE-02/09. Identificação e contato prioritários; informações financeiras/legadas em seções progressivas, respeitando obrigatoriedade real.

**Aceite:** telefone e dados mínimos prontamente alcançáveis; regra obrigatória preservada; duplicidade tratada; abrir seção não apaga entrada; erros e retorno funcionam. **Prova:** cadastro válido, inválido, duplicado e interrompido.

### FEA-019 — Agenda que abre no momento relevante

**Origem:** FE-05/06/17. Visualização de dia/semana apropriada, hora relevante, filtros compactos e lista mobile; remarcação por comando além de arrastar.

**Aceite:** primeiro compromisso relevante no viewport inicial da massa auditada; fora de expediente explicável; fuso, virada de dia, conflito e cancelamento coerentes; rolagem horizontal apenas no componente quando necessária e claramente indicada. **Prova:** desktop/mobile preenchidos, teclado e conflito real em homologação.

### FEA-020 — Busca global e contextual coerentes

**Origem:** FE-14/06. Definir diferença entre filtro da lista e pesquisa global, evitando destinos redundantes. Conservar escopo visível.

**Aceite:** teclado, nomes semelhantes, ausência de resultado e permissão; selecionar resultado e voltar conserva origem; cancelar pesquisa não altera registro. **Prova:** tarefas de busca entre módulos e testes de autorização da resposta.

### FEA-021 — Início útil por função

**Origem:** FE-07/08/13. Mostrar prioridades e próximos trabalhos; indicadores detalhados sob demanda, condicionados à permissão.

**Aceite:** cinco perfis pactuados encontram primeira tarefa sem atravessar pilhas de cartões; sem exposição de módulo/dado não autorizado. **Prova:** capturas por função e teste com contas distintas.

### FEA-022 — Página de paciente com contexto persistente

**Origem:** FE-06/15/17; `AAA-007`. Identidade, espécie e contexto relevante permanecem legíveis; abas e retorno previsíveis.

**Aceite:** trocar paciente atualiza conteúdo e identificação juntos; nomes extensos e dados ausentes não quebram cabeçalho; retornar à lista recupera contexto. **Prova:** dois pacientes distintos, lentidão e navegação rápida.

### FEA-023 — Prontuário legível e seguro para trabalhar

**Origem:** expansão clínica; FE-02/07/15. Organizar leitura cronológica e ações de registro, com distinção entre rascunho, salvo e falha.

**Aceite:** nenhuma confirmação antes da persistência; texto longo, anexos e histórico navegáveis; interrupção conserva conteúdo conforme contrato; revisão do responsável clínico. **Prova:** sessão real de homologação e cenários negativos. Não alterar regras clínicas neste ticket.

### FEA-024 — Internação e leitos com leitura de plantão

**Origem:** expansão clínica; FE-07/11/17. Hierarquia entre paciente, leito, estado e ação; detalhe contextual sem ruído repetitivo.

**Aceite:** atualizações não movem inesperadamente o alvo; status por texto e cor; todos os estados previstos; leitura mobile e transição de contexto revisadas por OP. **Prova:** lotação, vazio, atualização e falta de permissão.

## 5. F5 — expansão com baseline própria

### FEA-025 — Caixa e financeiro com confirmação inequívoca

**Origem:** inventário novo, FE-08/15 como padrões transversais. Primeiro capturar estados atuais; aplicar hierarquia de totais, valores tabulares e ações explícitas.

**Aceite:** pending, failed, timeout, confirmado e estornado visualmente distintos conforme API; nenhuma animação simula recebimento; duplo clique não duplica comando; filtros/retorno preservados. **Prova:** contratos negativos e homologação integrada; depende dos tickets financeiros globais pertinentes, sem substituí-los.

### FEA-026 — Estoque e compras com densidade controlada

**Origem:** inventário novo; FE-07/17 transversais. Tabelas com unidade, quantidade, lote e ações claras; alternativa para tela estreita.

**Aceite:** seleção em lote explícita por página/total; alterações de filtro não causam ação em registros invisíveis sem aviso; sem truncamento de unidade crítica. **Prova:** massa extensa, teclado e estados de seleção.

### FEA-027 — Laboratório e resultados

**Origem:** inventário novo. Tornar pedido, coleta, processamento e resultado comparáveis sem inventar estados não suportados.

**Aceite:** paciente, data, unidade e referência legíveis; pendência diferente de ausência de resultado; anexos acessíveis; status coerente com API. **Prova:** contratos e revisão de fluxo pelo responsável do domínio.

### FEA-028 — Relatórios e exportação com contexto

**Origem:** FE-15 e inventário novo. Simplificar filtros, composição e preview; preservar filtros e indicar processamento.

**Aceite:** voltar restaura contexto; exportação informa falha/conclusão real; formato e fuso coerentes; tabela larga possui navegação acessível. **Prova:** relatório preenchido e vazio, falha e reconciliação com arquivo exportado.

### FEA-029 — Configurações e permissões compreensíveis

**Origem:** FE-13/16 transversais e inventário novo. Agrupar por tarefa; explicitar alcance de alteração e acesso negado.

**Aceite:** editar, cancelar e salvar inequívocos; não há controle que prometa permissão inexistente; teclado e rótulos completos. **Prova:** papéis distintos e erro de autorização real.

## 6. F6 — qualificação, sem autoaprovação

### FEA-030 — Matriz de acessibilidade e dispositivos

**Origem:** FE-16/17. Consolidar rotas alteradas, temas, estados, 320/375/390/768/1024/1280/1440 e tela ampla; teclado virtual e zoom. Selecionar browsers e aparelhos reais segundo público.

**Aceite:** WCAG 2.2 AA avaliada no escopo declarado; zero bloqueador; axe complementado por teclado, foco, leitor de tela, contraste, reflow e movimento reduzido. Registrar critérios não aplicáveis com justificativa. **Prova:** matriz com ambiente, resultado e evidência por caso, sem chamar ausência de overflow de aprovação de usabilidade.

### FEA-031 — Performance e custo de mídia

**Origem:** FE-18. Comparar build final à baseline; otimizar rotas e assets, sem carregar cenas 3D no runtime só porque existem arquivos Blender.

**Aceite:** metas e orçamentos do plano demonstrados em laboratório; dados de campo rotulados por janela/amostra; nenhum conteúdo pessoal coletado; rede lenta preserva primeira tarefa. **Prova:** traces, relatórios e tamanho dos artefatos, com lacunas de campo explícitas.

### FEA-032 — Regressão funcional e visual do candidato

**Origem:** todos os achados; contribuição `AAA-045`. Executar jornadas críticas, estados, temas e browsers sobre build identificado.

**Aceite:** zero regressão bloqueadora, comparação visual revisada; nenhum baseline aprovado automaticamente; falhas/flake não escondidos por retry ou skip. **Prova:** logs, traces e diff no mesmo candidato; cumprir também o gate global de repetição aplicável.

### FEA-033 — UAT e revisão visual independente

**Origem:** FE-16/17 e ambição premium; contribuição `AAA-044`. Repetir tarefas de FEA-002 com cenários comparáveis e responsáveis das funções atendidas.

**Aceite:** metas de conclusão, erro e tempo avaliadas; amostra e incerteza relatadas; zero erro crítico; revisor que não construiu inspeciona hierarquia, tipografia, estados, materialidade e movimento. **Prova:** ata de aceite ou reprovação fundamentada; plano de correção. Nota autoatribuída não substitui revisão.

### FEA-034 — Dossiê frontend e recomendação de promoção

**Origem:** consolidação. Vincular requisitos, tickets, candidato, revisão e limites; propor implantação incremental e reversão.

**Aceite:** todos os tickets no escopo encerrados com prova ou explicitamente removidos por decisão de escopo; nenhuma exceção crítica escondida; dependências globais consultadas; recomendação frontend não é GO do ERP. **Prova:** dossiê e parecer dos responsáveis, integrado a `AAA-044/045/047`.

## 7. Cobertura dos achados

| Auditoria | Tickets que tratam o achado |
| --- | --- |
| FE-01 | FEA-004, FEA-010 |
| FE-02 | FEA-005, FEA-011, FEA-018, FEA-023 |
| FE-03 | FEA-006, FEA-008, FEA-012 |
| FE-04 | FEA-014, FEA-017 |
| FE-05 | FEA-014, FEA-019 |
| FE-06 | FEA-007, FEA-013, FEA-019, FEA-020, FEA-022 |
| FE-07 | FEA-012, FEA-014, FEA-017, FEA-021, FEA-024 |
| FE-08 | FEA-014, FEA-017, FEA-021, FEA-025 |
| FE-09 | FEA-005, FEA-011, FEA-018 |
| FE-10 | FEA-009 |
| FE-11 | FEA-009, FEA-010, FEA-014, FEA-016 |
| FE-12 | FEA-010, FEA-013, FEA-016 |
| FE-13 | FEA-015, FEA-020, FEA-021, FEA-029 |
| FE-14 | FEA-007, FEA-015, FEA-020 |
| FE-15 | FEA-008, FEA-009, FEA-022, FEA-028 |
| FE-16 | FEA-010, FEA-011, FEA-013, FEA-030, FEA-033 |
| FE-17 | FEA-014, FEA-019, FEA-024, FEA-030, FEA-033 |
| FE-18 | FEA-003, FEA-016, FEA-031 |

## 8. Definition of Done comum

Código e documentação coerentes; critérios específicos demonstrados; ambos os temas e estados pertinentes; testes proporcionais ao risco; teclado e mobile funcionais; evidência sanitizada com build/ambiente; diff revisado por outra pessoa; baselines aprovadas conscientemente; reversão descrita. Dependência de API real não satisfeita permanece explícita. Nenhum ticket termina apenas por ter uma imagem gerada, um componente novo ou um teste superficial espelhando a implementação.

## 9. Execução iniciada em 07/09/2026

FEA-004/006 têm implementação e testes focados, pendentes de consolidação da prova de navegador e aceite do escopo completo. FEA-005 tem proteção local de formulário, sem promessa de rascunho durável. [ExecPlan](../.agent/plans/frontend-premium-execplan.md) e [régua congelada](frontend/implementation/quality-bar-v1.json). Nenhum ticket foi declarado DONE; FEA-002/003 e FEA-007–034 continuam requeridos.

### Controles e rolagem — continuação de 07/09

FEA-007 iniciou política de histórico, filtros e âncoras; 16 testes e revisão I1 aprovaram esse recorte, sem prova integral de scroll/foco no navegador. FEA-010/013 aplicaram tokens ao DsButton e estabilizaram largura durante loading, inclusive carregamento inicial e texto alterado. Regressão conjunta: 84 testes. Prova Chromium isolada em quatro combinações, com largura, nome acessível, cliques repetidos, foco por teclado, movimento reduzido e fullWidth responsivo: [report](frontend/implementation/evidence/button-material-3N7MXC/report.json). Recepção preenchida reexecutada com zero falhas e hashes estáveis: [log](frontend/implementation/button-reception-browser.log). Esses recortes não encerram os oito estados, variantes restantes, recuperação/foco transversal nem aprovação visual final.

### Continuidade de foco e histórico — 07/09

FEA-007 implementou orientação após navegação bem-sucedida e retorno de foco por histórico, com memória limitada à sessão. [Contrato e limites](frontend/implementation/navigation-continuity-contract.md). Navegador congelado `continuity-Jvds8h`: quatro cenários passaram, scroll e Cancelar visível restaurados sem GET de documento. Navegação cancelada mantém título/recents. FEA-007 segue DOING: ordenação de guards anteriores, retorno/filtros/seleção por módulo e conteúdo assíncrono permanecem abertos.

FEA-006/012/017: busca própria da Recepção passou a proteger a intenção atual, incluindo contexto complementar, erros e loading. Edição, Limpar e unmount invalidam requisições anteriores. Revisão I1 de fonte aprovada; 17 testes da página e quatro casos Chromium com resposta atrasada passaram. [Evidências integradas](frontend/implementation/navigation-reception-evidence.json). Suíte de integração: 66 testes; typecheck exit 0. O layout foi preservado; aceites de domínio e qualificação completa seguem pendentes.

### Agenda e painel de detalhes — 07/09

FEA-014/019: lista cronológica padrão, sem cortar itens; dia/semana/mês mantidos; cabeçalho compacto, comandos secundários em Mais ações, filtros sob demanda. Testes verificam ordenação, itens densos/tardios, permissões e modos. Painel ganhou foco inicial, limites de Tab, Esc, prioridade de modal aninhado e retorno ao acionador. Navegador `continuity-ewerA5` passou quatro jornadas completas; primeiro compromisso em y523 mobile e y390,75 desktop, em contraste com a baseline histórica abaixo da primeira tela. Dois críticos visuais I1 preferiram a nova composição e pediram destaque para alertas e legenda contextual, tratados na revisão seguinte. Duplicação do título no shell, integração real, conflitos/remarcação e demais aceites FEA019 seguem abertos.

FEA-016: ComfyUI concluiu o job de estudo; [prévia coletada](frontend/assets/images/0836ac61_000.png) inspecionada, ainda sem aprovação de produção. Open Design foi solicitado pelo usuário; duas chamadas MCP retornaram Transport closed, sem geração atribuída ao serviço.

FEA-010 recebeu uma matriz de estados na Storybook, alinhamento dos tipos
públicos com o componente Vue e 13 testes unitários do componente. Variantes,
tamanhos, loading com largura preservada, bloqueio de ação, nome acessível,
metadados de link e fullWidth estão cobertos; a revisão visual independente,
rede lenta, toque e UAT ainda não encerram o ticket.

FEA-016 teve uma integração candidata do poster e do loop Blender no palco de
identidade do login, com marca separada e redução de movimento que mantém o
poster sem montar o vídeo. Após revisão do produto em 08/09/2026, essa
integração foi revertida porque a órbita não preservava a identidade do
hospital. O palco voltou ao poster e loop oficiais
`hospital-logo-poster.webp`/`hospital-logo-loop.mp4`; o estudo Blender foi
preservado somente no caderno visual. A matriz corrente está em
`frontend/implementation/evidence/login-assets-20260908.json`.

FEA-012 também recebeu um alinhamento no consumidor analítico: a falha do
catálogo de referências agora usa `DataTableFeedback` com estado
`unavailable`, causa explícita, uma ação `Tentar novamente` e preservação do
resultado estruturado. O retry é isolado da consulta principal e mantém
registros/seleção durante pending e falha. A suíte analítica passou 24/24 e o
`DataTable` passou 25/25; o contrato de listas continua piloto, sem autorização
real, indisponibilidade exercitada em browser, confirmação operacional ou UAT.

FEA-011/018 receberam uma revalidação adicional no harness final:
`evidence/continuity-ty2R5x/report.json` passou 6/6 no formulário de paciente
e `evidence/continuity-JOB4sv/report.json` passou 2/2 no formulário de tutor em
1440×900, 390×844 e 195×422 (proxy CSS de 200% para uma tela física 390×844),
claro/escuro, sem erro de página, overflow documental ou perda de draft. O
recorte verifica resumo/foco do primeiro erro, loading/falha e ações sticky;
zoom nativo, touch/teclado virtual, leitor de tela, backend/RLS e UAT continuam
pendentes. A matriz `continuity-niDPip` passou 8/8 nos conflitos 409 de tutor e
paciente, preservando o rascunho, oferecendo manter/abrir existente e
respeitando a confirmação de saída. `continuity-z5FzeJ` e `continuity-8wg68C`
preservam as falhas anteriores por seletores de CTA obsoletos.

### Continuidade de paciente e Agenda — revalidação do checkpoint em 07/09

FEA-005 recebeu cobertura comportamental ampliada no formulário de paciente: troca de `ownerId` com dirty state, continuar editando, descarte com hidratação do novo tutor, falha de POST mantendo campos, sucesso limpando o dirty state, desmontagem/remontagem do coordenador e logout somente após consentimento. A jornada browser sintética `evidence/continuity-ASegyY/report.json` passou em 1440×900 e 390×844, claro/escuro, com seis IDs de interação e `inputsStable=true`.

FEA-007/019 recebeu a correção de ownership do título da Agenda: um único `h1` visível, contexto estrutural de data/modo/profissional, texto livre apenas em memória, retorno por histórico, Esc/foco, filtros e transição lista/dia/mês. A evidência de continuidade de navegação `evidence/continuity-s4KrKw/report.json` passou nas quatro combinações de viewport/tema, com semântica de foco/scroll, preservação de rascunho e ausência de navegação documental. A jornada específica da Agenda continua exigindo sua própria execução; todos os relatórios novos usam respostas sintéticas, sem backend, RLS, UAT, persistência, performance de campo ou aceite global.

Suíte focada da fatia: 5 arquivos, 115 testes; `vue-tsc --noEmit` e `docs:validate` passaram. A crítica independente de render/source mantém o recorte como evidência condicional: a qualificação completa FEA-005/007/019, homologação com serviços reais e os demais FEA-001–004, 006, 008–018 e 020–034 continuam abertos. Nenhum ticket foi promovido a DONE.

### Estados de dados nas listas laboratoriais — piloto FEA-012 em 07/09

O `DataTable` recebeu um contrato aditivo de feedback para `empty`, `no-results`, `error`, `unavailable` e `forbidden`, com precedência loading → feedback → dados, ação nomeada de retry e anúncio assertivo somente para estados terminais de falha. As listas de Exames e Laudos passaram a distinguir lista intrinsecamente vazia de filtros sem correspondência e deixaram de duplicar o erro de carregamento em `DsAlert` e bloco paralelo. Suíte focada: 3 arquivos, 40 testes; typecheck da SPA passou. A regressão completa da SPA passou com 198 arquivos e 1.682 testes; mensagens de navegação do jsdom foram apenas ruído conhecido.

O harness browser sintético `evidence/continuity-qIU3s3/report.json` passou em 1440×900 e 390×844, claro/escuro, nas duas rotas: loading atrasado, uma única superfície `role="alert"`, retry, vazio intrínseco, lista populada, sem resultados e ausência de erros de console; `inputsStable=true`. Capturas separadas de loading, vazio, populado e sem resultados foram geradas para as oito combinações. O hash `56ee32b423306b88b31da18af014fc244df5075497798b3621e89d8a78c4cf9d` está registrado no próprio relatório e coincide com as fontes pinadas no momento da execução. O alcance permanece piloto: indisponibilidade/permissão não foram exercitadas em rota real, confirmação de operações não é coberta por este contrato, respostas são sintéticas e não há backend, RLS, UAT, persistência ou aprovação global. FEA-012 e todos os demais tickets continuam abertos; nenhum foi promovido a DONE.

O crítico fresco Nash classificou o recorte como `CONDITIONAL PASS` e o aceite integral de FEA-012 como `HOLD`, sem bloqueador visual ou funcional observado; manteve as limitações de autorização, leitor de tela real, UAT e operação. Essa revisão independente não altera o status do ticket.

### Formulários progressivos e continuidade de cadastro — 07/09

FEA-011/018 receberam um recorte de implementação no cadastro de paciente e tutor: resumo de erros com links focalizáveis, `aria-invalid`/descrição associada nos campos principais, foco no primeiro erro, preservação do conteúdo durante troca de tutor/falha de gravação, seções opcionais fechadas por padrão no novo tutor e barra de ações sticky posicionada no limiar inferior do viewport. Identificação e contato permanecem prioritários; documentação, endereço, observações, financeiro e dados legados seguem progressivos. A alteração é aditiva e mantém a obrigatoriedade real do contato.

As matrizes Chromium sintéticas `evidence/continuity-ASegyY/report.json` (paciente), `evidence/continuity-UgP3gl/report.json` (tutor) e `evidence/continuity-s4KrKw/report.json` (histórico/navegação) passaram nas combinações 1440×900 e 390×844, claro/escuro, com `inputsStable=true` e hash de harness `56ee32b423306b88b31da18af014fc244df5075497798b3621e89d8a78c4cf9d`. O paciente registrou tutor `required`, inválido/foco, troca de tutor com continuar/descartar, falha de POST preservando campos com feedback focalizado e visível, sucesso limpando dirty, desmontagem e logout com consentimento; o tutor registrou grupo de contato `aria-required`, resumo/foco e preservação ao abrir seções. A navegação registrou retorno de scroll/foco, ausência de navegação documental, continuar/descartar e logout.

O exame visual considerou os viewports de tela; as capturas de viewport não mostram ação cobrindo o primeiro erro e mantêm legibilidade nos dois temas. O feedback de falha do paciente agora aparece no viewport e recebe foco programático; capturas `fullPage` com shell fixo repetido continuam tratadas como artefato de costura, não como render de viewport. O crítico fresco Turing classificou o recorte como `PARCIAL — REVIEW REQUIRED` e os tickets integrais FEA-011/018 como `HOLD`: ainda faltam zoom real de 200%, teclado virtual/dispositivo touch, leitor de tela, backend/RLS, persistência durável, UAT, métricas humanas, jornada de duplicidade e validação browser integral de sucesso/falha do tutor. Portanto FEA-011/018 permanecem abertos e sem promoção a DONE.

### Busca global com retorno contextual — piloto FEA-020 em 07/09

`MasterSearchPage` preserva a pesquisa em `?q=`, atualizando a URL sem criar entrada extra no histórico, e o fluxo browser sintético cobre teclado/Enter, resultado, ida ao paciente, retorno com consulta restaurada e Limpar sem mutar registros. `evidence/continuity-VM7KKf/report.json` passou em quatro combinações 1440×900/390×844 e claro/escuro, sem erros de console e com `inputsStable=true`; o screenshot de resultados também foi gerado nos quatro casos. O hash `56ee32b423306b88b31da18af014fc244df5075497798b3621e89d8a78c4cf9d` está no relatório. O piloto não comprova permissões negativas em backend, ranking de produção ou UAT. FEA-020 permanece aberto e sem promoção a DONE.

### Internação, mapa de leitos e detalhe contextual — piloto FEA-024 em 07/09

As páginas de Internação, Mapa de leitos e Detalhes da Internação receberam uma fatia operacional verificável: a lista usa feedback terminal sem duplicação e diferencia falha de autorização; o mapa preserva cards e estatísticas durante atualização, anuncia os quatro estados por texto e oferece retorno à internação quando o acesso é negado; o detalhe usa `dl/dt/dd` para a ficha, mantém paciente/unidade/enfermaria/leito/status visíveis durante refresh e conserva o contexto anterior quando a atualização falha.

O harness browser sintético `evidence/continuity-LeK3oR/report.json` passou em 12 combinações — 1440×900 e 390×844, claro/escuro, nas três rotas — sem erros de página, com `inputsStable=true` e hash `56ee32b423306b88b31da18af014fc244df5075497798b3621e89d8a78c4cf9d`. As interações cobriram lista preenchida/refresh `Internado → Estável`/403 sem linhas obsoletas; mapa com `Ocupado`, `Disponível`, `Manutenção` e `Bloqueado`, refresh `1/4 → 2/4` preservando cards e 403 restrito; detalhe `A-01 → A-02`, `Internado → Estável`, `aria-busy`, preservação após 403 e retry. Capturas mobile/desktop foram inspecionadas nos dois temas.

O alcance permanece piloto: a matriz ainda não cobre estado vazio real, touch/teclado virtual, zoom de 200%, leitor de tela, backend/RLS, persistência, UAT, métricas de campo ou operação clínica. O teste focado das três páginas passou 70/70, a regressão da SPA passou 198 arquivos e 1.682 testes, e o typecheck da SPA/harness syntax passaram. A primeira crítica independente apontou quatro achados major; eles foram corrigidos, mas as tentativas frescas posteriores encerraram sem parecer, portanto não há confirmação independente final deste recorte. FEA-024 continua aberto e nenhum ticket foi promovido a DONE.

### Atualização final da retomada — 07/09/2026

Os IDs abaixo substituem os IDs históricos desta página para os recortes que
foram alterados nesta retomada. Todos continuam bounded; nenhum encerra o FEA
integral nem autoriza AAA ou GO:

- FEA-005/011/018: `continuity-Quith7` passou 4/4 com seis interações de
  paciente; `continuity-If2Phm` passou 4/4 com seções progressivas do tutor; a
  navegação compartilhada foi renovada em `continuity-ubek1f` (4/4).
- FEA-007/019: `continuity-WBhawJ` passou 4/4 no contexto profundo da Agenda e
  `continuity-ts34l4` passou 4/4 na prioridade visual/teclado.
- FEA-020: `continuity-gTtJmg` passou 4/4 com query, teclado, retorno
  contextual e Limpar.
- FEA-012/027: `continuity-wD7rbf` passou 8/8 em Exames e Laudos, cobrindo
  loading atrasado, erro/retry, vazio intrínseco, populado e sem resultados.
- FEA-024: `continuity-nqORvp` passou 12/12 em internação, mapa de leitos e
  detalhe, com refresh, preservação contextual e 403.
- FEA-025: `continuity-0rUvS1` passou 4/4; a jornada exercitou falha sem perda
  de formulário, guarda contra duplo envio, timeout, reconsulta com a mesma
  chave de idempotência e fechamento confirmado. A UI ainda não cobre todo o
  ciclo de estados/reversão Pix; os testes de rota/server validam o contrato
  bounded do runner, mas não substituem replay em banco integrado.
- FEA-026: `continuity-ohbW3A` passou 8/8 fresco com seleção limitada à página/consulta,
  reset de filtro e rascunho de compra explicitamente temporário.
- FEA-028: `continuity-zUtFoO` passou 4/4; execução server-side, filtros na URL,
  vazio/erro/retry e CSV baixado foram comparados ao fixture do servidor, com
  indicação UTC e rolagem horizontal por teclado.
- FEA-029: `continuity-JtZTaj` passou 4/4 com erro 403 focado, retry, tabs,
  formulários de usuários/grupos/setores e controles da matriz.
- FEA-003: o [baseline laboratorial](frontend/implementation/performance-lab-2026-09-07.md)
  repetiu o build atual três vezes por rota em Chromium 145, registrando
  artefatos, FCP/LCP de laboratório e limites explícitos; sem INP/RUM, rede
  lenta, participantes ou aceite de campo.
- FEA-004: o fixture browser [`button-navigation-DOcxUE`](frontend/implementation/evidence/button-navigation-DOcxUE/report.json)
  passou 4/4 com rota interna Vue Router, Enter/Espaço, back/forward,
  modificadores, URL externa, disabled e `type=button`; permanece prova
  bounded, sem promoção a DONE ou aceitação global.
- FEA-030: `continuity-MbTjs6` passou 56/56 em sete larguras, dois temas e
  movimento reduzido; Axe reportou zero violações, com skip link, foco e
  reflow verificados.
- FEA-031: o [build candidato](frontend/implementation/production-build-candidate-2026-09-07.md)
  passou; entrada inicial 93.382 B gzip contra baseline de 92.406 B (+1,06%).
  A medição não é LCP/INP/CLS, RUM ou rede lenta.
- FEA-032: regressão SPA passou 198 arquivos/1.696 testes; o recorte focado
  passou 124 testes, o design system 7 arquivos/35 testes, e as verificações
  de API cash passaram 5 testes de rota e 1 teste de server. A E2E real desta
  retomada foi bloqueada por PostgreSQL indisponível; não contar o fallback em
  memória.
- FEA-033/034: UAT, ata de aceite e parecer humano final continuam pendentes.
  O [dossiê de qualificação](frontend/implementation/frontend-premium-qualification-2026-09-07.md)
  consolida a matriz FEA-001–034, os limites e a recomendação sem GO.

Foram tentadas revisões independentes read-only frescas de FEA-024–030
(Zeno e, depois, Wegener, em escopo estreito); ambas foram encerradas sem
parecer final dentro do limite e portanto não contam como aprovação. Os
pareceres efetivos de Nash e Turing continuam vinculados aos seus recortes e
mantêm, respectivamente, FEA-012 e FEA-011/018 em HOLD integral. FEA-025,
FEA-030–034 e todos os tickets sem prova integral permanecem abertos/HOLD
conforme a régua congelada.

### Atualização da retomada — duplicidade recuperável em FEA-018

O contrato de conflito de tutor e paciente agora tem tratamento de interface
explícito: somente `409` com `code=CONFLICT`, mensagem de duplicidade e ID em
`details` abre o alerta warning focalizado. O formulário não é resetado nem
marcado como limpo; o operador pode manter o rascunho ou abrir o registro
existente, caso em que a confirmação de alterações não salvas é exigida.

`evidence/continuity-niDPip/report.json` passou 8/8 em 1440×900/390×844,
claro/escuro, nos fluxos de tutor e paciente, sem falhas. Os testes bounded
passaram 74/74, e Maxwell classificou o recorte `PASS_WITHIN_CONTRACT` com
severidade máxima S3. A matriz é sintética e não substitui RLS, persistência,
leitor de tela, demais variações de 409 ou UAT; FEA-018 continua parcial/HOLD
no aceite integral.

O baseline regenerado registra 253 rotas, 249 protegidas/4 públicas, 686
arquivos frontend rastreados, 138 arquivos-fonte alterados, 88 assets e 13
relatórios de evidência. O estado global segue ACTIVE, sem DONE/AAA/GO.

### Atualização da retomada — prancha CVG Pulse em FEA-009

O Design System agora expõe uma prancha Storybook canônica para o contrato
CVG Pulse: o story `design-system-tokens-cvg-pulse--canonical-board` renderiza
light e dark lado a lado, com inventário legado→atual, página preenchida,
acentos, números tabulares, materiais, motion/reduced motion e pares de
contraste. A rebinding local dos tokens evita que um tema externo do documento
contamine o board oposto.

O capturador `frontend/implementation/cvg-pulse-tokens-browser.mjs` gerou
`frontend/implementation/evidence/cvg-pulse-tokens-OklWS0/report.json` com
Storybook 10.3.5, 191 módulos e 12/12 combinações Chromium em 390/768/1440,
claro/escuro e movimento normal/reduzido. O mínimo medido foi 5,52:1 no light
e 10,85:1 no dark; os quatro screenshots foram inspecionados. O recorte é
`PASS_WITHIN_CONTRACT`, mas FEA-009 permanece parcial/HOLD por licença e
disponibilidade de fonte, dispositivos reais, zoom/touch, leitor de tela, UAT e
aceite integral; sem DONE/AAA/GO. O baseline atualizado registra 690 arquivos
frontend rastreados, 147 arquivos-fonte alterados e 14 relatórios correntes.

O crítico fresh-context Dewey confirmou `PASS_WITHIN_CONTRACT` para este
recorte, severidade máxima S3 e nenhum S1/S2. Validou o render/index real,
isolamento dos temas, migration/filled page/tabular-nums/acentos, 12/12,
contraste mínimo 5,52:1 no light e 10,85:1 no dark, e ausência de overflow
documental. A medição não cobre todos os containers internos; licença/fallback
real de Aptos, consumidores de produção, dispositivos/zoom/touch, leitor de
tela e UAT continuam gates, e FEA-009 segue parcial/HOLD.

### Continuação — FEA-002 com roteiro sanitizado

O protocolo `frontend/implementation/task-baseline-2026-09-07.json` e sua versão `.md` definem
cinco tarefas (Recepção, Agenda, cadastro tutor/paciente, contexto clínico e PIX), cinco perfis
operacionais, 10 sessões planejadas, massa sintética, sucesso/erro e campos de medição. Nenhum
resultado humano foi inventado: `humanObservations` é zero e FEA-002/033 continuam HOLD até OP,
consentimento e UAT.

### Verificação da rodada

A regressão SPA final passou em `209/1.802`; o build passou com `806` módulos e `483` entradas de
precache PWA; documentação, OpenAPI (`413` paths/`518` schemas) e `git diff --check` passaram.
O check de complexidade permanece HOLD nos dois hotspots registrados (`server.ts` 8.347/8.335;
`ReportWorkbenchPage.vue` 3.205/3.186). O estado dos 34 FEA segue ACTIVE, sem DONE/AAA/GO.

### Continuação — FEA-025 e limite de confirmação Pix

O detalhe do atendimento ganhou uma conferência do recebimento em dinheiro e
um fluxo de estorno com alerta de irreversibilidade, motivo obrigatório,
confirmação explícita e `Idempotency-Key` própria. O relatório fresh
`frontend/implementation/evidence/continuity-WiebZn/report.json` passou 4/4 em
Chromium, claro/escuro e 1440/390, sem erros ou overflow documental; a suíte
focalizada de Encounter/serviço passou 35/35 e a rota API 11/11. O retry após
falha transitória preserva a mesma chave, o resumo financeiro é relido após o
commit e `includeReversed=true` recupera o estado estornado após refresh/reload.

Esse recorte continua bounded e sintético: não encerra replay em banco,
provider, RLS, reconciliação, contrato PIX de confirmação/reversão ou UAT. A análise
do contrato Pix confirmou que o SPA só dispõe de despacho/polling para
tentativas de encounter; confirmação/reversão manual não deve ser inventada no
frontend. FEA-025 permanece parcial/HOLD e o conjunto global segue ACTIVE, sem
DONE/AAA/GO.

### Continuação — FEA-026: escopo de seleção e compras

`frontend/implementation/evidence/continuity-ohbW3A/report.json` passou 8/8 em
Chromium, claro/escuro e 1440/390. A seleção permanece limitada à página/consulta,
limpa ao filtrar, mantém unidades críticas legíveis e não oferece ação para
linhas invisíveis; o rascunho de compra é explicitamente temporário e não altera
o estoque. Mutação batch persistida, integração real, touch/zoom, leitor de tela
e UAT continuam pendentes; FEA-026 permanece parcial/HOLD. Lagrange fez a
crítica fresh e classificou o recorte bounded como `PASS_WITHIN_CONTRACT`, sem
S1/S2; os testes focalizados de inventário/compras passaram 27/27 e o `DataTable`
25/25.

### Correção posterior — revisão fresh de FEA-025

Depois da revisão independente, o recorte adicionou `required`/`aria-required`
ao motivo, foco no painel estável após o modal, aviso explícito para uma releitura
404 enquanto a reversão confirmada é mantida e breadcrumb móvel sem scroll
interno. A captura `continuity-WiebZn` passou 4/4 com `scrollContainers=[]`;
Encounter/serviço passou 35/35, API 11/11 e a regressão SPA 209/1.805. O HOLD
restante é de evidência real financeira (backend/RLS/DB/replay), PIX sem contrato
de confirmação/reversão e UAT.

Avicenna classificou o recorte `PASS_WITHIN_CONTRACT`, severidade máxima S3,
sem S1/S2, em revisão fresh-context somente leitura, confirmando os quatro
achados acionáveis corrigidos. O veredito não promove FEA-025 ao aceite integral
nem altera o estado global ACTIVE/HOLD.

### Continuação — FEA-028: execução server-side e exportação

`frontend/implementation/evidence/continuity-UAGHyE/report.json` passou 4/4
fresh em Chromium, claro/escuro e 1440/390. O recorte preserva filtros na URL e
no retorno, usa execução server-side, baixa CSV com indicação UTC, diferencia
preenchido/vazio/erro e permite retry; a tabela larga responde às setas em
rolagem local. Reconciliação financeira, browser-to-database, touch/zoom,
leitor de tela e UAT continuam pendentes; a crítica fresh ainda está em curso.

### Correção e nova evidência — FEA-027: laboratório

Após a crítica fresh, o `LaboratoryAnalyticalWorkbench` passou a manter um
estado `forbidden` explícito para 403 nos três workbenches. O fluxo `closed=false`
exibe pedido `collected` sem valores como pendente, enquanto uma busca sem
correspondência produz `no-results`; laudos mantêm valores estruturados,
unidades, referências, situação e ação acessível para anexo protegido.

`frontend/implementation/evidence/continuity-cFoZKq/report.json` passou 20/20
em Pedidos, Laudos, Hemogramas, Urina e Bioquímico, nos dois temas e em 1440/390,
com zero erros, `inputsStable=true` e Axe 0 nos estados inicial, populated,
modal, attachment, selected, pending, no-results e forbidden. Foco, Tab, Enter,
setas e refresh também foram observados. A crítica fresh final ainda é o gate;
backend/RLS/persistência/permissões reais, touch/zoom, leitor de tela e UAT não
estão cobertos.

### Registro de crítica — FEA-028

Hume classificou o recorte fresh como `HOLD` S2: a exportação precisa ancorar no
`executionId` exibido, timeout precisa reconciliar/cancelar execução persistente,
datas precisam de intervalo UTC meio-aberto, e o contrato deve uniformizar CSV,
estado sem resultados e escopo server-side. `continuity-UAGHyE` está stale após
as mudanças atuais e deve ser regenerado depois da correção.

### Continuação — FEA-029: permissões e configurações

`frontend/implementation/evidence/continuity-3NvGzS/report.json` passou 4/4 em
1440/390 e claro/escuro, com 403 focalizado, retry, tabs, foco de edição,
fieldsets de usuários/grupos/setores e matriz de permissões. Papéis reais,
backend/RLS, persistência, touch/zoom, leitor de tela e UAT continuam pendentes;
a crítica fresh independente permanece em execução.

### Recertificação FEA-013 — 08/09

O scheduler de sucesso agora persiste a cópia genérica antes de redirects de
documento e aguarda a Promise de `router.push` antes de ativar o flash no shell
em navegações SPA. Os consumidores migrados devolvem a Promise; o alerta global
não coexiste mais com o alerta local do formulário. A fatia focused passou 11/11
e o recorte nativo do runner oficial passou 23/23 contra PostgreSQL descartável
com migrações 0000–0164, seed/RLS, Redis isolado e limpeza confirmada. O
relatório sanitizado está em
`frontend/implementation/evidence/success-redirect-e2e-20260908.json`.

Isso atualiza a evidência bounded da FEA-013; não encerra o ticket. Permanecem
cross-browser posterior ao scheduler, device/touch/zoom, leitor de tela real,
UAT, revisão independente fresh, RUM/INP/CLS e os gates globais AAA/GO.

### Atualização de implementação — FEA-007, FEA-012 e FEA-013 — 08/09/2026

O recorte corrente tratou três lacunas de continuidade sem alterar o escopo:

- FEA-013: flash genérico persistido antes do redirect, ativação no shell após
  `router.push`/paint boundary, um único alerta visível, bloqueio de CTA
  pendente, reduced motion por microtask e invalidação segura no desmontagem.
  Browser Chromium passou 6/6 em movimento padrão e 6/6 em reduced motion; o
  E2E nativo passou 23/23 com cleanup confirmado.
- FEA-007: foco de retorno com identidades estruturais, rolagem local
  `scrollLeft`/`scrollTop`, geração contra frames stale, reprocessamento
  orientado a `MutationObserver` para conteúdo assíncrono e descarte de branch
  forward. A suíte dedicada passou 32/32.
- FEA-012: metadata de status/código sem alterar o contrato legado, estados
  explícitos de erro/indisponibilidade/proibido, retry apenas quando seguro,
  retenção de linhas confirmadas durante falha de refresh e mensagens genéricas
  sem payload bruto. O recorte focused combinado passou 98/98.

A SPA completa corrente passou 210 arquivos/1.847 testes e `vue-tsc`. Os
recortes são bounded e não promovem tickets: autorização/RLS real,
persistência, todos os consumidores, cross-browser após o scheduler,
touch/zoom nativos, leitor de tela, UAT, RUM/INP/CLS e provider PIX/reversão
continuam pendências externas. O programa permanece `ACTIVE/HOLD`, sem
`DONE`/`AAA`/`GO`, aguardando a revisão fresh independente e os gates do
proprietário.
