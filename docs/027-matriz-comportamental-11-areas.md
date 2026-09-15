# PROD-027 — matriz comportamental das 11 áreas

Status: PROPOSED_PENDING_AUTHORITY. Esta entrega é CONTRACT_ONLY_PREPARATION:
prepara taxonomia, crosswalk, inventário e cenários; não é paridade aceita,
UAT, fixture comportamental ou homologação.

## Limite e divergência observada

A auditoria de 14/09 descreve 45 módulos (45 diretórios) e 4/11 áreas verified
por manifesto, com 7/11 blocked. A inspeção atual do worktree encontrou 46
diretórios: workflows é uma delta observada e não será removida, ignorada ou
promovida silenciosamente. A diferença 45→46 fica PENDING_AUTHORITY.

Os estados VERIFIED_MANIFEST_ONLY e BLOCKED_IN_BASELINE são observações. A
presença de arquivo, nome de pacote ou camada declarada não equivale a
comportamento PASS, equivalência Vetus ou aceite do dono.

## Taxonomia proposta

As 11 áreas preservam o agrupamento de paridade relatado, com clínico,
comercial e integrações explicitamente detalhados:

1. Tutores, pacientes e cadastros.
2. Agenda, atendimento, comanda e clínica.
3. Estoque, compras e farmácia.
4. Profissionais e comissões.
5. Laboratório e diagnósticos.
6. Fiscal.
7. Financeiro, caixa, pagamentos, PIX e comercial.
8. Marketing e comunicação.
9. Relatórios e entregas agendadas.
10. Acesso, segurança, auditoria e LGPD.
11. Integrações e migração.

O contrato JSON registra o owner pendente, fontes, superfícies, risco,
limitações e status de cada área. Nenhuma área recebe aprovação nesta
preparação.

## Dimensões obrigatórias

Cada área precisa de contrato e evidência para:

- positivo;
- negativo;
- permissão, tenant e flags;
- persistência, reload e restart quando aplicável;
- reconciliação com fonte, ledger, documento ou oracle.

Concorrência, retry/replay, ordem, cutover e recuperação entram quando o risco
da área exigir. A ausência de uma dimensão não pode ser escondida por um
manifesto verde: vira lacuna, UNKNOWN ou BLOCKED com owner.

## Inventário e jornadas comerciais

O JSON classifica cada diretório observado de packages/modules com uma
primaryArea contável. Tracks transversais preservam jornadas sem dupla
contagem. Pacotes/fidelidade, cotações, vendas/comanda e catálogo de serviços
ficam em COM-001 a COM-004 e devem ser testados como jornadas próprias; não
ficam cobertos somente por fidelidade ou por existência de módulos.

O inventário atual possui 46 entradas e marca workflows como
BASELINE_COUNT_DRIFT_PENDING. A decisão de taxonomia e a reconciliação do delta
dependem de Product, QA e donos de domínio.

Os cenários normativos incluem SCN-001 e os failures de contrato incluem
FAIL-001; eles são critérios de verificação, não evidência de execução. O
inventário documental também não é aceitação de paridade.

## Bloqueios

PROD-003 continua dependência integral do cartão. O gate atual permite somente
esta preparação documental replanejada; não libera harness, jornadas,
fixtures, execução pública, UAT, mudança de escopo ou promoção de PROD-027.

O aceite integral exige decisão versionada de Product/QA/donos de domínio,
fixtures sintéticas, execução nas fronteiras públicas, negativos,
permissões, persistência, reconciliação, dataset Vetus autorizado, crítica
independente fresh e reabertura das áreas atingidas por novos A02/A03–A05.

O contrato normativo está em
docs/engineering/behavioral-parity-contract-prod-027.json e o guard é
scripts/validate-prod-027-behavioral-parity-contract.mjs. A implementação
funcional, os provedores e o Triplo AAA continuam bloqueados.
