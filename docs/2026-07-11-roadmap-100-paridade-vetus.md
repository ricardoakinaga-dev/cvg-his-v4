# Roadmap para paridade Vetus 100/100

**Status:** substituido em 2026-07-11 por `2026-07-11-roadmap-premium-58-a-90.md`
**Início:** 2026-07-11
**Fontes:** auditorias de segurança/runtime, paridade funcional e produto/UX de 2026-07-09 a 2026-07-11

## Objetivo

Alcançar paridade funcional comprovada, sem elevar notas por presença de arquivos, rotas ou telas. O resultado final exige 11 de 11 domínios verificados e todos os itens analisados em 100/100.

## Régua obrigatória por domínio

Cada domínio recebe dez pontos por critério. Um domínio só chega a 100 quando os dez critérios estiverem comprovados.

| # | Critério | Prova obrigatória |
|---:|---|---|
| 1 | Regras e estados | tabela de decisão e transições válidas/inválidas testadas |
| 2 | UI operacional | sem mock, hardcode, CTA inativo ou fluxo bloqueado |
| 3 | API | validação, autorização, contrato e OpenAPI |
| 4 | Persistência | migration, constraints, FK e índices canônicos |
| 5 | Tenant | role real sem `BYPASSRLS` e teste cruzado |
| 6 | Consistência | atomicidade, idempotência e concorrência |
| 7 | Efeitos | auditoria, outbox e integrações reconciliadas |
| 8 | Testes internos | unitários e integração, incluindo erros |
| 9 | Jornada | E2E PostgreSQL real, sem `skip`, retry ou atalhos por API |
| 10 | Homologação | operação assinada e documentação atualizada |

## Fases

| Fase | Escopo | Saída obrigatória |
|---|---|---|
| R0 | Contrato, backlog e gate | matriz requisito -> código -> teste -> evidência |
| R1 | Segurança, tenant, migrations e worker | runtime sem role privilegiada ou fallback silencioso |
| R2 | Identidade, atendimento, prontuário, comanda e recebimento | jornadas agendada e avulsa completas |
| R3 | Laboratório, internação, estoque e compras | operação hospitalar transacional |
| R4 | Caixa, pagamentos, fiscal e comissões | operação comercial reconciliada |
| R5 | Preventivo, marketing, relatórios, portal e integrações | paridade operacional ampliada |
| R6 | UX, acessibilidade, resiliência e certificação | 11/11 domínios e todos os scores em 100 |

## Caminho crítico

`R0 -> SEC-001 -> SEC-002 -> DB-001 -> DATA-001 -> CLIN-001 -> BILL-001 -> FLOW-001 -> E2E-001/002/003 -> R3 -> R4 -> R5 -> R6`

## Ondas de execução

### Onda 1 - fundação e jornada bloqueada

- substituir o gate baseado em presença de arquivo;
- separar roles de migration, API e worker;
- corrigir contexto tenant na mesma transação;
- eliminar seeds não persistidos em runtime PostgreSQL;
- importar/cadastrar tutor e paciente com UUID canônico;
- impedir escrita em atendimento encerrado;
- separar episódio ativo de último episódio.

### Onda 2 - atendimento até recebimento

- ledger único por paciente/atendimento/comanda;
- pagamentos, estornos e estoque atômicos;
- checklist transacional de fechamento;
- admissão de internação ponta a ponta;
- E2E agendado, avulso e dois tenants.

### Onda 3 - hospital

- laboratório em estados separados;
- upload clínico seguro;
- mapa terapêutico 24 horas;
- lote, validade, consumo e devolução;
- compras, NF e transferências.

### Onda 4 - comercial e fiscal

- caixa completo e conciliação;
- múltiplas formas e chargeback;
- PIX/cartão homologados;
- NFS-e com rejeição/cancelamento;
- comissão até pagamento.

### Onda 5 - continuidade e gestão

- preventivo e comunicação consentida;
- marketing com entrega/retry;
- relatórios agendados pelo worker;
- portal/Live Pet e laboratório integrado;
- migração Vetus idempotente e reconciliada.

### Onda 6 - certificação

- design system e terminologia únicos;
- decomposição das páginas gigantes;
- WCAG 2.2 AA nas jornadas críticas;
- caos, restart, carga e 20 execuções sem flake;
- homologação com recepção, veterinário e caixa.

## Gates de saída

### Gate R2

- login real até comanda recebida em cenário agendado e avulso;
- nenhuma etapa criada por API no teste da jornada;
- PostgreSQL real, `retries=0`, zero `skip`;
- dados preservados após restart;
- cenário concorrente em dois tenants sem vazamento.

### Gate R4

- clínica, estoque, caixa, pagamentos e fiscal reconciliados;
- falha injetada não deixa efeito parcial;
- retry com a mesma chave produz um único conjunto de efeitos.

### Gate final

1. `pnpm vetus:parity` retorna `Functional parity: VERIFIED`.
2. Os 11 domínios estão `verified`, sem bloqueadores.
3. Build, lint, typecheck, cobertura, integração, E2E e segurança passam.
4. Máquinas P0 têm 100% das transições testadas e cobertura global mínima de 80%.
5. Vinte execuções passam sem flake, retry ou skip.
6. Recepção, veterinário e caixa concluem 100% dos fluxos obrigatórios sem assistência.
7. Providers externos obrigatórios estão homologados.
8. Não existem mocks, placeholders ou fallbacks em capacidade declarada.

## Política de atualização de nota

- A nota só sobe com evidência executável ligada ao ticket do backlog.
- Um bloqueador P0 mantém o domínio abaixo de homologação, independentemente da média.
- Evidência indireta, snapshot ou arquivo sem comportamento não comprova funcionalidade.
- O scorecard é atualizado ao fim de cada onda, nunca por intenção ou código não exercitado.
