# PROMPT MASTER — CVG-HIS-V2 — EXECUÇÃO ENTERPRISE — HARDENING GLOBAL TRANSVERSAL

## Objetivo

Executar a trilha de hardening global transversal do CVG-HIS-V2 com base no documento `/docs/90-hardening-global.md`, reduzindo débito técnico estrutural e aumentando confiabilidade operacional, consistência fullstack e robustez de auditoria, sem reabrir escopo funcional dos módulos já aprovados.

Regra central:

O hardening global é uma frente transversal e técnica.
Ele não deve reabrir escopo funcional de módulos já aprovados, salvo quando uma inconsistência estrutural exigir correção objetiva para preservar contrato, persistência ou previsibilidade operacional.

Fonte oficial:

- `/docs/90-hardening-global.md`

Escopo desta execução:

- repository-first transversal
- remoção de caches internos como fonte primária
- reforço de constraints no banco
- testes HTTP completos
- versionamento otimista em pontos sensíveis
- redução de `delete+recreate` em coleções
- padronização de lifecycle endpoints
- estabilização da suíte ampla

Fora do escopo desta execução:

- novos módulos funcionais
- redesign de UX
- reescrita arquitetural ampla sem necessidade comprovada
- mudanças cosméticas
- refatoração abstrata sem ganho operacional claro

## PRINCÍPIO DE EXECUÇÃO

O hardening deve:

- preservar comportamento funcional válido já conquistado
- reduzir ambiguidade estrutural
- tornar contratos mais confiáveis
- aproximar runtime real, testes e staging
- evitar regressão funcional

Não fazer:

- reabrir módulos para “melhorias gerais”
- criar camadas novas sem necessidade
- trocar padrão apenas por gosto arquitetural
- quebrar frontend ou contratos expostos sem compatibilidade transitória coordenada

## ORDEM OBRIGATÓRIA DE EXECUÇÃO

Executar nesta ordem:

FASE 1 — Padronizar repository-first
FASE 2 — Remover cache dos services
FASE 3 — Constraints reais no banco — onda segura
FASE 4 — Testes HTTP completos
FASE 5 — Versionamento otimista
FASE 6 — Evitar delete+recreate em coleções
FASE 7 — Padronizar lifecycle endpoints
FASE 8 — Constraints reais no banco — onda sensível
FASE 9 — Estabilizar suíte ampla

Não inverter a ordem sem motivo técnico explícito.

## FASE 1 — PADRONIZAR REPOSITORY-FIRST

Objetivo:
Consolidar repository como fonte primária de leitura e escrita em todos os módulos operacionais.

Ações obrigatórias:

- identificar services que ainda bifurcam comportamento entre memória e persistência
- garantir que `list`, `detail`, transições, fechamento, revisão e validações críticas leiam do estado persistido atual
- eliminar dependência de entidade previamente carregada quando a operação exige estado atual do banco
- reduzir divergência entre ambiente com repository e ambiente com fallback local

Resultado esperado:

- repository vira fonte real do comportamento operacional exposto
- fluxos críticos não dependem de estado em memória previamente aquecido

## FASE 2 — REMOVER CACHE DOS SERVICES

Objetivo:
Eliminar cache, `Map` e estado em memória como fonte primária dos services.

Ações obrigatórias:

- localizar caches internos nos modules/services
- manter cache apenas como detalhe secundário, se realmente necessário
- impedir que restart de runtime altere comportamento funcional
- reler do repository antes de mutações sensíveis quando houver risco de estado stale

Resultado esperado:

- memória deixa de governar o comportamento funcional
- banco/repositório passa a ser a fonte operacional em todos os fluxos expostos

## FASE 3 — CONSTRAINTS REAIS NO BANCO — ONDA SEGURA

Objetivo:
Reforçar no banco as regras seguras e já maduras do contrato.

Ações obrigatórias:

- adicionar `NOT NULL` onde o contrato já está consolidado
- adicionar defaults coerentes
- aplicar checks simples
- endurecer enums centrais quando viável
- criar migrations com backfill quando necessário

Resultado esperado:

- banco passa a bloquear estados básicos inválidos
- regras críticas deixam de depender só de frontend/service

Importante:
Nesta fase NÃO aplicar ainda constraints muito sensíveis dependentes de status complexo ou semântica condicional.

## FASE 4 — TESTES HTTP COMPLETOS

Objetivo:
Cobrir contratos HTTP principais com testes fim a fim.

Ações obrigatórias:

- criar testes focados por rota para create, list, detail, update e transições críticas
- validar payload enriquecido real
- cobrir especialmente:
  - expansões usadas pelo frontend
  - aliases normalizados
  - contratos que passaram por hardening
- preferir rotas dos módulos mais maduros primeiro

Resultado esperado:

- regressões em contrato HTTP passam a ser detectadas diretamente
- auditorias futuras dependem menos de leitura manual de código

## FASE 5 — VERSIONAMENTO OTIMISTA

Objetivo:
Reduzir overwrite silencioso em updates concorrentes.

Ações obrigatórias:

- identificar módulos com histórico/revisão onde concorrência faz diferença
- usar `versionNumber` ou equivalente
- exigir `expectedVersion` quando o risco justificar
- falhar com erro explícito de conflito em caso de divergência

Resultado esperado:

- menor risco de perda lógica em edição concorrente
- comportamento mais seguro em fluxos clínicos e administrativos

## FASE 6 — EVITAR DELETE+RECREATE EM COLEÇÕES

Objetivo:
Reduzir perda de rastreabilidade em updates de listas filhas.

Ações obrigatórias:

- identificar módulos onde update de coleções ainda usa `delete+recreate`
- substituir, quando viável, por reconcile por item:
  - atualizar existentes
  - inserir novos
  - encerrar/remover controladamente ausentes
- manter `delete+recreate` só como transição temporária documentada, quando não houver alternativa simples imediata

Resultado esperado:

- melhor histórico
- menor risco de perda acidental de item omitido
- base mais preparada para auditoria fina

## FASE 7 — PADRONIZAR LIFECYCLE ENDPOINTS

Objetivo:
Reduzir ambiguidade entre `PATCH` genérico e endpoints específicos de ciclo de vida.

Ações obrigatórias:

- definir padrão transversal:
  - ou `PATCH` com contrato de mudança de estado claro
  - ou endpoints dedicados como `cancel`, `complete`, `discharge`, `amend`, `supersede`
- evitar mistura arbitrária entre módulos
- manter naming e comportamento consistentes
- preservar compatibilidade transitória documentada quando necessário

Resultado esperado:

- APIs mais previsíveis
- menor custo cognitivo entre módulos
- transições mais claras para backend, frontend e auditoria

## FASE 8 — CONSTRAINTS REAIS NO BANCO — ONDA SENSÍVEL

Objetivo:
Aplicar constraints mais sensíveis, dependentes de regra de negócio forte ou status operacional.

Ações obrigatórias:

- avaliar unicidade parcial
- reforçar constraints condicionais onde a regra exigir
- aplicar garantias mais fortes de domínio quando os dados e migrations permitirem
- sempre fazer:
  - diagnóstico prévio
  - backfill/limpeza
  - aplicação da constraint

Exemplos:

- unicidade de internação ativa por paciente
- regras condicionais por status
- garantias estruturais mais fortes em módulos críticos

Resultado esperado:

- persistência passa a proteger invariantes mais sofisticados do domínio

## FASE 9 — ESTABILIZAR SUÍTE AMPLA

Objetivo:
Fazer a suíte global da API fechar de forma reproduzível.

Ações obrigatórias:

- identificar falhas restantes em `notifications`, `appointments`, `users` e outros módulos ainda contaminando o gate global
- separar falha de módulo de falha de infraestrutura de teste
- corrigir de forma definitiva os cenários restantes
- não aceitar estado permanente de “módulos aprovados com suíte global sempre quebrada”

Resultado esperado:

- suíte ampla passa com confiabilidade
- gate técnico global passa a ser utilizável de verdade

## REGRAS DE ROLLOUT

1. Nenhuma rodada de hardening pode quebrar contrato HTTP existente sem ajuste coordenado de frontend.
2. Toda mudança transversal deve ser aplicada primeiro ao módulo mais maduro e depois propagada.
3. Toda migration com nova constraint deve prever:
   - diagnóstico prévio
   - backfill, se necessário
   - aplicação da constraint
4. Toda mudança de lifecycle endpoint deve manter compatibilidade transitória documentada quando houver consumidores existentes.
5. Toda substituição de `delete+recreate` deve preservar comportamento funcional antes de buscar granularidade mais fina.
6. Nenhuma frente de hardening deve reabrir escopo funcional de módulo já aprovado, salvo defeito estrutural comprovado.

## MÓDULOS PRIORITÁRIOS PARA INÍCIO

Iniciar preferencialmente pelos módulos já mais maduros e centrais:

- Pacientes
- Atendimentos
- Prontuário Clínico
- Prescrições
- Exames
- Internação
- Execução de Prescrição
- Alta

Usar Tutores conforme necessário para coerência transversal.
Tratar `users`, `notifications` e `appointments` especialmente na fase de suíte ampla e correções globais de infraestrutura/typing.

## VALIDAÇÃO CONTÍNUA

Após cada fase:

- rodar build
- rodar typecheck
- rodar testes focados afetados
- validar contratos HTTP afetados
- corrigir antes de avançar

Não avançar com regressão aberta na fase atual.

## ENTREGA FINAL OBRIGATÓRIA

Ao final, entregar:

1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo por fase do que foi endurecido
4. módulos impactados em cada fase
5. pendências remanescentes, se houver
6. riscos residuais, se houver
7. confirmação final exata:

`Hardening global transversal concluído`

Importante:
Não declarar o sistema pronto para produção apenas por concluir esta frente.
Declarar apenas que a trilha transversal prevista em `/docs/90-hardening-global.md` foi executada.

## CRITÉRIO DE SUCESSO

O hardening global será considerado bem executado se:

- services não dependerem mais de memória como fonte primária
- suite ampla da API estiver estável
- regras críticas tiverem reforço real de banco
- updates concorrentes críticos tiverem proteção mínima
- contratos HTTP principais estiverem cobertos por testes
- lifecycle endpoints seguirem padrão coerente
- coleções filhas não dependerem mais de `delete+recreate` como regra geral
- repository-first estiver consolidado como padrão transversal

## FIM DO PROMPT
