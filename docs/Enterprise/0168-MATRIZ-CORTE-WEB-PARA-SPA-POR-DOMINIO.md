# 0168 - Matriz de Corte Web para SPA por Dominio

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0158-MATRIZ-ROTAS-WEB-TO-SPA.md](./0158-MATRIZ-ROTAS-WEB-TO-SPA.md) e [0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)

---

## 1. Objetivo

Estabelecer um corte por dominio para reduzir o risco operacional da transicao de `apps/web` para `apps/spa`, sem criar vacuo de uso.

---

## 2. Regra geral

| Estado | Significado |
|---|---|
| `web somente` | ainda depende do legado e nao pode ser cortado |
| `web + spa em convivio` | existe cobertura no SPA, mas o corte ainda nao ocorreu |
| `spa oficial` | o SPA e a rota preferida e o web nao e mais o caminho principal |
| `web desligado` | o dominio foi migrado e o legado nao participa mais do fluxo |

---

## 3. Matriz por dominio

| Dominio | Estado atual | Estado alvo | Condicao para corte |
|---|---|---|---|
| Shell / Navegacao | spa oficial | web desligado | menu, contexto, favoritos e recentes completos |
| Dashboard | spa oficial | web desligado | KPIs, atalhos e recortes por perfil |
| Owners | spa oficial | web desligado | list/detail/form com contexto premium |
| Patients | spa oficial | web desligado | detalhe rico e fluxo de criacao confiavel |
| Scheduling / Queue | spa oficial | web desligado | agenda, fila e formulario sem divergencia |
| Encounters | spa oficial | web desligado | abertura, detalhe e fluxo diario cobertos |
| Medical Records | spa oficial | web desligado | linha do tempo e acesso a historico |
| Triage | spa oficial | web desligado | ajuste controlado e status claro |
| Inpatient | spa oficial | web desligado | setores, leitos e mapa funcionais |
| Diagnostics | spa oficial | web desligado | resumo executivo e contexto clinico |
| Surgery | spa oficial | web desligado | status e acompanhamento integrados |
| Prescriptions | spa oficial | web desligado | prescricao e execucao no SPA |
| Billing / Cash | spa oficial | web desligado | leitura financeira, caixa e fluxo fechado |
| Inventory | spa oficial | web desligado | consumo e reflexo de estoque |
| Governance | spa oficial | web desligado | access-control, users e audit no SPA |
| Platform / Integrations | spa oficial | web desligado | api keys, api client, webhooks e notificacoes |
| Commercial | spa oficial | web desligado | produtos, servicos, vendas e orcamentos |

---

## 4. Sequencia de corte recomendada

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

O `apps/web` pode ser removido da trilha operacional apenas quando:

- todos os dominios acima estiverem em `web desligado`
- a matriz de rotas estiver concluida
- nenhum fluxo critico ainda depender do legado
- o deploy oficial do produto estiver totalmente centrado no `apps/spa`
