# Fonte de verdade documental

**Status:** vigente
**Validado em:** 2026-08-23
**Owner:** engenharia e produto CVG-HIS

## Regra central

Documento nao transforma uma funcionalidade em pronta. O estado real e determinado por comportamento reproduzivel, persistencia canonica e testes que exercitam a jornada sem mocks impeditivos ou `skip`.

## Fontes por tema

| Tema | Fonte vigente |
|---|---|
| Checkpoint de continuidade atual | `2026-08-23-checkpoint-continuacao.md` |
| Estado do produto e auditoria | `2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md` |
| Plano executivo vigente | `2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md` |
| Backlog e roadmap vigentes | `2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md` |
| Primeiro acesso e super administrador | `2026-08-10-primeiro-acesso-super-admin.md` |
| Baselines anteriores de produto | documentos de julho de 2026, sem prevalencia sobre o programa de agosto |
| Paridade Vetus e lacunas de evidencia | `2026-07-10-auditoria-paridade-funcional-vetus.md` |
| Seguranca e runtime | comportamento/testes atuais; depois `2026-08-07-*` e, como baseline, `2026-07-09-auditoria-correcao-seguranca-runtime.md` |
| Arquitetura | `112` a `116`, mais `adr/` |
| Deploy | `130`, `131` e `132` |
| Navegacao | `navigation-*` e `routine-state-model.md` |
| Evidencias do Vetus | `vetus/` |
| Historico | `docs2/` |

## Estados permitidos

- **comprovado:** fluxo exercitado ponta a ponta, persistente e coberto por teste deterministico;
- **parcial:** ha implementacao util, mas a jornada, integracao ou prova esta incompleta;
- **simulado:** depende de mock, dado estatico, identificador falso ou provider nao homologado;
- **bloqueado:** o usuario nao consegue concluir a acao principal;
- **planejado:** existe apenas especificacao, backlog ou interface sem efeito operacional.

## Manutencao

- Toda auditoria deve informar data, escopo, metodo e limitacoes.
- Toda nota deve publicar a regua usada; nota de cobertura documental nao pode ser apresentada como paridade funcional.
- Um documento superado vai para `docs/docs2/` com preservacao do nome e do conteudo.
- Nao criar novos relatorios de “fechamento final” sem criterios P0 aprovados e evidencias anexadas.
- Links da raiz devem ser verificados quando arquivos forem movidos.

## Continuidade no GBrain

- Todo avanco verificavel do CVG-HIS V4 deve atualizar a pagina canonica `projects/cvg-his-v4` no GBrain antes do encerramento da tarefa.
- Registrar: data, objetivo, tickets, comportamento entregue, arquivos/migrations relevantes, gates executados, evidencias, riscos restantes e proximo passo.
- Nao registrar plano, codigo nao testado ou implementacao parcial como funcionalidade concluida.
- `docs/` continua sendo a fonte detalhada e versionada do projeto; o GBrain mantem o resumo operacional para retomada entre agentes e sessoes.
- Em divergencia, prevalecem comportamento reproduzido, testes/runtime, codigo e depois documentacao, conforme a regra de precedencia deste repositorio.

## Criterio de paridade

Paridade com Vetus exige o fluxo integrado entre cadastro, agenda ou entrada avulsa, esteira, atendimento, prontuario, exames ou receita, comanda, recebimento, estoque e auditoria. A existencia isolada de telas ou endpoints nao atende ao criterio.
