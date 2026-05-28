# Guia Operacional - CVG-HIS v4 Premium Enterprise

Data: 2026-05-28

## 1. Objetivo

Este guia organiza o uso operacional do CVG-HIS v4 Premium Enterprise com base nas superficies que ja existem no sistema e nas entregas registradas nos relatorios de construcao futura.

O documento serve para:

- orientar demonstracoes executivas;
- apoiar piloto controlado;
- padronizar validacao funcional por modulo;
- reduzir dependencia de explicacao verbal durante homologacao;
- conectar as telas Premium aos gates tecnicos enterprise.

Escopo: uso da SPA, rotas operacionais, fluxo de suporte, governanca, auditoria, SLO, busca global e validacoes antes de demo/piloto.

## 2. Pre-condicoes para demo ou piloto

Antes de apresentar o produto como Premium Enterprise, executar os gates minimos abaixo:

| Gate | Comando | Resultado esperado |
|---|---|---|
| Typecheck SPA | `pnpm --filter @cvg-his-v2/spa typecheck` | Sem erros de TypeScript/Vue |
| OpenAPI | `pnpm validate:openapi` | Contrato HTTP valido |
| RLS multi-tenant | `pnpm validate:rls` | Politicas tenant obrigatorias validadas |
| Seguranca enterprise | `pnpm security:enterprise` | Sem vulnerabilidade critica/alta bloqueante |
| Backup operacional | `pnpm ops:backup:check` | Scripts e plano de restore validaveis |
| Deploy | `pnpm deploy:check` | Configuracao estatica de deploy valida |
| Helm | `pnpm validate:helm` | Manifests Helm validaveis |

Para homologacao completa, complementar com build, testes unitarios/integracao e fluxos E2E criticos.

## 3. Mapa de navegacao Premium

| Area | Rota | Uso operacional |
|---|---|---|
| Inicio executivo | `/` | Central executiva Premium, SLO, auditoria, lentes clinica/financeira/operacional/estoque |
| Recepcao | `/reception` | Entrada diaria, busca de tutor/paciente e acoes rapidas contextuais |
| Busca Mestre | `/master-search` | Busca federada por tutor, paciente, vinculo, produto e comanda |
| Tutor 360 | `/owners/:id` | Cockpit de tutor, pacientes, agenda, financeiro, alertas e proxima acao |
| Paciente | `/patients/:id` | Detalhe clinico e operacional do animal |
| Agenda | `/appointments` | Agendamentos e organizacao da rotina de atendimento |
| Comandas | `/counter-sales` | Operacao comercial assistida e fechamento de vendas |
| Internacao | `/inpatient` | Stays, ocorrencias, diarias e acompanhamento hospitalar |
| Diarias de internacao | `/inpatient/daily-charges` | Controle gerencial de diarias pendentes/faturadas |
| Estoque transacional | `/inventory/movements` | Ledger, movimentacoes e ajustes auditaveis |
| Financeiro executivo | `/dashboards/financial` | Indicadores financeiros e apoio gerencial |
| Auditoria | `/audit` | Eventos, cobertura operacional e evidencias |
| Cliente API | `/api-client` | Health check, SLO e apoio a integracoes |
| Governanca de acesso | `/access-control` | RBAC/ABAC, perfis, escopo e permissoes |
| Marketing | `/marketing/campaigns` | Segmentos, templates, campanhas e disparos rastreaveis |
| Laboratorio | `/laboratory/orders` e `/laboratory/results` | Pedidos, resultados, liberacao assinada e laudos |

## 4. Fluxos operacionais principais

### 4.1 Recepcao e entrada do paciente

1. Abrir `/reception`.
2. Buscar tutor ou paciente pelo termo disponivel.
3. Conferir os resultados retornados.
4. Usar as acoes rapidas contextuais para:
   - abrir cockpit do tutor;
   - abrir ficha do paciente;
   - acessar agenda;
   - seguir para check-in quando aplicavel;
   - abrir comanda quando a jornada comercial for necessaria.
5. Se a busca local nao resolver, usar o link para `/master-search`.

Resultado esperado: a recepcao encontra o contexto do atendimento sem navegar manualmente por varios modulos.

### 4.2 Gestao executiva diaria

1. Abrir `/`.
2. Validar a `Central executiva Premium`.
3. Conferir:
   - status de SLO;
   - cobertura de auditoria operacional;
   - eventos auditados;
   - prioridades do gestor.
4. Usar as `Lentes executivas` para navegar para:
   - clinica e internacao;
   - financeiro do dia;
   - operacao comercial;
   - estoque critico.
5. Ao identificar risco operacional, abrir `/api-client`, `/audit` ou o modulo de origem.

Resultado esperado: a lideranca inicia o dia com leitura consolidada e rotas claras de acao.

### 4.3 Busca global Premium

1. Abrir `/master-search`.
2. Digitar nome, documento, telefone, paciente, produto ou referencia de comanda.
3. Aguardar o estado `Carregando busca Premium...`.
4. Conferir resultados por dominio:
   - tutores;
   - pacientes;
   - vinculos tutor/paciente;
   - produtos;
   - comandas.
5. Se houver aviso de resultado parcial, seguir com os grupos carregados e registrar incidente para o dominio indisponivel.
6. Se todos os grupos falharem, tratar como incidente de API ou dependencia.

Resultado esperado: suporte, recepcao e gestao encontram entidades transversais sem depender de um unico cadastro.

### 4.4 Cockpit 360 tutor/paciente

1. Abrir `/owners/:id` a partir da lista, recepcao ou busca global.
2. Conferir o resumo do tutor.
3. Revisar:
   - pacientes vinculados;
   - agenda;
   - atendimento ativo;
   - financeiro;
   - alertas clinicos;
   - proxima acao sugerida.
4. Abrir `/patients/:id` quando a decisao exigir detalhe clinico do animal.

Resultado esperado: o usuario entende rapidamente a situacao do tutor e do paciente antes de agir.

### 4.5 Auditoria, SLO e operacao enterprise

1. Abrir `/api-client`.
2. Conferir status da API, historico local e leitura de SLO.
3. Abrir `/audit` para eventos e cobertura operacional.
4. Em caso de SLO degradado ou critico:
   - validar health/API;
   - verificar dominios afetados;
   - conferir eventos recentes de auditoria;
   - executar gates operacionais aplicaveis;
   - registrar incidente com horario, rota afetada e dominio.

Resultado esperado: problemas tecnicos deixam rastros verificaveis para suporte e governanca.

## 5. Procedimento de suporte para falha parcial

Falha parcial significa que parte dos dados carregou e parte falhou. O caso mais comum hoje e a Busca Mestre carregar alguns dominios e sinalizar falha em outros.

Conduta:

| Sintoma | Acao imediata | Escalonamento |
|---|---|---|
| Um dominio da busca falhou | Usar os resultados disponiveis e repetir a consulta | Verificar API do dominio afetado |
| Todos os dominios falharam | Tratar como indisponibilidade da busca/API | Abrir `/api-client` e registrar incidente |
| SLO degradado | Continuar operacao assistida com atencao | Acionar suporte tecnico |
| SLO critico | Evitar operacoes sensiveis ate confirmar estabilidade | Prioridade maxima de suporte |
| Auditoria sem cobertura esperada | Conferir modulo e acao executada | Abrir item de correcao enterprise |

## 6. Checklist de demo executiva

| Item | Status esperado |
|---|---|
| Gates minimos executados | Sem bloqueio P0 |
| `/` abre Central executiva Premium | Sim |
| Lentes executivas navegam para dominios reais | Sim |
| `/reception` mostra acoes rapidas contextuais | Sim |
| `/master-search` encontra tutor, paciente, produto e comanda | Sim |
| Falha parcial da busca e comunicada sem quebrar toda a tela | Sim |
| `/owners/:id` mostra cockpit 360 | Sim |
| `/audit` mostra eventos e cobertura operacional | Sim |
| `/api-client` mostra health/SLO | Sim |
| Fluxos criticos do piloto estao definidos | Sim |

## 7. Checklist de piloto controlado

| Area | Validacao |
|---|---|
| Recepcao | Buscar tutor/paciente e seguir por acao contextual |
| Atendimento | Abrir agenda, esteira, ficha do paciente e comanda quando aplicavel |
| Financeiro | Conferir dashboard financeiro, contas e conciliacao conforme escopo do piloto |
| Estoque | Consultar ledger em `/inventory/movements` e registrar ajuste auditavel |
| Laboratorio | Criar/acompanhar pedido, liberar resultado assinado e abrir laudo |
| Internacao | Conferir stay, ocorrencias e diarias |
| Governanca | Validar permissao por perfil e auditoria por acao sensivel |
| Operacao | Conferir SLO, backup/deploy gates e plano de suporte |

## 8. Criterio de pronto para Release Candidate

O guia operacional considera o produto pronto para Release Candidate apenas quando:

- os gates tecnicos da secao 2 estiverem verdes;
- os fluxos de demo executiva forem reprodutiveis;
- os fluxos de piloto controlado tiverem responsavel e evidencia;
- a auditoria operacional cobrir os modulos sensiveis;
- SLO, backup, restore e deploy tiverem evidencia atualizada;
- bugs P0/P1 de operacao forem zerados ou formalmente aceitos.

## 9. Lacunas ainda relevantes

Este guia documenta o que ja pode ser usado como superficie Premium. Ainda devem ser tratados como trilha de construcao:

- E2E completo dos fluxos criticos;
- cobertura minima consolidada do monorepo;
- padronizacao visual ampla do design system;
- onboarding assistido dentro da propria SPA;
- manual de implantacao por ambiente;
- runbook completo de rollback e restore testado em ambiente controlado;
- matriz final de paridade Vetus com nota acima de 88.

