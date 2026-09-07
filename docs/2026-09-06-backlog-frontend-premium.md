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
| FEA-007 | F1 | P1 | PROPOSTO | FE/UX | 2–4 | 004,005 |
| FEA-008 | F1 | P1 | PROPOSTO | FE/LT | 3–5 | 001,006 |
| FEA-009 | F2 | P1 | DOING | UX/FE | 2–4 | 002 |
| FEA-010 | F2 | P1 | PROPOSTO | FE/UX | 2–3 | 004,009 |
| FEA-011 | F2 | P1 | PROPOSTO | FE/UX | 2–4 | 005,009,010 |
| FEA-012 | F2 | P1 | PROPOSTO | FE/UX | 2–3 | 006,009,010 |
| FEA-013 | F2 | P2 | DOING | FE/UX | 2–3 | 007,009,010 |
| FEA-014 | F2 | P1 | DOING | FE/UX | 2–4 | 002,007,009 |
| FEA-015 | F2 | P1 | PROPOSTO | UX/OP | 1–2 | 002 |
| FEA-016 | F2 | P2 | PROPOSTO | UX/FE | 2–4 | 009,013 |
| FEA-017 | F3 | P1 | DOING | FE/UX | 3–5 | 010,012,014,015 |
| FEA-018 | F3 | P1 | PROPOSTO | FE/UX | 3–5 | 005,011,014,015 |
| FEA-019 | F3 | P1 | PROPOSTO | FE/UX | 5–8 | 007,008,012,014 |
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
