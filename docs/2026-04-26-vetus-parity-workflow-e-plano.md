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

Checkpoint de decisao atual: `Webhooks` fechou a sequencia observada de `Atendimento > Cadastros`; em seguida, `Laboratorio > Atendimentos > Exames` e `Laboratorio > Atendimentos > Laudos` foram implementados. O proximo modulo pela ordem observada em `Laboratorio > Atendimentos` e `Hemogramas`.

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
| Navbar | Shell/navbar Vetus | Implementado | `c590978` | Navbar do `cvg-his-v2` alinhado com a estrutura macro do Vetus. |
| Atendimento | Fallbacks operacionais Vetus-like | Implementado | `b29bae9` | Paginas fallback para manter navegabilidade inicial. |
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
| Laboratorio > Atendimentos > Laudos | Listagem de laudos laboratoriais | Implementado | Este commit | Observado no Vetus em `Sistema/Laboratorio/Laudos.htm`: botao `Incluir`, filtros `Codigo do Laudo`, `Cliente`, `Proprietario`, `Animal`, `Data da Finalizacao`, `Data de Entrada`, `Corpo do Laudo`, checkbox `Pesquisar Laudos Fechados`, botao `Pesquisar`, tabela com `Codigo de Laudo`, `Cliente`, `Proprietario`, `Animal`, `Data de Finalizacao`, `Data de Entrada`, `Valor` e `Abrir`, vazio `Nenhum registro encontrado`. No `cvg-his-v2`: SPA `/laboratory/results` com aliases `/laboratorio/laudos` e `/laboratorio/atendimentos/laudos`; tela `Laudos` com filtros Vetus-like, listagem enriquecida por cliente/proprietario/animal via cadastros existentes, acao `Incluir` para a Central Diagnostica e `Abrir` para o diagnostico do atendimento; API `/laboratory/results`, `/laboratory/reports`, `/laboratorio/laudos`, `/laboratorio/atendimentos/laudos` com filtros por codigo, animal/patientId, datas, corpo e fechados; persistencia duravel existente em `diagnostic_orders`. |
| Atendimento > Vacinas e Vermifugos | Agenda preventiva, baixa, reagendamento e email preparado | Implementado | `2e53796` | Persistencia em `preventive_events`, API `/vaccines-dewormers`, tela SPA ligada a API. |

## Checkpoint tecnico atual

Ultimos commits relevantes:

```text
Este commit feat: align Vetus-like laboratory reports flow
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
- Ultima rota validada: `http://localhost:3002/laboratory/results`
- API health validado em `http://localhost:3003/health`
- Ultima API validada: `GET http://localhost:3003/laboratory/results`
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
| Estoque | Parcial | Observar ordem do submenu e conectar com produtos/vacinas/servicos. |
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

Apos concluir `Laboratorio > Atendimentos > Laudos`, continuar pela ordem observada em `Laboratorio > Atendimentos`:

1. `Laboratorio > Atendimentos > Hemogramas`

Antes de implementar o proximo item, abrir novamente o Vetus apenas em modo observacional para confirmar campos, botoes, filtros, colunas e acoes do modulo escolhido. Este documento deve ser atualizado novamente ao termino da proxima tarefa.
