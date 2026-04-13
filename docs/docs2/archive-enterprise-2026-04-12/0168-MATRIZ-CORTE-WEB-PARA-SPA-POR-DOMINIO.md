# 0168 - Matriz de Corte Web para SPA por Dominio

**Status:** completo
**Data de validacao:** 2026-04-12
**Base:** [0158-MATRIZ-ROTAS-WEB-TO-SPA.md](./0158-MATRIZ-ROTAS-WEB-TO-SPA.md) e [0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)

---

## 1. Objetivo

Estabelecer um corte por dominio para reduzir o risco operacional da transicao de `apps/web` para `apps/spa`, sem criar vacuo de uso e sem introduzir novas entregas no legado.

---

## 2. Regra geral

| Estado | Significado |
|---|---|
| `web somente` | ainda depende do legado e nao pode ser cortado |
| `web + spa em convivio` | existe cobertura no SPA, mas o corte ainda nao ocorreu |
| `spa oficial` | o SPA e a rota preferida e o web nao e mais o caminho principal |
| `web desligado` | o dominio foi migrado e o legado nao participa mais do fluxo |

Regra operacional: a fase de convivio foi encerrada. `apps/web` nao participa mais do fluxo oficial e nao recebe novos ajustes funcionais.

---

## 3. Matriz por dominio

| Dominio | Estado final | Evidencia principal | Validado em |
|---|---|---|---|
| Shell / Navegacao | web desligado | shell premium, contexto, favoritos, recentes e command palette no SPA | 2026-04-12 |
| Dashboard | web desligado | KPIs operacionais, atalhos e widgets no SPA | 2026-04-12 |
| Owners | web desligado | list/detail/form premium no SPA | 2026-04-12 |
| Patients | web desligado | hub assistencial, detalhe e formularios no SPA | 2026-04-12 |
| Scheduling / Queue | web desligado | agenda, fila operacional e formulario no SPA | 2026-04-12 |
| Encounters | web desligado | abertura, detalhe e transicoes no SPA | 2026-04-12 |
| Medical Records | web desligado | linha do tempo clinica e detalhe de prontuario no SPA | 2026-04-12 |
| Triage | web desligado | lista, detalhe e historico de alteracoes no SPA | 2026-04-12 |
| Inpatient | web desligado | internacao, setores, leitos e bed board no SPA | 2026-04-12 |
| Diagnostics | web desligado | solicitacoes, resultados e resumo no SPA | 2026-04-12 |
| Surgery | web desligado | status e acompanhamento cirurgico no SPA | 2026-04-12 |
| Prescriptions | web desligado | prescricao e execucao no SPA | 2026-04-12 |
| Billing / Cash | web desligado | faturamento, caixa e leitura financeira no SPA | 2026-04-12 |
| Inventory | web desligado | estoque, detalhe e formulario no SPA | 2026-04-12 |
| Governance | web desligado | access-control, users, staff e audit no SPA | 2026-04-12 |
| Platform / Integrations | web desligado | api keys, api client, webhooks e notificacoes no SPA | 2026-04-12 |
| Commercial | web desligado | produtos, servicos, vendas, orcamentos e relatorios no SPA | 2026-04-12 |

---

## 4. Sequencia de corte executada

### Lote 1 - Shell e entrada

1. dashboard
2. navegacao
3. favoritos e recentes

### Lote 2 - Core diario

1. owners
2. patients
3. scheduling
4. queue
5. encounters

### Lote 3 - Assistencial

1. medical-records
2. triage
3. inpatient
4. diagnostics
5. surgery
6. prescriptions

### Lote 4 - Governanca e plataforma

1. access-control
2. users
3. staff
4. audit
5. notifications
6. api keys
7. webhooks
8. api client

### Lote 5 - Comercial

1. billing
2. cash
3. products
4. services
5. counter-sales
6. quotes
7. commercial-reports
8. inventory

---

## 5. Checklist de corte por dominio

Para marcar um dominio como `web desligado`, confirmar:

1. rota equivalente existe no `apps/spa`
2. fluxo principal funciona sem redirecionamento manual
3. testes minimos do dominio passam
4. a documentacao viva aponta para o SPA
5. o web nao recebe mais ajuste de produto
6. o dominio nao aparece como dependente do legado em nenhum plano ativo

---

## 6. Sinalizadores de risco

| Sinal | Interpretacao |
|---|---|
| rotina critica ainda abre no web | corte adiado |
| doc viva ainda manda o usuario para o web | documentacao fora de sincronia |
| rota do SPA sem cobertura equivalente | backlog de corte ainda aberto |
| duplicidade de tela ativa | convivencia nao resolvida |

---

## 7. Condicao final

O `apps/web` saiu da trilha operacional oficial porque:

- todos os dominios acima estao em `web desligado`
- a matriz de rotas foi encerrada
- nenhum fluxo critico permanece dependente do legado
- o deploy oficial do produto esta centrado no `apps/spa`
