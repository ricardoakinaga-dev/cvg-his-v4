# Matriz de gaps restantes — pós fase estrutural Vetus-aligned

Data: 2026-04-22
Status: consolidado
Objetivo: separar o que ainda falta em estabilidade, cobertura e profundidade funcional

## 1. Leitura da matriz

Escala usada:
- Prioridade alta: reduz risco técnico imediato ou desbloqueia fase funcional
- Prioridade média: melhora robustez e legibilidade, mas não bloqueia avanço
- Prioridade baixa: acabamento complementar ou aprofundamento oportunista

## 2. Matriz de gaps

| Área | Gap restante | Tipo | Prioridade | Impacto | Observação |
|---|---|---|---|---|---|
| Testes / Auth Store | Warning Pinia por conflito `pendingMfaUserId` no store auth | Estabilidade | Alta | Médio/Alto | Ruído recorrente que polui validações futuras |
| Testes / Enterprise | Cobertura ainda superficial em parte das superfícies enterprise | Cobertura | Alta | Alto | Há render tests e slices, mas pouco teste comportamental fino |
| Testes / Integração | Falta de baterias mais completas entre rotas, shell e superfícies críticas | Cobertura | Alta | Alto | Importante para evitar regressão da taxonomia consolidada |
| Financeiro > Cartões | Ainda sem CRUD/backend real | Funcional | Média | Alto | Taxonomia pronta, superfície inicial já existe |
| Financeiro > Custos e Despesas | Ainda sem persistência real e fluxo completo | Funcional | Média | Alto | Boa candidata à fase funcional |
| Estoque > Cadastros adicionais | Fornecedores/fabricantes/grupos/estoques ainda em camada inicial | Funcional | Média | Alto | Estrutura pronta para aprofundar |
| Relatórios > Produção | Ainda é superfície honesta inicial, sem BI real | Funcional | Média | Médio | Deve crescer quando houver definição analítica/back-end |
| Access Control | Precisa de testes mais profundos por tab/workflow | Cobertura/Funcional | Média | Alto | Página já é rica e merece suíte própria mais forte |
| API Client | Precisa de testes de health/session/history mais finos | Cobertura | Média | Médio | Estrutura existe, falta hardening |
| API Keys | Precisa de testes funcionais de criação/permissões/erros | Cobertura | Média | Alto | Página já tem bastante lógica de formulário |
| LGPD | Precisa de testes por trilha de consentimento e DSR | Cobertura | Média | Alto | Superfície sensível, vale mais robustez |
| Master Search | Precisa de testes de fluxo de busca e mocks mais específicos | Cobertura | Média | Médio | Montagem já exigiu mocks explícitos |
| Audit | Precisa de testes sobre filtros, risco e timeline | Cobertura | Média | Médio | Estrutura rica, mas ainda pouco blindada |
| Docs de próxima fase | Falta formalizar backlog funcional por onda executável | Planejamento | Média | Médio | Útil para a execução da próxima etapa |

## 3. Classificação por frente de trabalho

## 3.1 Estabilidade

Itens mais urgentes:
1. corrigir warning do store auth;
2. reduzir ruído de montagem nos testes enterprise;
3. padronizar estratégia de mocks para páginas com chamadas a serviços.

## 3.2 Cobertura

Itens mais valiosos imediatamente:
1. access-control
2. api-keys
3. lgpd
4. master-search
5. audit

Critério:
- são páginas já ricas em lógica;
- têm mais risco de regressão silenciosa;
- já justificam testes comportamentais mais completos.

## 3.3 Profundidade funcional

Melhores candidatos para a próxima fase de produto:
1. cartões / custos e despesas
2. fornecedores / fabricantes / grupos / estoques
3. relatórios de produção
4. governança enterprise

Critério:
- taxonomia pronta;
- superfície inicial já materializada;
- maior retorno agora vem de backend, CRUD e fluxo real.

## 4. Conclusão executiva

A matriz mostra que o projeto já não sofre do problema principal anterior, que era estrutura incompleta.

Agora os gaps se concentram em:
- robustez técnica;
- cobertura automatizada;
- profundidade funcional de domínios já preparados.

Isso confirma que a decisão correta para a próxima etapa é:
- estabilizar primeiro;
- aprofundar depois, com menos risco de regressão estrutural.