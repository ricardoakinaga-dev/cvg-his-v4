# 114 - Frontend Architecture

**Status:** vivo
**Data de validacao:** 2026-03-31
**Fonte principal de evidencia:** `apps/web/src/index.ts`, `apps/web/src/pages/*`

## Papel do frontend

`apps/web` e o frontend canonico do CVG-HIS V2.

Ele entrega hoje:

- server-side routing por pathname
- HTML inline com JS client-side leve
- autenticacao baseada na API V2
- navegacao assistencial, administrativa e operacional

## Estado real atual

### Stack

- app: `apps/web`
- runtime: Node.js HTTP server
- renderizacao: HTML server-side com scripts client-side
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
- frontend ainda usa HTML inline; isso e aceitavel no curto prazo, mas exige disciplina de manutencao
- falta consolidar documentacao de UX por dominio para os modulos mais novos

## Direcao para a proxima fase

- manter `apps/web` como frontend oficial
- expandir cobertura E2E dos fluxos enterprise
- documentar UX e contratos de cada modulo novo apenas quando eles estiverem operacionais de ponta a ponta
- evitar criar trilhas paralelas de frontend
