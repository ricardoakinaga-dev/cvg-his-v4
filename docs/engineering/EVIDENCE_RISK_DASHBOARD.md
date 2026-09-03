# Dashboard mensal de risco e evidência

**Ciclo:** mensal  
**Owner:** PMO CVG-HIS  
**Última revisão:** 2026-09-03  
**Próxima revisão:** 2026-10-03

Este painel registra o estado comprovado; presença de código ou documento não
promove um gate. Datas são alvos de controle e devem ser replanejadas na revisão
mensal se equipe, sandbox ou ambiente-alvo não estiver disponível.

## Gates e vencimentos

| Gate/evidência                                         | Estado em 2026-09-02                         | Owner             | Vencimento              | Decisão/exceção                                                             |
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
