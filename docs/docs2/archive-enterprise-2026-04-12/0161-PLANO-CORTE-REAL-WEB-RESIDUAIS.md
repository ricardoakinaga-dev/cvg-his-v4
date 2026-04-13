# 0161 - Plano de Corte Real do `apps/web` com Residuais

## Objetivo

Fechar a migração do frontend do CVG HIS V2 para o `apps/spa` como frontend oficial alvo, deixando claro quais capacidades ainda dependem do `apps/web`, quais rotas precisam de normalização e qual e o criterio objetivo para apagar o `apps/web`.

## Estado atual

O `apps/spa` ja cobre o nucleo do produto:

- dashboard e shell premium
- cadastro mestre de tutores e pacientes
- agenda, fila, atendimento e prontuario
- triagem, diagnosticos, prescricoes, execucoes, cirurgia, internacao e altas
- faturamento, caixa, PIX, comanda, orcamentos
- usuarios, equipe, notificacoes, WhatsApp, webhooks, chaves API
- estoque, produtos e servicos

O `apps/web` ainda sobrevive como trilha legacy funcional para alguns dominios e para rotas de administracao que ainda nao foram substituidas 1:1 no SPA.

## Residuais que ainda dependem do `apps/web`

### Bloqueadores de corte

1. `access-control`
- O `web` ainda possui a pagina completa de governanca de acesso.
- A SPA possui paginas de usuarios e equipe, mas nao possui ainda uma tela equivalente de matriz de permissao, heranca por equipe e por setor.

2. `audit`
- O `web` ainda expoe a trilha de auditoria.
- Nao existe equivalente direto no `spa`.

3. `master-search`
- O `web` ainda expoe a busca mestre transversal.
- Nao existe equivalente direto no `spa`.

### Lacunas de dominio secundarias

4. `commercial-reports`
- Existe no `web`.
- Nao existe equivalente direto no `spa`.
- Pode ser desativado junto com o `web` se nao for fluxo critico, mas precisa de decisao explicita.

5. `sectors`, `beds`, `bed-map`
- No `web`, esses itens ainda aparecem como paginas separadas.
- No `spa`, a capacidade foi consolidada em `inpatient` e `inpatient/board`.
- Se a operacao precisar de detalhe separado de setores e leitos, essas rotas ainda precisam ser implementadas no `spa`.

6. `api-client`
- O `web` ainda possui area de cliente API.
- No `spa`, a cobertura mais proxima e `api-keys`, `webhooks` e `notifications`.
- Precisa de validacao se isso e so differenca de nomenclatura ou se ha capacidade funcional faltante.

### Divergencias de rota

7. `cash-register` -> `cash`
- O `web` usa `cash-register`.
- O `spa` usa `cash`.
- Essa divergencia precisa ser tratada com redirect/alias na fase final de corte.

8. `surgeries` -> `surgery`
- O `web` usa `surgeries`.
- O `spa` usa `surgery`.
- Essa divergencia precisa ser normalizada antes do desligamento final.

## Mapa de equivalencia

| Dominio | `web` | `spa` | Situacao |
|---|---|---|---|
| Dashboard | `/` | `/` | Coberto |
| Tutores | `/owners` | `/owners` | Coberto |
| Pacientes | `/patients` | `/patients` | Coberto |
| Atendimentos | `/encounters` | `/encounters` | Coberto |
| Prontuario | `/medical-records` | `/medical-records` | Coberto |
| Agenda | `/appointments` | `/appointments` | Coberto |
| Fila | `/queue` | `/queue` | Coberto |
| Triagem | `/triage` | `/triage` | Coberto |
| Internacao | `/inpatient`, `/bed-map` | `/inpatient`, `/inpatient/board` | Coberto com divergencia de rota |
| Prescricoes | `/prescriptions` | `/prescriptions` | Coberto |
| Execucoes | `/prescription-executions` | `/prescription-executions` | Coberto |
| Diagnosticos | `/diagnostics` | `/diagnostics` | Coberto |
| Cirurgias | `/surgeries` | `/surgery` | Coberto com divergencia de rota |
| Altas | `/discharges` | `/discharges` | Coberto |
| Faturamento | `/billing` | `/billing` | Coberto |
| Caixa | `/cash-register` | `/cash` | Coberto com divergencia de rota |
| PIX | n/a | `/pix` | Novo no SPA |
| Comanda | `/counter-sales` | `/counter-sales` | Coberto |
| Orcamentos | `/quotes` | `/quotes` | Coberto |
| Estoque | `/inventory` | `/inventory` | Coberto |
| Produtos | `/products` | `/products` | Coberto |
| Servicos | `/services` | `/services` | Coberto |
| Usuarios | `/users` | `/users` | Coberto |
| Equipe | `/staff` | `/staff` | Coberto |
| Notificacoes | `/notifications` | `/notifications` | Coberto |
| WhatsApp | `/notifications` | `/notifications/whatsapp` | Coberto no SPA com subrota |
| Webhooks | `/webhooks` | `/webhooks` | Coberto |
| Chaves API | `/api-client` | `/api-keys` | Cobertura parcial / renomeacao |
| Governanca de acesso | `/access-control` | n/a | Falta no SPA |
| Auditoria | `/audit` | n/a | Falta no SPA |
| Busca global | `/master-search` | n/a | Falta no SPA |
| Relatorios comerciais | `/commercial-reports` | n/a | Falta no SPA |

## Ordem de corte

### Fase 1 - Bloqueadores

1. Implementar `access-control` no SPA com matriz de permissao, equipes, setores e usuarios.
2. Implementar `audit` no SPA.
3. Implementar `master-search` no SPA.

### Fase 2 - Lacunas secundarias

4. Decidir `commercial-reports`.
5. Decidir se `sectors`, `beds` e `bed-map` precisam de paginas dedicadas ou se `inpatient/board` e suficiente.
6. Validar `api-client` versus `api-keys`.

### Fase 3 - Normalizacao de rotas

7. Criar alias/redirect de `/cash-register` para `/cash`.
8. Criar alias/redirect de `/surgeries` para `/surgery`.
9. Normalizar a nomenclatura de qualquer rota ainda divergente na documentacao e no backlog.

## Criterio objetivo para apagar o `apps/web`

O `apps/web` so pode ser apagado quando todos os itens abaixo forem verdadeiros:

- todas as rotas criticas do quadro acima estiverem implementadas ou formalmente descartadas no `spa`
- os redirects e aliases finais estiverem ativos e testados
- nenhuma operacao diaria depender do `web`
- o plano de desligamento operacional tiver sido executado
- a janela de convivencia tiver sido encerrada
- o rollback para o `web` nao for mais necessario

## Regra de governance

Nao existe apagamento por data fixa.

O `apps/web` so morre por condicao funcional, nunca por expectativa.

## Proximo passo recomendado

1. Implementar `access-control` no `spa`.
2. Decidir `commercial-reports` e `api-client`.
3. Padronizar redirects de rotas legacy.
4. Executar o corte final do `apps/web` somente depois disso.
