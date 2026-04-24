# Relatório da Entidade Vacinas e Vermífugos

Data-base da inspeção: 24 de abril de 2026

Escopo:

- análise específica do módulo `Vacinas e Vermífugos`;
- foco em estrutura da entidade, filtros, agendamento, execução, lembretes e relações com `animal`, `agenda`, `marketing`, `comanda` e prevenção clínica;
- inspeção somente leitura, sem salvar agendamento, sem baixar aplicação e sem enviar email.

Evidências principais:

- [vacinas-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-12-53-716Z-vacinas/screenshots/vacinas-lista.png)
- [vacinas-lista.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-12-53-716Z-vacinas/vacinas-lista.json)
- [vacinas-lista.html](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-12-53-716Z-vacinas/vacinas-lista.html)
- [vacinas-vacina.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-12-53-716Z-vacinas/screenshots/vacinas-vacina.png)
- [vacinas-vacina.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-12-53-716Z-vacinas/vacinas-vacina.json)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-12-53-716Z-vacinas/network.json)
- [2026-04-24-relatorio-entidade-marketing.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-24-relatorio-entidade-marketing.md)
- [01-PLANEJAMENTO-ERP-ENTERPRISE.md](/root/cvg-his-v2/docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md:308)
- [03-MODELO-DADOS.md](/root/cvg-his-v2/docs/vetus/guides/03-MODELO-DADOS.md:331)
- [04-ESPECIFICACAO-APIS.md](/root/cvg-his-v2/docs/vetus/guides/04-ESPECIFICACAO-APIS.md:368)

Nota de segurança:

- a análise foi feita por UI, HTML, rede e documentação interna do projeto;
- não houve gravação de agendamento;
- não houve baixa de vacina;
- não houve envio de email.

## 1. Síntese executiva

`Vacinas e Vermífugos` é um módulo legado operacional e bem mais rico do que o menu sugere. Nesta passada foi possível confirmar:

- listagem de registros por período;
- filtros por `cliente` e `animal`;
- opção de incluir aplicações executadas na pesquisa;
- ação explícita de `Agendar Vacina ou Vermífugo`;
- ação explícita de `Enviar Email de Aviso`;
- diálogo de `Baixar e Reagendar`;
- diálogo de `Agendamento`.

Leitura objetiva:

- o módulo não é apenas um cadastro de produto clínico;
- ele é um controle operacional de prevenção;
- ele conecta agenda preventiva, execução clínica e lembrete ao tutor.

## 2. Arquitetura do módulo

Rota confirmada:

- `https://erp.vetus.com.br/Sistema/Vacina/Vacinas.htm`

Fluxo de acesso confirmado:

- login e shell no `erp-beta.vetus.com.br`;
- SSO para `erp.vetus.com.br`;
- operação efetiva no legado.

Tecnologia observada:

- formulários `POST` para a própria rota;
- recursos `javax.faces.resource`;
- callbacks `PrimeFaces.ab(...)`;
- diálogos modais de `Agendamento` e `Baixar e Reagendar`.

Leitura:

- `Vacinas e Vermífugos` segue legado-operacional;
- não apareceu superfície beta própria para esse módulo nesta rodada;
- o beta hoje atua como entrada e navegação, não como front principal do caso de uso.

## 3. Estrutura da listagem

A tela principal expôs:

- título `Vacinas e Vermífugos`;
- filtro `Data Inicial`;
- filtro `Data Final`;
- filtro `Cliente (branco = Todos)`;
- filtro `Animal`;
- checkbox `Pesquisar aplicações executadas`;
- ação `Pesquisar`.

Colunas confirmadas na grade:

- `Cliente`
- `Animal`
- `Data`
- `Descrição`
- `Executar`
- `Abrir`
- `Email`

Estado observado:

- período default preenchido com `01/04/2026` a `30/04/2026`;
- grade vazia com mensagem `Nenhuma vacina nem vermífugo encontrado`.

Leitura:

- a entidade é tratada como agenda/lista operacional de aplicações;
- a linha do registro combina contexto relacional, data do evento, descrição do imunizante/vermífugo e ações;
- o módulo foi desenhado tanto para consulta quanto para execução operacional sobre o item.

## 4. Campos confirmados

Campos principais do filtro:

- `formPrincipal:dataInicial_input`
- `formPrincipal:dataFinal_input`
- `formPrincipal:clientePesquisa_input`
- `formPrincipal:clientePesquisa_hinput`
- `formPrincipal:animalPesquisa`
- `formPrincipal:pesquisarBaixadas_input`

Leitura:

- o filtro usa combinação de período, tutor e paciente;
- `cliente` vem por autocomplete;
- `animal` aparece como campo textual simples na superfície capturada;
- o checkbox de aplicações executadas sugere convivência entre registros pendentes/agendados e históricos já baixados.

## 5. Ações operacionais confirmadas

O HTML mostrou três ações centrais da tela:

- `Pesquisar`
- `Agendar Vacina ou Vermífugo`
- `Enviar Email de Aviso`

Além disso, a grade prevê por linha:

- `Executar`
- `Abrir`
- `Email`

Leitura:

- `Executar` tende a materializar a aplicação ou baixa;
- `Abrir` tende a abrir um detalhe/edit do registro;
- `Email` tende a disparar comunicação relativa àquela linha;
- `Enviar Email de Aviso` atua como ação global da listagem, não apenas da linha.

Importante:

- como a grade estava vazia, `Executar`, `Abrir` e `Email` foram confirmados como estrutura de coluna, mas não como fluxo percorrido em registro real.

## 6. Diálogo de Baixar e Reagendar

O markup revelou um modal específico chamado `Baixar e Reagendar`.

Campos confirmados:

- `formDialog:observacaoBaixaVacina`
- `formDialog:reagendarPara_input`

Ação confirmada:

- botão `Baixar`

Leitura:

- o módulo trata a execução da aplicação como evento com observação;
- há suporte nativo a reagendamento da próxima ocorrência;
- isso reforça uma modelagem longitudinal de prevenção, não um simples cadastro pontual.

Esse ponto é central:

- a aplicação pode ser concluída;
- a próxima aplicação pode ser reposicionada;
- o histórico preventivo fica operacionalizado na mesma entidade.

## 7. Diálogo de Agendamento

Ao abrir a ação ligada a `Vacina`, o módulo expôs o modal `Agendamento`.

Campos e estados confirmados:

- `Cliente`
- `Animal`
- `Vacina/Vermífugo`
- `Data`
- `Observação`
- `Cliente`: vazio na coleta
- `Animal`: valor default `Não Definido`

Campos técnicos confirmados:

- `formDialog:cliente_input`
- `formDialog:cliente_hinput`
- `formDialog:animal_input`
- `formDialog:novaVacina_input`
- `formDialog:novaVacina_hinput`
- `formDialog:j_idt146_input`
- `formDialog:obs`

Ações confirmadas:

- `Salvar`
- `Excluir`

Observação importante:

- o botão `Excluir` estava desabilitado no estado de novo agendamento;
- isso indica lifecycle diferente entre criação e manutenção.

Leitura:

- o módulo trata vacina/vermífugo como evento agendável associado a cliente e animal;
- o item clínico é escolhido separadamente em `Vacina/Vermífugo`;
- a ocorrência possui data e observação próprias;
- a entidade foi desenhada para criação e manutenção, não só consulta.

## 8. Relação com animal e cliente

Essa relação é explícita e estrutural.

Sinais confirmados:

- filtro por `Cliente`;
- filtro por `Animal`;
- colunas `Cliente` e `Animal` na grade;
- diálogo de agendamento com ambos os campos.

Leitura:

- o tutor é o pivô relacional e de comunicação;
- o animal é o pivô clínico e assistencial;
- `Vacinas e Vermífugos` opera exatamente na interseção dessas duas entidades.

Isso faz do módulo uma ponte natural entre:

- cadastro do animal;
- histórico preventivo;
- contato com o tutor.

## 9. Relação com agenda

Mesmo sem abrir a agenda em si nesta passada, a ligação ficou forte.

Sinais confirmados:

- existência de modal de `Agendamento`;
- registros com coluna `Data`;
- baixa e reagendamento na mesma entidade.

Leitura:

- o módulo possui agenda preventiva própria, mesmo que não seja a mesma grade do módulo `Agenda`;
- ele controla ocorrências futuras e passadas;
- é plausível que parte dessa agenda alimente lembretes e retornos operacionais.

Conclusão objetiva:

- `Vacinas e Vermífugos` não é só prontuário;
- ele é um mecanismo de agenda clínica preventiva.

## 10. Relação com marketing

A ligação com `marketing` ficou confirmada de forma muito mais forte do que nos módulos anteriores.

Sinais diretos:

- botão `Enviar Email de Aviso` na própria listagem;
- existência do relatório anterior sobre `Layout de Email de Vacina`;
- documentação do projeto prevendo envio automático de lembretes de vacina.

Leitura:

- o módulo preventivo já nasce acoplado à comunicação com o tutor;
- `marketing` não está só ao lado de vacinas no menu, ele consome esse domínio;
- vacina é um dos casos concretos onde marketing e operação clínica se tocam diretamente.

Resumo funcional:

- `Vacinas e Vermífugos` define/agenda a ocorrência;
- `marketing` transforma essa ocorrência em aviso.

## 11. Relação com comanda

Nesta rodada, a ligação com `comanda` não apareceu explicitamente na UI.

Não houve:

- coluna de comanda;
- botão de abrir comanda;
- referência textual direta a cobrança ou item de atendimento.

Leitura mais defensável:

- a aplicação de vacina pode repercutir economicamente em comanda ou venda em fluxos do ERP;
- porém isso não ficou comprovado na superfície desta passada;
- neste relatório, a conexão com `comanda` deve ficar como hipótese arquitetural plausível, não como integração confirmada.

## 12. Modelagem prevista do domínio

Os documentos internos reforçam a leitura da tela.

No planejamento:

- `Animais` incluem `Vacinas e vermífugos`;
- o marketing prevê `Email de Vacina` com layout personalizável e envio automático.

Na modelagem de dados:

- existe tabela `vaccines`;
- campos previstos:
  - `animal_id`
  - `product_id`
  - `professional_id`
  - `application_date`
  - `next_application_date`
  - `batch_number`
  - `laboratory`
  - `observation`
  - `status`

Leitura:

- o domínio previsto é mais completo do que a superfície da listagem deixa ver;
- além de agendamento e aviso, ele comporta rastreabilidade clínica e operacional;
- o campo `next_application_date` combina fortemente com o padrão de reagendamento observado no legado.

## 13. APIs previstas

Na especificação interna, a seção `4.6 Vacinas` prevê:

- `GET /animals/{id}/vaccines`
- `POST /animals/{id}/vaccines`

Leitura:

- a API-alvo trata vacina como subrecurso do `animal`;
- isso é coerente com a leitura clínica da entidade;
- o tutor entra como contexto de busca e contato, mas o registro preventivo pertence ao paciente.

Importante:

- essas rotas vieram da documentação interna do projeto;
- elas não apareceram como chamadas modernas vivas nesta passada;
- portanto devem ser lidas como especificação-alvo, não backend novo confirmado na tela legado atual.

## 14. Papel operacional na prevenção clínica

`Vacinas e Vermífugos` fecha um eixo muito específico do ERP: o da medicina preventiva recorrente.

Síntese da jornada:

- o animal possui necessidade preventiva;
- o módulo registra ou agenda a aplicação;
- a aplicação pode ser executada e baixada;
- a próxima ocorrência pode ser reagendada;
- o tutor pode ser avisado por email;
- o histórico preventivo se mantém navegável por período, cliente e animal.

Leitura:

- esse módulo une prontuário preventivo, agenda e relacionamento;
- ele é mais assistencial do que comercial;
- seu valor maior é a recorrência clínica com apoio de comunicação.

## 15. Limitações da inspeção

Esta passada teve limites claros:

- a grade principal estava vazia no período filtrado;
- não foi possível abrir um registro real em `Abrir`;
- não foi possível percorrer um caso real de `Executar` por falta de linha disponível;
- o modal de agendamento foi aberto, mas não houve qualquer submissão;
- a leitura de integração com `comanda` permaneceu indireta.

## 16. Conclusão

`Vacinas e Vermífugos` é um módulo legado robusto de prevenção clínica, não apenas um cadastro secundário do animal.

O que ficou firme nesta rodada:

- a entidade é centrada em `animal`, com `cliente` como contexto relacional;
- existe listagem com filtros, execução, abertura e email;
- existe agendamento estruturado;
- existe baixa com reagendamento;
- existe integração funcional direta com comunicação por email.

Conclusão objetiva:

- `Vacinas e Vermífugos` conecta `animal`, `cliente`, `agenda preventiva` e `marketing`;
- ele é uma das peças mais claras do eixo de recorrência clínica do ERP;
- a ligação com `comanda` é plausível, mas ainda não foi provada diretamente pela UI desta passada.
