---
document_status: historical
document_kind: baseline
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-candidate-change-or-material-evidence
candidate_sha: ad2f0373f68635f2579253b013a4382219906921
overall_score: 68
verdict: RELEASE_BLOCKED
superseded_by: docs/2026-09-26-auditoria-completa-sistema.md
---

# Auditoria profunda do repositório CVG-HIS V4

[Plano executivo](2026-09-21-plano-executivo-remediacao-integral.md) ·
[Roadmap](2026-09-21-roadmap-remediacao-integral.md) ·
[Backlog](2026-09-21-backlog-remediacao-integral.md) ·
[Prompt Codex](2026-09-21-prompt-codex-remediacao-integral.md)

## Identificação e veredito

- Data da auditoria: 21/09/2026.
- HEAD auditado: `ad2f0373f68635f2579253b013a4382219906921`.
- `origin/main` observado: `363c87efd653dad74afa1a6caf125debc6004641`.
- Distância: `main` 79 commits à frente de `origin/main`.
- Worktree ao final da inspeção: limpo.
- Nota geral ponderada: **68/100**.
- Estado: **não aprovado para release**.

O repositório possui uma base funcional extensa, testes críticos fortes e boa
instrumentação local. Entretanto, o candidato não é publicável no estado
observado: existe um blob versionado maior que o limite normal do GitHub, o
gate de cobertura falha, não há CI remoto no SHA exato e 11 de 14 controles P0
permanecem abertos. Uma média não compensa um critério obrigatório reprovado.

## Escopo e método

A auditoria comparou documentação, código, manifests, scripts, CI, migrations,
testes, infraestrutura, controle `.agent`, identidade do candidato e evidências
Triplo AAA. Foram exercitados build, typecheck, lint, testes dos workspaces,
coverage, complexidade, readiness, segurança, validadores documentais e suíte
crítica PostgreSQL/processos em banco descartável.

Não foram executados deploy em produção, push, uso de credenciais reais, UAT
hospitalar, restore destrutivo em infraestrutura compartilhada, certificação de
provedores ou aprovação humana. Resultados dessas fronteiras permanecem
`NOT_PROVEN`, mesmo quando o preparo local existe.

## Scorecard

| Dimensão | Peso | Nota | Diagnóstico |
| --- | ---: | ---: | --- |
| Funcionalidade e paridade do produto | 14% | **58** | Somente 4 de 11 áreas de paridade verificadas |
| Backend, API e contratos | 11% | **84** | 431 paths OpenAPI; servidor central excessivamente grande |
| Frontend, UX e acessibilidade | 8% | **72** | Build/testes fortes; hotspots e UAT/a11y real pendentes |
| Dados, migrations e multitenancy | 12% | **84** | Suíte PostgreSQL forte; prova no target ausente |
| Segurança, privacidade e segredos | 11% | **82** | Scans locais passam; RLS target, LGPD e aceite incompletos |
| Arquitetura e manutenibilidade | 8% | **51** | Gate de complexidade reprovado |
| Testes e qualidade | 10% | **76** | Cobertura ampla; coverage falha e teste padrão dá falso verde |
| CI, supply chain e release | 10% | **35** | Push bloqueado; CI exato e attestations ausentes |
| Confiabilidade, operação e observabilidade | 7% | **78** | Contratos locais bons; restore/soak/target não certificados |
| Documentação e rastreabilidade | 4% | **76** | Governança passa; identidades e régua estavam defasadas |
| DX e reprodutibilidade | 3% | **61** | Node divergente, lint desigual e workspace pesado |
| Governança, UAT e aceite | 2% | **30** | Autoridades e aceites externos ausentes |
| **Total ponderado** | **100%** | **68/100** | **Release bloqueado** |

## Evidência positiva observada

- `pnpm build`, `pnpm typecheck` e o script `pnpm lint` passaram nos 68
  projetos selecionados.
- Testes dos workspaces passaram, incluindo 1.891 testes SPA e 639 testes API.
- A suíte PostgreSQL descartável passou em 68 arquivos e 623 testes.
- Os 11 de 11 cenários críticos de processo passaram, incluindo concorrência,
  SIGKILL/restart, PIX, caixa, internação, webhook e workflow.
- OpenAPI válido: 431 paths, 41 tags e 525 schemas.
- RLS estático: 171 de 172 tabelas tenant protegidas; uma exceção documentada.
- Scan de segredos passou e `pnpm audit` não encontrou vulnerabilidade conhecida
  crítica, alta ou moderada no momento da execução.
- Referências de Actions e imagens de infraestrutura estavam imutáveis/pinadas.
- Validadores de documentação, namespaces, dependências, deploy, runtime,
  observabilidade e supply chain passaram localmente.

## Ranking completo de achados

### Alto impacto

1. **F-001 — blob de 152.651.034 bytes impede push normal (P0).**
   `.gauntlet/state.json` está versionado, sem Git LFS, e o blob existe no
   histórico local ainda não publicado. O GitHub bloqueia arquivos acima de
   100 MiB em Git normal segundo sua
   [documentação oficial](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github?from_column=20423&platform=linux).
   Um commit posterior apagando o arquivo não remove o blob do intervalo que
   será enviado; a correção exige preservação, decisão humana e reescrita
   coordenada do histórico local ou outra estratégia aprovada.

2. **F-002 — coverage gate falha (P0).** `pnpm test:coverage` encerrou com seis
   testes falhando, 3.000 passando e três ignorados. Branch coverage ficou em
   81,8%, abaixo do mínimo de 82%.

3. **F-003 — comando de teste padrão produz falso verde (P0).** `pnpm test`
   executa scripts de workspaces, mas não cobre adequadamente `tests/unit/**`.
   O comando passou enquanto `test:coverage` revelou falhas na raiz.

4. **F-004 — CI remoto do candidato exato não existe (P0).** A branch está 79
   commits à frente e a identidade mantém `ci_sha` e `release_sha` nulos.

5. **F-005 — 11 de 14 controles P0 permanecem abertos (P0).** Há três
   `CLOSED`, cinco `TARGET_REQUIRED`, três `BLOCKED_BY_DEPENDENCY`, dois
   `HUMAN_REQUIRED` e um `NOT_PROVEN`.

6. **F-006 — isolamento RLS no target não foi provado (P0).** Falta observar
   roles reais, owner e `FORCE RLS` impedindo acesso cross-tenant.

7. **F-007 — recuperação do worker no target não está certificada (P0).** Os
   testes locais são fortes, mas não provam restart, lease, redelivery e
   ausência de efeito duplicado na infraestrutura final.

8. **F-008 — golden path clínico e invariantes de auditoria bloqueados (P0).**
   Falta uma prova integrada candidate-bound no ambiente aprovado.

9. **F-009 — restore e rollback reais ausentes (P0).** Os contratos estáticos
   não substituem restore de backup representativo, RPO/RTO e rollback medido.

10. **F-010 — capacidade, desempenho e soak não certificados (P0).** Não há
    evidência corrente de latência, throughput, filas, conexões e degradação.

11. **F-011 — supply chain final não comprovada (P0).** Faltam OCI por digest,
    SBOM, scan das imagens publicadas, assinatura e attestation do mesmo SHA.

12. **F-012 — UAT hospitalar e acessibilidade humana ausentes (P0).** A
    automação não substitui validação clínica, teclado, leitor de tela e
    usabilidade por usuários representativos.

13. **F-013 — autoridade formal de release ausente (P0).** Operações,
    Segurança/DPO, Produto/Clínica e release authority não aprovaram o candidato.

14. **F-014 — paridade verificada em apenas 4 de 11 áreas (P1).** Laboratório,
    fiscal, financeiro/pagamentos, marketing, relatórios, usuários/LGPD e
    integrações permanecem pendentes.

15. **F-015 — gate de complexidade falha no servidor (P1).**
    `apps/api/src/server.ts` possui aproximadamente 8.406 linhas, acima do teto
    de 8.335, e ainda concentra composição de rotas, stores e normalizadores.

### Médio impacto

16. **F-016 — hotspots adicionais muito grandes (P1).** Páginas de pacientes,
    vendas, prontuário, relatórios, agenda, dashboard, layout, módulo de
    relatórios e runner do worker têm concentração elevada.

17. **F-017 — Node local diverge do runtime suportado (P1).** O projeto exige
    22.23.2, mas a auditoria rodou em 24.20.0, com avisos de engine e criptografia
    experimental.

18. **F-018 — testes de startup secrets estão defasados (P1).** A inclusão de
    `METRICS_AUTH_TOKEN` não foi incorporada aos mocks/expectativas, causando
    quatro falhas.

19. **F-019 — contrato de erro de payload diverge do teste (P1).** O código
    retorna `PayloadTooLargeError`; o teste ainda espera `ValidationError`.

20. **F-020 — Helm foi validado apenas estaticamente (P1).** O binário Helm não
    estava disponível para lint/renderização real na auditoria corrente.

21. **F-021 — lint não é uniforme (P2).** Apenas dois pacotes usam ESLint; 57
    usam typecheck com nome de lint e nove não possuem script de lint.

22. **F-022 — testes dependentes de infraestrutura são condicionais/skipped
    (P2).** Há casos para Redis, PostgreSQL e diagnósticos externos sem shard
    obrigatório uniforme.

23. **F-023 — segurança operacional de migrations incompleta (P1).** Faltam
    lock duration, mixed-version, rollback e volume representativo.

24. **F-024 — identidade apresentada no README estava antiga (P2).** O README
    apontava `cc063413…`, a identidade candidate-bound era `74b8669…` e o HEAD
    auditado era `ad2f0373…`.

25. **F-025 — Quality Bar não refletia a evidência (P2).** Dos 16 critérios,
    havia um `PASS`, dois `IN_PROGRESS`, um `PARTIAL` e doze `NOT_EVALUATED`.

26. **F-026 — repositório e estado Gauntlet excessivamente grandes (P2).**
    `.git` ocupava cerca de 756 MB e `.gauntlet` 146 MB.

27. **F-027 — retenção local de artefatos excessiva (P2).** `artifacts` ocupava
    cerca de 54 GB e `docs` 2,4 GB no workspace.

28. **F-028 — feedback de testes ruidoso e custoso (P2).** Há builds repetidos,
    logs extensos e avisos JSDOM que escondem o primeiro erro útil.

### Baixo impacto

29. **F-029 — três pacotes declaram não possuir testes (P3).** `chaos`,
    `shared/contracts` e `shared/types`; o maior risco é o pacote de chaos.

30. **F-030 — dívida residual de tipagem (P3).** Foram observadas cerca de 59
    ocorrências de `any` ou equivalentes em fontes não-teste.

31. **F-031 — validador OpenAPI emite aviso de módulo (P3).** O script usa ESM
    sem a declaração de módulo correspondente.

32. **F-032 — `pnpm-lock.yaml` está ignorado apesar de versionado (P3).** A
    configuração é ambígua e pode ocultar um lockfile recriado.

33. **F-033 — nomes de testes FK têm baixa diagnosticabilidade (P3).** Casos
    exibem `FK undefined → undefined should exist`, dificultando triagem futura.

## Prioridade de resolução

| Ordem | Faixa | Achados | Condição de saída |
| ---: | --- | --- | --- |
| 1 | P0 local | F-001–F-005, F-017–F-019 | branch publicável e todos os gates locais verdes no Node oficial |
| 2 | P0 remoto | F-004, F-011 | CI e release candidate-bound no SHA exato |
| 3 | P0 target | F-006–F-010 | RLS, recovery, restore e performance comprovados no target |
| 4 | P0 humano | F-012–F-013 | UAT e autoridades formalmente registradas |
| 5 | P1 produto/arquitetura | F-014–F-016, F-020, F-023 | paridade e hotspots tratados sem regressão |
| 6 | P2/P3 sustentabilidade | F-021–F-033 | governança, DX e higiene estabilizados |

## Conclusão

O CVG-HIS V4 está tecnicamente avançado, mas a classificação honesta é
**68/100 — candidato local parcialmente validado, não publicável e não aprovado
para produção**. A próxima etapa deve começar pela preservação e correção segura
do histórico Git, seguida da restauração dos gates locais. Nenhuma ação externa
ou humana pode ser declarada concluída por um agente sem a evidência e a
autoridade correspondentes.
