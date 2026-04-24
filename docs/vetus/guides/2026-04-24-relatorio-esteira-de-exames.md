# Relatório de Inspeção: Esteira de Exames

Data: 2026-04-24
Escopo: inspeção e planejamento da entidade `Esteira de Exames`, com foco no encadeamento `solicitação -> coleta -> análise -> laudo -> entrega`.

## 1. Evidência disponível nesta passada

Nesta rodada, a rota legada da esteira foi confirmada, mas a abertura direta da tela ficou bloqueada pelo desafio da borda:

- rota mapeada no menu legado: `/Sistema/Atendimento/EsteiraExames.htm`;
- classificação anterior do módulo: `Legado`, complexidade `Média`;
- posicionamento no shell: item de `Atendimento`, ao lado de `Esteira`, `Vacinas e Vermífugos`, `Orçamentos` e `Resgate de Pontos`;
- planejamento interno com fluxo explícito do domínio laboratorial;
- tentativa direta de acesso HTTP retornando `403` com `cf-mitigated: challenge`;
- tentativa de automação Playwright ficando parada no desafio da Cloudflare antes de abrir a tela real.

Por isso, este relatório combina:

- evidência direta de navegação e malha de rotas;
- documentação interna do projeto;
- consistência com o relatório já fechado de `laboratório`.

## 2. Posicionamento do módulo na arquitetura

A `Esteira de Exames` vive tecnicamente sob `Atendimento`, não sob o agrupamento visual de `Laboratório`.

Leitura arquitetural:

- o pedido de exame nasce no contexto assistencial;
- a esteira organiza a execução operacional dos exames;
- os módulos laboratoriais especializados executam o registro analítico;
- o laudo fecha a saída clínica/documental;
- a entrega devolve o resultado ao atendimento e ao cliente.

Isso indica que a esteira é menos um cadastro e mais uma fila operacional transversal.

## 3. Encadeamento operacional confirmado

O fluxo interno documentado para o domínio é:

`Requisição de exame -> Esteira de Exames -> Coleta de material -> Registro de resultados (Hemograma/Urina/Bioquímico) -> Emissão de Laudo -> Entrega ao cliente`

O planejamento do ERP também fixa a sequência de estados:

`Solicitado -> Coletado -> Em Análise -> Laudado -> Entregue`

Leitura do fluxo:

- `Solicitado`: exame foi criado ou requisitado, mas ainda não houve coleta;
- `Coletado`: material biológico foi recebido/coletado e o exame pode seguir para processamento;
- `Em Análise`: os dados laboratoriais estão sendo produzidos em módulos especializados;
- `Laudado`: o resultado já foi interpretado e consolidado em laudo;
- `Entregue`: o exame saiu da esteira operacional e foi disponibilizado ao cliente ou ao fluxo clínico.

## 4. Papel da esteira no domínio

A `Esteira de Exames` provavelmente opera como uma fila de trabalho com recorte temporal e clínico.

Ela tende a responder a perguntas operacionais como:

- quais exames estão aguardando coleta;
- quais materiais já foram coletados e ainda não analisados;
- quais exames estão presos em análise;
- quais já foram laudados e aguardam entrega;
- quais exames completaram o ciclo.

Isso a diferencia de:

- `Exames`: ordem/listagem clínica do exame;
- `Hemogramas`, `Urina`, `Bioquímico`: telas especializadas de resultado;
- `Laudos`: emissão e gestão documental;
- `Tipos de Laudo`: configuração estrutural/modelo.

## 5. Estrutura inferida da entidade operacional

Sem a UI final aberta nesta passada, a estrutura abaixo é leitura arquitetural sustentada pela malha dos módulos e pelo fluxo documentado.

Cada item da esteira tende a carregar, no mínimo:

- identificador do exame ou requisição;
- `animal`;
- `cliente`;
- tipo de exame;
- data/hora de solicitação;
- status atual;
- profissional ou setor responsável;
- informação de coleta;
- ponte para resultado analítico;
- ponte para laudo;
- informação de entrega.

Campos e metadados que fazem sentido forte neste ponto do fluxo:

- data/hora da coleta;
- material/coleta realizada;
- prioridade;
- observações;
- timestamps por mudança de status;
- usuário responsável por cada etapa;
- número do laudo, quando existente.

## 6. Relação com os demais módulos

### 6.1 Origem

A esteira tende a receber exames vindos de:

- atendimento clínico;
- internação;
- eventuais requisições laboratoriais independentes.

Leitura:

- o exame nasce da necessidade clínica;
- a esteira transforma a necessidade em operação;
- o laboratório transforma a operação em resultado;
- o laudo transforma o resultado em documento clínico.

### 6.2 Execução analítica

A ponte mais forte da esteira é com:

- `Exames`;
- `Hemogramas`;
- `Urina`;
- `Bioquímico`;
- `Laudos`.

O encadeamento provável é:

- a esteira seleciona o trabalho pendente;
- o usuário entra no módulo analítico correspondente;
- registra ou conclui o resultado;
- emite ou vincula o laudo;
- devolve o item para a fila no novo status.

### 6.3 Saída operacional

Quando o exame chega a `Laudado` ou `Entregue`, a esteira deixa de ser apenas fila interna e passa a refletir:

- resposta ao tutor/cliente;
- apoio ao veterinário na decisão clínica;
- histórico de execução do laboratório;
- eventual insumo para indicadores de SLA.

## 7. Modelo de transição de estados

O desenho mais coerente para a entidade é um state machine simples e linear, com possíveis exceções:

- `Solicitado -> Coletado`
- `Coletado -> Em Análise`
- `Em Análise -> Laudado`
- `Laudado -> Entregue`

Transições auxiliares que fazem sentido, mas não foram confirmadas visualmente nesta passada:

- retorno de `Coletado` para pendência por coleta inválida;
- retorno de `Em Análise` para recolhimento/complemento;
- cancelamento do exame;
- reabertura após correção de resultado ou laudo.

## 8. Leitura de construção técnica

O módulo está no bloco legacy e, pelo padrão dos demais módulos inspecionados desse mesmo grupo, a leitura mais forte é:

- tela server-rendered no legado;
- acoplada ao shell/menu híbrido do ERP;
- navegação por rota `*.htm`;
- comportamento centrado em grade/fila com ações por item;
- integração indireta com telas laboratoriais especializadas.

Mesmo sem a renderização final nesta passada, a posição do módulo no legado e o desenho do fluxo deixam claro que a esteira não é uma tela documental, mas uma superfície de orquestração operacional.

## 9. Conclusão

A `Esteira de Exames` é a fila operacional que conecta o pedido clínico do exame ao resultado efetivamente entregue.

O desenho do domínio ficou suficientemente claro:

- entrada: requisição de exame;
- processamento: coleta e análise;
- consolidação: laudo;
- saída: entrega.

Ela é o ponto onde o ERP transforma o módulo de laboratório em operação diária mensurável.

## 10. Limitações desta passada

Limitações objetivas:

- a tela real da rota `EsteiraExames.htm` não abriu nesta sessão por bloqueio de borda;
- não houve captura direta da grade interna da esteira;
- não foi possível confirmar colunas, filtros e botões reais da UI nesta rodada;
- não foi possível observar os endpoints específicos da página.

Mesmo assim, a existência do módulo, sua rota, seu posicionamento, seus estados e seu papel no fluxo laboratorial ficaram suficientemente sustentados para esta fase de inspeção e planejamento.
