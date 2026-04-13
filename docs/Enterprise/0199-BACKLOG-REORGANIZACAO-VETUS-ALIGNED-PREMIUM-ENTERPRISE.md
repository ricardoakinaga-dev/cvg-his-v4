# 0199 - Backlog de Reorganizacao Vetus-Aligned Premium Enterprise

**Status:** proposto  
**Data de validacao:** 2026-04-12  
**Base:** `0197`, `0198`, `0196`, acervo `vetus-screenshots`

---

## 1. Regras do backlog

- todo item deve preservar os upgrades enterprise existentes
- nenhum item de UI fecha sem mapear impacto em permissao, rota e telemetria
- prioridade `P0` organiza a espinha dorsal do produto
- prioridade `P1` fecha lacunas operacionais claras contra a referencia Vetus
- prioridade `P2` adiciona profundidade, acabamento e escala

---

## 2. Legenda de status inicial

| Status | Significado |
| --- | --- |
| `TODO` | ainda nao iniciado |
| `EXPAND` | base existe, mas precisa ser reorganizada ou aprofundada |
| `MOVE` | capacidade pronta, porem no grupo errado |
| `NEW` | modulo ou superficie ainda inexistente |

---

## 3. Epic E01 - Arquitetura de informacao e governanca

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-001 | P0 | TODO | Aprovar taxonomia primaria Vetus-aligned | menu atual e por dominios internos | mapa oficial com 8 grupos principais | nenhuma | taxonomia publicada e assinada |
| REORG-002 | P0 | TODO | Definir console enterprise secundario | capacidades avancadas estao espalhadas | arquitetura de dupla camada formalizada | REORG-001 | todos os modulos enterprise tem destino definido |
| REORG-003 | P0 | TODO | Publicar matriz atual -> alvo de todos os modulos | redistribuicao ainda nao oficial | matriz modulo, rota, label, permissao | REORG-001 | nenhum modulo sem mapeamento |
| REORG-004 | P1 | TODO | Congelar naming canonico de labels e breadcrumbs | labels variam por pagina | dicionario de labels oficial | REORG-001 | labels unificadas por dominio |
| REORG-005 | P1 | TODO | Revisar impacto em RBAC, favoritos e recentes | mudanca de menu afeta descoberta | plano tecnico de migracao de navegação | REORG-001 | riscos catalogados e mitigados |

---

## 4. Epic E02 - Shell, topbar e navbar

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-010 | P0 | TODO | Reestruturar sidebar primaria para 8 grupos Vetus-like | sidebar atual usa `Inicio`, `Cadastro`, `Operacao`, `Assistencial`, `Comercial`, `Estoque`, `Plataforma`, `Governanca` | nova sidebar oficial publicada | REORG-001 | grupo principal novo ativo em todo o shell |
| REORG-011 | P0 | TODO | Introduzir hierarquia de 2-3 niveis por grupo | itens atuais sao quase todos diretos | subgrupos `Atendimentos`, `Internacao`, `Cadastrados`, etc | REORG-010 | grupos expandem e recolhem sem ambiguidade |
| REORG-012 | P0 | TODO | Exibir contexto de empresa/unidade/setor no shell | contexto organizacional pouco visivel | bloco de contexto operacional no topo da sidebar ou topbar | REORG-001 | usuario sempre sabe em qual contexto opera |
| REORG-013 | P1 | TODO | Convergir topbar para modelo Vetus+CVG | topbar atual privilegia breadcrumbs e logout | topbar com busca, suporte, WhatsApp, notificacoes, perfil e palette | REORG-010 | topbar atende operacao e governanca |
| REORG-014 | P1 | TODO | Alinhar busca global e busca de menu a nova taxonomia | busca atual conhece o mapa antigo | busca por modulo, rotina, palavra-chave e grupo | REORG-010 | busca retorna itens da nova estrutura |
| REORG-015 | P1 | TODO | Adaptar favoritos e recentes ao novo mapa | favoritos seguem paths atuais, sem contexto de grupo | favoritos mantidos com nova taxonomia | REORG-010 | favoritos e recentes sobrevivem a reorganizacao |
| REORG-016 | P1 | TODO | Revisar command palette para nova semantica | palette atual reflete labels antigas | palette com grupos operacionais Vetus-aligned | REORG-010 | resultados da palette aderentes ao novo menu |
| REORG-017 | P2 | TODO | Criar onboarding contextual do novo menu | nao existe tutorial da nova arquitetura | help contextual por macroarea | REORG-013 | onboarding disponivel por perfil |

---

## 5. Epic E03 - Inicio

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-020 | P1 | EXPAND | Reposicionar dashboard como porta operacional do ERP | dashboard ja tem KPIs, favoritos e recentes | dashboard com atalhos por macroarea ERP | REORG-010 | dashboard espelha a nova organizacao |
| REORG-021 | P1 | NEW | Criar painel de pendencias do dia | nao ha painel operacional forte | lembretes, tarefas e alertas por perfil | REORG-020 | usuario ve o que precisa fazer ao entrar |
| REORG-022 | P2 | NEW | Criar cards de atalhos equivalentes ao Vetus | hoje atalhos sao mais genericos | grid de atalhos por rotina critica | REORG-020 | atalhos cobrem recepcao, clinico e financeiro |
| REORG-023 | P2 | NEW | Criar widgets de aniversariantes, lembretes e filas | inexistente ou disperso | widgets operacionais configuraveis | REORG-020 | widgets habilitados por permissao e contexto |

---

## 6. Epic E04 - Atendimento

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-030 | P0 | MOVE | Mover `patients` para `Atendimento > Cadastrados` | hoje esta em `Cadastro` | paciente dentro do fluxo de atendimento | REORG-010 | paciente aparece no grupo novo sem perda de rota |
| REORG-031 | P0 | MOVE | Mover `owners` para `Atendimento > Cadastrados` | hoje esta em `Cadastro` | tutor dentro do fluxo de atendimento | REORG-010 | tutor acessivel a partir do mesmo dominio |
| REORG-032 | P0 | MOVE | Consolidar `appointments`, `scheduling` e `queue` em `Atendimento > Atendimentos` | agenda fragmentada | jornada agenda -> fila -> atendimento coerente | REORG-010 | recepcao nao precisa trocar de macrogrupo |
| REORG-033 | P0 | MOVE | Reposicionar `encounters` e `medical-records` no mesmo grupo | hoje ficam em dominios separados do cadastro | atendimento e prontuario na mesma trilha | REORG-032 | jornada clinica direta entre telas |
| REORG-034 | P1 | MOVE | Reclassificar `triage` como etapa do atendimento | hoje esta em `Assistencial` | triagem abaixo de Atendimento | REORG-032 | triagem passa a ser descoberta no fluxo real |
| REORG-035 | P1 | EXPAND | Criar narrativa `Comandas / faturamento assistencial` | `billing` existe mas como financeiro generico | faturamento assistencial contextualizado | REORG-032 | usuario entende o papel do faturamento no atendimento |
| REORG-036 | P1 | MOVE | Posicionar `quotes` e `counter-sales` como trilhas proximas do atendimento | hoje estao em `Comercial` | orcamento e venda assistida visiveis no fluxo de recepcao | REORG-035 | recepcao encontra orcamento e venda no mesmo ecossistema |
| REORG-037 | P1 | MOVE | Consolidar internacao como subgrupo de Atendimento | hoje internacao vive em `Assistencial` | `Internacao`, `Mapa de Leitos`, `Setores`, `Leitos`, `Altas` no mesmo grupo | REORG-010 | subgrupo de internacao fechado e navegavel |
| REORG-038 | P2 | NEW | Criar trilha `Pacotes` | Vetus referencia pacotes, CVG nao tem superficie clara | backlog funcional de pacotes publicado e priorizado | REORG-036 | modulo mapeado e pronto para execucao |
| REORG-039 | P2 | NEW | Criar trilha `Vacinas e protocolos` | ha base parcial de protocolos, sem hub operacional | menu e hub especificos | REORG-030 | capacidade descoberta sem procurar em modulos paralelos |

---

## 7. Epic E05 - Laboratorio

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-050 | P0 | NEW | Criar grupo `Laboratorio` na navegacao principal | inexistente no menu atual | macrogrupo oficial no navbar | REORG-010 | laboratorio aparece como dominio de primeira classe |
| REORG-051 | P0 | EXPAND | Desmembrar `diagnostics` em `Exames` e `Laudos` | diagnosticos esta genérico | modulos laboratoriais distinguiveis | REORG-050 | usuario encontra exames e laudos separadamente |
| REORG-052 | P1 | NEW | Criar superficies `Hemogramas`, `Bioquimico` e `Urina` | nao existem como paginas dedicadas | jornadas especializadas por tipo de exame | REORG-051 | cada categoria possui lista, detalhe e acao principal |
| REORG-053 | P1 | NEW | Criar `Equipamentos` laboratoriais | sem hub dedicado | CRUD e navegacao especifica | REORG-050 | equipamento acessivel no subgrupo de cadastros |
| REORG-054 | P1 | NEW | Criar `Tipos de Laudo` e `Valores de Referencia` | sem superficie dedicada | cadastros laboratoriais completos | REORG-053 | laboratorio ganha profundidade de ERP |
| REORG-055 | P2 | NEW | Planejar integracao com anomalia/ML no laboratorio | ha modulo `ml`, sem narrativa laboratorial | trilha futura de valor clinico | REORG-051 | roadmap tecnico anexado ao dominio |

---

## 8. Epic E06 - Estoque e fiscal

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-060 | P1 | EXPAND | Reorganizar `inventory` como `Estoque > Controles` | hoje estoque e lista principal | hub com movimentacao, consumo, validade e reposicao | REORG-010 | estoque deixa de ser apenas listagem |
| REORG-061 | P1 | MOVE | Fixar `products` em `Estoque > Cadastrados` | ja existe, mas precisa semantica nova | catalogo alinhado ao backoffice | REORG-060 | produto fica em local previsivel |
| REORG-062 | P1 | MOVE | Reavaliar `services` fora de Estoque | hoje servicos vivem ao lado de produtos | servicos migram para Atendimento > Cadastrados | REORG-030 | menu reflete semantica correta |
| REORG-063 | P1 | NEW | Criar trilha de fornecedores, fabricantes e grupos de produto | ausente na UI principal | cadastros auxiliares de estoque | REORG-060 | estoque ganha profundidade administrativa |
| REORG-064 | P1 | EXPAND | Dar superficie de UI ao dominio fiscal | modulo `fiscal` existe, mas sem narrativa no shell | subgrupo fiscal com tabelas e parametrizacoes | REORG-060 | fiscal visivel dentro de Estoque |
| REORG-065 | P2 | NEW | Criar trilha de compras e transferencia entre estoques | inexistente como jornada | compras e transferencias operacionais | REORG-063 | fluxo mapeado e integravel ao estoque |

---

## 9. Epic E07 - Financeiro

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-070 | P0 | MOVE | Criar grupo `Financeiro` e mover `billing`, `cash`, `pix` | hoje vivem em `Comercial` | grupo financeiro oficial | REORG-010 | caixa e faturamento deixam de depender de Comercial |
| REORG-071 | P1 | EXPAND | Posicionar `cash` como `Gaveta / Caixa` | caixa existe, mas sem narrativa de gaveta | subgrupo dedicado com abertura e fechamento | REORG-070 | operacao financeira descobre caixa em 1 lugar |
| REORG-072 | P1 | NEW | Criar `Contas a Receber` | lacuna relevante frente ao Vetus | modulo financeiro completo | REORG-070 | fluxo de recebiveis definido e navegavel |
| REORG-073 | P1 | NEW | Criar `Contas a Pagar` | lacuna relevante frente ao Vetus | modulo financeiro completo | REORG-070 | fluxo de pagar definido e navegavel |
| REORG-074 | P1 | NEW | Criar `Fluxo de Caixa` e `Linha do Tempo` | nao ha hub financeiro equivalente | analise financeira operacional | REORG-072 | financeiro passa a ter visao gerencial |
| REORG-075 | P1 | NEW | Criar `Bancos`, `Formas de Pagamento`, `Centros de Custo`, `Custos e Despesas` | base parcial, sem grupo dedicado | cadastros financeiros estruturados | REORG-070 | cadastros financeiros acessiveis no grupo correto |
| REORG-076 | P2 | NEW | Criar `DRE` e analitica financeira | inexistente como produto claro | DRE e relatorios gerenciais | REORG-074 | diretoria encontra DRE em Financeiro/Relatorios |

---

## 10. Epic E08 - Marketing e RH

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-080 | P1 | MOVE | Mover `notifications` e `notifications-whatsapp` para `Marketing` | hoje ficam em `Plataforma` | modulo de relacionamento e comunicacao | REORG-010 | notificacoes deixam de parecer recurso tecnico |
| REORG-081 | P1 | NEW | Criar superficie de `Campanhas` e `Templates` | ausente | marketing operacional e recorrente | REORG-080 | campanhas ganham hub e configuracao |
| REORG-082 | P0 | MOVE | Mover `users`, `staff`, `access-control` e `mfa` para `RH` + console enterprise | hoje espalhados em `Plataforma` e `Governanca` | grupo RH consolidado | REORG-010 | usuarios e equipe descobriveis no dominio humano |
| REORG-083 | P1 | NEW | Criar trilha `Comissoes` | Vetus possui calculo e regras; CVG nao | modulo de comissoes planejado e depois materializado | REORG-082 | regras, calculo e produtividade definidos |
| REORG-084 | P2 | NEW | Criar `Profissoes`, `Departamentos` e `Folgas` | ausentes ou difusos | cadastros administrativos de RH | REORG-082 | RH completo para operacao |

---

## 11. Epic E09 - Relatorios e console enterprise

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-090 | P0 | NEW | Criar grupo `Relatorios` | relatorios estao dispersos | hub principal de relatorios por area | REORG-010 | relatorios aparecem como macrogrupo oficial |
| REORG-091 | P1 | MOVE | Migrar `commercial-reports` para `Relatorios` | hoje esta em `Comercial` | relatorios comerciais em local correto | REORG-090 | menu e breadcrumbs alinhados |
| REORG-092 | P1 | MOVE | Posicionar `audit` e `lgpd` em `Relatorios > Plataforma` e no console enterprise | hoje estao em `Governanca` | dupla exposicao controlada | REORG-002 | auditoria e LGPD acessiveis sem poluir menu ERP |
| REORG-093 | P1 | NEW | Criar relatorios de atendimento, cadastro e financeiro | nao ha portifolio completo estilo Vetus | trilhas analiticas por dominio | REORG-090 | diretoria e operacao encontram relatorios por area |
| REORG-094 | P0 | NEW | Criar console enterprise para `api-keys`, `webhooks`, `api-client`, `soc2` e integracoes | hoje capacidades avancadas estao espalhadas | camada secundaria administrativa | REORG-002 | console enterprise publicado com acesso restrito |
| REORG-095 | P2 | NEW | Criar visao de saude operacional e integracoes | observabilidade existe, mas nao como superficie executiva do produto | hub de plataforma e operacao | REORG-094 | status enterprise visivel ao admin |

---

## 12. Epic E10 - Migracao, corte e qualidade

| ID | Prioridade | Status | Item | Estado atual | Entrega esperada | Dependencias | Criterio de aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REORG-100 | P0 | TODO | Criar plano de alias temporarios para navegacao antiga | mudanca de taxonomia pode quebrar descoberta | aliases e redirects de transicao | REORG-010 | usuario nao fica sem caminho conhecido |
| REORG-101 | P0 | TODO | Atualizar testes de navegacao, breadcrumbs e command palette | suites refletem menu antigo | cobertura da nova navegação | REORG-010 | testes passam com mapa novo |
| REORG-102 | P1 | TODO | Instrumentar telemetria de uso do menu reorganizado | sem leitura forte de descoberta | dados de adocao por grupo e rota | REORG-010 | telemetria orienta refinamento |
| REORG-103 | P1 | TODO | Atualizar documentacao operacional e manual por area | docs atuais nao refletem a estrutura alvo | docs coerentes com o produto | REORG-001 | nenhuma area sem manual atualizado |
| REORG-104 | P1 | TODO | Rodar UAT com recepcao, clinico, laboratorio, financeiro e admin | reorganizacao pode parecer correta so no papel | evidencia de aprovacao de campo | REORG-100 | aceite formal por area |
| REORG-105 | P2 | TODO | Desligar taxonomia antiga e limpar resquicios | risco de drift entre duas organizacoes | corte final e governado | REORG-104 | menu antigo removido sem regressao |

---

## 13. Ordem recomendada de ataque

### Lote 1 - Fundacao da reorganizacao

- `REORG-001`
- `REORG-002`
- `REORG-003`
- `REORG-010`
- `REORG-011`
- `REORG-012`

### Lote 2 - Atendimento e recepcao

- `REORG-020`
- `REORG-030`
- `REORG-031`
- `REORG-032`
- `REORG-033`
- `REORG-037`

### Lote 3 - Dominios operacionais fortes

- `REORG-050`
- `REORG-051`
- `REORG-060`
- `REORG-061`
- `REORG-070`
- `REORG-071`

### Lote 4 - Backoffice e relatorios

- `REORG-072`
- `REORG-073`
- `REORG-080`
- `REORG-082`
- `REORG-090`
- `REORG-094`

### Lote 5 - Expansao premium

- `REORG-052`
- `REORG-054`
- `REORG-075`
- `REORG-076`
- `REORG-083`
- `REORG-093`

### Lote 6 - Rollout e corte

- `REORG-100`
- `REORG-101`
- `REORG-102`
- `REORG-103`
- `REORG-104`
- `REORG-105`

---

## 14. Definition of Done do backlog

Um item deste backlog so fecha quando houver:

- destino correto no navbar
- label final aprovado
- impacto em rotas, breadcrumbs, busca e palette resolvido
- permissao e visibilidade revisadas
- evidencia em teste, UAT ou documento oficial

---

## 15. Resultado esperado do backlog

Este backlog entrega tres coisas ao mesmo tempo:

1. a estrutura de ERP veterinario que o usuario espera ver
2. a preservacao do que o `cvg-his-v2` ja tem de premium enterprise
3. um caminho controlado para sair da organizacao atual sem regressao funcional

O criterio final de sucesso e simples:

> o operador deve sentir que entrou em um ERP organizado como o Vetus; a arquitetura deve continuar sendo a do melhor CVG-HIS V2.
