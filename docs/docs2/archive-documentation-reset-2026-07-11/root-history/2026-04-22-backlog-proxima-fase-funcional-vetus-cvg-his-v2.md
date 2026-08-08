# Backlog priorizado — próxima fase funcional após consolidação estrutural

Data: 2026-04-22
Status: proposto
Objetivo: organizar a próxima fase em uma sequência pragmática de estabilização, cobertura e aprofundamento funcional

## 1. Princípio de priorização

A ordem proposta é:
1. reduzir ruído técnico e fragilidade de teste;
2. blindar superfícies já ricas com cobertura melhor;
3. só então puxar um subdomínio para backend/CRUD real.

Isso preserva o valor do que já foi estruturado e diminui regressões na transição para a próxima fase.

## 2. Backlog priorizado

## P0 — Estabilização imediata

### P0.1 Corrigir warning do store auth
Objetivo:
- eliminar o conflito entre state e getter `pendingMfaUserId`

Arquivos prováveis:
- `apps/spa/src/stores/auth.ts`
- testes relacionados de auth/MFA

Resultado esperado:
- menos ruído em testes enterprise e páginas dependentes de auth.

### P0.2 Padronizar mocks de serviços para páginas ricas
Objetivo:
- evitar fetches e side effects acidentais em testes de superfície

Áreas alvo:
- access-control
- lgpd
- master-search
- api-client
- api-keys
- audit

Resultado esperado:
- testes mais previsíveis e menos acoplados ao ambiente.

## P1 — Cobertura das superfícies enterprise

### P1.1 Access Control
Cobrir:
- tabs principais
- catálogo vazio
- matriz
- filtros simples
- estados de loading/erro

### P1.2 API Keys
Cobrir:
- criação de chave
- validação de formulário
- permissões
- mensagens de erro/sucesso

### P1.3 LGPD
Cobrir:
- consentimento
- criação de solicitação DSR
- estados pendente/concluído/rejeitado

### P1.4 Master Search
Cobrir:
- busca vazia
- busca com resultados
- resultados por tutores/pacientes
- limpeza de query

### P1.5 Audit
Cobrir:
- filtros
- classificação de risco
- empty state
- timeline/lista carregada

## P2 — Consolidação transversal

### P2.1 Smoke suite do shell principal
Objetivo:
- validar rapidamente que as rotas-chave continuam montando após futuras mudanças

Ramos alvo:
- shell principal
- relatórios por domínio
- console enterprise
- financeiro expandido
- estoque expandido

### P2.2 Matriz curta de regressão estrutural
Objetivo:
- formalizar um conjunto enxuto de comandos de validação antes de cada nova onda funcional

## P3 — Primeira onda funcional real

Recomendação de escolha:
- `Financeiro > Cartões / Custos e Despesas`

Motivo:
- já existe superfície inicial;
- domínio tem valor ERP claro;
- a transição para backend/CRUD é mais direta e de alto impacto.

Alternativa forte:
- `Estoque > Cadastros adicionais`

Motivo:
- ramos já materializados;
- forte valor operacional;
- relação natural com catálogo, inventory e fiscal.

## 3. Sequência executiva sugerida

### Sprint técnico 1
- corrigir warning do auth store
- padronizar mocks enterprise
- estabilizar suíte base

### Sprint técnico 2
- access-control
- api-keys
- lgpd
- master-search
- audit

### Sprint funcional 1
Escolher um foco:
- opção A: financeiro cadastros reais
- opção B: estoque cadastros reais

Minha recomendação:
- opção A primeiro

## 4. Próximo passo recomendado imediatamente

Se a equipe quiser seguir com menor risco e maior retorno composto, o próximo passo ideal é:

### abrir uma mini-fase de estabilização + cobertura enterprise
Começando por:
1. `auth.ts` warning
2. `access-control`
3. `api-keys`
4. `lgpd`
5. `master-search`
6. `audit`

## 5. Conclusão

A próxima fase mais inteligente não é outra expansão grande de estrutura.

Ela deve ser:
- primeiro, consolidar a base já aberta;
- depois, escolher um domínio materializado e puxar fluxo real.

Isso reduz retrabalho, melhora a confiança do código e transforma a fase seguinte em entrega funcional de verdade, não apenas nova organização visual.