# Dashboard mensal de risco e evidência

**Ciclo:** mensal  
**Owner:** PMO CVG-HIS  
**Última revisão:** 2026-09-06
**Próxima revisão:** 2026-09-13

Este painel registra o estado comprovado; presença de código ou documento não
promove um gate. Datas são alvos de controle e devem ser replanejadas na revisão
mensal se equipe, sandbox ou ambiente-alvo não estiver disponível.

## Snapshot executivo — 2026-09-06

O [programa ERP State of Art / Triplo AAA](../2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md)
usa este painel como superfície de risco. A nota de maturidade atual é **75/100**;
ela não autoriza release.

| Indicador | Estado atual | Implicação |
|---|---|---|
| Gates AAA globais | `PARTIAL/BLOCKED` | nenhum selo AAA; todos os gates obrigatórios permanecem ativos |
| Critical bootstrap | `FAIL` | ambiente isolado PostgreSQL/Redis/Docker necessário antes da recertificação |
| E2E SPA com persistência | `FAIL` nesta tentativa | fallback de memória não pode ser usado como evidência de release |
| Cobertura executada | 2.433 pass, 1 skip; 82,32% lines/statements | escopo instrumentado reduzido; critical coverage ainda aberto |
| Paridade comportamental | 4/11 | 7 domínios requerem cenário, persistência e aceite de negócio |
| Dependências externas | 0/10 prontas; 10 bloqueadas | provider/target/credenciais precisam de decisão humana |
| Worktree | 676 entradas alteradas/não rastreadas | não existe candidato imutável no estado avaliado |
| Visual/a11y | evidências scoped positivas | sem aprovação global; dashboard baseline mismatch e revisão assistiva pendentes |

Próxima ação operacional: desbloquear `AAA-002`/`AAA-003`, repetir o critical
gate em ambiente dedicado e atualizar o [backlog AAA](../2026-09-06-backlog-erp-state-of-art-triplo-aaa.md).

## Gates e vencimentos — compromissos de controle a revalidar

| Gate/evidência                                         | Snapshot de referência                      | Owner             | Vencimento              | Decisão/exceção                                                             |
| ------------------------------------------------------ | -------------------------------------------- | ----------------- | ----------------------- | --------------------------------------------------------------------------- |
| R0 roles + matriz PostgreSQL/Redis                     | verificado localmente                        | PLAT/SEC          | concluído em 2026-09-02 | sem exceção; CI remoto ainda é evidência separada                           |
| cobertura global ≥82%                                  | verificado localmente                        | QA                | concluído em 2026-09-02 | sem redução de threshold ou novas exclusões                                 |
| Helm real dev/staging/prod                             | verificado localmente                        | OPS               | concluído em 2026-09-02 | não comprova cluster-alvo                                                   |
| FIN-001 cadastros financeiros persistentes             | verificado localmente                        | FIN/PLAT          | concluído em 2026-09-03 | CRUD/RBAC/auditoria/RLS/E2E aprovados; não promove FIN-002                  |
| REP-001 semântica UTC de relatórios                    | verificado localmente                        | REPORTS/QA        | concluído em 2026-09-03 | contrato e regressões aprovados; paridade histórica permanece separada      |
| OPS-006 game day efêmero                               | 6/6 verificados localmente                   | SRE/OPS           | concluído em 2026-09-03 | alvo, alertas humanos e sandboxes de providers ainda são evidência separada |
| CI remoto no mesmo SHA + proteção de `main`            | pendente externo                             | PLAT              | 2026-09-16              | bloqueia RC enquanto não houver execução e ruleset comprovados              |
| artefato SHA/digest + SBOM                             | implementação/evidência remota pendente      | PLAT/SEC          | 2026-09-16              | bloqueia RC                                                                 |
| instalação, upgrade, restore e rollback no alvo        | pendente externo                             | OPS/DBA           | 2026-09-30              | bloqueia G2                                                                 |
| carga, SLO e observabilidade no alvo                   | pendente externo                             | SRE/OPS           | 2026-10-16              | bloqueia G3                                                                 |
| rotação de segredos + break-glass + audit log          | automação pronta; exercício externo pendente | SEC/PLAT/OPS      | 2026-10-16              | workflow protegido exige três referências e aprovação humana                |
| paridade Vetus 9/11                                    | 4/11 verificados                             | Produto/QA        | 2026-10-30              | escopo menor exige exceção formal de Produto                                |
| homologações laboratório/fiscal/pagamentos/comunicação | bloqueadas por providers                     | donos de domínio  | 2026-11-13              | go-live limitado sem sandbox, rejeição e indisponibilidade provadas         |
| LGPD e WCAG com aceite independente                    | pendente                                     | DPO/WEB/QA        | 2026-11-13              | bloqueia produção ampla                                                     |
| cutover + rollback + go/no-go                          | não executado                                | Comitê de release | 2026-11-27              | nenhuma promoção sem ata e aprovadores                                      |

## Exceções ativas

| ID      | Escopo | Responsável | Expira em | Compensação | Aprovador |
| ------- | ------ | ----------- | --------- | ----------- | --------- |
| nenhuma | —      | —           | —         | —           | —         |

Uma exceção nova precisa de impacto, superfície afetada, controle compensatório,
data de expiração e aprovador. Exceção vencida torna o gate vermelho.

## Ata mínima da revisão

```text
Data/timezone:
Commit/SHA avaliado:
Participantes e papéis:
Gates que mudaram e evidência vinculada:
Exceções abertas, encerradas ou vencidas:
Riscos com owner ou vencimento alterado:
Decisão de promoção/retenção:
Próxima revisão:
```

O histórico mensal deve ser acrescentado abaixo ou arquivado com link a partir
deste painel; não se sobrescreve uma decisão anterior sem rastreabilidade.
