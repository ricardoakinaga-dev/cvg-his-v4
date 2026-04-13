# 0198 - Roadmap de Reorganizacao Vetus-Aligned Premium Enterprise

**Status:** proposto  
**Data de validacao:** 2026-04-12  
**Base:** `0197`, `0196`, acervo `vetus-screenshots`, `apps/spa`, `packages/modules`

---

## 1. Objetivo do roadmap

Transformar a reorganizacao Vetus-aligned em uma trilha executavel, priorizando:

1. arquitetura de informacao
2. shell e navbar
3. redistribuicao de modulos existentes
4. expansao dos modulos faltantes de ERP
5. consolidacao da camada enterprise secundaria

---

## 2. Premissas de execucao

- `apps/spa` segue como frontend oficial
- `apps/web` nao recebe nova expansao funcional
- a reorganizacao nao pode regredir seguranca, qualidade ou observabilidade
- o menu principal deve mudar primeiro; o enriquecimento de modulo vem em ondas
- modulos faltantes serao entregues por valor de negocio, nao por completismo

---

## 3. Macrocronograma recomendado

| Fase | Janela sugerida | Objetivo principal | Resultado esperado |
| --- | --- | --- | --- |
| F0 | 1 semana | fechar taxonomia e desenho alvo | mapa oficial aprovado |
| F1 | 2 semanas | reconstruir shell e navbar principal | navegacao primaria Vetus-aligned |
| F2 | 3 semanas | reorganizar `Inicio` e `Atendimento` | recepcao e operacao alinhadas |
| F3 | 3 semanas | estruturar `Laboratorio` e `Estoque` | dominios operacionais claros |
| F4 | 3 semanas | estruturar `Financeiro`, `Marketing` e `RH` | backoffice ERP coerente |
| F5 | 2 semanas | consolidar `Relatorios` e console enterprise | produto organizado e governavel |
| F6 | 2 semanas | hardening, treino e rollout | corte controlado da navegacao anterior |

**Duracao total recomendada:** `16 semanas`

---

## 4. Fase F0 - Arquitetura de Informacao e Aprovação

### Objetivo

Fechar a estrutura-alvo antes de mover UI ou rotas.

### Entregas

- mapa oficial do navbar principal
- definicao do console enterprise secundario
- redistribuicao de todos os modulos atuais por grupo-alvo
- naming canonical de rotas, labels e breadcrumbs
- matriz de impacto em documentacao, permissoes e testes

### Saidas obrigatorias

- taxonomia aprovada
- dicionario de labels aprovado
- matriz atual -> alvo assinada por produto, UX e arquitetura

### Gate de saida

- nenhuma ambiguidade sobre onde cada modulo vivera
- nenhuma capacidade enterprise sem destino definido

---

## 5. Fase F1 - Shell, Topbar e Navbar Primaria

### Objetivo

Materializar a estrutura Vetus-aligned no shell do sistema.

### Entregas

- topbar com contexto organizacional, busca, suporte e perfil
- sidebar primaria com 8 grupos principais
- hierarquia de 2-3 niveis por grupo
- search de menu alinhada a nova taxonomia
- favoritos e recentes adaptados ao novo mapa
- breadcrumbs coerentes com a nova estrutura

### Modulos impactados

- `AppLayout.vue`
- `navigation.ts`
- `routes.ts`
- store de favoritos/recentes
- command palette

### KPIs de aceite

- 100% das rotas principais mapeadas a um grupo primario
- zero modulo operacional orphan
- nenhum clique adicional pior que a baseline atual para fluxos criticos

### Risco principal

- reorganizar visualmente sem ajustar a taxonomia profunda, gerando menu bonito mas semanticamente errado

---

## 6. Fase F2 - Inicio + Atendimento

### Objetivo

Fazer o produto parecer um ERP veterinario ja na recepcao e na operacao clinica.

### Escopo

#### Inicio

- dashboard com atalhos por macroarea
- alertas e pendencias
- cards operacionais
- lembretes do dia

#### Atendimento

- redistribuicao de `patients` e `owners` para `Atendimento > Cadastrados`
- redistribuicao de `appointments`, `scheduling`, `queue`, `encounters`, `medical-records`
- criacao da narrativa `Comandas / Faturamento assistencial`
- aproximacao operacional entre `quotes`, `counter-sales` e jornada de atendimento
- consolidacao do subgrupo `Internacao`

### Resultado esperado

- quem opera atendimento encontra toda a jornada no mesmo grupo
- cadastros deixam de ser silo separado
- internacao passa a ser subdominio claro de atendimento

### Gate de saida

- recepcao consegue operar sem depender de grupos externos ao Atendimento

---

## 7. Fase F3 - Laboratorio + Estoque

### Objetivo

Fechar dois domínios historicamente fortes no Vetus e ainda subrepresentados na organizacao do CVG.

### Escopo Laboratorio

- criar grupo `Laboratorio`
- separar `Exames`, `Laudos`, `Hemogramas`, `Bioquimico`, `Urina`
- criar cadastros laboratoriais
- aproveitar `diagnostics`, `exam_orders`, `exam_results`

### Escopo Estoque

- manter `inventory` e `products`
- criar trilha de controles de estoque
- organizar cadastros de fornecedores, fabricantes e grupos
- dar superficie de UI ao bloco fiscal existente

### Resultado esperado

- laboratorio deixa de parecer subcapacidade escondida
- estoque deixa de ser apenas lista de produtos

### Gate de saida

- menu principal comporta laboratorio e estoque com profundidade equivalente ao Vetus

---

## 8. Fase F4 - Financeiro + Marketing + RH

### Objetivo

Reestruturar o backoffice empresarial no mesmo idioma do Vetus, sem perder o runtime premium do CVG.

### Escopo Financeiro

- mover `billing`, `cash`, `pix` para `Financeiro`
- criar estruturas de contas a receber e pagar
- organizar fluxo de caixa, DRE, bancos e centros de custo
- separar financeiro assistencial de financeiro comercial apenas no detalhe, nunca no menu principal

### Escopo Marketing

- transformar `notifications` em modulo de relacionamento
- consolidar WhatsApp, SMS, email e campanhas
- adicionar configuracoes de templates e preferencias

### Escopo RH

- mover `users`, `staff`, `access-control`, `mfa`
- criar subestrutura de usuarios, profissionais e comissoes
- posicionar governanca humana no mesmo dominio administrativo

### Gate de saida

- backoffice financeiro, relacional e humano organizado em 3 grupos distintos e compreensiveis

---

## 9. Fase F5 - Relatorios + Console Enterprise

### Objetivo

Fechar a camada de analise e a camada avancada do produto.

### Escopo Relatorios

- criar grupo `Relatorios`
- separar relatorios financeiros, atendimento, cadastros e plataforma
- migrar `commercial-reports`
- integrar `audit` e `lgpd` como trilhas analiticas e de controle

### Escopo Console Enterprise

- criar ponto unico para:
  - API keys
  - webhooks
  - API client
  - governanca avancada
  - evidencias operacionais
  - seguranca

### Gate de saida

- menu principal fica limpo
- recursos enterprise continuam visiveis e acessiveis

---

## 10. Fase F6 - Hardening, Comunicacao e Rollout

### Objetivo

Trocar a organizacao oficial do produto sem gerar quebra operacional.

### Entregas

- plano de migracao de rotas e breadcrumbs
- aliases temporarios de navegacao
- telemetria de uso do novo menu
- checklist de treinamento por area
- help center e onboarding contextual
- criterios para desligar a taxonomia antiga

### Gate de saida

- navegacao antiga pode ser retirada sem perda de descoberta
- time assistencial, financeiro e administrativo aprovado no UAT

---

## 11. Milestones executivos

| Marco | Fase | Criterio objetivo |
| --- | --- | --- |
| M1 | F0 | mapa alvo aprovado |
| M2 | F1 | shell oficial reorganizado |
| M3 | F2 | Atendimento vira dominio principal coerente |
| M4 | F3 | Laboratorio e Estoque ganham profundidade ERP |
| M5 | F4 | Financeiro, Marketing e RH consolidados |
| M6 | F5 | Relatorios e console enterprise publicados |
| M7 | F6 | rollout concluido com UAT e telemetria |

---

## 12. KPIs recomendados do programa

### UX e adocao

- tempo medio para localizar modulo critico
- cliques ate acao principal por area
- uso de busca global vs navegação manual
- uso de favoritos por perfil

### Produto

- percentual de modulos redistribuidos conforme plano
- percentual de modulos Vetus-like com hub completo
- percentual de modulos faltantes efetivamente materializados

### Operacao

- taxa de erro de navegacao apos rollout
- tickets de suporte relacionados a descoberta de modulo
- sucesso no UAT por recepcao, clinico, financeiro e administrativo

---

## 13. Dependencias criticas

1. design authority para aprovar a taxonomia
2. product owner com poder de definir naming final
3. inventario definitivo de permissoes por area
4. padrao unico de hub page e detail page
5. backlog priorizado para modulos faltantes

---

## 14. Decisao de sequencing

Este roadmap recomenda atacar primeiro:

1. **arquitetura de informacao**
2. **shell e navbar**
3. **redistribuicao do que ja existe**
4. **expansao do que falta**
5. **hardening de rollout**

Fazer o contrario seria erro:

- construir novos modulos sem taxonomia final
- crescer financeiramente e laboratorialmente em uma estrutura de menu errada
- continuar adicionando features num shell que nao representa a operacao

---

## 15. Resultado esperado ao final do roadmap

Ao final desta trilha, o `cvg-his-v2` deve entregar:

- linguagem de navegacao equivalente ao Vetus
- profundidade funcional superior ao Vetus
- separacao clara entre ERP operacional e plataforma enterprise
- coerencia entre codigo, UX, menu, relatorios e documentacao

Este e o ponto de equilibrio correto entre:

- familiaridade operacional Vetus-like
- maturidade tecnica Premium Enterprise do CVG
