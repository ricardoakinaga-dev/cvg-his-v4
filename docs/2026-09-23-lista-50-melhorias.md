---
document_status: supporting
document_kind: improvement-list
effective_date: 2026-09-23
owner: Engenharia e Produto CVG-HIS
review_cycle: on-baseline-change
---

# 50 melhorias priorizadas

Origem: [auditoria de 23/09](2026-09-23-relatorio-auditoria-repositorio.md), nota 66/100 e release bloqueado. Os IDs `M-01` a `M-50` identificam propostas desta rodada; não substituem nem encerram os tickets `REM` do [backlog operacional anterior](2026-09-21-backlog-remediacao-integral.md). O [backlog desta rodada](2026-09-23-backlog-melhorias.md) fornece dependências e aceites.

**Prioridade alta:** bloqueia publicação, integridade, segurança ou comprovação de fluxo crítico. **Média:** reduz risco e custo de mudança após os bloqueios básicos. **Baixa:** melhora higiene e comunicação sem substituir gates obrigatórios.

## Alta prioridade — 20 melhorias

1. **M-01 — Reconciliar as histórias Git local/remota** após a reescrita autorizada, preservando os 79 commits exclusivos de cada lado e o trabalho não commitado; provar que a ref a publicar não contém o blob de 152 MB.
2. **M-02 — Congelar um candidato limpo e identificável**, com SHA, árvore sem alterações pendentes e manifesto de evidências vinculadas ao mesmo código.
3. **M-03 — Corrigir o gate documental de backup**, atualizando matcher e teste de mutação para W3/REM-024, sem declarar restore aprovado por um check textual.
4. **M-04 — Restabelecer credenciais de migração em ambiente seguro**, com acesso controlado, sem inserir senha em Git ou logs.
5. **M-05 — Aplicar e comprovar a migration 0175** em banco descartável antes de considerar qualquer ambiente compartilhado; conferir schema, rollback e compatibilidade.
6. **M-06 — Validar API persistente com readiness real**, PostgreSQL/Redis e fluxos críticos; separar claramente demo em memória de certificação.
7. **M-07 — Rodar a suíte completa em ambiente isolado**, incluindo testes da raiz, workspaces e integrações, com falha propagada ao gate canônico.
8. **M-08 — Atualizar e executar o gate de cobertura**, cobrindo superfícies críticas hoje excluídas de forma apropriada, sem reduzir o threshold de 82%.
9. **M-09 — Vincular CI remoto ao SHA congelado**, executando build, typecheck, lint, testes, segurança e validações exigidas, com evidência terminal.
10. **M-10 — Fechar a cadeia OCI/release**, ligando imagem, digest, SBOM, scan, assinatura e attestations ao mesmo SHA, sem rebuild na promoção.
11. **M-11 — Provar isolamento multitenant no target**, com roles reais, RLS/FORCE RLS, casos negativos entre tenants e exceção documentada.
12. **M-12 — Provar recuperação e idempotência do worker**, incluindo concorrência, redelivery, restart/SIGKILL e efeitos externos sem duplicidade.
13. **M-13 — Automatizar uma jornada clínica e financeira completa**, de cadastro/agenda até prontuário, comanda, recebimento, estoque e auditoria em banco real.
14. **M-14 — Ensaiar backup, restore e rollback representativos** em target autorizado e descartável, medindo RPO/RTO contra limites aprovados.
15. **M-15 — Executar carga, soak e alertas no target**, com perfil hospitalar aprovado e capacidade/limites publicados.
16. **M-16 — Fechar as sete áreas de paridade bloqueadas**, com critérios funcionais, fixtures e evidência por domínio, em vez de contar documentação como funcionalidade.
17. **M-17 — Homologar provedores externos críticos**, cobrindo pagamento, fiscal, mensagens e demais integrações aplicáveis com sucesso, falha e reconciliação.
18. **M-18 — Conduzir UAT e acessibilidade assistida**, com perfis hospitalares, navegador/dispositivos previstos e defeitos rastreados.
19. **M-19 — Reconciliar e encerrar cada P0 por evidência**, atualizando registry, Quality Bar e controle operacional no mesmo candidato.
20. **M-20 — Obter decisão formal de go/no-go**, com Produto, Operação e Segurança/DPO e registro de risco residual após todos os gates obrigatórios.

## Média prioridade — 20 melhorias

21. **M-21 — Dividir `apps/api/src/server.ts`** por composição, rotas e serviços, preservando contratos HTTP e autorização.
22. **M-22 — Dividir as páginas SPA mais extensas** por domínio e estado, priorizando paciente, prontuário, agenda, vendas e relatórios.
23. **M-23 — Estender o inventário e guard de hotspots** às áreas acima de 2.000 linhas ainda não acompanhadas, com ownership explícito.
24. **M-24 — Tornar estados de UI consistentes**, incluindo carregamento, vazio, erro, confirmação e recuperação de sessão nos fluxos críticos.
25. **M-25 — Ampliar testes de acessibilidade automatizados** e revisão manual de teclado, foco, semântica e leitores de tela nos fluxos principais.
26. **M-26 — Revisar contratos HTTP e OpenAPI** para erros, paginação, idempotência e compatibilidade entre cliente e API.
27. **M-27 — Reforçar contratos de upload/anexos**, limites, tipos, autorização, varredura e falhas de armazenamento.
28. **M-28 — Expandir testes negativos multitenant**, cobrindo API, jobs, relatórios, exportações e arquivos.
29. **M-29 — Reduzir skips permitidos**, substituindo-os por fixtures confiáveis ou shards dedicados, sem esconder falhas.
30. **M-30 — Executar Helm real**, fixando a versão e validando lint/template e values por ambiente, além do check estático.
31. **M-31 — Criar preflight de banco local**, verificando credenciais, versão, migrations e schema antes de iniciar API/testes persistentes.
32. **M-32 — Exercitar install, upgrade e rollback de migrations**, com dados sintéticos, locks e versão mista.
33. **M-33 — Reforçar observabilidade de jornadas críticas**, com traces, métricas, correlação e alertas acionáveis sem vazar dados sensíveis.
34. **M-34 — Definir SLOs operacionais e runbooks executáveis**, incluindo incidentes de API, worker, banco e integrações.
35. **M-35 — Testar falhas e reconciliação de pagamentos**, com duplicidade, timeout, callback fora de ordem e compensação.
36. **M-36 — Testar relatórios/exportações ponta a ponta**, com filtros, autorização, grandes volumes e semântica de datas.
37. **M-37 — Reconciliar identidade e snapshots de evidência**, evitando que árvore suja ou SHA antigo apareça como prova corrente.
38. **M-38 — Padronizar lint semântico em todos os pacotes aplicáveis**, distinguindo lint, typecheck e geração.
39. **M-39 — Fixar matriz de runtime e dependências**, com Node/pnpm reproduzíveis e instalação frozen.
40. **M-40 — Construir matriz de permissões por papel**, validando acesso mínimo e trilha auditável nos fluxos clínicos e administrativos.

## Baixa prioridade — 10 melhorias

41. **M-41 — Corrigir quatro links locais históricos** nos scorecards Triplo AAA, preservando o contexto do arquivo.
42. **M-42 — Melhorar o índice `docs/README.md`**, deixando visíveis baseline, limites e documentos vigentes.
43. **M-43 — Definir retenção de evidências e artefatos gerados**, com limpeza segura e espaço previsível.
44. **M-44 — Reduzir avisos `any`** nas fronteiras API/SPA mais modificadas.
45. **M-45 — Padronizar nomes de testes de FK e migrations**, facilitando localizar causa e escopo.
46. **M-46 — Enxugar logs locais ruidosos**, preservando correlação e sinais de falha.
47. **M-47 — Documentar o modo local de demonstração**, incluindo memória, readiness, limites e fluxo para banco persistente.
48. **M-48 — Revisar `.gitignore` e geração de arquivos**, para evitar novo blob de estado e ruído no checkout.
49. **M-49 — Criar exemplos curtos de configuração de desenvolvimento**, sem credenciais reais e com preflight reproduzível.
50. **M-50 — Publicar um changelog de evidências por candidato**, com SHA, data, ambiente, gates e limitações.
