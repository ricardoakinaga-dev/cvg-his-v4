# 304 - Plano da Equipe A - Design System Vue e Consolidação Visual da SPA

## Objetivo do documento

Este documento isola o escopo operacional da `Equipe A`, permitindo execução autônoma da frente transversal de frontend sem dependência do plano consolidado de duas equipes.

O foco desta equipe é:

- consolidar a camada Vue do design system
- ampliar a adoção dos componentes `Ds*` nas páginas da SPA
- reduzir markup inline e CSS duplicado
- elevar a consistência visual e a velocidade de evolução da interface

## Missão da Equipe A

Transformar o design system Vue em base real da SPA.

## Resultado esperado

Ao final desta frente, a SPA deve:

- usar componentes Vue do design system em páginas reais e críticas
- depender menos de markup local repetido
- ter componentes base com testes e API estáveis
- possuir uma camada visual mais uniforme entre módulos
- ficar mais barata de manter e mais rápida de expandir

## Contexto atual

O projeto já possui:

- `packages/design-system` com tokens, temas e componentes SSR-first
- primeira camada de componentes Vue SFC já portada
- SPA em `apps/spa/` madura, com múltiplos módulos migrados
- testes unitários, de página, E2E e visual regression ativos

Os componentes Vue já portados incluem, em nível inicial:

- `DsButton`
- `DsCard`
- `DsBadge`
- `DsAlert`
- `DsModal`
- `DsTabs`
- `DsSpinner`
- `DsInput`

Apesar disso, a adoção ainda é parcial e muitas páginas seguem com:

- markup local repetido
- wrappers visuais ad hoc
- CSS global ou por página para problemas que já poderiam ser resolvidos no design system

## Fora de escopo

- migrar módulos novos de negócio completos
- redesenhar toda a SPA de uma vez
- trocar a stack visual por biblioteca externa
- reescrever o design system inteiro em uma única fase
- alterar contratos de backend

## Ownership técnico

### Áreas prioritárias de escrita

- `packages/design-system/`
- `apps/spa/src/components/`
- `apps/spa/src/styles/`
- `apps/spa/src/pages/` em refactors visuais controlados
- `apps/spa/tests/` relacionados à camada visual

### Áreas com escrita coordenada

- `apps/spa/src/router/routes.ts` apenas se algum componente exigir meta visual nova
- `docs/Enterprise/300-SCORECARD-PROGRESSO.md`
- `docs/Enterprise/999-RELATORIO-CONSOLIDADO-ENTERPRISE.md`

## Dependências que a equipe pode assumir como estáveis

- stores da SPA
- infraestrutura de testes da SPA
- infraestrutura Playwright
- tokens e temas existentes do design system
- convenções `types/`, `services/`, `pages/`

---

## Fase A0 - Auditoria e Matriz de Adoção

### Objetivo

Descobrir onde a SPA ainda repete elementos que já deveriam estar encapsulados em `Ds*`.

### Subfase A0.1 - Inventário de uso atual

Levantar, página por página:

- onde `DsButton` já está em uso
- onde `DsInput` já está em uso
- onde `DsCard` já está em uso
- onde `DsAlert` já está em uso
- onde `DsBadge` ou wrapper equivalente já está em uso
- onde `DsModal` já está em uso
- onde `DsSpinner` já está em uso

### Subfase A0.2 - Mapa de duplicação

Catalogar os principais blocos repetidos:

- cabeçalhos de página
- seções de formulário
- cartões de detalhe
- alertas de erro/sucesso
- botões de ação primária/secundária
- labels de status
- modais simples de confirmação

### Subfase A0.3 - Priorização por lote

Classificar páginas em:

- `Lote 1`: alta repetição, baixo risco, alto ganho imediato
- `Lote 2`: média repetição, dependem de pequeno hardening dos componentes
- `Lote 3`: casos especiais, dependem de wrapper composto ou evolução posterior

### Entregáveis reais da fase

- inventário de adoção atual
- mapa de duplicação de UI
- lista priorizada de páginas por lote
- lista de gaps de API dos componentes

### Checklist

- [ ] páginas auditadas
- [ ] uso atual dos `Ds*` inventariado
- [ ] repetições de UI mapeadas
- [ ] lotes de adoção definidos
- [ ] gaps dos componentes documentados

---

## Fase A1 - Hardening dos Componentes Vue Base

### Objetivo

Garantir que os componentes base estejam maduros o suficiente para adoção ampla.

### Componentes foco

- `DsButton`
- `DsInput`
- `DsCard`
- `DsAlert`
- `DsBadge`
- `DsModal`
- `DsSpinner`
- `DsTabs`

### Subfase A1.1 - Revisão de API

Conferir em cada componente:

- props
- slots
- emits
- variants
- tamanhos
- loading/disabled/error
- compatibilidade com uso real da SPA

### Subfase A1.2 - Revisão de acessibilidade

Conferir:

- labels e associação com campos
- `aria-*`
- foco visível
- navegação por teclado quando aplicável
- semântica dos botões, modais e tabs

### Subfase A1.3 - Revisão de estilo

Alinhar:

- spacing
- hierarquia visual
- consistência com tokens
- estados hover/focus/disabled
- dark/light compatibility, quando já suportado

### Subfase A1.4 - Testes dos componentes

Criar ou ampliar testes cobrindo:

- renderização básica
- comportamento por variante
- estados especiais
- interações principais
- acessibilidade funcional básica

### Entregáveis reais da fase

- componentes endurecidos
- testes dos componentes Vue
- API pública documentada ou revisada

### Checklist

- [ ] API pública validada
- [ ] acessibilidade revisada
- [ ] variantes revisadas
- [ ] testes criados
- [ ] documentação revisada

---

## Fase A2 - Adoção Ampla nas Páginas da SPA

### Objetivo

Substituir markup local repetido por componentes `Ds*` em páginas reais já migradas.

### Lote A2.1 - Shell e páginas de entrada

Páginas foco:

- `LoginPage`
- `DashboardPage`
- elementos reutilizáveis do shell visual

### Lote A2.2 - Form pages

Páginas foco:

- `OwnerFormPage`
- `PatientFormPage`
- `AppointmentFormPage`
- `EncounterFormPage`
- `Triage` form pages, se houver encaixe simples

### Lote A2.3 - Detail pages

Páginas foco:

- `OwnerDetailPage`
- `PatientDetailPage`
- `EncounterDetailPage`
- `BillingDetailPage`
- `MedicalRecordsDetailPage`

### Subfase A2.1 - Refactor de formulários

Padronizar com `DsInput`, `DsButton`, `DsAlert` e `DsCard`:

- labels
- hints
- errors
- campos select/textarea
- footer de ações

### Subfase A2.2 - Refactor de detalhes

Padronizar com `DsCard`, `DsBadge`, `DsAlert`, `DsModal`:

- blocos de detalhe
- cabeçalhos de seção
- alertas contextuais
- badges de status
- modais de confirmação simples

### Subfase A2.3 - Refactor de feedback visual

Padronizar:

- mensagens de erro
- mensagens de sucesso
- warnings
- loading states pequenos

### Entregáveis reais da fase

- páginas reais usando `Ds*`
- redução mensurável de duplicação de markup/CSS
- consistência visual mais alta entre módulos

### Checklist

- [ ] páginas do lote 1 migradas
- [ ] formulários prioritários usando `DsInput` e `DsButton`
- [ ] alertas padronizados com `DsAlert`
- [ ] cards de detalhe padronizados com `DsCard`
- [ ] badges de status alinhados com `DsBadge`
- [ ] modais simples usando `DsModal`
- [ ] regressão visual revisada

---

## Fase A3 - Componentes Compostos e Wrappers de Aplicação

### Objetivo

Criar wrappers reutilizáveis da aplicação para padrões que aparecem repetidamente em várias páginas.

### Exemplos esperados

- `AppPageHeader`
- `AppFormSection`
- `AppDetailSection`
- `AppStatusPill`
- `AppConfirmModal`

### Subfase A3.1 - Identificação de padrões compostos

Selecionar padrões que apareçam em pelo menos 3 páginas.

### Subfase A3.2 - Extração dos wrappers

Criar wrappers leves, sem acoplamento forte a domínio.

### Subfase A3.3 - Adoção seletiva

Aplicar wrappers nas páginas de maior retorno.

### Entregáveis reais da fase

- 2 a 5 wrappers compostos
- menos repetição estrutural
- melhor consistência de layout e interação

### Checklist

- [ ] padrões compostos identificados
- [ ] wrappers criados
- [ ] wrappers adotados
- [ ] testes mínimos criados quando aplicável

---

## Fase A4 - Validação, Documentação e Gate de Pronto

### Objetivo

Fechar a frente com evidência técnica, documentação e backlog residual claro.

### Entregáveis reais

- testes atualizados
- documentação do design system Vue revisada
- lista de páginas ainda fora da adoção
- backlog residual priorizado

### Checklist

- [ ] `typecheck` limpo
- [ ] testes de componentes passando
- [ ] testes da SPA passando
- [ ] visual regression sem regressões relevantes
- [ ] documentação atualizada
- [ ] backlog residual documentado

---

## Critério de pronto da Equipe A

A frente será considerada concluída quando:

- os componentes `Ds*` base estiverem maduros e testados
- páginas prioritárias estiverem adotando esses componentes
- houver redução concreta de markup/CSS duplicado
- a camada Vue do design system estiver claramente estabelecida como base da SPA

## Entregáveis obrigatórios consolidados

- componentes Vue endurecidos
- testes dos componentes Vue
- adoção ampliada em páginas reais
- wrappers compostos, se houver ganho claro
- documentação atualizada

## Riscos

- adoção ampla demais gerar regressão visual
- API dos componentes ainda não estar madura para todos os cenários
- conflito com equipes mexendo nas mesmas páginas

## Mitigações

- adoção por lotes
- testes e visual regression após cada lote
- componentes maduros primeiro
- coordenação semanal de áreas compartilhadas

## Indicadores de sucesso

- número de páginas convertidas para `Ds*`
- redução de CSS local repetido
- redução de markup duplicado
- aumento da cobertura de testes dos componentes Vue

## Próximo passo natural após esta frente

Após essa frente, o caminho natural é:

- ampliar port de componentes mais avançados para Vue
- evoluir wrappers compostos
- reduzir ainda mais a dependência de markup local nas páginas de produto
