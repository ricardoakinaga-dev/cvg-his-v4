---
document_status: current
document_kind: baseline
effective_date: 2026-09-02
owner: Qualidade, Segurança e Engenharia CVG-HIS
review_cycle: monthly
---

> Atualizacao de execucao (2026-09-03): a implementacao local e as dependencias externas estao consolidadas no [relatorio de implementacao](./2026-09-03-implementacao-plano-cvg-his-v4.md). As notas abaixo permanecem a fotografia do SHA originalmente auditado.

# Relatório de reauditoria do CVG-HIS V4

**Data da evidência:** 2026-09-02

**Commit avaliado:** `3b30f5e` (`main`, sincronizada com `origin/main`)

**Nota global:** **84/100**

**Decisão:** apto para desenvolvimento, demonstração e homologação controlada; **não aprovado para produção crítica**.

Este relatório substitui as notas executivas de 7 de agosto como fotografia atual. Os documentos anteriores continuam válidos apenas como histórico. A execução das melhorias é detalhada no [plano executivo](./2026-09-02-plano-executivo-melhorias-cvg-his-v4.md), no [roadmap](./2026-09-02-roadmap-melhorias-cvg-his-v4.md) e no [backlog priorizado](./2026-09-02-backlog-priorizado-cvg-his-v4.md).

## 1. Resumo executivo

O CVG-HIS V4 tem uma base de engenharia madura: build, typecheck, lint, suíte unitária/de componentes, contratos, segurança estática e execução local passaram. API, SPA, worker, PostgreSQL e Redis estavam ativos e saudáveis durante a auditoria. A árvore Git estava sincronizada e o remoto continha apenas a branch `main`.

A nota não é maior porque quatro grupos de risco continuam abertos:

1. o contrato entre o reconciliador e o inspetor das roles PostgreSQL produz `safe=false` para a role real da API;
2. a suíte crítica PostgreSQL não é portável para caminhos com espaço e, em execução controlada, ainda apresentou quatro falhas funcionais e dois erros de infraestrutura/limpeza;
3. a cobertura global ficou em 79,98% de statements/lines, 0,02 ponto percentual abaixo do gate de 80%;
4. a paridade Vetus funcional está comprovada em 4 de 11 domínios; integrações e homologações externas ainda bloqueiam os demais.

O indicador `readiness:enterprise` chegou a 95/100 porque mede a presença de controles e evidências. Ele não substitui a paridade funcional, a execução do gate crítico nem a homologação operacional.

## 2. Régua e método

|  Nota | Interpretação                                         |
| ----: | ----------------------------------------------------- |
|  0–39 | Bloqueado, simulado ou sem evidência suficiente       |
| 40–59 | Parcial, com risco alto                               |
| 60–79 | Piloto controlado                                     |
| 80–89 | Candidato à homologação                               |
| 90–99 | Produção comprovada, com riscos residuais controlados |
|   100 | Integralmente verificado no escopo definido           |

A avaliação considerou código, documentação, scripts de operação, configuração, banco, execução local e testes reproduzíveis. Presença de arquivo, endpoint ou tela não foi considerada prova suficiente: persistência, isolamento, restart, autorização, efeito entre módulos e integração real também pesaram.

### Escopo inspecionado

- 71 manifestos `package.json`;
- 1.320 arquivos de código TypeScript, TSX ou Vue;
- 656 arquivos de teste/especificação, dos quais 621 em TypeScript/TSX;
- 161 artefatos SQL de migração e 156 migrações canônicas aplicadas no banco local;
- 1.486 arquivos de documentação;
- workflow de CI/CD, Compose, Helm, OpenAPI, RLS, worker, telemetria e scripts de deploy.

Não foram executados nesta rodada: CI remoto hospedado, provedor externo real, benchmark representativo de produção, restauração em infraestrutura-alvo e cutover real. Esses itens só podem receber aprovação depois de evidência no ambiente correspondente.

## 3. Evidência dos gates

| Gate                                  | Resultado                       | Evidência resumida                                                                                                                                        |
| ------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado Git                            | **Passou**                      | `main` limpa e alinhada a `origin/main`; apenas `main` publicada no remoto no momento da coleta                                                           |
| Instalação/dependências               | **Passou**                      | Node 24.20.0 e pnpm 10.0.0; workspace instalado                                                                                                           |
| `pnpm build`                          | **Passou**                      | 70/71 workspaces; SPA/PWA geradas; restaram avisos de chunk/import misto                                                                                  |
| `pnpm typecheck`                      | **Passou**                      | sem erro de tipos                                                                                                                                         |
| `pnpm lint`                           | **Passou**                      | sem violação bloqueante                                                                                                                                   |
| `DATABASE_URL= pnpm test`             | **Passou com limite de escopo** | API 540/540; SPA 1.053/1.053; demais pacotes e worker passaram. Testes dependentes das portas PostgreSQL/Redis de integração foram ignorados nessa matriz |
| `DATABASE_URL= pnpm test:coverage`    | **Falhou no limiar**            | 196 arquivos passaram, 1 foi ignorado; 2.256 testes passaram e 1 foi ignorado; 79,98% statements/lines, 81,31% branches e 84,93% functions                |
| Suíte crítica oficial                 | **Bloqueada**                   | o executor constrói comando shell sem proteger o caminho `Área de trabalho`                                                                               |
| Recorte crítico em PostgreSQL efêmero | **Falhou**                      | 50 arquivos passaram, 6 falharam, 3 foram ignorados; 521 testes passaram, 4 assertions falharam, 35 foram ignorados; 2 erros de suíte                     |
| Banco/migrações                       | **Passou com ressalva**         | migrações e seed aplicados em PostgreSQL 16 isolado; inconsistência de capabilities das roles permanece                                                   |
| Runtime local                         | **Passou**                      | PostgreSQL, Redis, API, SPA e worker ativos; API e worker responderam `ready=true`                                                                        |
| OpenAPI                               | **Passou**                      | 354 paths, 40 tags e 413 schemas                                                                                                                          |
| Namespaces/migração/RLS/deploy        | **Passou estaticamente**        | validadores de namespaces, fonte de migração, RLS, superfície de deploy e deploy check concluíram                                                         |
| Helm                                  | **Passou estaticamente**        | charts de dev/staging/prod validados; binário Helm não estava disponível para renderização real                                                           |
| Segurança enterprise                  | **Passou**                      | secret scan passou; 0 vulnerabilidades críticas, altas ou moderadas reportadas no gate                                                                    |
| `readiness:enterprise`                | **Falhou para promoção**        | 95/100; 42 PASS, 3 WARN e 1 FAIL; falha em paridade Vetus                                                                                                 |
| Paridade Vetus                        | **Parcial**                     | 100/100 evidências catalogadas, mas somente 4/11 domínios funcionalmente verificados                                                                      |

## 4. Notas por item analisado

| Item                                  |    Nota | Diagnóstico atual                                                                                            |
| ------------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------ |
| Governança Git e branches             | **100** | `main` única no remoto e sincronizada na coleta; manter proteção e proibição de push direto                  |
| Dependências e reprodutibilidade      |  **96** | instalação íntegra e sem vulnerabilidade relevante no gate; falta provar reinstalação limpa na CI alvo       |
| Arquitetura e modularidade            |  **91** | monorepo bem segmentado entre apps e pacotes; complexidade e amplitude exigem disciplina de contratos        |
| Build e empacotamento                 |  **96** | build completo passou; avisos de chunk/import merecem tratamento não bloqueante                              |
| TypeScript e consistência de tipos    |  **96** | typecheck passou em todo o escopo selecionado                                                                |
| Lint e padrões estáticos              |  **94** | gate passou; qualidade depende também das validações complementares do repositório                           |
| Testes unitários e de componentes     |  **96** | grande volume e passagem integral na matriz sem banco; skips de dependências reais reduzem a nota            |
| Cobertura automatizada                |  **79** | 79,98% de statements/lines: muito próxima, porém abaixo do limiar obrigatório de 80%                         |
| Integração PostgreSQL                 |  **72** | boa cobertura crítica, mas existem quatro regressões reproduzíveis e dois erros de harness/cleanup           |
| Banco, schema e migrações             |  **84** | fonte canônica e aplicação limpa funcionam; contrato das roles e portabilidade do executor precisam correção |
| RLS e isolamento tenant               |  **76** | base de RLS é forte, porém a role real da API não satisfaz o próprio inspetor de segurança                   |
| API e OpenAPI                         |  **97** | contrato amplo e validado, com readiness saudável                                                            |
| SPA, UX e PWA                         |  **89** | aplicação compilada, navegável e coberta; homologação de todas as jornadas ainda não está completa           |
| Segurança de aplicação e supply chain |  **80** | scan limpo; o guard estrito de role está desativado localmente e falharia com o estado atual                 |
| Worker e processamento assíncrono     |  **91** | pronto, loops e consumidores principais saudáveis; um teste falha ao localizar `pnpm` no subprocesso         |
| Observabilidade                       |  **85** | health, readiness e instrumentação existem; falta comprovação distribuída no ambiente-alvo                   |
| CI/CD e deploy                        |  **80** | automação ampla e validação estática sólida; faltam execução remota verde, Helm real e cutover comprovado    |
| Documentação                          |  **86** | cobertura excepcional, mas excesso de documentos e baselines antigas criam risco de contradição              |
| Completude funcional                  |  **76** | quatro domínios Vetus verificados; sete dependem de implementação/homologação adicional                      |
| Performance e escala                  |  **74** | infraestrutura de testes existe; não houve benchmark representativo nesta rodada                             |
| Ambiente local                        |  **97** | stack completa saudável em `http://localhost:3002`                                                           |
| Prontidão para produção               |  **68** | role, critical gate, DR/cutover, CI remoto e provedores externos impedem aprovação                           |

### Consolidação ponderada

| Dimensão                  |   Nota |
| ------------------------- | -----: |
| Engenharia                | **89** |
| Execução local            | **97** |
| Completude funcional      | **76** |
| Prontidão para produção   | **68** |
| **Nota global ponderada** | **84** |

## 5. Notas por domínio funcional

| Domínio                                           |   Nota | Paridade   | Lacuna decisiva                                                               |
| ------------------------------------------------- | -----: | ---------- | ----------------------------------------------------------------------------- |
| Atendimento, agenda, comanda e internação         | **92** | Verificada | ampliar homologação operacional e não regredir os fluxos críticos             |
| Cadastros de responsáveis, pacientes e auxiliares | **92** | Verificada | manter prova E2E e governança de dados mestres                                |
| Laboratório                                       | **70** | Bloqueada  | Live Lab/provedor externo e homologação real                                  |
| Estoque, compras e movimentações                  | **84** | Verificada | corrigir regressões de relatórios por data/estoque                            |
| Fiscal                                            | **66** | Bloqueada  | sandbox municipal, certificado, rejeição/cancelamento e XML/PDF               |
| Financeiro, caixa, cartão e PIX                   | **62** | Bloqueada  | cadastros persistidos, cartões, split, settlement, refund e conciliação reais |
| Marketing e comunicações                          | **68** | Bloqueada  | provedor real, bounce e E2E externo                                           |
| Equipe, folgas e comissões                        | **90** | Verificada | preservar cobertura e validar operação real                                   |
| Relatórios e exportações                          | **64** | Bloqueada  | cobertura histórica Vetus, agendamento/entrega e correções de limite de data  |
| Usuários, acesso, auditoria e LGPD                | **76** | Bloqueada  | aceite operacional de retenção, mascaramento e processos LGPD                 |
| Integrações e migração Vetus                      | **68** | Bloqueada  | Live Pet, Live Lab, observabilidade distribuída e homologação no destino      |

## 6. Achados prioritários

### P0 — contrato inseguro/inconsistente das roles de runtime

A inspeção da role real `cvg_api` retornou `safe=false`, apesar de a role não ser superuser, não ter `BYPASSRLS` e não possuir tabelas RLS. Foram detectados 23 privilégios de tabela proibidos e uma função `SECURITY DEFINER` fora do contrato aceito.

O reconciliador configura as roles de runtime como `NOINHERIT` e concede `cvg_installer` sem herança, enquanto o inspetor exige herança efetiva para reconhecer esse membership. Também há divergência entre a função PIX concedida, a lista de funções permitidas e o `search_path` esperado. O desenvolvimento local continua porque `DATABASE_REQUIRE_RLS_ROLE=0`; produção deve operar em fail-closed.

**Critério de saída:** o reconciliador e o inspetor compartilham uma única especificação; `checkDatabaseRuntimeRole()` retorna `safe=true` para API e worker em banco recriado do zero; o modo estrito permanece obrigatório nos ambientes de promoção.

### P0 — suíte crítica não é portável e ainda não está verde

O executor em `tests/db/db-schema.ts` interpola o caminho do script em uma string de shell. Como o workspace está sob `Área de trabalho`, o Node tenta resolver apenas `/home/ricardo/Área`. A execução deve usar argumentos estruturados, sem shell.

Em PostgreSQL 16 efêmero, migrado e populado do zero, o recorte crítico registrou:

- paginação por cursor de auditoria retorna a segunda página vazia;
- vendas de balcão omitem registro exatamente no início inclusivo do período;
- relatório de produtos de estoque omite `Alpha Med` no limite inicial;
- relatório de posição de estoque retorna uma linha onde eram esperadas duas;
- cleanup de prescrições viola `entry_revisions_author_user_id_fkey`;
- suíte de consumidores do worker não encontra `pnpm` no subprocesso.

**Critério de saída:** executor funciona em qualquer caminho; banco efêmero limpo; zero falha, zero erro de suíte e zero skip não justificado em execuções repetidas.

### P0 — cobertura abaixo do contrato

O gate exige 80% em todas as métricas. Statements e lines ficaram em 79,98%, portanto o resultado correto é falha. O primeiro ganho deve cobrir comportamentos de risco — reconciliador de roles, repositórios PostgreSQL e gateways — sem reduzir o limiar.

**Critério de saída:** mínimo de 82% em statements/lines/branches/functions para criar margem operacional; meta seguinte de 85% nos módulos críticos.

### P1 — evidência externa e paridade

A auditoria de evidências está completa, mas apenas 4/11 domínios atingiram paridade funcional. Laboratório, fiscal, financeiro, marketing, relatórios, LGPD e integrações dependem de sandboxes, credenciais/certificados controlados, ciclos reais de erro e aceite operacional.

**Critério de saída:** 11/11 domínios verificados com evidência datada, reproduzível e aprovada pelo responsável de negócio; mocks não contam como homologação.

### P1 — governança documental e identidade da versão

O acervo de 1.486 documentos preserva muita evidência, mas baselines antigas entram em conflito com o estado atual. Além disso, o produto é denominado V4 enquanto pacotes, serviços e OpenAPI ainda conservam identificadores `cvg-his-v2` e versão `0.1.0`.

**Critério de saída:** índice vigente aponta para uma única baseline, documentos históricos estão explicitamente rotulados e a política de nome/versão está registrada e aplicada.

## 7. Decisão de uso

| Uso                   | Decisão                       | Condição                                                                  |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| Desenvolvimento local | **Aprovado**                  | stack saudável e gates principais executáveis                             |
| Demonstração          | **Aprovado**                  | usar dados não sensíveis e declarar integrações simuladas/não homologadas |
| Piloto controlado     | **Condicional**               | limitar módulos, manter rollback e aceite explícito do risco              |
| Homologação integrada | **Condicional**               | corrigir todos os P0 e disponibilizar sandboxes/provedores                |
| Produção crítica      | **Reprovado no estado atual** | requer todos os gates de promoção descritos no plano e roadmap            |

## 8. Meta da próxima reauditoria

A próxima nota só deve ser publicada depois de evidência nova. A meta mínima é **92/100 global**, **90/100 em prontidão para produção**, zero P0 aberto, coverage gate verde, suíte crítica repetidamente verde e pelo menos 9/11 domínios Vetus verificados. Aprovação final de produção requer 11/11 ou exceções formalmente aceitas, além de restore, cutover, carga, observabilidade e provedores comprovados no ambiente-alvo.
