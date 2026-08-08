# Checkpoint final — fase estrutural Vetus-aligned

Data: 2026-04-22
Status: consolidado
Escopo: shell, taxonomia, breadcrumbs, ondas estruturais de domínio, relatórios por domínio e console enterprise

## 1. Objetivo deste checkpoint

Consolidar o encerramento da fase estrutural do SPA do CVG-HIS V2 depois das ondas de alinhamento ao benchmark Vetus, registrando:
- o que efetivamente convergiu;
- o que já está validado por teste;
- o que ainda resta como dívida técnica ou funcional;
- e por que o próximo passo correto passa a ser estabilização + cobertura.

## 2. Resultado macro da fase estrutural

A fase estrutural entregou convergência real em cinco camadas:

1. contrato documental;
2. shell e layout;
3. navegação e rotas;
4. breadcrumbs explícitos;
5. materialização inicial dos ramos ainda rasos da taxonomia.

Em termos executivos:
- o produto deixou de parecer uma SPA com rotas dispersas;
- passou a comunicar uma arquitetura de informação ERP coerente;
- e ganhou profundidade mínima honesta nos ramos que antes estavam semanticamente prometidos, porém vazios.

## 3. O que ficou estruturalmente fechado

## 3.1 Contrato de navegação e convenções

Documentos-base já existentes e válidos:
- `navigation-contract-vetus-aligned.md`
- `navigation-matrix-current-vs-target.md`
- `navigation-copy-and-breadcrumb-conventions.md`
- `routine-state-model.md`

Resultado:
- domínio > subdomínio > rotina ficou explícito;
- labels e breadcrumbs passaram a ter convenção formal;
- a refatoração deixou de ser subjetiva e passou a ser auditável.

## 3.2 Shell

Arquivos-chave convergidos:
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/components/AppPageHeader.vue`

Resultado:
- topbar com hierarquia mais clara;
- sidebar priorizando espinha operacional;
- enterprise, favoritos e recentes com peso visual mais adequado;
- `AppPageHeader` como ponto padrão de breadcrumb explícito.

## 3.3 Rotas e navegação

Arquivos-chave convergidos:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.test.ts`

Resultado:
- macrodomínios do ERP alinhados;
- parents de breadcrumb reancorados na taxonomia correta;
- console enterprise deixou de ficar preso ao dashboard genérico;
- relatórios por domínio passaram a existir como decomposição real.

## 3.4 Breadcrumbs explícitos

Leitura do estado atual:
- as superfícies principais do core ERP foram alinhadas;
- a segunda camada principal foi fechada;
- auditoria final feita no diretório `apps/spa/src/pages` não indicou lacunas relevantes de `AppPageHeader` sem breadcrumbs explícitos nas páginas priorizadas.

## 3.5 Ondas estruturais materializadas

Ondas concluídas nesta fase:
- `Estoque > Cadastrados adicionais`
- `Financeiro > Cadastros remanescente`
- `Relatórios > Produção`
- `Console Enterprise`

Resultado:
- estoque ganhou fornecedores, fabricantes, grupos de produto e estoques;
- financeiro ganhou cartões e custos/despesas;
- relatórios ganharam produção;
- enterprise ganhou enquadramento taxonômico coerente.

## 4. Leitura consolidada por domínio

## 4.1 Núcleo ERP

Hoje já está estruturalmente forte em:
- Atendimento
- Laboratório
- Estoque
- Financeiro
- RH
- Relatórios

Isso não significa backend completo em tudo, mas significa que o shell já comunica corretamente a intenção do produto.

## 4.2 Console Enterprise

Hoje já está estruturalmente organizado em:
- Governança
- Integrações
- Utilidades

Com enquadramento explícito para:
- access-control
- audit
- lgpd
- api-client
- api-keys
- master-search
- webhooks

## 5. Evidência de validação

Suítes estruturais e slices de domínio foram executadas ao longo da fase.

Validações recentes relevantes:
- relatórios por domínio: verdes
- enterprise surfaces: verdes
- finance catalogs: verdes
- inventory catalogs: verdes
- testes estruturais de navegação e rotas: verdes

Rodada final recente observada:
- `npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts`
- resultado: `Test Files 3 passed (3)` e `Tests 21 passed (21)`

## 6. Dívidas técnicas remanescentes

## 6.1 Warning recorrente do store auth

Evidência observada em teste:
- warning Pinia sobre conflito de nome em `pendingMfaUserId`

Arquivo implicado:
- `apps/spa/src/stores/auth.ts`

Causa aparente:
- existe propriedade de state e getter com o mesmo nome:
  - `pendingMfaUserId` no state
  - `pendingMfaUserId` nos getters

Leitura:
- não bloqueia a suíte hoje;
- mas é ruído técnico real e deve entrar como item de estabilização.

## 6.2 Cobertura desigual

Apesar da base estrutural estar forte, a cobertura automatizada ainda é desigual:
- algumas páginas têm teste dedicado;
- outras dependem apenas de validação estrutural mais superficial.

## 6.3 Maturidade funcional ainda heterogênea

Alguns ramos agora estão bem representados na taxonomia, porém ainda com implementação inicial:
- relatórios de produção;
- cards/expenses no financeiro;
- cadastros novos de estoque;
- algumas integrações enterprise dependem de backend real para amadurecer.

## 7. Critério oficial de encerramento da fase estrutural

A fase estrutural pode ser considerada suficientemente encerrada porque:
- a arquitetura de informação foi congelada e implementada;
- o shell está alinhado à taxonomia-alvo;
- os breadcrumbs principais foram disseminados;
- os ramos mais rasos ganharam superfícies reais;
- o console enterprise foi reancorado corretamente;
- os testes estruturais relevantes seguem verdes.

## 8. Recomendação para a próxima fase

O próximo passo correto deixa de ser nova grande onda estrutural.

A recomendação oficial passa a ser:
- abrir uma frente de estabilização + cobertura
antes da próxima expansão funcional pesada.

Motivos:
- o maior ganho marginal agora está em robustez;
- a base já ficou larga o suficiente para justificar consolidação;
- reduzir ruído de teste e ampliar cobertura diminui risco da próxima fase funcional.

## 9. Conclusão executiva

O SPA do CVG-HIS V2 saiu de um estado de desalinhamento estrutural difuso e entrou em um estado de arquitetura significativamente mais madura, com taxonomia, shell, breadcrumbs e domínios principais muito mais coerentes com o benchmark Vetus.

A partir daqui, o projeto deve ser tratado menos como refatoração estrutural e mais como consolidação técnica seguida de aprofundamento funcional orientado por valor.