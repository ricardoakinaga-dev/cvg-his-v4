---
document_status: supporting
document_kind: improvement-plan
effective_date: 2026-09-23
owner: Liderança técnica, Produto, Plataforma, Segurança e Operações CVG-HIS
review_cycle: weekly-or-material-blocker-change
---

# Plano executivo — melhoria e certificação do CVG-HIS V4

[Auditoria](2026-09-23-relatorio-auditoria-repositorio.md) · [50 melhorias](2026-09-23-lista-50-melhorias.md) · [Roadmap](2026-09-23-roadmap-melhorias.md) · [Backlog](2026-09-23-backlog-melhorias.md)

## Decisão executiva

O estado observado em 23/09/2026 recebeu **66/100** e permanece **release bloqueado**. A prioridade é obter um candidato limpo, persistente, reproduzível e rastreável; depois provar seus fluxos e controles no CI e no ambiente-alvo. A demonstração local em memória e gates estáticos são úteis, mas não encerram os riscos de dados, paridade ou operação.

Este plano organiza 50 propostas em um programa incremental. Não substitui a [Quality Bar](triple-a/QUALITY_BAR_V1.json), os contratos vigentes ou o status operacional de `.agent/backlog.json`. Os tickets `M-xx` devem ser ligados aos `REM` existentes antes de iniciar implementação, evitando duas filas concorrentes. A [auditoria de 21/09](2026-09-21-auditoria-profunda-repositorio.md) continua como baseline formal de um checkout limpo; o novo score é da árvore observada em 23/09.

## Resultados mensuráveis

| Resultado | Medida de saída |
| --- | --- |
| Candidato rastreável | Um SHA em checkout limpo, sem blob proibido nas refs de publicação e com evidência íntegra vinculada à mesma identidade. |
| Ambiente de dados reproduzível | Credencial de migração em canal seguro, migration 0175 comprovada em banco isolado e API persistente com readiness aprovado. |
| Gates locais e remotos | Suíte integral, coverage ≥82% sem afrouxamento, build/typecheck/lint/segurança/docs/Helm exigidos e CI terminal no SHA. |
| Cadeia de release | OCI, digest, SBOM, scan, assinatura e attestations verificáveis no mesmo candidato. |
| Produto e dados | 11/11 áreas de paridade demonstradas no escopo acordado, jornada integrada e isolamento tenant em target. |
| Resiliência | Restore/rollback, RPO/RTO e carga medidos contra limites previamente aprovados; worker recupera sem duplicidade. |
| Decisão | Zero P0 abertos, UAT e aceites humanos registrados, reauditoria independente e go/no-go formal. |

As metas Triplo AAA permanecem total ≥97, dimensões críticas ≥95 e todos os gates obrigatórios aprovados. Melhorar a nota editorial para 97 não basta sem essas provas.

## Organização e responsabilidade

| Frente | Responsável sugerido | Decisões e dependências |
| --- | --- | --- |
| Identidade, Git, CI e artefatos | Plataforma + liderança técnica | Preservar trabalho; reconciliar histórias; escolher SHA; publicar somente com autoridade e trilha. |
| Banco, migrations, RLS e recovery | Backend + DBA + Operações | Provisionar banco de teste isolado; aprovar credenciais/target; medir restore e RPO/RTO. |
| Qualidade e segurança | QA + Segurança/DPO | Definir amostra crítica, suite/coverage, casos negativos, segredo/PII e independência da reauditoria. |
| Produto e integrações | Produto + donos de domínio + Backend/Frontend | Aceitar critérios das 11 áreas, homologar provedores, conduzir UAT por papel. |
| Operação de release | Operações + liderança de release | Validar SLO, capacidade, runbooks e riscos; convocar go/no-go. |

Responsáveis são propostas de função, não aceites de pessoas reais. A execução pode preparar código, fixtures e evidência local; alterações em serviços externos, credenciais, ambiente compartilhado e autorização de produção exigem decisão das autoridades correspondentes.

## Estratégia de entrega

1. **Preservar e reconciliar (G0).** Inventariar diffs/refs, garantir recuperação e resolver divergência Git sem perder trabalho. Corrigir o check de backup que referencia termos antigos. Congelar um candidato apenas depois de integrar o que pertence à entrega.
2. **Reproduzir dados e gates (G1).** Usar banco descartável, corrigir acesso de migração, aplicar 0175 e executar API persistente, suíte integral, coverage e Helm. Não executar a suíte de raiz contra o banco compartilhado de desenvolvimento.
3. **Certificar a cadeia de entrega (G2).** Rodar CI no SHA congelado; encadear artefatos OCI, SBOM, scan, assinatura e attestations. Qualquer mudança posterior exige novo SHA e recertificação afetada.
4. **Provar target e produto (G3/G4).** Testar RLS, worker, restore, carga, integrações e jornada clínica/financeira em alvos autorizados. Fechar paridade por comportamento e executar UAT/acessibilidade.
5. **Reduzir dívida e decidir (G5).** Separar hotspots e ampliar controles sem alterar indevidamente contratos; reconciliar P0, evidências e documentação; submeter go/no-go formal.

## Regras de acompanhamento

- Reunião semanal curta: cada frente informa ticket, SHA, ambiente, resultado do gate, bloqueio e próximo responsável. A linha de base do [roadmap](2026-09-23-roadmap-melhorias.md) é relativa; datas serão ajustadas após capacidade e acesso a ambientes serem confirmados.
- Cada item do [backlog](2026-09-23-backlog-melhorias.md) só é `DONE` quando o aceite observável passa e a prova identifica SHA/ambiente. O status vivo permanece em `.agent/backlog.json`, com mapeamento para `REM`.
- Nenhum gate reprovado é convertido em verde por excluir superfície, baixar threshold, usar mock no lugar de persistência ou trocar um relatório por execução.
- P0 ou segurança/regressão clínica interrompem promoção do candidato. A preparação de outras frentes pode continuar com escopo isolado.
- Mudança de código depois do freeze renova apenas as evidências afetadas, mas a identidade final deve permanecer única.

## Riscos e decisões necessárias

| Risco | Controle imediato | Decisão necessária |
| --- | --- | --- |
| Perda de trabalho na reconciliação Git | Backup verificável, comparação de refs e diffs, checkout isolado para integração. | Estratégia de publicação e autoridade para ações remotas/destrutivas, se aplicável. |
| Ambiente DB compartilhado/incompleto | Banco descartável e preflight; nenhuma migração automática no banco de uso atual. | Credenciais e target de teste administrados por Operações/DBA. |
| Falta de evidência CI/OCI/target | Marcar `NOT_PROVEN`; capturar logs/artefatos no SHA congelado. | Acesso a CI, registry e ambiente de homologação. |
| Sete áreas de paridade sem prova | Critérios por domínio, fixtures e jornada integrada. | Aprovação de escopo por Produto e donos clínicos. |
| Restore, RPO/RTO, UAT e LGPD pendentes | Procedimentos e scripts em alvo descartável; registro de limites. | Limites RPO/RTO e aceites formais por Operações, Produto e Segurança/DPO. |

O [roadmap](2026-09-23-roadmap-melhorias.md) detalha a ordem e o [backlog](2026-09-23-backlog-melhorias.md) define o aceite de cada uma das 50 melhorias.
