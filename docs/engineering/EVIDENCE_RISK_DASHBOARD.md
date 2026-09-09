# Dashboard mensal de risco e evidência

**Ciclo:** mensal  
**Owner:** PMO CVG-HIS  
**Última revisão:** 2026-09-07
**Próxima revisão:** 2026-09-14

Este painel registra o estado comprovado; presença de código ou documento não
promove um gate. Datas são alvos de controle e devem ser replanejadas na revisão
mensal se equipe, sandbox ou ambiente-alvo não estiver disponível.

## Snapshot executivo — 2026-09-07

O [programa ERP State of Art / Triplo AAA](../2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md)
usa este painel como superfície de risco. A nota de maturidade atual é **75/100**;
ela não autoriza release.

| Indicador                | Estado atual                                                                                                                                                                       | Implicação                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gates AAA globais        | `PARTIAL/BLOCKED`                                                                                                                                                                  | nenhum selo AAA; todos os gates obrigatórios permanecem ativos                                                                                                |
| Critical gate agregado   | `PASS_BOUNDED` local                                                                                                                                                               | `pnpm test:critical` passou com 65 arquivos/594 testes e 10/10 processos; target, CI remoto e recertificação continuam abertos                                |
| E2E SPA com persistência | `PASS_BOUNDED` scoped; visual `29/29`; master UX `299/299`                                                                                                                         | 9/9 jornadas, 29/29 snapshots e 299/299 auditorias passaram contra PostgreSQL/Redis reais; target, CI remoto, a11y independente e providers continuam abertos |
| Suítes locais            | `pnpm test` PASS; API 564; SPA 198 arquivos/1.668 testes; worker e pacotes verdes; critical DB/process PASS_BOUNDED; E2E SPA scoped 9/9; 1 integração laboratorial opcional pulada | cobertura instrumentada anterior permanece 2.433 pass/1 skip e escopo reduzido; E2E integral e critical coverage formal ainda abertos                         |
| Paridade comportamental  | 4/11                                                                                                                                                                               | 7 domínios requerem cenário, persistência e aceite de negócio                                                                                                 |
| Readiness enterprise     | 92/100; 28 PASS, 3 WARN, 1 FAIL                                                                                                                                                    | o FAIL é paridade Vetus; o score mede camadas de prova e mantém o NO-GO                                                                                       |
| Dependências externas    | 0/10 prontas; 10 bloqueadas                                                                                                                                                        | provider/target/credenciais precisam de decisão humana                                                                                                        |
| Worktree                 | compartilhado e sujo, com alterações concorrentes                                                                                                                                  | não existe candidato imutável no estado avaliado                                                                                                              |
| Visual/a11y              | visual `29/29` e auditoria master `299/299` locais                                                                                                                                 | reprodução visual/navegação está verde; WCAG independente, leitor de tela, browsers adicionais e UAT continuam pendentes                                      |

Próxima ação operacional: preservar o critical gate e o E2E scoped como
evidência bounded, fechar `AAA-003`/`AAA-011`, recertificar `AAA-013` no
target/CI e atualizar o [backlog AAA](../2026-09-06-backlog-erp-state-of-art-triplo-aaa.md).

Registro técnico adicional: a API agora exige a tabela de sequência de vendas
duráveis; a migration 0163 aplica `FORCE RLS` incrementalmente sem editar a
0048 histórica; a 0164 permite a cascata legítima de itens de billing sem
afrouxar a proteção de reservas; e o worker exige as tabelas/colunas/policies
com `FORCE RLS` do runtime de relatórios antes de disponibilizar fontes
persistentes. Isso reduz risco de bootstrap parcial e de cleanup inconsistente,
mas ainda não é prova de aplicação/upgrade no target.

## Gates e vencimentos — compromissos de controle a revalidar

| Gate/evidência                                         | Snapshot de referência                       | Owner             | Vencimento              | Decisão/exceção                                                             |
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

## Revalidação do critical gate — 2026-09-07

O [registro de evidência do critical gate](CRITICAL_GATE_2026-09-07.md) documenta
o comando agregado com runtime local isolado. A perna de banco/setup passou
65/65 arquivos e 594/594 testes; a perna de processos passou 10/10 cenários,
sem skip, com cleanup por banco. O [E2E SPA](E2E_SPA_2026-09-07.md) passou 9/9
no envelope local e também limpou seus dados; a matriz visual passou 29/29 e a
auditoria master 299/299. O resultado é suficiente para retirar a ausência de
runtime local, a falha de cascata e a instabilidade dos snapshots como bloqueios
técnicos imediatos, mas não substitui target, CI remoto, providers, paridade,
WCAG independente ou aceite humano.

Na reprodução final, o papel de runtime do `.env` não tinha `CREATEDB`; por isso
o bootstrap usou a URL administrativa de migração somente para as bases
efêmeras, com Redis privado explicitamente configurado. O runner não fez
fallback e o resultado funcional foi mantido; o papel de bootstrap equivalente
deve ser garantido no CI/target.

## Revalidação visual, navegação e lote crítico — 2026-09-07

- `E2E_PLAYWRIGHT_TARGET=e2e/spa/visual/visual-regression.spec.ts`: **29/29**;
- `E2E_PLAYWRIGHT_TARGET=e2e/spa/master-usability-audit.spec.ts`: **299/299**;
- lote crítico/enterprise (10 specs): **40/40**;
- lote D (7 specs): **40/40**, incluindo os 29 testes visuais;
- ambiente: PostgreSQL efêmero local, Redis real, API em modo `database`, SPA
  servida pelo runner oficial;
- correções de qualidade: poster estático no login, query pública de visão diária
  na agenda e página nova por rota na auditoria master;
- limite: evidência local bounded, não checkout limpo/CI, nem substituto para
  revisão humana de WCAG 2.2 AA, leitor de tela ou homologação no target.

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
