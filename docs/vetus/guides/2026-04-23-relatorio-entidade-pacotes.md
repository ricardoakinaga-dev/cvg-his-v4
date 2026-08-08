# Relatório da Entidade Pacotes

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica da entidade `pacotes`;
- foco em produto composto, sessões, recorrência comercial e relação com atendimento, agenda, comanda e faturamento;
- inspeção somente leitura, sem criar pacote, sem pagar sessão e sem salvar edição.

Evidências principais:

- [pacotes-lista.png](../inspection/2026-04-23T23-46-55-036Z-pacotes/screenshots/pacotes-lista.png)
- [pacotes-lista.json](../inspection/2026-04-23T23-46-55-036Z-pacotes/pacotes-lista.json)
- [pacotes-detalhe.png](../inspection/2026-04-23T23-46-55-036Z-pacotes/screenshots/pacotes-detalhe.png)
- [pacotes-detalhe.json](../inspection/2026-04-23T23-46-55-036Z-pacotes/pacotes-detalhe.json)
- [network.json](../inspection/2026-04-23T23-46-55-036Z-pacotes/network.json)
- [2026-04-23-relatorio-entidade-agenda.md](../guides/2026-04-23-relatorio-entidade-agenda.md)
- [2026-04-23-relatorio-entidade-comanda.md](../guides/2026-04-23-relatorio-entidade-comanda.md)
- [2026-04-23-relatorio-entidade-vendas.md](../guides/2026-04-23-relatorio-entidade-vendas.md)
- [2026-04-23-relatorio-entidade-financeiro.md](../guides/2026-04-23-relatorio-entidade-financeiro.md)

Nota de segurança:

- a análise foi feita por UI, markup e rede;
- não houve criação de pacote;
- não houve pagamento de pacote ou sessão;
- não houve edição persistida.

## 1. Síntese executiva

`Pacotes` é um módulo beta funcional e maduro o suficiente para ser tratado como entidade própria do core novo.

Ele não apareceu como legado operacional nesta rodada. Pelo contrário:

- a rota beta `/pacotes` funciona;
- a leitura anterior já apontava `404` para a referência legacy histórica;
- a interface atual já cobre listagem e edição detalhada do pacote.

Leitura objetiva:

- `pacote` é um produto composto de serviços;
- é vinculado a `cliente` e `animal`;
- tem emissão, validade, observações e status;
- suporta pagamento;
- organiza sessões/serviços dentro de um contrato comercial recorrente.

## 2. Arquitetura do módulo

Rota confirmada:

- `/pacotes`

APIs confirmadas na rede:

- `GET https://dorylus.vetus.com.br/packages/list?size=10&page=0&sort=id,desc`
- `GET https://dorylus.vetus.com.br/packages/3`

Chamadas de apoio observadas:

- `GET /animals/client/47?size=100`
- `GET /commands/open?`

Leitura:

- o módulo está implementado no beta com backend dedicado;
- ele já conversa com entidades relacionadas como `animal` e `comandas abertas`;
- não depende do legado para sua superfície principal.

## 3. Estrutura da listagem

A listagem de `Pacotes` confirmou uma estrutura simples e muito orientada ao acompanhamento.

Elementos visíveis:

- título `Pacotes`
- ação `Filtrar`
- ação `Incluir Novo Pacote`
- busca por `Cliente ou Animal`

Cada card da listagem expõe:

- `Cliente`
- `Animal`
- `Emissão`
- `Validade`
- `Status do pacote`
- ação `Pagar pacote`
- ação `Ver detalhes`
- expansão `Ver serviços`
- expansão `Observações`

Leitura:

- a listagem já é praticamente uma superfície operacional;
- o usuário não vê só o “nome do pacote”, mas o vínculo do pacote com cliente e animal;
- o pacote é tratado como objeto vivo, com status e ação financeira disponível desde a fila.

## 4. Estrutura do detalhe

O detalhe abriu dentro do próprio fluxo do beta, sem redirecionar para outra tecnologia.

Blocos confirmados:

- `Editar Pacote`
- `ID`
- `Cliente`
- `Animal`
- `Data de emissão`
- `Data de validade`
- seção `Serviços`
- seção `Observações`

Ações confirmadas:

- `Excluir`
- `Imprimir`
- `Pagar Pacote`
- `Cancelar`
- `Salvar`

Leitura:

- o pacote é editável como entidade de contrato operacional;
- há lifecycle administrativo completo;
- o detalhe não é só consulta, ele foi desenhado como tela de manutenção.

## 5. Composição do pacote

Essa é a parte mais importante da rodada.

No detalhe aberto, o pacote mostrou uma composição explícita por serviços:

- `Serviço 1`
- `Serviço 2`
- `Serviço 3`

Cada serviço exibiu:

- descrição do serviço
- valor unitário
- validade própria

Exemplo observado:

- `VACINA V4 FELINA`
- `VACINA ANTI-RÁBICA`
- valor `R$ 50,00`
- validade individual por item

Também apareceu:

- ação `Adicionar outro serviço`

Leitura:

- o pacote não é um bloco fechado indivisível;
- ele é um contêiner de sessões/serviços unitários;
- cada item do pacote pode ter validade própria;
- há forte aderência a modelos de recorrência clínica/comercial, como vacina, banho, sessões seriadas ou planos de serviços.

## 6. Relação com cliente e animal

Essa relação é explícita e central.

Na listagem e no detalhe aparecem:

- `Cliente`
- `Animal`

Leitura:

- diferente do financeiro puro, aqui o `animal` continua presente na entidade;
- diferente da venda pura, o `pacote` não é só comercial, ele é também operacional/assistencial;
- o pacote nasce no nível econômico do cliente, mas continua ancorado no paciente.

Isso faz do pacote uma entidade intermediária entre:

- relacionamento comercial;
- planejamento de atendimento;
- consumo assistencial.

## 7. Relação com agenda

A relação com `agenda` é forte, mesmo sem botão explícito de “agendar” na tela capturada.

Os sinais são:

- o pacote é vinculado a `animal`;
- o pacote é composto por serviços;
- o pacote tem emissão, validade e serviços consumíveis;
- a modelagem anterior de API já indicava `sessions`.

Leitura:

- a agenda é o candidato natural para consumir sessões do pacote;
- o pacote fornece a camada contratual/recorrente;
- a agenda fornece a execução temporal de cada sessão.

Resumo funcional:

- pacote define o direito de uso;
- agenda executa uma ocorrência desse direito.

## 8. Relação com comanda

Essa ligação também é forte.

A rede desta rodada mostrou:

- `GET /commands/open?`

Leitura:

- o módulo de pacotes enxerga o contexto de comandas abertas;
- há integração operacional entre pacote e comanda;
- isso sugere que a utilização de um item do pacote pode repercutir em atendimento/comanda.

Hipótese mais forte, sustentada pelos módulos anteriores:

- a sessão ou serviço do pacote é consumida dentro da jornada de atendimento;
- a `comanda` é a entidade operacional onde esse consumo pode ser materializado.

## 9. Relação com faturamento e financeiro

Na própria listagem e no detalhe aparece a ação:

- `Pagar pacote`

Isso é decisivo.

Leitura:

- o pacote possui estado financeiro próprio;
- ele não é só um agrupador de serviços, mas também um objeto comercial faturável;
- o pagamento pode acontecer no nível do pacote, não apenas item a item.

Em conjunto com o financeiro já inspecionado:

- o pacote representa uma receita contratual;
- o financeiro depois deve absorver o reflexo desse pagamento;
- o consumo das sessões e o recebimento do pacote podem ser desacoplados no tempo.

Essa separação é típica de produto recorrente ou pré-pago.

## 10. Status, validade e lifecycle

Na listagem apareceu:

- `Status do pacote: Disponível`

Também aparecem:

- `Emissão`
- `Validade`

Leitura:

- o pacote possui lifecycle temporal;
- a disponibilidade depende de estado e validade;
- ele não é um item atemporal de cadastro, mas um contrato ativo com janela de uso.

No detalhe, as ações disponíveis reforçam isso:

- pagar
- imprimir
- salvar
- excluir

Conclusão:

- o pacote vive um ciclo administrativo e econômico completo.

## 11. Observações e camada contratual

O módulo traz:

- bloco `Observações`
- placeholder `Observações gerais sobre o pacote`
- contador de caracteres

Leitura:

- existe necessidade real de registrar contexto contratual ou operacional;
- o pacote pode carregar regras, condições, exceções ou instruções de uso;
- isso o aproxima mais de “acordo comercial operacionalizado” do que de simples combo promocional.

## 12. Modelo funcional inferido

Com base na UI confirmada e nas APIs observadas, a entidade `pacote` pode ser lida assim:

1. o usuário vincula `cliente` e `animal`;
2. define um conjunto de `serviços`;
3. cada serviço vira uma unidade consumível com valor e validade;
4. o pacote ganha emissão, validade global e observações;
5. o pacote pode ser pago como objeto comercial;
6. as sessões/serviços do pacote são consumidas ao longo da jornada operacional, provavelmente via agenda/comanda.

Essa modelagem bate com a especificação já documentada no projeto:

- `clientId`
- `animalId`
- `totalSessions`
- `intervalDays`
- `items`
- pagamento de sessão

Mesmo sem reproduzir a especificação aqui como fonte primária da rodada, a UI ficou coerente com ela.

## 13. Diferença entre pacote e venda/comanda

Essa distinção é importante.

`Venda`:

- transação comercial imediata;
- forte orientação a item e pagamento;
- menor presença do animal.

`Comanda`:

- transação operacional do atendimento;
- forte presença de cliente, animal, itens e execução.

`Pacote`:

- contrato composto e recorrente;
- forte presença simultânea de cliente e animal;
- contém serviços futuros/consumíveis;
- pode ser pago antes, durante ou em outro momento da execução.

Leitura:

- o pacote funciona como camada intermediária entre comercial e operação;
- ele antecipa e organiza atendimentos futuros.

## 14. Limitações da inspeção

- a rodada confirmou listagem e detalhe de um pacote, mas não executou pagamento;
- não houve clique em `Salvar`;
- não houve consumo de sessão;
- não houve navegação explícita para agenda ou comanda a partir do detalhe;
- a relação com agenda/comanda foi inferida por conjunto de evidências, não por execução transacional.

Mesmo assim, a leitura da entidade ficou forte porque a UI revelou:

- cliente
- animal
- serviços
- validade
- observações
- pagamento

## 15. Conclusão

`Pacotes` é uma das entidades mais estratégicas do core beta.

Ela fecha a camada de produto composto e recorrência comercial porque combina numa só estrutura:

- vínculo comercial com `cliente`;
- vínculo assistencial com `animal`;
- composição de `serviços`;
- validade e disponibilidade;
- pagamento do pacote;
- integração provável com `agenda` e `comanda`.

Em termos de arquitetura funcional, o pacote opera como contrato de consumo futuro.

Essa é a leitura mais importante da rodada:

- `venda` monetiza o item imediato;
- `comanda` operacionaliza o atendimento;
- `pacote` organiza recorrência, pré-pagamento e consumo planejado ao longo do tempo.
