# Checkpoint técnico — segunda camada de breadcrumbs e taxonomia Vetus-aligned

Data: 2026-04-22
Status: concluído
Escopo: consolidação da segunda camada de breadcrumbs, fechamento da coerência shell > rota > página e separação entre acabamento estrutural e próxima expansão real

## 1. Objetivo deste checkpoint

Registrar que a frente principal de convergência estrutural do SPA deixou de ser um trabalho disperso de breadcrumb e passou a um estado estável o suficiente para liberar a próxima onda de materialização de domínio.

## 2. O que foi fechado nesta camada

## 2.1 Contrato, shell e navegação

A base estrutural já está estável em:
- `docs/navigation-contract-vetus-aligned.md`
- `docs/navigation-matrix-current-vs-target.md`
- `docs/navigation-copy-and-breadcrumb-conventions.md`
- `docs/routine-state-model.md`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/components/AppPageHeader.vue`

Resultado prático:
- a árvore principal do ERP está explícita no shell;
- a topbar comunica contexto e hierarquia;
- a sidebar prioriza a navegação operacional;
- `AppPageHeader` padroniza breadcrumbs explícitos dentro das páginas.

## 2.2 Blocos operacionais já convergidos com breadcrumbs explícitos

Início:
- `DashboardPage.vue`

Atendimento:
- agenda e comandas;
- pacientes, tutores e serviços;
- encounters, triage, clinical e medical-records;
- internação, setores, leitos e mapa de leitos.

Laboratório:
- hub, pedidos, resultados, equipamentos, tipos de laudo e valores de referência.

Estoque:
- controles de estoque;
- produtos;
- bloco fiscal.

Financeiro:
- faturamento;
- caixa/gaveta;
- PIX;
- cadastros iniciais do financeiro.

RH:
- usuários;
- equipe;
- comissões e folgas.

Marketing e integrações:
- notificações;
- WhatsApp operacional;
- webhooks.

Relatórios:
- hub executivo existente;
- relatórios por domínio já materializados.

## 2.3 Auditoria objetiva do estado atual

Auditoria executada no diretório `apps/spa/src/pages`:
- páginas `.vue` com `AppPageHeader`: auditadas
- páginas com `AppPageHeader` sem breadcrumb explícito: `0`

Leitura executiva:
- a segunda camada deixou de ter lacunas relevantes de breadcrumb nas superfícies principais;
- o problema restante já não é orientação estrutural da UI;
- o valor incremental agora vem mais de expansão de domínio do que de acabamento visual.

## 3. O que ainda resta, separado corretamente

## 3.1 Acabamento residual

Itens residuais de acabamento que podem ser tratados em trilhas próprias, sem bloquear expansão de domínio:
- estabilização dos warnings intermitentes de teardown no Vitest;
- revisão fina de superfícies enterprise quanto a profundidade funcional, não mais quanto a breadcrumb básico;
- cobertura adicional de testes para páginas novas quando o domínio ganhar lógica real.

## 3.2 Expansão estrutural de verdade

Agora entram como prioridade real:
- `Estoque > Cadastrados adicionais`
  - Fornecedores
  - Fabricantes
  - Grupos de Produto
  - Estoques
- depois:
  - `Financeiro > Cadastros` adicionais remanescentes
  - `Relatórios > Produção`
  - superfícies enterprise ainda rasas

## 4. Mudança oficial de critério de prioridade

Até aqui, o driver principal foi:
- coerência entre shell, rota, breadcrumb e hierarquia.

A partir deste checkpoint, o driver principal passa a ser:
- materializar seções que a navegação já promete, mas que ainda estão rasas ou sub-representadas.

Em termos executivos:
- a fase de convergência visual e taxonômica principal está suficientemente madura;
- a próxima percepção de valor do produto vem de profundidade estrutural de domínio.

## 5. Próximo passo correto após este checkpoint

O próximo passo correto é abrir o lote:
- `Estoque > Cadastrados adicionais`

Motivos:
- o benchmark Vetus mostra esse bloco como funcionalmente relevante;
- o domínio de estoque já está forte em controles e fiscal, mas ainda incompleto em cadastros mestre;
- essa expansão melhora a leitura de ERP maduro mais do que continuar polindo breadcrumbs isolados.

## 6. Evidência de validação da camada estrutural

Suítes usadas como referência de estabilidade recente:
- `src/navigation.test.ts`
- `src/router/routes.test.ts`
- `src/components/__tests__/AppPageHeader.test.ts`
- blocos por domínio em inventory, users, notifications, webhooks, assistencial e clínico

Estado operacional desta camada:
- navegação estrutural coerente
- rotas coerentes
- breadcrumbs explícitos disseminados
- shell consolidado

## 7. Conclusão executiva

A segunda camada pode ser considerada fechada do ponto de vista de arquitetura de informação do SPA.

O projeto não está “terminado”, mas saiu definitivamente de um estado de desalinhamento estrutural para um estado de expansão guiada por domínio.

Esse checkpoint muda a natureza do trabalho seguinte:
- antes: corrigir comunicação estrutural;
- agora: construir profundidade real nas áreas já previstas pela taxonomia.
