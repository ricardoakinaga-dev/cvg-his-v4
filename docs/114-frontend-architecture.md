# 114 - Frontend Architecture

**Status:** vivo
**Data de validacao:** 2026-03-31
**Fonte principal de evidencia:** `apps/spa/src/*`

## Papel do frontend

`apps/spa` e o frontend canonico do CVG-HIS V2.

Ele entrega hoje:

- navegacao por dominio com shell premium
- layout responsivo com componentes Vue
- autenticacao baseada na API V2
- navegacao assistencial, administrativa e operacional

## Estado real atual

### Stack

- app: `apps/spa`
- runtime: Nginx servindo build estatico da SPA
- renderizacao: cliente com fallback de SPA
- roteamento: path routing, nao hash routing

### Rotas de pagina existentes

- `/login`
- `/`
- `/owners`
- `/patients`
- `/encounters`
- `/medical-records`
- `/users`
- `/staff`
- `/access-control`
- `/appointments`
- `/queue`
- `/triage`
- `/inpatient`
- `/sectors`
- `/beds`
- `/bed-map`
- `/diagnostics`
- `/surgeries`
- `/inventory`
- `/billing`
- `/notifications`
- `/audit`
- `/master-search`
- `/discharges`
- `/prescription-executions`
- `/prescriptions`

## Capacidades cobertas

- autenticacao e sessao
- dashboard
- cadastro mestre de tutores e pacientes
- atendimento e fila
- triagem
- prontuario clinico
- internacao, setores, leitos e mapa de leitos
- exames e cirurgias
- prescricoes e execucao de prescricoes
- billing e estoque
- usuarios, equipe e permissoes
- notificacoes, auditoria e busca global
- altas
- shell enterprise com menu por dominio, contexto, favoritos, recentes e command palette

## Responsabilidades

- expor a superficie funcional do ERP de forma navegavel
- formular requests para a API
- refletir estados operacionais e de autorizacao
- organizar a experiencia por dominios e fluxos de trabalho

## Nao responsabilidades

- decidir regra de dominio como fonte soberana
- substituir validacoes de backend
- manter regras clinicas apenas no cliente

## Lacunas ainda abertas

- suite E2E ainda nao cobre toda a superficie de tela
- ainda existe frontend legado `apps/web` durante a janela de transicao
- falta consolidar documentacao de UX por dominio para os modulos mais novos

## Direcao para a proxima fase

- manter `apps/spa` como frontend oficial
- expandir cobertura E2E dos fluxos enterprise
- documentar UX e contratos de cada modulo novo apenas quando eles estiverem operacionais de ponta a ponta
- evitar criar trilhas paralelas de frontend
- remover `apps/web` somente apos o corte por dominio estar completo
