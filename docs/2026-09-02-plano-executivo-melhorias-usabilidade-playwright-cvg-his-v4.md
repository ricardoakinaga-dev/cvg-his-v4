# Plano executivo de melhorias de usabilidade Playwright — CVG-HIS V4

> Atualização de execução: a implementação e as pendências de certificação estão consolidadas no [relatório de implementação](./2026-09-02-implementacao-usabilidade-playwright-cvg-his-v4.md).

Data-base: 2 de setembro de 2026  
Status: proposta executiva para aprovação  
Fonte de verdade: [Relatório master de usabilidade Playwright](./2026-09-02-relatorio-master-usabilidade-playwright-cvg-his-v4.md)  
Execução: [Roadmap de melhorias](./2026-09-02-roadmap-melhorias-usabilidade-playwright-cvg-his-v4.md)  
Controle: [Backlog priorizado](./2026-09-02-backlog-priorizado-usabilidade-playwright-cvg-his-v4.md)

## 1. Decisão executiva proposta

Autorizar um programa de estabilização de **12 semanas**, organizado em seis sprints de duas semanas, para transformar a aprovação condicionada em homologação comprovada por Playwright e PostgreSQL real.

Durante o programa:

- manter o CVG-HIS V4 disponível para desenvolvimento e demonstração controlada;
- não liberar operação clínica, financeira ou fiscal real enquanto os gates G0–G3 não estiverem verdes;
- congelar novas funcionalidades que concorram com os bloqueadores P0/P1;
- tratar o ambiente PostgreSQL reproduzível como primeira entrega, pois sem ele não é possível separar defeito de produto de limitação do ambiente;
- preservar o baseline visual válido e nunca atualizar snapshots para aceitar telas de erro.

O horizonte de 12 semanas pressupõe uma equipe dedicada mínima. Caso a capacidade seja menor ou compartilhada, as datas devem ser recalculadas sem reduzir os critérios de aceite.

## 2. Baseline e metas de homologação

| Indicador                                     | Baseline | Meta de saída |
| --------------------------------------------- | -------: | ------------: |
| Casos Playwright definidos                    |      369 |   369 ou mais |
| Casos aprovados pelo runner                   |      354 |           369 |
| Falhas do runner                              |        9 |             0 |
| Casos pulados                                 |        6 |             0 |
| Renderizações conformes na auditoria interna  |    0/286 |       286/286 |
| Rotas com `4xx/5xx` inesperado                |       33 |             0 |
| Regressões visuais                            |     1/28 |          0/28 |
| Renderizações com landmarks `main` duplicados |      286 |             0 |
| Campos sem rótulo programático                |        7 |             0 |
| Ocorrências de alvo menor que `24x24px`       |       90 |             0 |
| Overflows horizontais globais                 |       10 |             0 |
| Erros JavaScript não tratados                 |        0 |      manter 0 |
| Cenários de contas e profissionais            |    12/12 |  manter 12/12 |

O programa só pode declarar sucesso quando o mesmo commit cumprir as metas no ambiente de homologação com PostgreSQL, sem skips não aprovados.

## 3. Resultados de negócio esperados

1. **Segurança clínica:** prontuário, internação, laboratório e handoffs funcionam com persistência real, restart e rastreabilidade.
2. **Confiabilidade financeira:** quitação atualiza o saldo imediatamente e exports concluem ou falham de forma limitada e compreensível.
3. **Operação sem telas parcialmente quebradas:** as 143 rotas carregam sem respostas internas inesperadas.
4. **Uso inclusivo:** o shell tem semântica correta, os formulários têm rótulos e os alvos podem ser acionados por teclado, mouse e toque.
5. **Uso mobile real:** as rotas financeiras deixam de ocultar centenas de pixels fora do viewport.
6. **Homologação repetível:** qualquer pessoa autorizada consegue subir o ambiente, executar a matriz e obter evidência ligada ao commit.

## 4. Escopo do programa

### Incluído

- infraestrutura local/CI de PostgreSQL e dependências de teste;
- persistência atômica do prontuário e fluxos assistenciais afetados;
- faturamento, relatório de exclusão e exports de agenda/estoque;
- 33 rotas com `400`, `500` ou `503`;
- shell semântico, rótulos, alvos interativos e responsividade;
- requisições secundárias incompatíveis com os perfis restritos;
- transformação da auditoria Playwright em gate de qualidade;
- reexecução integral, evidências e decisão go/no-go.

### Fora do escopo

- redesenho visual completo ou troca do design system;
- novos módulos sem relação com os achados;
- migração ampla de dados legados;
- homologação comercial de provedores externos não necessária aos 369 casos;
- otimizações de performance sem evidência de impacto nas jornadas auditadas.

Qualquer ampliação deve passar por controle de mudança e demonstrar que não atrasa P0/P1.

## 5. Frentes executivas

| Frente                         | Prioridade | Objetivo                                                      | Saída mensurável                                                      |
| ------------------------------ | ---------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| F1 — Ambiente e evidência      | P0         | tornar PostgreSQL/Playwright reproduzíveis localmente e na CI | 369 casos executáveis, zero skip ambiental e artefatos por SHA        |
| F2 — Persistência clínica      | P0         | recuperar prontuário e jornadas dependentes                   | fluxos clínico, internação e laboratório verdes; snapshot correto     |
| F3 — APIs e relatórios         | P0/P1      | eliminar falhas nas 33 rotas                                  | zero `4xx/5xx` inesperado nos dois viewports                          |
| F4 — Faturamento e exports     | P1         | garantir feedback e resultado consistentes                    | saldo correto; agenda/estoque baixam arquivo ou exibem falha limitada |
| F5 — Acessibilidade do shell   | P1         | corrigir problemas sistêmicos de semântica e componentes      | um `main`, zero campo sem rótulo e zero alvo abaixo do limiar         |
| F6 — Responsividade financeira | P1         | tornar dez superfícies utilizáveis sem rolagem global lateral | `scrollWidth <= clientWidth + 2px` em desktop/mobile                  |
| F7 — RBAC e cargas secundárias | P1         | impedir ruído `403` sem ampliar privilégios                   | cada papel carrega apenas dados autorizados; 12/12 cenários mantidos  |
| F8 — Gate final de usabilidade | P0/P1      | impedir falso verde e regressão                               | auditoria interna bloqueia pipeline, relatório consolidado fica verde |

## 6. Estratégia de execução

### Etapa 1 — Tornar o resultado confiável

Provisionar PostgreSQL, migrations, seed, navegador e coleta de artefatos. Reexecutar a baseline antes de alterar comportamento e classificar as 33 rotas em:

- defeito confirmado com banco saudável;
- contrato que deve ter fallback/estado vazio;
- erro de configuração;
- dependência externa fora do ambiente.

Essa classificação evita corrigir sintomas de um ambiente incompleto.

### Etapa 2 — Recuperar jornadas impeditivas

Corrigir primeiro a persistência atômica do prontuário, pois ela provoca múltiplas falhas funcionais e a única divergência visual. Em seguida corrigir saldo de faturamento, relatório de exclusão e exports.

### Etapa 3 — Corrigir causas compartilhadas

Agrupar as 33 rotas por endpoint e componente, evitando 33 correções isoladas:

- 11 rotas de catálogos/financeiro com respostas `503`;
- 11 rotas dependentes de `/api/reports/administrative-hubs`;
- 11 rotas dependentes de `/api/reports/executions`.

Aplicar a mesma estratégia aos componentes compartilhados de formulário, breadcrumb, alerta e layout responsivo.

### Etapa 4 — Fechar qualidade transversal

Eliminar o `main` duplicado no shell, ajustar os campos sem label, ampliar alvos pequenos e corrigir overflow. Adicionar Axe e regras estruturais à matriz para que a correção permaneça protegida.

### Etapa 5 — Certificar

Executar os 369 casos no mesmo SHA em ambiente limpo, repetir três vezes para detectar instabilidade, revisar manualmente as dez superfícies responsivas e obter aceite de QA, Produto/Operação e Engenharia.

## 7. Gates de promoção

| Gate                      | Decisão habilitada                    | Critério obrigatório                                                      |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| G0 — Ambiente confiável   | iniciar correções com baseline válida | PostgreSQL saudável, migrations/seed reproduzíveis e 369 casos coletáveis |
| G1 — Jornadas críticas    | liberar homologação interna           | prontuário, laboratório, billing, exports e relatórios impeditivos verdes |
| G2 — Superfície íntegra   | liberar UAT operacional               | zero rota com erro HTTP inesperado e RBAC sem sobrebusca ruidosa          |
| G3 — Usabilidade conforme | formar release candidate              | 286/286 registros internos conformes, 28/28 snapshots e zero overflow     |
| G4 — Certificação         | decisão go-live                       | todos os casos (mínimo 369), zero skip, três rodadas verdes e aceites     |

Nenhum gate pode ser aprovado por alteração de baseline visual, exclusão de rota ou transformação de falha em skip.

## 8. Capacidade recomendada

| Papel                     | Capacidade recomendada | Foco                                                                 |
| ------------------------- | ---------------------: | -------------------------------------------------------------------- |
| Backend                   |              2 pessoas | persistência clínica, relatórios, catálogos, billing e RBAC          |
| Frontend                  |              2 pessoas | feedback de erro, exports, design system, semântica e responsividade |
| QA/automação              |               1 pessoa | Playwright, triagem, evidências e gates                              |
| DevOps/SRE                |             0,5 pessoa | PostgreSQL, CI, browser cache e artefatos                            |
| Produto/Operação/UX       |   0,5 pessoa combinada | prioridade, UAT e aceite das jornadas                                |
| Revisão de acessibilidade |   participação pontual | validação semântica e manual                                         |

Recomenda-se limite de trabalho em andamento: no máximo duas frentes de correção por disciplina, além de incidentes P0.

## 9. Governança e responsabilidades

| Papel                  | Responsabilidade                                              |
| ---------------------- | ------------------------------------------------------------- |
| Patrocinador executivo | aprovar capacidade, freeze, exceções e go/no-go               |
| Product Owner/Operação | ordenar impacto, esclarecer comportamento e aceitar jornadas  |
| Liderança técnica      | arquitetura, dependências, qualidade e aprovação do SHA       |
| Backend                | banco, adapters, contratos de API, transações e relatórios    |
| Frontend/UX            | estados de tela, componentes, responsividade e acessibilidade |
| QA                     | cenários, rastreabilidade, triagem, regressão e parecer final |
| DevOps/SRE             | ambiente, CI, logs, artefatos e repetibilidade                |
| Segurança              | revisar RBAC sem expansão indevida de privilégios             |

Cadência:

- triagem diária de 15 minutos durante G0/G1;
- revisão semanal de indicadores, riscos e decisões;
- demonstração Playwright e aceite ao final de cada sprint;
- reauditoria parcial em cada gate e integral em G4.

## 10. Indicadores de acompanhamento

O painel semanal deve mostrar:

- casos aprovados, falhos, pulados e instáveis;
- conformidade interna por viewport;
- rotas com erro por endpoint e causa;
- P0/P1 abertos, idade e owner;
- tempo de download e tempo até feedback de erro;
- ocorrências de `403` por papel e superfície;
- contagem de landmarks, labels, alvos pequenos e overflows;
- snapshots alterados, com justificativa e aprovador;
- percentual do backlog aceito, não apenas implementado.

## 11. Riscos e mitigações

| Risco                                                      | Probabilidade | Impacto    | Mitigação                                                                                   |
| ---------------------------------------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------- |
| PostgreSQL revela falhas adicionais                        | alta          | alto       | reservar capacidade de contingência e rebaselinar no G0 antes do compromisso final          |
| correção do adapter clínico afeta transações               | média         | muito alto | testes atômicos, idempotência, rollback e revisão de backend                                |
| ajuste global do design system gera regressão em 143 rotas | média         | alto       | mudança por componente, snapshots e auditoria completa por PR                               |
| eliminação de `403` amplia permissões indevidamente        | média         | muito alto | remover requisição desnecessária ou tratar capacidade; nunca conceder permissão sem revisão |
| time atualiza snapshots para obter verde                   | média         | alto       | aprovação dupla e proibição de baseline contendo alerta/estado de erro                      |
| exports continuam flakey por evento de download            | média         | médio      | contrato determinístico, timeout de produto e evidência do arquivo                          |
| novas funcionalidades consomem a capacidade                | alta          | alto       | freeze até G2 e exceção aprovada pelo patrocinador                                          |

## 12. Critério executivo de sucesso

O programa termina somente quando:

1. G0–G4 estão aprovados no mesmo commit;
2. todos os casos descobertos, no mínimo os 369 da baseline, passam sem skips e sem retry ocultando flakiness;
3. as 286 auditorias internas estão conformes;
4. o ambiente usa PostgreSQL saudável e executa sem fallback para repositórios em memória;
5. nenhum P0/P1 impeditivo permanece aberto;
6. Produto/Operação, QA, Engenharia e Segurança registraram aceite;
7. riscos residuais possuem owner, prazo e aprovação executiva.

## 13. Decisões imediatas requeridas

1. Aprovar ou ajustar a capacidade recomendada.
2. Nomear responsáveis pelas frentes F1–F8.
3. Autorizar freeze de novas funcionalidades até G2.
4. Definir o ambiente PostgreSQL oficial de homologação.
5. Aprovar a regra de que somente evidência Playwright no SHA candidato promove o produto.
