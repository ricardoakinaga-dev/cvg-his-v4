# 0164 - Roadmap de Construcao Premium do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Objetivo:** orientar a construcao do CVG-HIS V2 com as diretrizes premium do Vetus-like, mantendo `apps/spa` como unico frontend oficial e proibindo novas entregas em `apps/web`.

---

## 1. Principios do roadmap

| Principio | Diretriz |
|---|---|
| Uma trilha oficial | nada de novo em `apps/web`; todo build novo vai para `apps/spa` |
| Um frontend canonico | `apps/spa` e a base oficial de longo prazo |
| Um shell coerente | menu por dominio, contexto, favoritos, recentes e CTA padrao |
| Um modulo = um hub | cada dominio deve expor KPI, alerta, acao e detalhe |
| Uma documentacao viva | docs devem seguir o codigo real e nao o contrario |
| Um backlog por impacto | prioridade por risco operacional, ganho funcional e corte de legado |

---

## 2. Horizonte estrategico

### Horizonte 1 - Consolidacao do shell premium

**Janela sugerida:** 0 a 30 dias

Objetivo:

- estabilizar o `apps/spa` como experiencia oficial
- padronizar shell, header, menu e linguagem de acao
- reduzir divergencia visual entre modulos

Entregas:

- shell consistente em todos os dominios
- breadcrumbs, favoritos e recentes em todos os fluxos
- dashboard com leitura operacional mais forte
- pages base de list/detail/form com padrao comum

### Horizonte 2 - Hubs operacionais por dominio

**Janela sugerida:** 30 a 90 dias

Objetivo:

- transformar paginas soltas em centros de dominio
- aprofundar densidade funcional dos modulos mais usados

Dominios prioritarios:

- tutores e pacientes
- agenda e fila
- atendimentos e prontuario
- triagem, internacao e leitos
- faturamento, caixa e estoque

### Horizonte 3 - Governanca e plataforma premium

**Janela sugerida:** 90 a 150 dias

Objetivo:

- consolidar administracao, auditoria, acessos, notificacoes, integracoes e operacao
- transformar a plataforma em algo governavel e explicavel

Dominios prioritarios:

- access-control
- users
- staff
- audit
- notifications
- api-client
- api-keys
- webhooks

### Horizonte 4 - Comercial e expansao de valor

**Janela sugerida:** 150 a 240 dias

Objetivo:

- fechar a camada comercial e analitica com leitura executiva
- elevar a percepcao de produto premium

Dominios prioritarios:

- products
- services
- counter-sales
- quotes
- commercial-reports
- billing
- cash
- inventory

### Horizonte 5 - Fechamento do legado e endurecimento

**Janela sugerida:** 240 dias em diante

Objetivo:

- concluir a desativacao operacional do `apps/web`
- reduzir o residual documental
- manter so uma trilha oficial de construcao

---

## 3. Roadmap por fase

| Fase | Foco | Entregas chave | Condicao de saida |
|---|---|---|---|
| F0 | Base viva | docs alinhadas, trilha oficial clara, decisoes sem ambiguidade | nenhuma duvida sobre frontend, deploy e cutover |
| F1 | Shell premium | navegacao, contexto, favoritos, recentes, CTA, dashboard | UX consistente por toda a SPA |
| F2 | Core operacional | owners, patients, appointments, encounters, records | operacao diaria completa e confiavel |
| F3 | Assistencial avancado | triage, inpatient, beds, board, diagnostics, surgery, prescriptions, discharges | leitura clinica e operacional densa |
| F4 | Governanca | access-control, users, staff, audit, notifications | administracao e rastreabilidade premium |
| F5 | Comercial | products, services, counter-sales, quotes, cash, inventory, reports | fluxo de receita e consumo fechado |
| F6 | Cutover final | remover dependencias de `apps/web` | nenhuma jornada critica depende do legado |

---

## 4. Sequencia recomendada de execucao

### Etapa A - Alinhar a experiencia de topo

1. revisar shell e topbar do `apps/spa`
2. padronizar card, button, alert e input
3. garantir menu por dominio e contexto fixo
4. ajustar dashboard como centro de operacao

### Etapa B - Fechar o core de uso diario

1. tutores
2. pacientes
3. agenda
4. fila
5. atendimentos
6. prontuario

### Etapa C - Ampliar o assistencial premium

1. triagem
2. internacao
3. mapa de leitos
4. setores e leitos
5. diagnosticos
6. cirurgia
7. prescricoes
8. execucao de prescricoes
9. altas

### Etapa D - Consolidar administracao e governanca

1. usuarios
2. equipe
3. access-control
4. audit
5. notifications
6. api keys
7. webhooks
8. api client

### Etapa E - Fechar a camada comercial e analitica

1. produtos
2. servicos
3. comanda de balcao
4. orcamentos
5. caixa
6. faturamento
7. relatorios comerciais
8. inventario

### Etapa F - Desligar o legado

1. manter web somente como fallback controlado durante a migracao por dominio
2. remover redirects antigos
3. encerrar deploy canonico do web
4. eliminar a trilha operacional residual

---

## 5. Criterios de sucesso por horizonte

| Horizonte | Criterios |
|---|---|
| H1 | shell uniforme, menu premium, dashboard mais rico, UX coerente |
| H2 | core operacional fechado e navegavel ponta a ponta |
| H3 | governanca explicavel, auditavel e administravel |
| H4 | fluxo comercial completo e mensuravel |
| H5 | nenhum fluxo critico depende de `apps/web` |

---

## 6. Decisoes de arquitetura que o roadmap assume

| Decisao | Implicacao |
|---|---|
| `apps/spa` e o frontend oficial alvo | novas telas e evolucoes vao para o SPA |
| `apps/web` e trilha encerrada | sem novas features, apenas desligamento controlado e limpeza documental |
| Design system manda na padronizacao | shell e modulos seguem o mesmo conjunto de componentes |
| Hubs sao por dominio | paginas devem juntar KPIs, lista, detalhe e acao |
| Governanca precisa ser explicavel | permissao efetiva e origem devem estar visiveis |

---

## 7. Riscos do roadmap

| Risco | Impacto | Mitigacao |
|---|---|---|
| Duplicar a trilha de frontend | confusao operacional | manter SPA como unica trilha oficial |
| Crescer sem padrao de shell | experiencia fragmentada | consolidar layout, CTA e hierarquia antes de expandir |
| Migrar sem corte por dominio | vacuo operacional | cortar por dominio com aceite claro |
| Priorizar visual acima de fluxo | produto bonito mas fraco | backlog deve sempre partir do fluxo critico |
| Deixar docs desatualizarem | perda de confianca | cada fase precisa fechar com validacao documental |

---

## 8. Resultado esperado ao final

Ao fim do roadmap, o CVG-HIS V2 deve estar em um destes estados:

1. `apps/spa` consolidado como unico frontend oficial
2. `apps/web` sem novas entregas e fora da trilha operacional
3. shell premium com linguagem consistente em todo o produto
4. hubs de dominio com KPI, alertas e acciones
5. governanca e comercial com acabamento enterprise
