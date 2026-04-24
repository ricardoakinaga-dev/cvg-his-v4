# Relatório Executivo: Plano de Migração por Ondas do Domínio Laboratório

Data: 2026-04-24
Escopo: plano executivo de migração por ondas do domínio `Laboratório`, convertendo prioridades já mapeadas em fases entregáveis.

## 1. Síntese executiva

O domínio `Laboratório` deve ser migrado por ondas, e não por telas isoladas.

A lógica do plano é:

- primeiro fechar o `core operacional`;
- depois adicionar `profundidade analítica`;
- em seguida consolidar `norma` e `infraestrutura técnica`;
- por fim fechar `integrações`, `entrega` e `rollout`.

Essa abordagem reduz:

- risco de regressão clínica;
- risco de duplicidade entre beta e legacy;
- risco de criar uma casca SPA sem capacidade real.

## 2. Princípios do plano

O plano assume cinco princípios:

- `backend-first` para o domínio laboratorial;
- migração por `capacidades`, não por telas;
- preservação da espinha operacional `Exames -> Esteira -> Laudos`;
- migração diferenciada das famílias `Hemogramas`, `Urina` e `Bioquímico`;
- rollout progressivo, sem big bang.

## 3. Visão geral das ondas

### Onda 0: Fundação do Domínio

Objetivo:

- criar a base transacional e contratual do laboratório no target.

Entregas:

- API laboratorial dedicada;
- modelo persistente para:
  - ordens de exame;
  - estados da esteira;
  - laudos;
  - tipos de laudo;
- contratos explícitos para integração com `animal`, `cliente`, `atendimento` e `internação`;
- remoção de dependência principal de derivação local no serviço laboratorial.

Critério de saída:

- o domínio existe como backend real;
- o shell deixa de ser apenas agrupador visual.

Risco atacado:

- shell forte com profundidade irregular.

### Onda 1: Core Operacional Mínimo

Objetivo:

- fechar o ciclo mínimo utilizável do laboratório.

Escopo:

- `Exames`
- `Esteira de Exames`
- `Laudos`
- `Tipos de Laudo`

Entregas:

- listagem e detalhe de ordens;
- fluxo de estados da esteira;
- emissão e consulta de laudos;
- templates de laudo utilizáveis;
- navegação operacional ponta a ponta.

Critério de saída:

- o laboratório consegue operar requisição -> esteira -> laudo no target;
- o fluxo deixa de depender do legado para a espinha operacional.

Risco atacado:

- migração superficial sem jornada completa.

### Onda 2: Resultados Especializados Quantitativos

Objetivo:

- migrar as trilhas analíticas tabulares do laboratório.

Escopo:

- `Hemogramas`
- `Bioquímico`

Entregas:

- telas e APIs próprias por família;
- parâmetros estruturados;
- leitura por faixa;
- base para comparação e destaque de desvio;
- vínculo consistente com a ordem e com o laudo.

Critério de saída:

- os dois módulos quantitativos operam fora do legado;
- o target suporta resultado estruturado paramétrico real.

Risco atacado:

- genericismo excessivo;
- perda de aderência técnica nos resultados tabulares.

### Onda 3: Resultado Especializado Clínico-Estruturado

Objetivo:

- migrar a trilha `Urina` com modelagem própria.

Escopo:

- `Urina`

Entregas:

- estrutura por seções;
- suporte a leitura `física + química + microscópica`;
- modelo compatível com dados descritivos e semi-quantitativos;
- integração com laudo e esteira.

Critério de saída:

- o target suporta resultado especializado não tabular;
- a arquitetura do laboratório passa a contemplar os dois padrões de resultado.

Risco atacado:

- tratar `Urina` como cópia simplificada de `Hemogramas`.

### Onda 4: Camada Normativa

Objetivo:

- fechar a interpretação automatizada do domínio.

Escopo:

- `Vlr. Ref. Hemograma`
- `Vlr. Ref. Bioquímico`

Entregas:

- cadastro de valores de referência;
- modelagem por `tipo de exame`, `espécie`, `parâmetro`, `idade`;
- aplicação consistente de faixa nos módulos analíticos;
- base de comparação previsível.

Critério de saída:

- o target deixa de registrar apenas valores e passa a interpretar desvios de forma consistente.

Risco atacado:

- laboratório “bonito”, porém raso;
- número sem contexto clínico.

### Onda 5: Infraestrutura Técnica

Objetivo:

- fechar a base de governança operacional do laboratório.

Escopo:

- `Equipamentos`
- manutenção;
- calibração.

Entregas:

- cadastro de ativos laboratoriais;
- histórico de manutenção;
- controle de calibração;
- suporte à confiabilidade operacional dos módulos quantitativos.

Critério de saída:

- o domínio deixa de depender de infraestrutura técnica implícita;
- a operação laboratorial ganha sustentação formal no target.

Risco atacado:

- resultado sem lastro técnico;
- ausência de governança operacional.

### Onda 6: Integrações e Reflexos

Objetivo:

- fechar o laboratório como domínio transversal completo.

Escopo:

- integração com `atendimento`;
- integração com `internação`;
- reflexo em `cliente` e `animal`;
- integração com `financeiro`;
- entrega e comunicação.

Entregas:

- rastreabilidade de origem assistencial;
- vínculo consistente com contexto de paciente e tutor;
- origem financeira clara;
- fechamento do ciclo de entrega;
- pontos de integração com mensageria e comunicação.

Critério de saída:

- o laboratório se comporta como domínio transversal completo no target;
- não apenas como módulo clínico isolado.

Risco atacado:

- desacoplamento entre clínica, operação e economia.

## 4. Priorização executiva resumida

### Prioridade imediata

- Onda 0
- Onda 1

Motivo:

- sem essas duas ondas, o laboratório continua sendo apenas um agrupamento visual e documental.

### Prioridade alta

- Onda 2
- Onda 3

Motivo:

- aqui o domínio ganha profundidade diagnóstica real.

### Prioridade estrutural

- Onda 4
- Onda 5

Motivo:

- aqui o laboratório deixa de ser funcionalmente incompleto.

### Prioridade de fechamento

- Onda 6

Motivo:

- fecha o valor transversal do domínio e o reflexo operacional/econômico.

## 5. Dependências entre ondas

Dependências mais importantes:

- Onda 1 depende da Onda 0.
- Onda 2 depende de Onda 0 e Onda 1.
- Onda 3 depende de Onda 0 e Onda 1.
- Onda 4 depende de Onda 2 e parcialmente de Onda 3.
- Onda 5 pode começar após Onda 0, mas gera mais valor quando Onda 2 já existe.
- Onda 6 depende do domínio já operando nas ondas anteriores.

Leitura:

- a ordem correta importa;
- inverter essa sequência aumenta risco de retrabalho.

## 6. Entregáveis por onda

### Onda 0

- domínio backend real
- contratos
- persistência
- integrações-base

### Onda 1

- ordens
- esteira
- laudos
- templates

### Onda 2

- hemogramas
- bioquímico

### Onda 3

- urina

### Onda 4

- valores de referência

### Onda 5

- equipamentos
- manutenção
- calibração

### Onda 6

- integrações transversais
- entrega
- reflexo financeiro/comercial

## 7. Sequência recomendada de rollout

Rollout mais seguro:

1. liberar backend e contratos sem expor front completo;
2. expor `Exames`, `Esteira` e `Laudos` para uso controlado;
3. habilitar famílias analíticas por trilha;
4. ativar camada de referência;
5. ativar equipamentos e governança técnica;
6. expandir integrações e retirar dependência remanescente do legado.

Isso permite:

- cortar risco clínico;
- validar consistência por fatia;
- reduzir impacto operacional.

## 8. Riscos por onda

### Onda 0

- modelagem incompleta do domínio;
- contratos inconsistentes.

### Onda 1

- quebra do fluxo da esteira;
- laudo sem rastreabilidade.

### Onda 2

- simplificação excessiva do modelo tabular;
- perda de comparação por faixa.

### Onda 3

- submodelagem de `Urina`;
- perda de estrutura clínica por seções.

### Onda 4

- referência sem contexto de espécie/idade;
- interpretação automática fraca.

### Onda 5

- equipamento tratado como inventário simples;
- ausência de rotina de manutenção/calibração.

### Onda 6

- desacoplamento com `financeiro`, `internação` e `atendimento`;
- entrega sem fechamento operacional.

## 9. Recomendação executiva final

O plano mais seguro é tratar o `Laboratório` como um programa próprio dentro da migração do ERP.

Recomendação:

- usar ondas curtas;
- medir fechamento por capacidade;
- evitar chamar o domínio de migrado antes da Onda 4;
- considerar Onda 5 e Onda 6 como fechamento de maturidade, não detalhes opcionais.

## 10. Conclusão final

O domínio `Laboratório` já está suficientemente entendido para um plano executivo de migração por ondas.

A melhor sequência é:

- fundação;
- core operacional;
- resultados especializados;
- referência;
- equipamentos;
- integrações finais.

Esse plano converte a leitura de `gaps`, `riscos` e `prioridades` em fases entregáveis, com ordem defensável e risco controlado.
