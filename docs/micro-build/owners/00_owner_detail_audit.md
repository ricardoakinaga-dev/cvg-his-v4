# Auditoria da Tela de Detalhe do Cliente/Tutor

Data: 2026-04-28
Escopo: `/owners/:id`, com referência operacional em `/owners/owner_maria_silva`
Status: auditoria técnica, sem implementação

## Regra desta etapa

Esta auditoria não altera código, banco, API, componentes ou comportamento. As recomendações abaixo devem ser executadas em microtarefas futuras, pequenas, rastreáveis e reversíveis.

## Evidências usadas

- Frontend: `apps/spa/src/pages/owners/OwnerDetailPage.vue`.
- Rota SPA: `apps/spa/src/router/routes.ts`.
- Serviços frontend: `apps/spa/src/services/owner.ts`, `patient.ts`, `appointment.ts`, `encounter.ts`, `billing.ts`, `quotes.ts`.
- Backend: `apps/api/src/routes/owners-routes.ts`, `patients-routes.ts`, rotas relacionadas de agenda, billing, quotes, counter-sales, audit e notificações.
- Tipos: `apps/spa/src/types/owner.ts`, `packages/shared/types/src/index.ts`, `packages/shared/contracts/src/index.ts`.
- Documento Vetus de referência: `docs/vetus/guides/2026-04-27-relatorio-prontuario-cliente-animal-autorizados.md`.
- URL pública: `https://his.centroveterinarioguarapiranga.com/owners/owner_maria_silva` respondeu HTML da SPA com HTTP 200. A inspeção visual por Playwright não pôde ser executada porque a extensão MCP não está instalada no Chrome local; portanto a auditoria visual é baseada no código renderizado e em evidências documentais existentes.

## Diagnóstico executivo

A tela atual tenta ser cadastro, hub operacional, CRM, financeiro, mensageria, fidelidade e recomendador comercial ao mesmo tempo. O resultado é uma página longa, com muitos cards de peso visual semelhante, dados repetidos e ações misturadas sem prioridade operacional clara.

Principais achados:

- O topo tem quatro CTAs fortes, incluindo duas ações primárias lado a lado, sem deixar clara a ação principal do atendente.
- Ações rápidas duplicam ações do header e algumas perdem contexto do tutor, como `Animais Cadastrados` apontando para `/patients` sem filtro e `Abrir Comanda` apontando para `/counter-sales` sem `ownerId`.
- O bloco cadastral expõe seis cards abertos de uma vez, incluindo campos administrativos e importação Vetus no mesmo nível de prioridade de dados de contato.
- Há duplicidade de financeiro, pontos, orçamentos e comandas em cards diferentes.
- `Gerar orçamento-base` e `Criar orçamento` executam criação via API sem confirmação, pré-visualização ou explicação do payload.
- Algumas métricas são derivadas no frontend com fórmulas locais, como `loyaltyPoints`, `redeemableValue`, `crmStage` e `packageRecommendations`; a origem não fica clara para usuário nem para manutenção.
- Não há abas, accordion ou navegação interna para separar leitura rápida, cadastro, pets, histórico, financeiro, comunicação e auditoria.
- Existem estados vazios simples em alguns cards, mas sem ações contextuais consistentes.
- Loading é global e raso; erros parciais existem apenas para summary, billing e quotes, mas não para agenda/atendimentos/pets.
- Documentos/anexos, logs/auditoria e observações internas aparecem ausentes como blocos próprios.

## Fluxo esperado do usuário

Um atendente ou veterinário deveria conseguir nesta tela:

- Visualizar identidade e contato principal do tutor sem rolagem.
- Editar dados do tutor.
- Ver pets vinculados e abrir ficha de cada pet.
- Iniciar novo atendimento para pet específico.
- Criar agendamento contextualizado pelo tutor e, quando possível, pelo pet.
- Abrir ou iniciar comanda contextualizada.
- Consultar histórico recente de atendimentos.
- Consultar situação financeira e pendências.
- Ver documentos/anexos vinculados ao tutor.
- Ver alertas importantes antes de agir.
- Registrar ou consultar observações internas.
- Entrar em contato por WhatsApp, telefone ou e-mail.
- Ver auditoria/logs do cadastro e das ações relevantes.

## Conclusão

A tela deve ser reorganizada antes de novas funcionalidades. O caminho mais seguro é preservar regras de negócio e dados atuais na primeira fase, mudar apenas hierarquia visual, agrupamento, labels e contexto das ações. Integrações novas ou refinadas devem vir depois, em endpoints específicos e com critérios de aceite próprios.
