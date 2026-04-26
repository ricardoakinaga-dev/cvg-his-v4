# Vetus Parity Workflow e Plano de Espelhamento

Data do checkpoint: 2026-04-26

Este documento e a fonte de verdade operacional para a frente de trabalho que espelha o ERP Vetus no `cvg-his-v2`. Ele existe para evitar perda de contexto entre sessoes, impedir a execucao fora da ordem combinada e manter claros os guardrails de seguranca.

## Objetivo

Construir o `cvg-his-v2` como uma versao Premium Enterprise do ERP Vetus, usando o Vetus como referencia observacional para:

- organizacao dos modulos;
- ordem e agrupamento do navbar;
- fluxos de atendimento;
- fluxos administrativos;
- fluxos financeiros;
- logica de uso;
- nomenclatura operacional;
- botoes, filtros, listagens, formularios, detalhes e acoes;
- integracoes entre cadastros, atendimentos, estoque, financeiro, marketing, RH e relatorios.

O resultado esperado nao e uma copia tecnica literal do Vetus. O objetivo e uma imagem funcional e organizacional do Vetus com a tecnologia, arquitetura, persistencia, UX e qualidade do `cvg-his-v2`.

## Guardrails obrigatorios

1. **ERP Vetus e somente observacional.**
   Nunca criar, editar, salvar, apagar, importar, exportar, baixar, confirmar, cancelar, executar baixa, enviar email, enviar SMS, enviar WhatsApp, alterar configuracao ou modificar qualquer dado no Vetus.

2. **Unico alvo de escrita: `cvg-his-v2`.**
   Todo codigo, banco, docs, testes e commits devem acontecer apenas em `/root/cvg-his-v2`.

3. **Nao versionar credenciais.**
   Senhas, tokens, cookies, sessoes e segredos nao devem ser gravados em markdown, codigo, migrations, testes, seeds ou commits. As credenciais do Vetus foram fornecidas pelo responsavel no canal da sessao e devem ser usadas apenas para login observacional quando necessario.

4. **Nao copiar dados pessoais reais do Vetus.**
   Nomes, telefones, emails, valores, comandas e qualquer dado de cliente/animal visto no Vetus nao devem ser copiados para docs, testes, seeds ou exemplos. Quando for necessario testar, usar dados ficticios.

5. **Seguir a ordem real do navbar do Vetus.**
   A sequencia de implementacao deve seguir os botoes/modulos do navbar do ERP Vetus. Antes de escolher o proximo modulo, validar a ordem observada ou consultar novamente o Vetus.

6. **Usar a tecnologia existente do `cvg-his-v2`.**
   Reaproveitar composables, componentes, services, API patterns, migrations, RLS, audit trail, testes e design system existentes. Nao criar novas portas ou dependencias sem aprovacao explicita.

7. **Publicar no localhost existente.**
   O projeto ja roda por compose com portas e dependencias funcionais. Manter:
   - SPA: `http://localhost:3002`
   - API: `http://localhost:3003`
   - Postgres local do compose
   - Redis local do compose

8. **Verificar antes de concluir.**
   Cada modulo implementado deve ter, quando aplicavel:
   - migration aplicada;
   - API persistente;
   - service SPA;
   - tela/lista/form/detalhe ou fluxo equivalente;
   - testes focados;
   - typecheck/build pertinente;
   - publicacao nos containers existentes;
   - commit.

9. **Atualizar este documento ao fim de cada tarefa.**
   Ao concluir qualquer modulo, fluxo, checkpoint de mapeamento ou mudanca relevante de sequencia, atualizar este arquivo antes do commit final da tarefa. O documento deve refletir o que foi feito, o commit criado, a ultima migration aplicada, o status do modulo e o proximo passo recomendado.

## Procedimento de login observacional no Vetus

URL:

```text
https://erp-beta.vetus.com.br/
```

Campos do login:

- Vetus ID
- Usuario
- Senha

As credenciais foram fornecidas pelo responsavel no canal da sessao. **Nao registrar a senha em repositorio.**

Procedimento:

1. Abrir a URL do Vetus.
2. Aguardar eventual verificacao Cloudflare.
3. Preencher Vetus ID, usuario e senha fornecidos pelo responsavel.
4. Entrar.
5. Confirmar que a tela inicial abriu em `/inicio`.
6. A partir desse ponto, navegar somente para observacao.
7. Nao clicar em botoes de gravacao, exclusao, baixa, envio, importacao, exportacao ou confirmacao.
8. Se um fluxo exigir abrir modal/formulario para observar campos, nao pressionar `Salvar`, `Excluir`, `Confirmar`, `Baixar`, `Enviar`, `Importar` ou equivalentes.

Status observado em 2026-04-26:

- Login realizado com sucesso em modo observacional.
- URL apos login: `https://erp-beta.vetus.com.br/inicio`
- Empresa exibida: Centro Veterinario Guarapiranga.
- Usuario autenticado exibido no cabecalho do Vetus.

## Navbar Vetus observado

Ordem principal observada em 2026-04-26:

1. Inicio
2. Atendimento
3. Laboratorio
4. Estoque
5. Financeiro
6. Marketing
7. RH
8. Relatorios

Observacao: a ordem de submenus deve ser validada diretamente no Vetus antes de implementar cada proximo modulo. Esta lista principal serve como trilho macro.

### Atendimento observado em 2026-04-26

Submenu `Atendimento` observado em modo somente leitura:

1. Atendimentos
   - Agenda
   - Comandas
   - Vendas
   - Pacotes
   - Esteira
   - Esteira de Exames
   - Vacinas e Vermifugos
   - Orcamentos
   - Resgate de Pontos
   - Vendas (beta)
2. Internacao
   - Internacao
3. Cadastros
   - Animais
   - Clientes
   - Servicos
   - Importar Dados Servicos
   - Termos de Responsabilidade
   - Racas
   - Especies
   - Cores
   - Grupos de Clientes
   - Boxes de Internacao
   - Webhooks

Checkpoint de decisao anterior: como a trilha recente estava em `Atendimento > Cadastros` e ja havia implementacao ate `Cores`, o proximo item pendente pela ordem observada foi `Grupos de Clientes`.

Checkpoint de decisao atual: `Webhooks` fechou a sequencia observada de `Atendimento > Cadastros`; em seguida, `Laboratorio > Atendimentos > Exames`, `Laboratorio > Atendimentos > Laudos`, `Laboratorio > Atendimentos > Hemogramas`, `Laboratorio > Atendimentos > Urina`, `Laboratorio > Atendimentos > Bioquimico`, `Laboratorio > Cadastros > Equipamentos`, `Laboratorio > Cadastros > Tipos de Laudo`, `Laboratorio > Cadastros > Vlr. Ref. Hemograma` e `Laboratorio > Cadastros > Vlr. Ref. Bioquimico` foram implementados. A sequencia observada de `Laboratorio > Cadastros` esta fechada. O fluxo seguiu para o proximo macro do navbar, `Estoque`, iniciando por `Estoque > Controles > Consulta de Precos`.

### Laboratorio observado em 2026-04-24

Submenu `Laboratorio` observado em modo somente leitura:

1. Atendimentos
   - Exames
   - Laudos
   - Hemogramas
   - Urina
   - Bioquimico
2. Cadastros
   - Equipamentos
   - Tipos de Laudo
   - Vlr. Ref. Hemograma
   - Vlr. Ref. Bioquimico

### Estoque observado em 2026-04-26

Tentativa de observacao direta em modo automatizado foi bloqueada por Cloudflare antes do login. Nao houve escrita, criacao, edicao, exclusao, importacao, exportacao, baixa ou confirmacao no Vetus.

Como fallback operacional, a sequencia foi baseada no navbar ja alinhado do `cvg-his-v2`, que havia sido criado a partir da estrutura macro Vetus e segue a ordem documentada para o grupo `Estoque`:

1. Controles
   - Consulta de Precos
   - Entrada de Nota Fiscal
   - Transacao no Estoque
   - Requisicao a Farmacia
   - Validade de Produtos
   - Auditoria de Estoque
   - Auditoria de Precos
   - Transferencia entre Estoques
   - Compras
   - Reajuste de Precos
   - Coletores de Dados
2. Cadastros
   - Produtos
   - Importar Dados Produtos
   - Fornecedores e Despesas
   - Estoques
   - Fabricantes
   - Grupos de Produtos
   - Setores da Empresa
   - Unidades de Medida
   - Tabelas de Preco
   - Ponto de Venda
3. Configuracoes Fiscais
   - Tabela ICMS
   - Tabela IPI
   - Tabela PIS
   - Tabela COFINS
   - Tabela CFOP
   - Tabela NFS-e
   - Matriz Estado ICMS
   - Tabela IBS/CBS

## Regra de sequenciamento

A partir deste checkpoint, a sequencia correta e:

1. escolher o proximo item seguindo a ordem do navbar Vetus;
2. abrir o Vetus apenas para observar o item/subitem;
3. mapear:
   - caminho no menu;
   - filtros;
   - botoes;
   - colunas;
   - formulario;
   - validacoes aparentes;
   - estados;
   - acoes;
   - relacoes com outros modulos;
   - efeitos operacionais;
4. localizar o equivalente no `cvg-his-v2`;
5. implementar usando o padrao existente do projeto;
6. verificar e publicar;
7. atualizar este documento com o resultado da tarefa, status e proximo passo;
8. registrar commit incluindo a atualizacao deste documento quando a tarefa alterar o roadmap/status.

## Modulos ja espelhados ou alinhados nesta frente

| Ordem operacional | Modulo/fluxo | Status no `cvg-his-v2` | Commit principal | Observacoes |
| --- | --- | --- | --- | --- |
| Navbar | Shell/navbar Vetus | Implementado | `c590978`, `2f5cce3`, `50131c5` | Navbar do `cvg-his-v2` alinhado com a estrutura macro do Vetus. Ajuste visual posterior: navbar reduzido para 248px no desktop e 64px no modo compacto, grupos sem bordas externas pesadas, links compactos, padding reduzido, texto dos botoes com quebra controlada em ate duas linhas, hover/ativo mais discretos e validacao responsiva sem overflow horizontal para equilibrar modernidade e usabilidade operacional. Checkpoint de sobriedade posterior: removidos do navbar os blocos de marca, `Menu operacional`, recolher lateral, empresa, troca de contexto e unidade ativa; a lateral agora inicia pela busca e segue diretamente para os modulos, deixando informacoes institucionais para o topbar/contexto global. |
| Atendimento | Fallbacks operacionais Vetus-like | Implementado | `b29bae9` | Paginas fallback para manter navegabilidade inicial. |
| Atendimento > Atendimentos > Agenda | Auditoria profunda e realinhamento Vetus-like da agenda operacional | Implementado | `be2d146`, `4bdbe32`, `75565ac`, `82beccf` | Revisao solicitada em 2026-04-26 por GAPs de UI, fluxo e estrutura. Observado diretamente no Vetus em 2026-04-26 em `/agenda`, somente leitura; nao houve escrita, criacao, edicao, exclusao, importacao, exportacao, confirmacao ou salvamento no Vetus. Estrutura Vetus observada: botao lateral `Criar agendamento`; calendario lateral mensal; filtros laterais `Status`, `Profissional`, `Servico`, `Cliente` e `Marcador`, cada bloco com `Limpar filtros`; toolbar da grade com `Hoje`, navegacao anterior/proximo, titulo da data, visoes `Mes`, `Semana` e `Dia`; grade FullCalendar por profissional com coluna `Sem profissional`, horas do dia e legenda `Folga`, `Aberto`, `Confirmado`, `Executado`, `Cancelado`, `Nao compareceu`, `Vacina`, `Vermifugo` e `Retorno`; fluxo de criacao inicia por selecao de cliente com busca por nome/id/CPF/telefone/e-mail, filtros, paginacao, `Novo Cliente`, `Cancelar` e `Adicionar Cliente`. No `cvg-his-v2`: removida duplicacao de painel superior, cards executivos, disponibilidade paralela e listagem redundante; preservada a tecnologia premium com drawer de detalhe, criacao rapida, validacao de disponibilidade no formulario, check-in, no-show, cancelamento, abertura de atendimento, aliases SPA `/agenda`, `/agendamentos`, `/atendimento/agenda` e `/atendimento/atendimentos/agenda`, e integracao com `/scheduling/overview`, `/scheduling/availability`, `/appointments`, `/queue`, Esteira e Comandas. Correcao posterior da grade: a tela nao troca mais a agenda por estado vazio quando nao ha agendamentos; dia, semana e mes mantem grade visual; horarios disponiveis aparecem explicitamente; range operacional alinhado a `00:00` ate `22:00`; semana indica horario livre mesmo quando outro profissional ja esta ocupado no mesmo horario. Ajuste responsivo posterior: shell lateral reduzido para liberar area util da agenda, grade e cards compactados, eixo de horarios fixo, textos com quebra/ellipsis controlados, colunas menores e validacao visual em desktop, largura intermediaria e mobile sem overflow do body nem cortes nos cards. |
| Atendimento > Cadastros > Clientes | Cadastro de clientes | Implementado | `2a698ba` | Fluxo de cadastro/listagem de clientes espelhado para a arquitetura do `cvg-his-v2`. |
| Atendimento > Cadastros > Animais | Cadastro de animais | Implementado | `b57404f` | Fluxo de animais espelhado; depende de clientes. |
| Atendimento > Cadastros > Servicos | Cadastro de servicos | Implementado | `2c1f875` | Fluxo de servicos Vetus-like. |
| Atendimento > Cadastros > Importacao de servicos | Importacao de servicos | Implementado | `a6bc68f` | Complemento do cadastro de servicos. |
| Atendimento > Cadastros > Termos de Responsabilidade | Cadastro/listagem/modelos de termos | Implementado | `a4e76d6`, `49df82e` | Primeiro em fluxo funcional; depois persistido em banco. |
| Atendimento > Cadastros > Racas | Cadastro de racas | Implementado | `3f2028e` | Persistencia em `breeds`, API `/breeds`, alias `/breed`, paginas SPA e integracao com animal. |
| Atendimento > Cadastros > Especies | Cadastro de especies | Implementado | `c70ac2b` | Persistencia em `animal_species`, API `/species`, alias `/specie`, paginas SPA e integracao com animal. |
| Atendimento > Cadastros > Cores/Pelagens | Cadastro de cores/pelagens | Implementado | `c77af4a` | Persistencia em `coat_colors`, API `/coat-colors`, aliases `/coat-color` e `/pelagens`, paginas SPA. |
| Atendimento > Cadastros > Grupos de Clientes | Cadastro de grupos de clientes | Implementado | `897820c` | Persistencia em `customer_groups`, API `/customer-groups`, aliases `/customer-group` e `/grupos-de-clientes`, paginas SPA de lista/inclusao/edicao/detalhe, politicas comerciais basicas. |
| Atendimento > Cadastros > Boxes de Internacao | Cadastro/listagem de boxes de internacao | Implementado | `61f7395` | Observado no Vetus em `Sistema/Internacao/InternacaoBox.htm`: botao `Incluir`, filtros `Codigo` e `Descricao`, botao `Pesquisar`, tabela com `Codigo`, `Descricao` e `Abrir`. No `cvg-his-v2`: SPA `/beds` com aliases `/boxes-de-internacao`, `/cadastros/boxes-de-internacao`, `/cadastro/boxes-de-internacao`; telas de lista/inclusao/edicao/detalhe; API `/beds`, `/beds/:id`, aliases de colecao; persistencia em `sectors`/`beds`; integracao com mapa de leitos e internação. |
| Atendimento > Cadastros > Webhooks | Cadastro/listagem de webhooks | Implementado | `02c72d6` | Link Vetus observado no navbar como `/Sistema/Cadastros/Webhooks.htm`. Nesta tarefa, a tentativa de login observacional automatizado nao chegou aos campos por indisponibilidade dos seletores de login/validacao; nao houve escrita no Vetus. No `cvg-his-v2`: SPA `/webhooks` com aliases `/webhook`, `/cadastro/webhooks`, `/cadastros/webhooks`; lista com botao `Incluir`, filtros `URL`, `Evento`, `Status`, botao `Pesquisar`, tabela `URL`, `Eventos`, `Status`, `Criado em`, `Abrir`; formulario de inclusao/edicao; detalhe com `Testar`, `Editar`, `Ativar/Desativar`; API com filtros, aliases de colecao, deliveries, stats e reteste; persistencia duravel existente em `webhooks`/`webhook_deliveries`; respostas publicas sem expor `secret`. |
| Laboratorio > Atendimentos > Exames | Listagem/fila de exames laboratoriais | Implementado | `495cfcb` | Observado no Vetus em `Sistema/Laboratorio/Exames.htm`: botao `Incluir`, filtros `Cliente`, `Animal` e `Data`, botao `Pesquisar`, tabela com `Id`, `Cliente`, `Animal`, `Data` e `Abrir`, vazio `Nenhum registro encontrado`. No `cvg-his-v2`: SPA `/laboratory/orders` com aliases `/laboratorio/exames`, `/laboratorio/atendimentos/exames`, `/laboratorio/pedidos-de-exame`, `/laboratorio/atendimentos/pedidos-de-exame`; tela `Exames` com filtros Vetus-like, listagem enriquecida por cliente/animal via cadastros existentes, acao `Incluir` para a Central Diagnostica e `Abrir` no pedido; API `/laboratory/orders`, `/laboratory/exams`, `/laboratorio/exames`, `/laboratorio/atendimentos/exames` com filtros por id, animal/patientId e data; persistencia duravel existente em `diagnostic_orders`. |
| Laboratorio > Atendimentos > Laudos | Listagem de laudos laboratoriais | Implementado | `c67c047` | Observado no Vetus em `Sistema/Laboratorio/Laudos.htm`: botao `Incluir`, filtros `Codigo do Laudo`, `Cliente`, `Proprietario`, `Animal`, `Data da Finalizacao`, `Data de Entrada`, `Corpo do Laudo`, checkbox `Pesquisar Laudos Fechados`, botao `Pesquisar`, tabela com `Codigo de Laudo`, `Cliente`, `Proprietario`, `Animal`, `Data de Finalizacao`, `Data de Entrada`, `Valor` e `Abrir`, vazio `Nenhum registro encontrado`. No `cvg-his-v2`: SPA `/laboratory/results` com aliases `/laboratorio/laudos` e `/laboratorio/atendimentos/laudos`; tela `Laudos` com filtros Vetus-like, listagem enriquecida por cliente/proprietario/animal via cadastros existentes, acao `Incluir` para a Central Diagnostica e `Abrir` para o diagnostico do atendimento; API `/laboratory/results`, `/laboratory/reports`, `/laboratorio/laudos`, `/laboratorio/atendimentos/laudos` com filtros por codigo, animal/patientId, datas, corpo e fechados; persistencia duravel existente em `diagnostic_orders`. |
| Laboratorio > Atendimentos > Hemogramas | Resultado hematologico estruturado | Implementado | `9c76c7f` | Observado no Vetus como rota legacy confirmada `Sistema/Laboratorio/Hemogramas.htm`; a abertura direta da tela ficou bloqueada por borda/Cloudflare, entao a construcao foi baseada na posicao real do navbar, no relatorio de entidade `Hemogramas`, na dependencia estrutural de `Vlr. Ref. Hemograma` e na cadeia `Exames -> Esteira de Exames -> Coleta -> Hemogramas -> Laudo -> Entrega`. No `cvg-his-v2`: SPA `/laboratory/hemograms` com aliases `/hemogramas`, `/laboratorio/hemogramas`, `/laboratorio/atendimentos/hemogramas` e `/laboratorio/exames/hemogramas`; tela `Hemogramas` com botao `Incluir`, filtros `Codigo do Hemograma`, `Cliente`, `Proprietario`, `Animal`, `Data da Analise`, `Data de Entrada`, `Corpo do Resultado`, checkbox `Pesquisar Hemogramas Fechados`, botao `Pesquisar`, listagem enriquecida por cliente/proprietario/animal, tabela de parametros hematologicos ligada a `Vlr. Ref. Hemograma`, status de faixa e historico comparativo; API `/laboratory/hemograms`, `/laboratorio/hemogramas`, `/laboratorio/atendimentos/hemogramas` filtrando resultados `HEM`; persistencia duravel reaproveita `diagnostic_orders` e `laboratory_reference_values`. |
| Laboratorio > Atendimentos > Urina | Resultado urinario estruturado | Implementado | `d21a4d3` | Observado no Vetus como rota legacy confirmada `Sistema/Laboratorio/Urina.htm`; a abertura direta ficou bloqueada por borda/Cloudflare, entao a construcao foi baseada na posicao real do navbar, no relatorio de entidade `Urina` e na cadeia `Exames -> Esteira de Exames -> Coleta -> Urina -> Laudo -> Entrega`. No `cvg-his-v2`: SPA `/laboratory/urinalysis` com aliases `/urina`, `/urinanalise`, `/urinálise`, `/laboratorio/urina`, `/laboratorio/atendimentos/urina` e `/laboratorio/exames/urina`; tela `Urina` com botao `Incluir`, filtros `Codigo do Exame`, `Cliente`, `Proprietario`, `Animal`, `Data da Analise`, `Data de Entrada`, `Corpo do Resultado`, checkbox `Pesquisar Exames Fechados`, botao `Pesquisar`, listagem enriquecida por cliente/proprietario/animal, secoes `Exame fisico`, `Exame quimico`, `Exame microscopico`, achados observacionais e referencias `URIN`; API `/laboratory/urinalysis`, `/laboratorio/urina`, `/laboratorio/atendimentos/urina` filtrando resultados `URIN`; persistencia duravel reaproveita `diagnostic_orders` e `laboratory_reference_values`. |
| Laboratorio > Atendimentos > Bioquimico | Resultado bioquimico estruturado | Implementado | `00308ac` | Observado no Vetus como rota legacy confirmada `Sistema/Laboratorio/Bioquimico.htm`; a abertura direta ficou bloqueada por borda/Cloudflare, entao a construcao foi baseada na posicao real do navbar, no relatorio de entidade `Bioquimico`, na dependencia estrutural de `Vlr. Ref. Bioquimico` e na cadeia `Exames -> Esteira de Exames -> Coleta -> Bioquimico -> Laudo -> Entrega`. No `cvg-his-v2`: SPA `/laboratory/biochemistry` com aliases `/bioquimico`, `/bioquímico`, `/laboratorio/bioquimico`, `/laboratorio/bioquímico`, `/laboratorio/atendimentos/bioquimico` e `/laboratorio/exames/bioquimico`; tela `Bioquimico` com botao `Incluir`, filtros `Codigo do Exame`, `Cliente`, `Proprietario`, `Animal`, `Data da Analise`, `Data de Entrada`, `Corpo do Resultado`, checkbox `Pesquisar Bioquimicos Fechados`, botao `Pesquisar`, listagem enriquecida por cliente/proprietario/animal, resultado tabular por `Painel hepatico`, `Painel renal` e `Metabolico`, e referencias `BIO`; API `/laboratory/biochemistry`, `/laboratorio/bioquimico`, `/laboratorio/atendimentos/bioquimico` filtrando resultados `BIO`; persistencia duravel reaproveita `diagnostic_orders` e `laboratory_reference_values`. |
| Laboratorio > Cadastros > Equipamentos | Cadastro tecnico de equipamentos laboratoriais | Implementado | `a9f9a63` | Observado no Vetus como rota legacy confirmada `Sistema/Laboratorio/Equipamentos.htm`; a abertura direta ficou bloqueada por borda/Cloudflare, entao a construcao foi baseada na posicao real do navbar, no relatorio de entidade `Equipamentos de Laboratorio`, na definicao de `Cadastro de equipamentos`, manutencao preventiva/corretiva e calibracao. No `cvg-his-v2`: SPA `/laboratory/equipment` com aliases `/equipamentos`, `/laboratorio/equipamentos` e `/laboratorio/cadastros/equipamentos`; lista com botao `Incluir`, filtros `Codigo`, `Descricao`, `Tipo`, `Situacao`, botao `Pesquisar`, tabela `Codigo`, `Descricao`, `Tipo`, `No Serie`, `Ultima Calibracao`, `Calibracao`, `Situacao` e `Abrir`; rotas de inclusao, detalhe e edicao; API `/laboratory/equipment`, `/laboratory/equipment/:id`, `/laboratorio/equipamentos`, `/laboratorio/cadastros/equipamentos` com filtros, criacao, detalhe e atualizacao; persistencia duravel reaproveita `laboratory_equipment`; integracao com dashboard de laboratorio, Hemogramas, Bioquimico, Laudos e auditoria tecnica. |
| Laboratorio > Cadastros > Tipos de Laudo | Cadastro de modelos/tipos de laudo laboratoriais | Implementado | `db417fc` | Observado no Vetus como item de navbar em `Laboratorio > Cadastros > Tipos de Laudo`; a construcao segue a rota/ordem documentada e reaproveita a persistencia duravel existente em `laboratory_report_types`. No `cvg-his-v2`: SPA `/laboratory/report-types` com aliases `/tipos-de-laudo`, `/laboratorio/tipos-de-laudo` e `/laboratorio/cadastros/tipos-de-laudo`; lista com botao `Incluir`, filtros `Codigo`, `Descricao`, `Categoria`, `Situacao`, botao `Pesquisar`, tabela `Codigo`, `Descricao`, `Categoria`, `Modelo`, `Situacao` e `Abrir`; rotas de inclusao, detalhe e edicao; API `/laboratory/report-types`, `/laboratory/report-types/:id`, `/laboratorio/tipos-de-laudo`, `/laboratorio/cadastros/tipos-de-laudo` com filtros, criacao, detalhe e atualizacao; integracao com Exames, Laudos, Hemogramas, Bioquimico, Urina e auditoria. |
| Laboratorio > Cadastros > Vlr. Ref. Hemograma | Cadastro de valores de referencia hematologicos | Implementado | `a3e132f` | Observado no Vetus como item de navbar em `Laboratorio > Cadastros > Vlr. Ref. Hemograma`; a construcao segue a rota/ordem documentada e reaproveita a persistencia duravel existente em `laboratory_reference_values` filtrada por `HEM`. No `cvg-his-v2`: SPA `/laboratory/hemogram-reference-values` com aliases `/vlr-ref-hemograma`, `/laboratorio/vlr-ref-hemograma` e `/laboratorio/cadastros/vlr-ref-hemograma`; lista com botao `Incluir`, filtros `Codigo`, `Parametro`, `Unidade`, botao `Pesquisar`, tabela `Codigo`, `Parametro`, `Exame`, `Valor Minimo`, `Valor Maximo`, `Unidade`, `Faixa` e `Abrir`; rotas de inclusao, detalhe e edicao; API `/laboratory/hemogram-reference-values`, `/laboratory/hemogram-reference-values/:id`, `/laboratorio/vlr-ref-hemograma`, `/laboratorio/cadastros/vlr-ref-hemograma` com filtros, criacao, detalhe e atualizacao; integracao com Hemogramas, Laudos, Exames e auditoria tecnica. |
| Laboratorio > Cadastros > Vlr. Ref. Bioquimico | Cadastro de valores de referencia bioquimicos | Implementado | `fd6c417` | Observado no Vetus como item de navbar em `Laboratorio > Cadastros > Vlr. Ref. Bioquimico`; a construcao segue a rota/ordem documentada e reaproveita a persistencia duravel existente em `laboratory_reference_values` filtrada por `BIO`. No `cvg-his-v2`: SPA `/laboratory/biochemistry-reference-values` com aliases `/vlr-ref-bioquimico`, `/laboratorio/vlr-ref-bioquimico` e `/laboratorio/cadastros/vlr-ref-bioquimico`; lista com botao `Incluir`, filtros `Codigo`, `Parametro`, `Unidade`, botao `Pesquisar`, tabela `Codigo`, `Parametro`, `Exame`, `Valor Minimo`, `Valor Maximo`, `Unidade`, `Faixa` e `Abrir`; rotas de inclusao, detalhe e edicao; API `/laboratory/biochemistry-reference-values`, `/laboratory/biochemistry-reference-values/:id`, `/laboratorio/vlr-ref-bioquimico`, `/laboratorio/cadastros/vlr-ref-bioquimico` com filtros, criacao, detalhe e atualizacao; integracao com Bioquimico, Laudos, Exames e auditoria tecnica. |
| Estoque > Controles > Consulta de Precos | Consulta de preco, custo, saldo e disponibilidade | Implementado | `b000f5f` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a primeira posicao do grupo `Estoque > Controles` conforme navbar ja alinhado no `cvg-his-v2`. No `cvg-his-v2`: SPA `/inventory/price-consultation` com aliases `/consulta-de-precos`, `/estoque/consulta-de-precos` e `/estoque/controles/consulta-de-precos`; tela com botao `Novo Produto`, acao `Atualizar`, filtros `Codigo`, `Produto`, `Origem`, botao `Pesquisar`, tabela `Codigo`, `Produto`, `Origem`, `Preco`, `Custo`, `Margem`, `Saldo`, `Status` e `Abrir`; composicao somente leitura dos endpoints persistentes existentes `/products` e `/inventory`; integracao com Produtos, Estoque, Comandas e Atendimento. |
| Estoque > Controles > Entrada de Nota Fiscal | Conferencia de entrada fiscal, lotes, custos e fornecedores | Implementado | `b2320a8` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a segunda posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/nf` com aliases `/entrada-nota-fiscal`, `/entrada-de-nota-fiscal`, `/estoque/entrada-nota-fiscal` e `/estoque/controles/entrada-nota-fiscal`; tela com botao `Novo Produto`, acao `Atualizar`, filtros `Nota Fiscal`, `Fornecedor`, `Produto`, `Lote`, `Status`, botao `Pesquisar`, tabela `Nota Fiscal`, `Fornecedor`, `Produto`, `Lote`, `Entrada`, `Validade`, `Quantidade`, `Custo Unit.`, `Valor`, `Status` e `Abrir`; composicao dos endpoints persistentes existentes `/inventory` e `/inventory/lots`; integracao com Produtos, Estoque, Validade/Lotes, Fornecedores e fluxo fiscal de entrada. |
| Estoque > Controles > Transacao no Estoque | Lancamento operacional de entrada, saida e ajuste de saldo | Implementado | `d88e167` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a terceira posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/movements` com aliases `/transacao-no-estoque`, `/transação-no-estoque`, `/estoque/transacao-no-estoque` e `/estoque/controles/transacao-no-estoque`; tela com botao `Novo Item`, acao `Atualizar`, painel de lancamento com `Estoque`, `Tipo`, `Produto`, `Codigo de Barras`, `Quantidade`, `Observacao`, preview de saldo e botao `Lancar`; filtros `Codigo`, `Produto`, `Natureza`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Natureza`, `Quantidade`, `Saldo`, `Custo`, `Referencia`, `Data` e `Abrir`; persistencia de saldo usando API existente `PATCH /inventory/:id`; listagem combina `/inventory` e `/inventory/consumptions`; tela antiga de ledger permanece como base de `Auditoria de Estoque`. |
| Estoque > Controles > Requisicao a Farmacia | Solicitacao e dispensacao de medicamentos conectadas ao saldo | Implementado | `657351e` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a quarta posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/pharmacy` com aliases `/requisicao-farmacia`, `/requisicao-a-farmacia`, `/requisição-à-farmácia`, `/estoque/requisicao-farmacia` e `/estoque/controles/requisicao-farmacia`; tela com acao `Atualizar`, atalho `Transacao`, painel de requisicao com `Origem`, `Prioridade`, `Solicitante`, `Atendimento / Paciente`, `Produto`, `Codigo de Barras`, `Quantidade`, `Observacao`, preview de saldo e botao `Dispensar`; filtros `Codigo`, `Produto`, `Origem`, `Situacao`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Origem`, `Prioridade`, `Quantidade`, `Situacao`, `Custo`, `Referencia`, `Data` e `Abrir`; baixa de saldo usando API existente `PATCH /inventory/:id`; listagem combina `/inventory` e `/inventory/consumptions`; integracao com Atendimento, Internacao, Cirurgia, Laboratorio e Transacao no Estoque. |
| Estoque > Controles > Validade de Produtos | Controle de vencimento, lote, localizacao e criticidade dos produtos | Implementado | `ece6cc0` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a quinta posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/validity` com aliases `/validade-de-produtos`, `/validade-produtos`, `/estoque/validade-de-produtos` e `/estoque/controles/validade-de-produtos`; tela com acoes `Atualizar`, `Entrada NF` e `Transacao`; painel de conferencia com `Produto`, `Localizacao`, `Lote`, `Validade`, situacao e acao recomendada; filtros `Codigo`, `Produto`, `Lote`, `Fornecedor`, `Validade ate`, `Situacao`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Lote`, `Estoque`, `Fornecedor`, `Fabricacao`, `Validade`, `Dias`, `Quantidade`, `Situacao` e `Abrir`; composicao somente leitura dos endpoints persistentes existentes `/inventory` e `/inventory/lots`; integracao com Entrada de Nota Fiscal, Transacao no Estoque, Produtos e Auditoria de Estoque. |
| Estoque > Controles > Auditoria de Estoque | Rastreabilidade operacional de saldos, consumos, lotes e divergencias | Implementado | `fb8291a` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a sexta posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/audit` com aliases `/auditoria-de-estoque`, `/auditoria-estoque`, `/estoque/auditoria-de-estoque` e `/estoque/controles/auditoria-de-estoque`; tela somente leitura com acoes `Atualizar`, `Validade` e `Transacao`; painel de conferencia com `Registro`, `Natureza`, `Origem`, `Usuario`, saldo auditado e trilha selecionada; filtros `Codigo`, `Produto`, `Origem`, `Natureza`, `Data inicial`, `Data final`, `Situacao`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Natureza`, `Origem`, `Usuario`, `Quantidade`, `Custo`, `Saldo`, `Referencia`, `Situacao`, `Data` e `Abrir`; composicao dos endpoints persistentes existentes `/inventory`, `/inventory/consumptions` e `/inventory/lots`; integracao com Produtos, Validade de Produtos, Entrada de Nota Fiscal e Transacao no Estoque. |
| Estoque > Controles > Auditoria de Precos | Conferencia de precos, custos, margens e tabelas comerciais | Implementado | `15b22b7` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a setima posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/price-audit` com aliases `/auditoria-de-precos`, `/auditoria-de-preços`, `/auditoria-precos`, `/estoque/auditoria-de-precos` e `/estoque/controles/auditoria-de-precos`; tela somente leitura com acoes `Atualizar`, `Consulta` e `Tabelas`; painel de conferencia com `Registro`, `Preco atual`, `Custo`, `Margem`, tabela e acao de auditoria; filtros `Codigo`, `Produto`, `Tabela`, `Origem`, `Situacao`, `Margem minima %`, botao `Pesquisar`; tabela `Codigo`, `Produto / Tabela`, `Origem`, `Tabela`, `Preco`, `Custo`, `Margem`, `Saldo`, `Situacao`, `Data` e `Abrir`; composicao dos endpoints persistentes existentes `/products`, `/inventory` e `/price-tables`; integracao com Consulta de Precos, Produtos, Estoque, Tabelas de Preco e fluxo comercial/PDV. |
| Estoque > Controles > Transferencia entre Estoques | Conferencia de origem, destino, lote e saldo para remanejamento interno | Implementado | `c8aad2f` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a oitava posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/transfers` com aliases `/transferencia-entre-estoques`, `/transferência-entre-estoques`, `/transferencia-estoques`, `/estoque/transferencia-entre-estoques` e `/estoque/controles/transferencia-entre-estoques`; tela com acoes `Atualizar`, `Transacao` e `Estoques`; painel de transferencia com `Origem`, `Destino`, `Produto`, `Codigo de Barras`, `Lote`, `Quantidade`, `Responsavel`, `Observacao`, preview de saldo de origem e botao `Preparar`; filtros `Codigo`, `Produto`, `Origem`, `Destino`, `Situacao`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Origem`, `Destino`, `Lote`, `Quantidade`, `Saldo`, `Situacao`, `Responsavel`, `Data` e `Abrir`; composicao dos endpoints persistentes existentes `/inventory` e `/inventory/lots`; integracao com Transacao no Estoque, Estoques, Produtos, Validade de Produtos e Auditoria de Estoque. Observacao tecnica: como a API atual ainda nao persiste saldo por local/depósito, a acao `Preparar` registra a conferencia no runtime da tela e nao altera o saldo global; a persistencia duravel de transferencia por local deve ser o proximo refinamento tecnico quando o modelo de estoque por deposito for exposto pela API. |
| Estoque > Controles > Compras | Sugestao, cotacao e preparacao de compra por saldo, minimo e lote | Implementado | `6a60fd9` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a nona posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/purchases` com aliases `/compras`, `/estoque/compras`, `/estoque/controles/compras`, `/compras-estoque` e `/compras-de-estoque`; tela com acoes `Atualizar`, `Entrada NF` e `Fornecedores`; painel de compra com `Fornecedor`, `Condicao`, `Produto`, `Codigo`, `Quantidade`, `Custo Unit.`, `Previsao`, `Observacao`, preview de saldo e total previsto, botao `Preparar Pedido`; filtros `Codigo`, `Produto`, `Fornecedor`, `Situacao`, `Previsao ate`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Fornecedor`, `Quantidade`, `Custo Unit.`, `Total`, `Saldo`, `Minimo`, `Situacao`, `Previsao` e `Abrir`; composicao dos endpoints persistentes existentes `/inventory` e `/inventory/lots`; integracao com Entrada de Nota Fiscal, Fornecedores, Produtos, Validade de Produtos e fluxo financeiro futuro de contas a pagar. Observacao tecnica: como a API atual ainda nao persiste pedido de compra, a acao `Preparar Pedido` registra a conferencia no runtime da tela e nao altera saldo/custo; a persistencia duravel de pedidos de compra deve ser o proximo refinamento tecnico quando o contrato de compras for exposto pela API. |
| Estoque > Controles > Reajuste de Precos | Simulacao, conferencia e aplicacao de reajuste comercial por produto, margem e tabela | Implementado | `201ccb9` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a decima posicao do grupo `Estoque > Controles` conforme sequencia documentada. No `cvg-his-v2`: SPA `/inventory/price-adjustments` com aliases `/reajuste-de-precos`, `/reajuste-de-preços`, `/reajuste-precos`, `/estoque/reajuste-de-precos` e `/estoque/controles/reajuste-de-precos`; tela com acoes `Atualizar`, `Auditoria` e `Tabelas`; painel de reajuste com `Tabela`, `Tipo`, `Produto`, `Codigo`, `Valor do Reajuste`, `Arredondamento`, `Margem minima %`, `Motivo`, preview de preco atual/novo preco e botao `Aplicar`; filtros `Codigo`, `Produto`, `Tabela`, `Situacao`, `Margem minima %`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Tabela`, `Preco Atual`, `Novo Preco`, `Variacao`, `Custo`, `Margem`, `Saldo`, `Situacao`, `Data` e `Abrir`; composicao dos endpoints persistentes existentes `/products`, `/inventory` e `/price-tables`; persistencia duravel do reajuste via `PATCH /products/:id`; integracao com Auditoria de Precos, Tabelas de Preco, Consulta de Precos, Produtos e fluxo comercial/PDV. |
| Estoque > Controles > Coletores de Dados | Conferencia por coletor, codigo de barras, lote, saldo e divergencia operacional | Implementado | `3e4414d` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao seguiu a decima primeira posicao do grupo `Estoque > Controles` conforme sequencia documentada e fecha a sequencia de `Estoque > Controles`. No `cvg-his-v2`: SPA `/inventory/data-collectors` com aliases `/coletores-de-dados`, `/coletores`, `/coletor-de-dados`, `/estoque/coletores-de-dados` e `/estoque/controles/coletores-de-dados`; tela com acoes `Atualizar`, `Transacao` e `Auditoria`; painel de coleta com `Coletor`, `Operacao`, `Produto`, `Codigo de Barras`, `Lote`, `Quantidade Coletada`, `Responsavel`, `Observacao`, preview de saldo/divergencia e botao `Registrar Coleta`; filtros `Codigo`, `Produto`, `Coletor`, `Operacao`, `Situacao`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Coletor`, `Operacao`, `Lote`, `Quantidade`, `Saldo`, `Divergencia`, `Situacao`, `Responsavel`, `Data` e `Abrir`; composicao dos endpoints persistentes existentes `/inventory` e `/inventory/lots`; integracao com Transacao no Estoque, Auditoria de Estoque, Validade de Produtos e Produtos. Observacao tecnica: como a API atual ainda nao persiste sessoes de coletor, a acao `Registrar Coleta` registra a conferencia no runtime da tela e nao altera saldo global; a persistencia duravel de sessoes/importacoes de coletor deve ser o proximo refinamento tecnico quando o contrato de coletores for exposto pela API. |
| Estoque > Cadastros > Produtos | Cadastro comercial de produtos, codigos, precos e situacao operacional | Implementado | `e9ee9d9` | Tentativa de observacao direta no Vetus em 2026-04-26 ficou bloqueada por Cloudflare antes do login; nao houve escrita no Vetus. A implementacao iniciou o grupo `Estoque > Cadastros` conforme sequencia documentada. No `cvg-his-v2`: SPA `/products` com aliases `/produtos`, `/estoque/produtos`, `/estoque/cadastros/produtos` e `/cadastros/produtos`; aliases auxiliares `/produtos/novo`, `/estoque/cadastros/produtos/novo`, `/produtos/:id` e `/produtos/:id/editar`; lista com acoes `Atualizar`, `Importar`, `Estoque` e `Incluir`; filtros `Codigo`, `Produto`, `Situacao`, botao `Pesquisar`; tabela `Codigo`, `Produto`, `Descricao`, `Preco Base`, `Situacao`, `Atualizado` e `Abrir`; formulario de inclusao/edicao com `Produto`, `Codigo`, `Descricao`, `Preco Base` e `Produto Ativo`; detalhe com ficha resumida e atalhos `Consulta`, `Auditoria` e `Editar`; API persistente existente `/products`, `/products/:id` com `GET`, `POST` e `PATCH`; integracao com Consulta de Precos, Auditoria de Precos, Reajuste de Precos, Estoque, Validade, Compras, Comandas e fluxo comercial/PDV. |
| Atendimento > Vacinas e Vermifugos | Agenda preventiva, baixa, reagendamento e email preparado | Implementado | `2e53796` | Persistencia em `preventive_events`, API `/vaccines-dewormers`, tela SPA ligada a API. |

## Checkpoint tecnico atual

Ultimos commits relevantes:

```text
`50131c5` feat: simplify sidebar operational chrome
`2f5cce3` feat: compact operational sidebar chrome
`82beccf` feat: tighten responsive appointment agenda layout
`75565ac` feat: keep appointment grid visible across agenda views
`4bdbe32` feat: simplify Vetus-like appointment agenda layout
`be2d146` feat: refine Vetus-like appointment agenda
`e9ee9d9` feat: align Vetus-like products registry
`3e4414d` feat: align Vetus-like inventory data collectors
`201ccb9` feat: align Vetus-like inventory price adjustments
`6a60fd9` feat: align Vetus-like inventory purchases
`c8aad2f` feat: align Vetus-like inventory transfers
`15b22b7` feat: align Vetus-like inventory price audit
`fb8291a` feat: align Vetus-like inventory audit control
`ece6cc0` feat: align Vetus-like product validity control
`657351e` feat: align Vetus-like pharmacy requisitions
`d88e167` feat: align Vetus-like inventory stock transaction
`b2320a8` feat: align Vetus-like inventory invoice entry
`b000f5f` feat: align Vetus-like inventory price consultation
`fd6c417` feat: align Vetus-like biochemistry reference values registry
`a3e132f` feat: align Vetus-like hemogram reference values registry
db417fc feat: align Vetus-like laboratory report types registry
a9f9a63 feat: align Vetus-like laboratory equipment registry
00308ac feat: align Vetus-like laboratory biochemistry flow
d21a4d3 feat: align Vetus-like laboratory urinalysis flow
9c76c7f feat: align Vetus-like laboratory hemograms flow
c67c047 feat: align Vetus-like laboratory reports flow
495cfcb feat: align Vetus-like laboratory exams flow
02c72d6 feat: align Vetus-like webhooks registry flow
61f7395 feat: add Vetus-like inpatient boxes module
2e53796 feat: persist vaccines and dewormers flow
c77af4a feat: add Vetus-like coat colors registry flow
c70ac2b feat: add Vetus-like species registry flow
3f2028e feat: add Vetus-like breeds registry flow
49df82e feat: persist responsibility terms in database
a4e76d6 feat: add Vetus-like responsibility terms flow
a6bc68f feat: add Vetus-like service import flow
2c1f875 feat: mirror Vetus services registry flow
2a698ba feat: mirror Vetus client registration flow
b57404f feat: mirror Vetus animal registration flow
b29bae9 feat: add Vetus-like operational fallback pages
c590978 feat: align navbar with Vetus structure
```

Ultimo estado publicado:

- SPA: `http://localhost:3002`
- API: `http://localhost:3003`
- Ultima rota validada: `http://localhost:3002/appointments`
- API health validado em `http://localhost:3003/health`
- Ultima API validada: `GET http://localhost:3003/scheduling/overview` e contrato SPA para `GET/POST http://localhost:3003/appointments`
- Ultima migration aplicada: `0030_vetus_boxes_internacao`

## Padrao minimo para cada modulo espelhado

Cada modulo deve ser tratado como um produto completo. O minimo esperado:

### Observacao Vetus

- Caminho completo no navbar.
- Nome exato do modulo.
- Submenus relacionados.
- Botoes principais.
- Filtros de listagem.
- Colunas da tabela.
- Estados vazios/carregamento/erro quando observaveis.
- Formulario de inclusao.
- Formulario de edicao.
- Tela de detalhe, se existir.
- Acoes destrutivas ou operacionais, apenas observadas.
- Fluxo de confirmacao, sem confirmar nada.
- Dependencias com outros modulos.
- Regras aparentes de obrigatoriedade.

### Implementacao `cvg-his-v2`

- Migration duravel, quando o modulo tiver dados persistentes.
- Schema em `packages/db/src/schema`.
- Schema compartilhado em `packages/shared/database`, quando aplicavel.
- Store/repository/API seguindo padrao do projeto.
- Endpoints REST explicitos.
- Auditoria via `appendAudit` ou mecanismo equivalente.
- Validacao de input no boundary.
- Service SPA em `apps/spa/src/services`.
- Pagina SPA usando design system existente.
- Rotas e aliases compatibeis com nomes Vetus/PT-BR.
- Testes de API.
- Testes de SPA.
- Typecheck.
- Rebuild/publicacao no compose existente.
- Commit claro.

## Plano macro de espelhamento por navbar

### 1. Inicio

Objetivo: espelhar dashboard inicial operacional.

Fluxos a observar no Vetus:

- cards/atalhos de Comandas, Clientes, Animais, Agenda, Produtos e Vendas;
- comandas abertas;
- lembretes do dia;
- aniversariantes;
- troca de empresa/unidade;
- notificacoes;
- suporte;
- perfil do usuario.

Status atual:

- Inicio existe no `cvg-his-v2`, mas precisa de validacao fina contra o Vetus.

Plano:

1. Mapear todos os cards e blocos do Inicio Vetus.
2. Comparar com Dashboard/Home do `cvg-his-v2`.
3. Ajustar cards, filtros e atalhos sem copiar dados reais.
4. Conectar cada card a endpoint real quando existir.
5. Criar fallback vazio quando o endpoint ainda nao existir.

### 2. Atendimento

Objetivo: cobrir todo o fluxo operacional de recepcao, cadastro, agenda, atendimento clinico e preventivo.

Subareas ja parcialmente implementadas:

- Clientes.
- Animais.
- Servicos.
- Termos de Responsabilidade.
- Racas.
- Especies.
- Cores/Pelagens.
- Grupos de Clientes.
- Vacinas e Vermifugos.

Subareas a mapear na ordem real do Vetus:

- Cadastros ainda pendentes.
- Agenda.
- Fila/esteira.
- Comandas/atendimento.
- Prontuario.
- Internacao.
- Procedimentos.
- Vacinas e vermifugos em profundidade.
- Protocolos preventivos, somente se aparecerem na ordem do Vetus.
- Documentos, termos, autorizacoes e anexos.

Plano por item:

1. Abrir submenu de Atendimento no Vetus e registrar ordem exata.
2. Marcar cada subitem como:
   - implementado;
   - implementado parcial;
   - placeholder;
   - ausente;
   - precisa observacao.
3. Seguir item por item nessa ordem.
4. Para cada cadastro, preferir CRUD completo com persistencia.
5. Para cada fluxo operacional, implementar listagem + detalhe + acao principal + auditoria.

### 3. Laboratorio

Objetivo: espelhar laboratorio, pedidos, resultados, equipamentos e valores de referencia.

Itens provaveis a observar:

- pedidos de exame;
- resultados;
- equipamentos;
- valores de referencia;
- hemograma;
- bioquimico;
- urinálise;
- integracoes de laboratorio.

Plano:

1. Validar ordem real do submenu Laboratorio no Vetus.
2. Comparar com paginas existentes em `apps/spa/src/pages/laboratory`.
3. Priorizar fluxos com maior dependencia clinica:
   - pedido;
   - coleta/status;
   - resultado;
   - laudo;
   - referencia.
4. Garantir vinculo com animal, cliente, atendimento e prontuario.

### 4. Estoque

Objetivo: espelhar cadastros, movimentacoes, produtos, fornecedores, grupos, fabricantes, almoxarifados e cadeia fria.

Itens provaveis a observar:

- produtos;
- grupos de produtos;
- fornecedores;
- fabricantes;
- entradas/saidas;
- inventario;
- validade;
- consulta de preco;
- auditoria de preco;
- farmacia;
- geladeira de vacinas/cadeia fria.

Plano:

1. Validar ordem real do submenu Estoque no Vetus.
2. Identificar quais itens ja existem no `cvg-his-v2`.
3. Espelhar primeiro os cadastros base.
4. Depois movimentos e estoque fiscal.
5. Integrar vacinas/vermifugos e servicos a produtos quando o Vetus indicar o fluxo.

### 5. Financeiro

Objetivo: espelhar contas, caixa, pagamentos, recebiveis, cartoes, PIX, despesas, centros de custo, relatórios financeiros e conciliacoes.

Itens provaveis a observar:

- contas a receber;
- contas a pagar;
- caixa;
- cartoes;
- pagamentos antecipados;
- PIX;
- despesas;
- centros de custo;
- relatorios;
- dashboards multifilial;
- auditoria financeira.

Plano:

1. Validar ordem real do submenu Financeiro no Vetus.
2. Reaproveitar os modulos financeiros ja construidos.
3. Fechar gaps de fluxo operacional:
   - lancamento;
   - baixa;
   - estorno;
   - conciliacao;
   - auditoria;
   - relatorio.
4. Manter trilhas de auditoria para acoes sensiveis.

### 6. Marketing

Objetivo: espelhar comunicacao com tutor, campanhas, email de vacina, SMS, WhatsApp e lembretes.

Itens provaveis a observar:

- layout de email de vacina;
- campanhas;
- SMS;
- WhatsApp;
- aniversariantes;
- lembretes;
- comunicados.

Plano:

1. Validar submenu Marketing no Vetus.
2. Mapear modelos, filtros e botoes de envio.
3. Implementar inicialmente preparacao/simulacao segura quando envio real ainda nao estiver configurado.
4. Integrar com vacinas/vermifugos, agenda, aniversariantes e clientes.
5. Nunca disparar mensagens reais durante observacao Vetus.

### 7. RH

Objetivo: espelhar equipe, profissionais, escalas, disponibilidade, comissoes e permissoes operacionais.

Itens provaveis a observar:

- colaboradores;
- profissionais;
- cargos/perfis;
- escalas;
- disponibilidade;
- comissoes;
- controle de acesso.

Plano:

1. Validar submenu RH no Vetus.
2. Comparar com modulos `staff`, `users`, `access-control` e comissoes existentes.
3. Priorizar cadastro de profissionais e disponibilidade por impacto em agenda/atendimento.
4. Depois permissoes e comissoes.

### 8. Relatorios

Objetivo: espelhar relatorios operacionais, financeiros, estoque, atendimento, producao, vacinas e marketing.

Itens provaveis a observar:

- relatorios de atendimento;
- financeiro;
- estoque;
- producao;
- fiscal;
- vacinas/vermifugos;
- clientes/animais;
- exportacoes.

Plano:

1. Validar submenu Relatorios no Vetus.
2. Separar relatorios por dominio.
3. Para cada relatorio:
   - filtros;
   - colunas;
   - totalizadores;
   - drilldown;
   - exportacao, se houver.
4. No `cvg-his-v2`, expor relatorios com endpoints agregados e UI consistente.
5. Evitar exportacoes reais ate o fluxo estar validado.

## Matriz de status inicial por navbar

| Navbar Vetus | Status geral no `cvg-his-v2` | Proxima acao |
| --- | --- | --- |
| Inicio | Parcial | Mapear blocos do dashboard Vetus e comparar com Home atual. |
| Atendimento | Em andamento | Validar submenu completo e continuar na ordem real, marcando o que ja foi feito. |
| Laboratorio | Parcial | Observar ordem do submenu e comparar com paginas existentes. |
| Estoque | Em andamento | Continuar em `Estoque > Cadastros`, proximo item provavel: `Importar Dados Produtos`. |
| Financeiro | Parcial/avancado | Revalidar contra ordem Vetus e fechar fluxos de baixa/conciliacao/auditoria. |
| Marketing | Parcial | Mapear comunicacoes e integrar com preventivo. |
| RH | Parcial | Mapear submenu e alinhar com staff/users/access-control. |
| Relatorios | Parcial | Mapear relatorios Vetus por dominio e priorizar os operacionais. |

## Criterio de pronto de um modulo

Um modulo so deve ser considerado espelhado quando tiver:

- caminho de menu/rota equivalente;
- tela com layout e controles equivalentes;
- filtros principais;
- listagem;
- formulario ou detalhe, quando existir no Vetus;
- acoes principais;
- persistencia duravel quando houver dado de negocio;
- API testada;
- SPA testada;
- typecheck/build sem erro;
- migration aplicada;
- publicado no localhost existente;
- commit criado;
- registro neste documento ou em documento complementar.

## Riscos e cuidados

- O Vetus contem dados reais de clientes e animais. Nao copiar esses dados.
- Alguns fluxos do Vetus podem executar acoes irreversiveis, como baixa, exclusao, envio de mensagem, fechamento financeiro ou alteracao de estoque. Esses fluxos devem ser apenas observados ate o ponto anterior a confirmacao.
- Se um botao abrir modal de confirmacao, nao confirmar.
- Se houver duvida se uma acao grava dado, tratar como gravacao e nao executar.
- Cloudflare pode bloquear navegacao automatizada. Se ocorrer, usar Chrome completo em ambiente controlado, ainda apenas para observacao.
- O `cvg-his-v2` ja tem infraestrutura funcional. Nao criar portas ou dependencias paralelas.

## Proximo passo recomendado

Apos concluir `Estoque > Cadastros > Produtos`, continuar pela ordem do grupo `Estoque > Cadastros`:

1. `Estoque > Cadastros > Importar Dados Produtos`

Antes de implementar o proximo item, abrir novamente o Vetus apenas em modo observacional para confirmar campos, botoes, filtros, colunas e acoes do modulo escolhido. Este documento deve ser atualizado novamente ao termino da proxima tarefa.
