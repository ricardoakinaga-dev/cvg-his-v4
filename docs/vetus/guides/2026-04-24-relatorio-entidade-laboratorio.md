# Relatório da Entidade Laboratório

Data-base da inspeção: 24 de abril de 2026

Escopo:

- análise específica do domínio `laboratório`;
- foco em `exames`, `laudos` e `tipos de laudo`, com leitura integrada de requisição, resultado e emissão diagnóstica;
- inspeção somente leitura, sem incluir exame, sem preencher resultado e sem emitir laudo.

Evidências principais:

- [laboratorio-exames.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/screenshots/laboratorio-exames.png)
- [laboratorio-exames.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/laboratorio-exames.json)
- [laboratorio-laudos.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/screenshots/laboratorio-laudos.png)
- [laboratorio-laudos.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/laboratorio-laudos.json)
- [laboratorio-tipos-laudo.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/screenshots/laboratorio-tipos-laudo.png)
- [laboratorio-tipos-laudo.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/laboratorio-tipos-laudo.json)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-25-28-013Z-laboratorio/network.json)
- [01-PLANEJAMENTO-ERP-ENTERPRISE.md](/root/cvg-his-v2/docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md:381)
- [03-MODELO-DADOS.md](/root/cvg-his-v2/docs/vetus/guides/03-MODELO-DADOS.md:1176)
- [04-ESPECIFICACAO-APIS.md](/root/cvg-his-v2/docs/vetus/guides/04-ESPECIFICACAO-APIS.md:921)

Nota de segurança:

- a análise foi feita por UI, HTML, rede e documentação interna do projeto;
- não houve inclusão de exame;
- não houve submissão de resultados;
- não houve finalização ou entrega de laudo.

## 1. Síntese executiva

`Laboratório` apareceu nesta rodada como um domínio legado composto, não como uma tela única.

As três superfícies inspecionadas fecharam bem o fluxo diagnóstico:

- `Exames`
- `Laudos`
- `Tipos de Laudo`

Leitura objetiva:

- `exame` funciona como ordem/fila operacional;
- `laudo` funciona como documento diagnóstico emitido a partir do exame;
- `tipo de laudo` funciona como cadastro de modelo/template diagnóstico.

Mesmo com as grades vazias nesta passada, a estrutura das telas e dos formulários foi suficiente para fechar a leitura do domínio com segurança.

## 2. Arquitetura do domínio

Rotas confirmadas:

- `https://erp.vetus.com.br/Sistema/Laboratorio/Exames.htm`
- `https://erp.vetus.com.br/Sistema/Laboratorio/Laudos.htm`
- `https://erp.vetus.com.br/Sistema/Laboratorio/TiposDeLaudo.htm`

Fluxo de acesso confirmado:

- autenticação no `erp-beta.vetus.com.br`;
- SSO para `erp.vetus.com.br`;
- operação efetiva no legado.

Tecnologia observada:

- formulários `POST` no próprio legado;
- `javax.faces.resource`;
- estrutura compatível com `JSF + PrimeFaces`.

Leitura:

- o domínio `laboratório` continua majoritariamente fora do core beta;
- o shell beta apenas encaminha para as superfícies operacionais legadas;
- isso é coerente com a leitura anterior de baixa cobertura laboratorial no SPA novo.

## 3. Exames

### 3.1 Estrutura da tela

A tela `Exames` expôs:

- ação `Incluir`
- filtro `Cliente`
- filtro `Animal`
- filtro `Data`
- ação `Pesquisar`

Colunas confirmadas:

- `Id`
- `Cliente`
- `Animal`
- `Data`
- `Abrir`

Estado observado:

- grade vazia com `Nenhum registro encontrado`.

### 3.2 Campos confirmados

O formulário da listagem revelou:

- `formPrincipal:j_idt86`
- `formPrincipal:j_idt89`
- `formPrincipal:j_idt92_input`
- `formPrincipal:tbPesq_selection`

Mesmo com os ids internos pouco semânticos, a UI visível deixa clara a função dos campos:

- cliente
- animal
- data
- seleção de linha

### 3.3 Leitura funcional

`Exames` é a camada de requisição e fila operacional do laboratório.

Leitura:

- o exame nasce associado a `cliente` e `animal`;
- o controle principal é por data e abertura do registro;
- a tela foi desenhada para acompanhar ordens laboratoriais, não só resultados prontos.

## 4. Laudos

### 4.1 Estrutura da tela

A tela `Laudos` expôs uma superfície mais rica do que `Exames`.

Filtros confirmados:

- `Código do Laudo`
- `Cliente`
- `Proprietário`
- `Animal`
- `Data da Finalização`
- `Data de Entrada`
- `Corpo do Laudo`
- checkbox `Pesquisar Laudos Fechados`
- ação `Pesquisar`

Colunas confirmadas:

- `Código de Laudo`
- `Cliente`
- `Proprietário`
- `Animal`
- `Data de Finalização`
- `Data de Entrada`
- `Valor`
- `Abrir`

Estado observado:

- grade vazia com `Nenhum registro encontrado`.

### 4.2 Estrutura do formulário interno

O `formDialog` revelou campos importantes:

- `formDialog:titulo`
- `formDialog:corpo`
- `formDialog:j_idt247_input` com `type="file"`
- `formDialog:descricaoImagem`

Leitura:

- o laudo é documento com título e corpo textual;
- o módulo aceita documentação por imagem;
- existe descrição de imagem, não apenas upload bruto.

### 4.3 Leitura funcional

`Laudos` é a camada de formalização diagnóstica.

Ele não guarda apenas o resultado numérico do exame; ele organiza:

- documento clínico;
- data de entrada e finalização;
- valor associado;
- anexo/foto;
- vínculo com cliente, proprietário e animal.

Leitura:

- o laudo fecha o ciclo diagnóstico para consumo clínico e comunicável;
- a coluna `Valor` sugere reflexo comercial ou cobrança do procedimento/laudo;
- a presença simultânea de `Cliente` e `Proprietário` indica adaptação a contextos distintos de relacionamento, ainda que na prática muitas vezes coincidam.

## 5. Tipos de Laudo

### 5.1 Estrutura da tela

A tela `Tipos de Laudo` expôs:

- ação `Incluir`
- filtro `Código`
- filtro `Descrição`
- ação `Pesquisar`

Colunas confirmadas:

- `Código`
- `Descrição`
- `Abrir`

### 5.2 Estrutura do formulário interno

O `formDialog` revelou:

- `formDialog:titulo`
- `formDialog:corpo`

Leitura:

- `tipo de laudo` é mais do que um rótulo;
- ele já inclui uma estrutura de conteúdo/modelo;
- isso o aproxima de `template` e não apenas de tabela de domínio estática.

### 5.3 Leitura funcional

`Tipos de Laudo` fecha a camada de padronização do laboratório.

Leitura:

- o sistema separa o documento emitido (`laudo`) do modelo-base (`tipo de laudo`);
- isso favorece reutilização, padronização técnica e ganho operacional.

## 6. Relação entre exames, resultados e laudos

Combinando as três telas e a documentação interna, o fluxo do domínio ficou assim:

- o exame é solicitado e acompanha animal/cliente/data;
- o resultado é registrado sobre o exame;
- o laudo consolida a leitura diagnóstica;
- o tipo de laudo fornece o modelo para emissão.

Essa leitura é reforçada pelo planejamento interno:

- `Fila de exames laboratoriais`
- `Status: Solicitado → Coletado → Em Análise → Laudado → Entregue`
- `Vinculação com resultados de exames`

Leitura:

- `exame` é entidade operacional;
- `resultado` é entidade analítica;
- `laudo` é entidade documental/assistencial;
- `tipo de laudo` é entidade de configuração clínica.

## 7. Relação com atendimento e decisão clínica

A ligação com `atendimento` não apareceu explicitamente como botão na UI desta passada, mas a relação de domínio é forte.

Sinais de documentação:

- o planejamento prevê `Esteira de Exames`;
- o fluxo interno mostra `Requisição de exame -> Esteira de Exames -> Coleta -> Registro de resultados -> Emissão de Laudo -> Entrega ao cliente`.

Leitura:

- o laboratório nasce de uma necessidade assistencial;
- o exame alimenta a decisão clínica;
- o laudo devolve a conclusão ao fluxo de atendimento e prontuário.

Esse é o papel central do módulo:

- transformar suspeita clínica em evidência diagnóstica estruturada.

## 8. Relação com internação

A UI desta passada não mostrou botão direto de `internação` dentro de `laboratório`, mas a conexão com o relatório anterior é forte.

Leitura:

- pacientes internados tendem a consumir exames e laudos como parte do cuidado contínuo;
- a modelagem laboratorial por `animal_id` e `professional_id` é compatível com uso em internação;
- o domínio laboratorial funciona como braço diagnóstico tanto do atendimento ambulatorial quanto do hospitalar.

Importante:

- essa relação é leitura arquitetural sustentada pela modelagem e pelo desenho global do ERP;
- não foi confirmada por fluxo visível dentro da UI laboratoral capturada nesta passada.

## 9. Modelagem prevista do domínio

Os documentos internos fecharam bem a leitura observada.

Tabelas previstas:

- `exam_types`
- `exams`
- `exam_results`
- `exam_reference_values`
- `reports`
- `report_items`
- `report_photos`
- `report_types`

Campos mais relevantes:

- em `exam_types`: `name`, `code`, `category`, `duration_minutes`, `price`
- em `exams`: `animal_id`, `exam_type_id`, `professional_id`, `requesting_professional_id`, `status`, `request_date`, `collection_date`, `completion_date`, `delivery_date`
- em `exam_results`: `parameter_name`, `result_value`, `unit`, `reference_min`, `reference_max`, `is_out_of_range`
- em `reports`: `exam_id`, `report_type_id`, `title`, `content`, `conclusion`, `status`, `finalized_at`, `delivered_at`
- em `report_photos`: `photo_url`, `description`
- em `report_types`: `name`, `template`

Leitura:

- a modelagem prevista é completa e coerente com as superfícies legadas;
- existe separação limpa entre ordem, resultado, documento e template;
- o domínio suporta exame simples e também laudo rico com foto.

## 10. APIs previstas

Na especificação interna, a seção de laboratório prevê:

- `GET /exams?page=0&size=20&status=&animalId=&type=&dateFrom=&dateTo=`
- `POST /exams`
- `GET /exams/{id}`
- `PUT /exams/{id}`
- `POST /exams/{id}/results`
- `GET /reports?page=0&size=20&status=&examId=`
- `POST /reports`
- `GET /reports/{id}`
- `PUT /reports/{id}`
- `POST /reports/{id}/finalize`
- `POST /reports/{id}/deliver`
- `GET /exam-types`
- `POST /exam-types`
- `PUT /exam-types/{id}`
- `GET /exam-reference-values?examTypeId=&specieId=`
- `POST /exam-reference-values`

Leitura:

- a API-alvo reflete exatamente a decomposição do domínio vista na UI;
- existe lifecycle explícito de exame e de laudo;
- a entrega do laudo é uma etapa própria, não mero efeito colateral da finalização.

Importante:

- essas rotas vieram da documentação interna do projeto;
- não foram observadas como chamadas modernas em produção nesta passada;
- portanto devem ser lidas como especificação-alvo.

## 11. Papel dos valores de referência e exames especializados

Mesmo sem abrir `Hemogramas`, `Urina` e `Bioquímico` nesta rodada, o planejamento e a modelagem deixam claro o papel deles.

Sinais documentados:

- hemograma com valores automáticos, flags fora da faixa e histórico comparativo;
- urina com análise física, química e microscópica;
- bioquímico como módulo próprio;
- `exam_reference_values` por espécie e faixa etária.

Leitura:

- os módulos especializados são extensões do core laboratorial;
- `Exames` e `Laudos` são a espinha dorsal do fluxo;
- hemograma, urina e bioquímico materializam famílias específicas de resultado.

## 12. Limitações da inspeção

Esta passada teve limites claros:

- as três grades capturadas estavam vazias;
- não foi possível abrir um exame real nem um laudo real;
- não houve detalhe prático de status ou transição em registro existente;
- a leitura de resultados e entrega veio principalmente da documentação interna e da modelagem.

## 13. Conclusão

`Laboratório` é um domínio legado bem estruturado, com separação nítida entre ordem de exame, resultado, laudo e template de laudo.

O que ficou firme nesta rodada:

- `Exames` organiza a fila/ordem diagnóstica por cliente, animal e data;
- `Laudos` organiza o documento clínico final, com datas, valor e foto;
- `Tipos de Laudo` organiza o modelo-base de emissão;
- a modelagem e as APIs previstas estão muito coerentes com essa separação.

Conclusão objetiva:

- `laboratório` fecha o eixo clínico-diagnóstico do ERP;
- ele transforma solicitação clínica em resultado estruturado e depois em documento interpretado;
- a ligação com atendimento e internação é forte no domínio, mesmo quando não aparece como botão explícito na UI capturada.
