# Hardening Global

## Objetivo

Consolidar os endurecimentos tecnicos transversais do CVG-HIS-V2 apos as rodadas de implementacao modulares, reduzindo debito tecnico estrutural e melhorando confiabilidade operacional, consistencia fullstack e robustez de auditoria.

Este documento nao reabre escopo funcional de modulos. Ele organiza uma trilha de hardening horizontal para o sistema.

## Itens obrigatorios

### 1. Remover cache dos services

Objetivo:

- eliminar dependencia operacional de `Map`, cache interno ou estado em memoria como fonte primaria de leitura/mutacao nos services.

Diretriz:

- service pode manter cache apenas como detalhe secundario, nunca como fonte de verdade;
- list, detail, transition, close, update e fluxos expostos pela API devem ser repository-first;
- sempre reler do repositório antes de mutacoes sensiveis quando houver risco de estado stale.

Resultado esperado:

- restart de runtime nao altera comportamento funcional do modulo;
- banco/repositorio passa a ser a fonte real em todos os fluxos expostos.

### 2. Estabilizar suite ampla

Objetivo:

- fazer a suite ampla de testes da API fechar sem falhas residuais externas recorrentes.

Diretriz:

- identificar e corrigir definitivamente os cenarios restantes em `notifications`, `appointments` e outros modulos que ainda contaminam o gate global;
- separar com clareza falha de modulo de falha de infraestrutura de teste;
- nao aceitar modulo “aprovado” com suite global permanentemente quebrada como estado final duradouro do projeto.

Resultado esperado:

- suite ampla passa de forma reprodutivel;
- gate tecnico global fica confiavel.

### 3. Constraints reais no banco

Objetivo:

- endurecer no banco as regras que hoje dependem apenas de service/frontend.

Diretriz:

- adicionar `NOT NULL` onde o contrato ja exige obrigatoriedade;
- adicionar constraints de unicidade onde a regra de negocio exige unicidade real;
- restringir valores de status/enums relevantes quando viavel com a estrategia atual;
- evitar deixar regra critica apenas na camada de aplicacao se ela puder ser reforcada na persistencia.

Exemplos:

- unicidade de internação ativa por paciente;
- obrigatorios centrais de encounters, prescricoes, exames e prontuario;
- consistencia de status principais.

Resultado esperado:

- banco deixa de aceitar estados estruturalmente invalidos com facilidade.

### 4. Versionamento otimista

Objetivo:

- reduzir overwrite silencioso em updates concorrentes.

Diretriz:

- adotar `versionNumber` ou campo equivalente como controle de concorrencia quando o modulo ja possui historico ou revisao;
- exigir `expectedVersion` nos updates sensiveis quando o risco justificar;
- falhar com erro explicito de conflito quando a versao persistida divergir da esperada.

Resultado esperado:

- menor risco de perda logica por edicao concorrente;
- comportamento mais seguro em fluxos clinicos e administrativos.

### 5. Testes HTTP completos

Objetivo:

- complementar testes de service/runtime com cobertura HTTP fim a fim dos contratos expostos.

Diretriz:

- criar testes focados por rota para list, detail, create, update e transicoes criticas;
- validar payload enriquecido real, nao apenas comportamento interno do service;
- cobrir principalmente fluxos onde frontend depende de expansoes ou aliases normalizados.

Resultado esperado:

- regressao em contrato HTTP passa a ser detectada diretamente;
- auditorias futuras ficam menos dependentes de leitura manual de codigo.

### 6. Padronizar lifecycle endpoints

Objetivo:

- reduzir ambiguidade entre `PATCH` generico e endpoints explicitos de ciclo de vida.

Diretriz:

- definir um padrao transversal para transicoes relevantes:
  - ou `PATCH` com contrato claro de mudanca de estado
  - ou endpoints dedicados como `cancel`, `complete`, `discharge`, `amend`, `supersede`
- evitar mistura arbitraria entre modulos;
- manter naming e comportamento consistentes no sistema.

Resultado esperado:

- APIs mais previsiveis;
- menor custo cognitivo entre modulos.

### 7. Evitar delete+recreate em coleções

Objetivo:

- reduzir perda de rastreabilidade e comportamento destrutivo em updates de listas filhas.

Diretriz:

- evitar estrategia de apagar toda a colecao e recriar quando houver identidade logica dos itens;
- preferir reconcile por item:
  - atualizar existentes
  - inserir novos
  - encerrar/remover controladamente os ausentes
- manter `delete+recreate` apenas como transicao temporaria e documentada quando nao houver alternativa simples imediata.

Resultado esperado:

- melhor historico;
- menor risco de perda acidental de item omitido;
- base mais preparada para auditoria fina.

### 8. Padronizar repository-first

Objetivo:

- consolidar um padrao arquitetural unico para todos os modulos operacionais.

Diretriz:

- services devem usar repository como fonte primaria de leitura e escrita;
- comportamento em memoria deve ser suporte local, nunca contrato central;
- detail, list, transicao, fechamento, revisao e validacoes de consistencia devem ler do estado persistido atual;
- evitar bifurcacao de comportamento entre ambiente com repository e ambiente sem repository.

Resultado esperado:

- arquitetura mais previsivel;
- menor diferenca entre teste, runtime local e staging.

## Ordem recomendada de execucao

1. Padronizar repository-first
2. Remover cache dos services
3. Constraints reais no banco
4. Versionamento otimista
5. Evitar delete+recreate em coleções
6. Padronizar lifecycle endpoints
7. Testes HTTP completos
8. Estabilizar suite ampla

## Critério de fechamento do hardening global

O hardening global pode ser considerado concluido quando:

- services nao dependerem mais de memoria como fonte primaria;
- suite ampla da API estiver estavel;
- regras criticas tiverem reforco real de banco;
- updates concorrentes criticos tiverem protecao minima;
- contratos HTTP principais estiverem cobertos por testes;
- lifecycle endpoints seguirem padrao unico;
- colecoes filhas nao dependerem mais de `delete+recreate` como regra geral;
- repository-first estiver consolidado como padrao transversal do projeto.
