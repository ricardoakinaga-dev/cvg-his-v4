# MATRIZ DE FECHAMENTO DO GAP FRONTEND VS BACKEND

**Data:** 10/04/2026
**Status:** EXECUTADO - lotes 1 e 2 concluidos
**Objetivo:** transformar o descompasso entre modulos do backend e cobertura da SPA em um plano de construcao executavel

---

## 1. Diagnostico Consolidado

O problema atual nao e uma falha isolada.
O problema e estrutural:

- o backend avancou para cerca de 35 modulos;
- a SPA cobre apenas o nucleo operacional principal;
- varios modulos ja possuem logica, contratos e testes no backend, mas ainda nao possuem superficie Vue correspondente.

Isso gera 3 efeitos:

1. o produto aparenta estar menos completo do que o backend realmente esta;
2. capacidades enterprise ficam inacessiveis para operadores;
3. o roadmap de produto perde simetria entre API e experiencia operacional.

---

## 2. Cobertura Atual da SPA

Cobertura claramente presente hoje:

- Dashboard
- Tutores
- Pacientes
- Atendimentos
- Agenda
- Fila
- Triagem
- Prontuario
- Internacao
- Faturamento
- Estoque
- Usuarios
- Webhooks

Conclusao:

- a SPA cobre bem o nucleo clinico-operacional;
- a camada administrativa, comercial, integracoes e modulos transversais ainda esta sub-representada.

---

## 3. Nem Todo Modulo Precisa de Uma Tela Dedicada

O gap existe, mas ele precisa ser classificado corretamente.

### Grupo A — Devem ganhar superficie frontend propria

Modulos com alto potencial de operacao direta na SPA:

- `api-keys`
- `auth`
- `cash`
- `counter-sales`
- `diagnostics`
- `discharges`
- `pix`
- `prescriptions`
- `prescription-executions`
- `products`
- `quotes`
- `services`
- `staff`
- `surgery`

### Grupo B — Devem aparecer como capacidades embutidas ou telas administrativas

Modulos que podem entrar como subfluxo, painel, configuracao ou secao de detalhe:

- `attachments`
- `mfa`
- `notifications`
- `notifications-whatsapp`

### Grupo C — Nao exigem SPA propria como prioridade

Modulos majoritariamente de infraestrutura, seguranca, compliance ou backbone:

- `access-control`
- `audit`
- `event-bus`
- `lgpd`
- `ml`
- `soc2`

### Grupo D — Ja cobertos ou parcialmente cobertos pela SPA atual

- `billing`
- `encounters`
- `inpatient`
- `inventory`
- `owners`
- `patients`
- `scheduling`
- `triage`
- `users`
- `webhooks`
- `medical-records`

---

## 4. Decisao de Produto

O fechamento do gap nao deve tentar criar frontend para os 35 modulos de uma vez.

A estrategia correta e:

1. priorizar os modulos do Grupo A com maior valor operacional imediato;
2. incorporar Grupo B nos fluxos existentes;
3. tratar Grupo C como backend-first, com documentacao e observabilidade, sem exigir SPA dedicada agora.

---

## 5. Ordem Recomendada de Construcao

### Fase FEA-1 — Administracao e Integracoes

Construir primeiro:

- `api-keys`
- `auth` / `mfa`
- `notifications`
- `notifications-whatsapp`

Motivo:

- fecha a superficie externa e administrativa;
- aproxima a SPA do padrao enterprise ja implementado no backend;
- reduz dependencia de uso via API bruta.

### Fase FEA-2 — Comercial e Financeiro

Construir em seguida:

- `cash`
- `counter-sales`
- `pix`
- `quotes`

Motivo:

- conecta a trilha financeira e comercial ao que ja existe em billing;
- aproveita a abertura do BLOCO 3 em integracoes e pagamentos.

### Fase FEA-3 — Assistencia Clinica Expandida

Construir depois:

- `diagnostics`
- `discharges`
- `prescriptions`
- `prescription-executions`
- `surgery`

Motivo:

- expande a cobertura clinica apos os fluxos centrais e financeiros;
- evita inflar a UI antes da base administrativa/comercial.

### Fase FEA-4 — Cadastro e Operacao Secundaria

Construir por fim:

- `products`
- `services`
- `staff`

Motivo:

- sao modulos importantes, mas dependem de convencoes de CRUD e catalogo ja maduras;
- entram melhor depois da consolidacao dos demais fluxos.

---

## 6. Tarefas de Construcao da Proxima Rodada

Esta rodada de execucao deve fazer 4 coisas:

### T1. Confirmar a matriz no codigo

Verificar no codigo da SPA:

- rotas existentes;
- paginas existentes;
- placeholders;
- modulos backend sem superficie correspondente.

### T2. Escolher o primeiro lote executavel

O primeiro lote recomendado e:

- `api-keys`
- `auth` / `mfa`
- `notifications`

Se houver capacidade adicional na mesma rodada:

- incluir `notifications-whatsapp`

### T3. Construir superficie real, nao mock

Para cada modulo do lote:

- criar rotas;
- criar paginas list/detail/form quando fizer sentido;
- integrar com API real;
- manter aderencia ao design system e aos gates da SPA;
- adicionar testes locais ou E2E minimos quando o fluxo justificar.

### T4. Atualizar a documentacao operacional

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- este arquivo

---

## 7. Criterio de Saida da Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- matriz frontend/backend confirmada no codigo;
- primeiro lote de modulos de interface escolhido sem ambiguidade;
- pelo menos parte desse lote materializada em rotas e paginas reais;
- documentacao coerente com o estado executado.

---

## 8. Resultado Esperado do Executor

O executor deve devolver:

- classificacao final dos modulos entre frontend proprio, frontend embutido e backend-only;
- primeiro lote escolhido;
- o que foi implementado em rotas/paginas/integracoes;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `GAP FRONTEND/BACKEND EM REDUCAO REAL`
  - ou `GAP FRONTEND/BACKEND AINDA SEM AVANCO MATERIAL`

---

## 9. Resultado da Rodada

- Classificacao final dos modulos: `api-keys`, `auth` / `mfa` e `notifications` entraram como superficie frontend propria; `notifications-whatsapp` permanece para rodada seguinte; `access-control` ficou como apoio de contrato para API keys.
- Lote escolhido: `api-keys`, `auth` / `mfa`, `notifications`
- Implementado: rota `/auth/mfa` com fluxo MFA real; rota `/api-keys` com listagem e criacao via API real; rota `/notifications` com listagem e processamento; nav da SPA exposta para os novos fluxos.
- Validacoes: `pnpm --filter @cvg-his-v2/spa typecheck` PASS, `pnpm --filter @cvg-his-v2/spa test` PASS, `pnpm --filter @cvg-his-v2/spa build` PASS, `pnpm test:visual` PASS, `pnpm test:e2e:spa` PASS.
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`, `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`, este documento.
- Decisao: `GAP FRONTEND/BACKEND EM REDUCAO REAL`

---

## 10. Rodada 2

- Classificacao final dos modulos: `notifications-whatsapp`, `pix`, `cash`, `counter-sales` e `quotes` ganharam superficie frontend real; a navegacao da SPA agora expõe esses fluxos.
- Lote escolhido: `notifications-whatsapp`, `pix`, `cash`, `counter-sales`, `quotes`
- Implementado: página `/notifications/whatsapp` com inbound real; página `/pix` com intent PIX real; página `/cash` com liquidação operacional apoiada por PIX; página `/counter-sales` com conversão real de orçamento em venda; página `/quotes` com workspace de criação, itens, ações e conversão.
- Validacoes: `pnpm --filter @cvg-his-v2/spa typecheck` PASS, `pnpm --filter @cvg-his-v2/spa test` PASS, `pnpm --filter @cvg-his-v2/spa build` PASS, `pnpm test:visual` PASS, `pnpm test:e2e:spa` PASS.
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`, `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`, este documento.
- Decisao: `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`

---

## 11. Rodada 3

- Lote executado: `diagnostics`, `prescriptions`, `prescription-executions`, `discharges`, `surgery`
- Implementado:
  - `/diagnostics` — workspace com selecao de atendimento, formulario de solicitacao diagnostica, anexos de resultado e timeline filtrada por `diagnostic_*`; integracao real via `diagnosticsService` que usa `medicalRecordsService` e `attachmentService`
  - `/prescriptions` — workspace clinico com selecao de atendimento, formulario de medicacao (nome, posologia, via, frequencia, observacoes), listagem de prescricoes vinculadas e lista de execucoes do atendimento; integracao real via `prescriptionsService` e `prescriptionExecutionsService`
  - `/prescription-executions` — operacao real com create, execute (administered), suspend, resume e log de eventos; painel de detalle com eventos da execucao; todos integrados via `prescriptionExecutionsService`
  - `/discharges` — trilha de alta com create e update real via `dischargeService` que usa contracts `CreateDischargeRequest`/`UpdateDischargeRequest`; formulario completo com tipo, desfecho, resumo clinico, instrucoes de continuidade e follow-up
  - `/surgery` — solicitacao cirurgica real com titulo, cirurgiao, agendamento, equipe e preparacao; listagem de cirurgias do atendimento e timeline filtrada por `surgery_*`; integracao via `surgeryService` e `medicalRecordsService`
- Rotas e paginas criadas: `/diagnostics` (DiagnosticsPage.vue), `/prescriptions` (PrescriptionsPage.vue), `/prescription-executions` (PrescriptionExecutionsPage.vue), `/discharges` (DischargesPage.vue), `/surgery` (SurgeryPage.vue) — todas em `apps/spa/src/pages/clinical/`
- Nav atualizada: `AppLayout.vue` expõe Diagnósticos, Prescrições, Execuções, Altas e Cirurgias com icones clínicos dedicados
- Validacoes: `pnpm --filter @cvg-his-v2/spa typecheck` PASS, `pnpm --filter @cvg-his-v2/spa test` PASS (497/497), `pnpm test:visual` PASS (9/9), `pnpm test:e2e:spa` PASS (22/22)
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, este documento, `0123-CONTINUIDADE-RODADA-3-GAP-FRONTEND-BACKEND-CLINICO-EXPANDIDO-2026-04-10.md`
- Decisao: `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`

---

## 12. Rodada 4

- Lote executado: `products`, `services`, `staff`
- Implementado:
  - `products` — superficie real com listagem (com busca), formulario (create/update) e detalhe; servicos SPA em `services/products.ts` com tipos propios; handlers de API `/products` (GET/POST) e `/products/{id}` (GET/PATCH) implementados no `server.ts`; integrados via `ProductsService` do modulo backend
  - `services` — superficie real com listagem (com busca), formulario (create/update) e detalhe; servicos SPA em `services/services.ts` com tipos propios; handlers de API `/services` (GET/POST) e `/services/{id}` (GET/PATCH) implementados no `server.ts`; integrados via `ServicesService` do modulo backend
  - `staff` — superficie real com listagem, formulario (create/update) e detalhe; servico SPA em `services/staff.ts` com `list()`, `getById()`, `create()`, `update()` e `toggleActive()`; handlers de API `/staff` e `/staff/{id}` ja existiam e foram validados; detalhe inclui botao de ativar/desativar
- Rotas e paginas criadas: `/products` (ProductsListPage), `/products/new` e `/products/:id/edit` (ProductFormPage), `/products/:id` (ProductDetailPage); `/services` (ServicesListPage), `/services/new` e `/services/:id/edit` (ServiceFormPage), `/services/:id` (ServiceDetailPage); `/staff` (StaffListPage), `/staff/new` e `/staff/:id/edit` (StaffFormPage), `/staff/:id` (StaffDetailPage)
- Nav atualizada: `AppLayout.vue` expõe Produtos, Serviços e Equipe com icones dedicados (📦, 🛠️, 👨‍⚕️)
- Validacoes: `pnpm --filter @cvg-his-v2/spa typecheck` PASS, `pnpm --filter @cvg-his-v2/spa test` PASS (497/497), `pnpm test:visual` PASS (9/9), `pnpm test:e2e:spa` PASS (22/22)
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0126-CONTINUIDADE-RODADA-4-GAP-FRONTEND-BACKEND-CADASTROS-OPERACIONAIS-2026-04-10.md`
- Decisao: `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
