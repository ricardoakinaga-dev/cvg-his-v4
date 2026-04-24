# Relatório da Entidade Serviço

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica da entidade `serviço` no ERP Vetus;
- inspeção somente leitura do cadastro dedicado de serviços;
- correlação com os módulos de `agenda`, `comanda`, atendimento e faturamento já inspecionados;
- sem criação de serviço, sem edição, sem importação e sem qualquer persistência no ERP.

Evidências principais:

- [servicos-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/screenshots/servicos-lista.png)
- [servicos-lista.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/servicos-lista.json)
- [servicos-lista.html](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/servicos-lista.html)
- [estado-pos-login.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/estado-pos-login.json)
- [estado-servicos.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/estado-servicos.json)
- [network-lite.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/network-lite.json)
- [2026-04-23-relatorio-entidade-agenda.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-agenda.md)
- [2026-04-23-relatorio-entidade-comanda.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-comanda.md)
- [2026-04-23-relatorio-fluxos-detalhe-comanda-agenda-financeiro.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-fluxos-detalhe-comanda-agenda-financeiro.md)

Nota de segurança:

- este relatório evita reproduzir dados sensíveis do ambiente;
- onde não houve registro aberto na listagem, a leitura fica ancorada em estrutura confirmada da tela, do HTML legado e das integrações observadas em outros módulos.

## 1. Síntese executiva

A entidade `serviço` é um pivô de domínio do ERP Vetus.

Ela aparece em quatro camadas diferentes:

- cadastro mestre;
- agenda operacional;
- composição transacional em `comanda`;
- repercussão fiscal e de faturamento.

Leitura arquitetural:

- o `serviço` não é apenas um item comercial;
- ele também é um item agendável, executável, precificável e fiscalizável;
- por isso, a entidade conecta operação clínica, agenda, cobrança e emissão/controle fiscal.

A inspeção confirma que o cadastro dedicado de serviços ainda está no legado, enquanto parte do ecossistema que consome essa entidade já migrou para o beta.

## 2. Onde o módulo vive

Rota dedicada observada:

- `https://erp.vetus.com.br/Sistema/Cadastros/Servicos.htm`

O caminho de acesso atual é híbrido:

1. o usuário autenticado entra no beta;
2. ao abrir `Serviços`, o sistema redireciona para `erp-beta.vetus.com.br/login?returnUrl=...`;
3. o beta emite um `accessToken` para `erp.vetus.com.br/NewLogin.htm?...`;
4. o legado conclui a sessão e entrega `Servicos.htm`.

Isso está confirmado no recorte de rede em [network-lite.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/network-lite.json).

Leitura:

- o cadastro de serviços ainda não foi migrado para a SPA beta;
- ele depende de SSO mediado pelo beta;
- mesmo sendo legado, continua encaixado na navegação unificada do produto.

## 3. Stack e construção do módulo

O cadastro de serviços é claramente um módulo legado server-rendered.

Evidências diretas do HTML:

- `javax.faces.ViewState`;
- recursos `javax.faces.resource/...`;
- `PrimeFaces.ab(...)`;
- `components.js` e `components.css` do PrimeFaces;
- formulários `formMenu`, `formPrincipal`, `formDialog`, `formServicoTabelaFiscalDialog`.

Leitura técnica:

- stack baseada em `JSF + PrimeFaces`;
- renderização no servidor;
- atualização parcial via Ajax do PrimeFaces;
- múltiplos formulários independentes na mesma página;
- diálogos modais já renderizados no DOM e apenas ativados sob demanda.

Isso contrasta com os módulos beta observados antes:

- `agenda`, `clientes`, `animais` e `comandas` usam shell SPA;
- `serviços` continua no paradigma legado com postback e `ViewState`.

## 4. Estrutura da listagem

Evidência principal:

- [servicos-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-16-39-933Z-servicos/screenshots/servicos-lista.png)

Título da tela:

- `Cadastro de Serviços`

Bloco de pesquisa confirmado:

- botão `Incluir`;
- filtro por `Id`;
- filtro por `Descrição`;
- checkbox `Serviços Ativos`;
- botão `Pesquisar`.

Grid confirmado:

- coluna `Id`;
- coluna `Descrição`;
- coluna `Valor`;
- coluna `Abrir`.

No estado capturado, a tabela apareceu com:

- `Nenhum registro encontrado`.

Isso limita a inspeção de um registro concreto, mas não impede a leitura estrutural do módulo.

## 5. O que a listagem já revela sobre a entidade

Mesmo sem linhas visíveis, a tela confirma atributos centrais do cadastro:

- identificador numérico;
- descrição textual;
- valor;
- status ativo/inativo.

Leitura de domínio:

- o serviço possui identidade própria;
- possui valor comercial nativo;
- possui ciclo de vida de ativação;
- é passível de pesquisa tanto por código quanto por descrição.

Isso é consistente com o papel da entidade em agenda e comanda:

- na agenda, o serviço define o que pode ser reservado;
- na comanda, o serviço define o que foi executado/cobrado.

## 6. Estruturas ocultas carregadas na própria página

Essa foi a descoberta mais importante do HTML legado.

Mesmo sem abrir um registro, a página já carrega blocos modais que deixam claro que a entidade `serviço` não é simples.

### 6.1 Tabela de preço

Bloco confirmado:

- diálogo `Tabela de Preço`

Campos confirmados:

- `Tabela`
- `Valor`
- ação `Salvar`

O alvo de atualização Ajax indica:

- `formPrincipal:tab:tbServicoTabela`

Leitura:

- o serviço aceita precificação por tabela;
- o valor exibido na listagem não esgota sua estrutura de preço;
- existem relações entre o serviço base e múltiplas tabelas de preço.

### 6.2 Tabela fiscal

Bloco confirmado:

- diálogo `Tabela Fiscal`

Campos confirmados:

- `Empresa`
- `Tabela Fiscal Serviço`
- ação `Salvar`

O alvo de atualização Ajax indica:

- `formPrincipal:tab:tbServicoTabelaFiscalDT`

Leitura:

- o serviço possui associação fiscal própria;
- essa associação pode variar por empresa;
- a entidade participa da camada de tributação e faturamento, não apenas da operação clínica.

## 7. O que isso prova sobre a modelagem do serviço

A entidade `serviço` provavelmente tem pelo menos quatro camadas de informação:

- cadastro base;
- preço;
- elegibilidade operacional;
- parametrização fiscal.

Camada base confirmada diretamente:

- `Id`
- `Descrição`
- `Ativo`

Camada comercial confirmada diretamente:

- `Valor`
- `Tabela de Preço`

Camada fiscal confirmada diretamente:

- `Empresa`
- `Tabela Fiscal Serviço`

Camada operacional confirmada por integração com outros módulos:

- subset agendável em `agenda`;
- uso como item de execução em `comanda`.

## 8. Relação com Agenda

No relatório da agenda ficou confirmado:

- `GET /service?active=true&hasSchedule=true`

Isso é extremamente revelador.

Leitura:

- nem todo serviço cadastrado necessariamente entra na agenda;
- existe ao menos um atributo lógico `hasSchedule=true`;
- a agenda consome apenas a subfamília de serviços agendáveis e ativos.

Implicação de domínio:

- `serviço` é uma entidade mais ampla que `serviço agendável`;
- a agenda trabalha sobre um subconjunto operacional do cadastro mestre.

## 9. Relação com Comanda

No relatório da comanda ficou confirmado que o detalhe da comanda possui bloco `Serviços`.

Também ficou visível que:

- a comanda agrega serviços por animal;
- os serviços participam do resumo da conta;
- a composição de serviços influencia diretamente totalização e fechamento.

Leitura:

- o serviço é uma unidade transacional dentro da comanda;
- ele não aparece apenas como referência descritiva;
- ele participa de valor, execução e contexto assistencial.

Isso faz do serviço a ponte entre:

- intenção operacional na agenda;
- execução real no atendimento/comanda;
- cobrança e fechamento financeiro.

## 10. Relação com faturamento e fiscal

O próprio cadastro já mostra que o serviço carrega parametrização fiscal.

Além disso, o menu legado e híbrido expõe superfícies diretamente relacionadas:

- `Tabela NFS-e`
- `Tabela CFOP`
- `Tabela PIS`
- `Tabela COFINS`
- `Tabela ICMS`
- `Relatório de NF de Serviços Prestados`

Leitura:

- o serviço é uma entidade fiscalmente relevante;
- ele precisa se amarrar a tabelas tributárias e de nota;
- a parametrização de um serviço tem efeito na emissão e no relatório fiscal posterior.

Em outras palavras:

- o produto não trata o serviço apenas como “procedimento”;
- trata também como item faturável e classificável para fins fiscais.

## 11. Relação com importação e governança de cadastro

No menu híbrido observado:

- o cadastro dedicado de `Serviços` está no legado;
- `Importar Dados Serviços` já está no beta.

Isso sugere um desenho de transição:

- manutenção fina do cadastro ainda está no legado;
- processos de carga/migração/importação já começam a aparecer na nova superfície.

Leitura organizacional:

- serviço é master data relevante o bastante para ter fluxo de importação específico;
- essa entidade provavelmente alimenta múltiplos módulos e precisa de governança central.

## 12. Papel da entidade na jornada completa

Com base nas inspeções anteriores, a jornada mais consistente é:

1. o serviço é cadastrado e parametrizado;
2. parte desses serviços se torna elegível para agendamento;
3. a agenda consome o subconjunto agendável;
4. a execução do atendimento repercute em `comanda`;
5. a comanda transforma o serviço em valor cobrado;
6. a camada fiscal e os relatórios consolidam a repercussão tributária e financeira.

Isso coloca `serviço` numa posição mais central que `cliente` ou `animal` em termos de regra operacional.

`cliente` e `animal` dão contexto.

`serviço` define o que será feito, quanto custa, se pode ser agendado e como será tratado fiscalmente.

## 13. Limites da inspeção desta rodada

A principal limitação foi objetiva:

- a listagem carregou sem registros visíveis no estado capturado.

Por isso, não ficou confirmado nesta fase:

- formulário completo de um serviço já existente;
- abas adicionais que possam existir no detalhe;
- campos clínicos ou operacionais que só apareçam ao abrir um registro;
- comportamento do botão `Abrir`;
- payload Ajax específico de inclusão/edição.

Ainda assim, a leitura da entidade já é robusta porque:

- o módulo dedicado carregou integralmente;
- a rota legada foi autenticada e inspecionada;
- o HTML revelou estruturas internas não visíveis na empty state;
- agenda e comanda já confirmam o consumo funcional da entidade.

## 14. Conclusão

A entidade `serviço` é um dos principais eixos estruturantes do ERP Vetus.

Ela conecta:

- cadastro mestre;
- agenda;
- comanda;
- fiscal;
- faturamento.

A inspeção confirmou que seu módulo dedicado permanece no legado `JSF/PrimeFaces`, enquanto o restante do ecossistema já consome essa entidade em superfícies beta.

O ponto mais importante não é apenas que existe um cadastro de serviços. É que esse cadastro governa simultaneamente:

- o que pode ser agendado;
- o que pode ser executado;
- o que pode ser cobrado;
- o que precisa ser tratado fiscalmente.

Em resumo, `serviço` é a entidade que transforma relacionamento e atendimento em oferta operacional concreta e monetizável.
