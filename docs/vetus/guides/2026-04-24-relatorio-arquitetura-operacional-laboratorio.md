# Relatório Consolidado: Arquitetura Operacional do Domínio Laboratório

Data: 2026-04-24
Escopo: consolidação do domínio `Laboratório` em uma visão única de arquitetura operacional, integrando `ordens`, `esteira`, `resultados`, `referências`, `equipamentos` e `laudos`.

## 1. Síntese executiva

O domínio `Laboratório` do ERP Vetus aparece como uma arquitetura legacy composta por blocos especializados, não como uma única aplicação monolítica de fluxo fechado.

A leitura consolidada ficou assim:

- `Exames` representa a ordem diagnóstica;
- `Esteira de Exames` representa a orquestração operacional;
- `Hemogramas`, `Urina` e `Bioquímico` representam famílias analíticas de resultado;
- `Vlr. Ref. Hemograma` e `Vlr. Ref. Bioquímico` representam a camada normativa;
- `Equipamentos` representa a infraestrutura técnica do laboratório;
- `Laudos` e `Tipos de Laudo` representam a saída documental e clínica.

O laboratório, portanto, é um domínio em camadas.

## 2. Visão macro da arquitetura

O fluxo consolidado mais coerente ficou assim:

`Requisição de exame -> Exames -> Esteira de Exames -> Coleta -> Resultado especializado -> Laudo -> Entrega`

Com os blocos de sustentação atuando em paralelo:

- `Vlr. Ref. ...` sustenta interpretação automática dos resultados;
- `Equipamentos` sustenta a confiabilidade operacional da medição;
- `Tipos de Laudo` sustenta a padronização documental.

Leitura:

- `Exames` inicia o processo;
- `Esteira` governa o processo;
- `Resultados` materializam o processo;
- `Referências` qualificam o processo;
- `Equipamentos` viabilizam tecnicamente o processo;
- `Laudos` encerram o processo.

## 3. Camada 1: Ordens laboratoriais

`Exames` é a porta de entrada operacional do domínio.

Papel:

- registrar a ordem laboratorial;
- vincular `cliente`, `animal` e `data`;
- funcionar como fila inicial de itens examináveis;
- servir de origem para a trilha diagnóstica.

Leitura consolidada:

- a ordem nasce no contexto assistencial;
- ela ainda não é resultado;
- ela ainda não é laudo;
- ela é o objeto operacional que será processado nas próximas camadas.

## 4. Camada 2: Orquestração operacional

`Esteira de Exames` é a camada que transforma ordem em operação diária.

Estados confirmados por documentação:

- `Solicitado`
- `Coletado`
- `Em Análise`
- `Laudado`
- `Entregue`

Papel:

- organizar o trabalho por etapa;
- permitir acompanhamento do exame no tempo;
- conectar requisição, coleta, análise e entrega;
- operar como fila transversal entre atendimento e laboratório.

Leitura:

- a esteira vive tecnicamente sob `Atendimento`;
- funcionalmente, ela é uma peça central do laboratório;
- ela é o ponto de coordenação e SLA do domínio.

## 5. Camada 3: Resultados especializados

O ERP separa os resultados laboratoriais em famílias distintas.

### 5.1 Hemogramas

Papel:

- resultado analítico hematológico;
- estrutura tabular;
- comparação com faixa normativa;
- histórico comparativo.

Leitura:

- módulo paramétrico;
- quantitativo;
- mais extenso;
- fortemente apoiado em referência automática.

### 5.2 Urina

Papel:

- resultado analítico urinário;
- estrutura `física + química + microscópica`;
- organização multisseção;
- maior densidade observacional.

Leitura:

- módulo mais descritivo;
- menos puramente tabular;
- mais próximo de uma composição clínica estruturada.

### 5.3 Bioquímico

Papel:

- painel bioquímico especializado;
- estrutura tabular;
- comparação por espécie;
- leitura objetiva de parâmetros.

Leitura:

- módulo paramétrico;
- quantitativo;
- mais compacto que `Hemogramas`;
- fortemente apoiado em referência contextual.

### 5.4 Leitura comparativa entre as famílias

`Hemogramas`:

- tabular;
- extenso;
- comparativo.

`Urina`:

- multisseção;
- descritivo;
- clínico-estruturado.

`Bioquímico`:

- tabular;
- compacto;
- orientado a painel.

Conclusão:

- o laboratório não modela todos os resultados do mesmo jeito;
- há pelo menos dois padrões arquiteturais de resultado:
  - quantitativo-tabular;
  - clínico-estruturado por seções.

## 6. Camada 4: Referências normativas

`Vlr. Ref. Hemograma` e `Vlr. Ref. Bioquímico` formam a camada de norma clínica do laboratório.

Modelo documentado:

- `exam_type_id`
- `specie_id`
- `parameter_name`
- `unit`
- `min_value`
- `max_value`
- `age_min_months`
- `age_max_months`

Papel:

- definir faixa esperada por tipo de exame;
- variar a referência por espécie;
- suportar variação por idade;
- alimentar a leitura automática do resultado.

Leitura:

- a norma é separada do valor observado;
- o sistema cruza `exam_results` e `exam_reference_values`;
- isso permite interpretar sem misturar regra com evento clínico.

Essa camada é o que transforma número em desvio, e desvio em sinal clínico.

## 7. Camada 5: Infraestrutura técnica

`Equipamentos` fecha a base estrutural do laboratório.

Responsabilidades confirmadas:

- cadastro de equipamentos;
- manutenção preventiva e corretiva;
- calibração.

Entidades previstas:

- `LabEquipment`
- `EquipmentMaintenance`

Papel:

- registrar ativos laboratoriais;
- controlar aptidão técnica;
- sustentar a confiabilidade da medição;
- dar base para governança operacional e auditoria.

Leitura:

- o laboratório não depende apenas de cadastro clínico;
- depende de infraestrutura técnica controlada;
- isso aproxima o domínio de uma operação assistencial real, não só de um prontuário com anexos.

## 8. Camada 6: Saída documental

`Laudos` e `Tipos de Laudo` são a camada de formalização diagnóstica.

`Laudos`:

- documento clínico final;
- título;
- corpo;
- imagem/anexo;
- datas de entrada e finalização;
- vínculo com cliente, proprietário e animal.

`Tipos de Laudo`:

- template;
- estrutura de conteúdo;
- padronização de emissão.

Leitura:

- o resultado analítico não é a saída final do domínio;
- a saída final é documental e clínica;
- o laudo fecha o ciclo de comunicação do laboratório com o atendimento e com o cliente.

## 9. Arquitetura em camadas

O domínio consolidado pode ser descrito assim:

### 9.1 Camada de entrada

- `Exames`

### 9.2 Camada de fluxo

- `Esteira de Exames`

### 9.3 Camada de execução analítica

- `Hemogramas`
- `Urina`
- `Bioquímico`

### 9.4 Camada normativa

- `Vlr. Ref. Hemograma`
- `Vlr. Ref. Bioquímico`

### 9.5 Camada de infraestrutura

- `Equipamentos`

### 9.6 Camada documental

- `Laudos`
- `Tipos de Laudo`

Essa divisão explica bem o domínio observado e ajuda diretamente no planejamento de migração ou reconstrução.

## 10. Leitura arquitetural operacional

O laboratório do Vetus não parece ser uma única vertical simples. Ele é uma composição de subdomínios articulados.

Leitura consolidada:

- `ordem` e `fila` estão mais próximos da operação assistencial;
- `resultado` está mais próximo da execução laboratorial;
- `referência` e `equipamento` estão mais próximos da governança técnica;
- `laudo` está mais próximo da formalização clínica.

Isso sugere uma arquitetura em que diferentes superfícies atendem responsabilidades diferentes, mas compartilham o mesmo domínio.

## 11. Principais conclusões

- o domínio `Laboratório` é robusto no legado e estruturado por camadas claras;
- `Esteira de Exames` é a espinha operacional do processamento;
- `Hemogramas`, `Urina` e `Bioquímico` não são variantes cosméticas, mas famílias de resultado com modelagens diferentes;
- `Vlr. Ref. ...` é a base que sustenta interpretação automatizada;
- `Equipamentos` fecha o eixo de confiabilidade operacional;
- `Laudos` e `Tipos de Laudo` encerram o domínio com formalização documental.

## 12. Conclusão final

O `Laboratório` do ERP Vetus forma uma arquitetura operacional madura e coerente, ainda que espalhada em superfícies legacy distintas.

O encadeamento consolidado ficou claro:

- a ordem entra em `Exames`;
- a execução é governada pela `Esteira`;
- a análise ocorre em módulos especializados;
- a interpretação é apoiada por referências normativas;
- a infraestrutura técnica é sustentada por equipamentos;
- a saída clínica é formalizada em laudo.

Essa leitura já é suficiente para tratar `Laboratório` como um domínio de negócio bem definido e pronto para planejamento de modelagem, migração ou reimplementação.
