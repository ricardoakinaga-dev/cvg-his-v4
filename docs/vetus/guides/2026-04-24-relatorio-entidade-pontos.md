# Relatório da Entidade Pontos e Resgate de Pontos

Data-base da inspeção: 24 de abril de 2026

Escopo:

- análise específica da entidade `pontos` e do módulo operacional `Resgate de Pontos`;
- foco em fidelização, benefício comercial e relação com atendimento, venda e pacote;
- inspeção somente leitura, sem incluir resgate, sem editar regras e sem salvar qualquer alteração.

Evidências principais:

- [pontos-lista.png](../inspection/2026-04-24T00-01-06-205Z-pontos/screenshots/pontos-lista.png)
- [pontos-lista.json](../inspection/2026-04-24T00-01-06-205Z-pontos/pontos-lista.json)
- [pontos-lista.html](../inspection/2026-04-24T00-01-06-205Z-pontos/pontos-lista.html)
- [pontos-text-pesquisar-.png](../inspection/2026-04-24T00-01-06-205Z-pontos/screenshots/pontos-text-pesquisar-.png)
- [pontos-text-cliente-.png](../inspection/2026-04-24T00-01-06-205Z-pontos/screenshots/pontos-text-cliente-.png)
- [pontos-text-pontos-.png](../inspection/2026-04-24T00-01-06-205Z-pontos/screenshots/pontos-text-pontos-.png)
- [network.json](../inspection/2026-04-24T00-01-06-205Z-pontos/network.json)
- [01-PLANEJAMENTO-ERP-ENTERPRISE.md](../guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md)
- [03-MODELO-DADOS.md](../guides/03-MODELO-DADOS.md)
- [04-ESPECIFICACAO-APIS.md](../guides/04-ESPECIFICACAO-APIS.md)

Nota de segurança:

- a análise foi feita por UI, markup, rede e documentação interna do projeto;
- não houve inclusão de resgate;
- não houve pontuação manual;
- não houve gravação dentro do ERP.

## 1. Síntese executiva

`Resgate de Pontos` existe hoje como módulo operacional ativo no legado, acessado por fluxo de SSO a partir do shell beta.

O que ficou confirmado na UI:

- rota funcional `https://erp.vetus.com.br/Sistema/Atendimento/PontuacaoResgate.htm`;
- tela intitulada `Resgate de Pontos`;
- listagem centrada em `Id`, `Cliente`, `Data`, `Pontos` e ação `Abrir`;
- filtro por `Cliente` e `Data`;
- ação `Incluir`.

O que ficou sugerido pela estrutura interna da tela:

- o resgate não é só abatimento abstrato de saldo;
- ele parece aceitar materialização em `produto` e `serviço`, porque a página expõe campos internos `formDialog:quantidadeProduto` e `formDialog:quantidadeServico`.

O que ficou sustentado pelos documentos internos:

- o domínio de fidelidade prevê acúmulo por compra, regras configuráveis, bloqueio de pontos e resgate por produtos/serviços;
- a modelagem prevista usa `loyalty_programs`, `loyalty_points` e `loyalty_redemptions`;
- a camada de API prevista já separa consulta de pontos, concessão de pontos e resgate.

Leitura objetiva:

- `pontos` fecha o eixo de fidelização comercial do ERP;
- a entidade é explicitamente centrada em `cliente`;
- o vínculo com `atendimento`, `venda` e `pacote` existe mais como efeito comercial e de consumo do que como dimensão explícita da listagem principal.

## 2. Arquitetura do módulo

Rota confirmada:

- `https://erp.vetus.com.br/Sistema/Atendimento/PontuacaoResgate.htm`

Fluxo de acesso confirmado em rede:

- `erp-beta.vetus.com.br/login`
- `erp-beta.vetus.com.br/selecionarEmpresa`
- `erp.vetus.com.br/NewLogin.htm?...returnUrl=...PontuacaoResgate.htm`
- `erp.vetus.com.br/Sistema/EscolherEmpresa.htm?...returnUrl=...PontuacaoResgate.htm`
- `erp.vetus.com.br/Sistema/Atendimento/PontuacaoResgate.htm`

Tecnologia observada:

- módulo legado com formulários `POST` para a própria rota;
- recursos `javax.faces.resource`;
- estrutura coerente com `JSF + PrimeFaces`, como já apareceu em outros módulos legados.

Leitura:

- fidelidade ainda não está materializada como módulo beta nativo nesta superfície;
- o beta hoje atua como camada de autenticação e navegação;
- a operação de resgate segue no legado.

## 3. Estrutura da listagem

A tela aberta mostrou uma listagem administrativa enxuta e orientada a histórico de resgates.

Elementos confirmados:

- título `Resgate de Pontos`;
- ação `Incluir`;
- filtro `Cliente`;
- filtro `Data`;
- ação `Pesquisar`;
- colunas `Id`, `Cliente`, `Data`, `Pontos`, `Abrir`.

Estado observado na coleta:

- a grade estava sem linhas visíveis, com mensagem `Nenhum registro encontrado`.

Leitura:

- a entidade de resgate tem identificação própria;
- o evento de fidelidade fica registrado historicamente, não só como saldo agregado;
- o módulo foi desenhado para consulta e manutenção de registros de resgate, não apenas para exibir saldo corrente.

## 4. Estrutura interna do resgate

O HTML da tela revelou mais do que a camada visual exposta na listagem.

Campos internos confirmados no markup:

- `formDialog:quantidadeProduto = 0`
- `formDialog:quantidadeServico = 0`

Esses campos não apareceram como bloco expandido na UI capturada, mas existem no formulário de diálogo da própria página.

Leitura:

- o resgate parece aceitar composição por quantidades de benefício;
- a tela foi desenhada para tratar pelo menos duas classes de recompensa: `produto` e `serviço`;
- isso aproxima o programa de fidelidade da operação comercial real, em vez de limitar o uso de pontos a um desconto genérico de valor.

Importante:

- esta última conclusão é inferência forte baseada em markup real;
- ela não foi confirmada por abertura completa de um registro ou submissão de formulário, porque a passada permaneceu estritamente em leitura.

## 5. Relação com cliente e animal

Na evidência direta desta rodada, a entidade está claramente ancorada em `cliente`.

Sinais confirmados:

- filtro principal por `Cliente`;
- coluna `Cliente` na grade;
- documentação de API baseada em `clientId`;
- modelagem de dados com `client_id` em `loyalty_points` e `loyalty_redemptions`.

O `animal` não apareceu como dimensão explícita:

- não há coluna `Animal` na listagem;
- não houve campo visível de paciente na tela capturada;
- a modelagem prevista de fidelidade também está orientada a `client_id`, não a `animal_id`.

Leitura:

- a fidelização é econômica e relacional no nível do tutor/cliente;
- o benefício pode repercutir sobre serviços consumidos por um animal, mas o lastro contábil/comercial do ponto pertence ao cliente.

## 6. Relação com venda, comanda e pacote

### 6.1 Venda

Evidência documental interna:

- o planejamento do domínio descreve `acúmulo de pontos por compra` em [01-PLANEJAMENTO-ERP-ENTERPRISE.md](../guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md).
- a modelagem de `loyalty_points` prevê `source_type` com comentário `purchase, bonus, adjustment` em [03-MODELO-DADOS.md](../guides/03-MODELO-DADOS.md).

Leitura:

- a venda é o gerador mais provável do saldo de fidelidade;
- o programa de pontos fecha a camada de incentivo comercial pós-compra;
- a relação com `vendas` é estrutural, mesmo que a tela de resgate não exponha a venda originadora.

### 6.2 Comanda

Evidência direta nesta rodada é limitada.

Não apareceu:

- coluna de `Comanda`;
- referência textual visível a número de comanda;
- vínculo de resgate a uma comanda específica na lista aberta.

Leitura mais defensável:

- a comanda pode ser um dos contextos operacionais onde um benefício é consumido;
- porém isso não ficou explicitamente provado na UI desta passada;
- o elo com `comanda` deve ser tratado aqui como hipótese operacional compatível com o restante do ERP, não como fato confirmado pela tela.

### 6.3 Pacote

Também não houve referência visual direta a `pacote` na tela de resgate.

Mesmo assim, a relação de domínio é plausível porque:

- o planejamento interno trata fidelidade como benefício por produtos/serviços;
- `pacote` já apareceu nos relatórios anteriores como contrato de consumo futuro de serviços;
- um programa de fidelidade pode coexistir com pacotes como incentivo comercial ou bonificação de consumo.

Leitura:

- a relação com `pacote` faz sentido no domínio;
- mas, nesta rodada, ela não passou de leitura arquitetural e não foi confirmada por UI ou rede específica.

## 7. Modelagem prevista do domínio

Os documentos internos do projeto ajudam a fechar a leitura arquitetural da entidade.

Planejamento funcional previsto:

- `Acúmulo de pontos por compra`
- `Regras de pontuação configuráveis`
- `Resgate de pontos por produtos/serviços`
- `Bloqueio de pontos`
- `Saldo disponível vs bloqueado`

Entidades previstas:

- `LoyaltyProgram`
- `LoyaltyPoint`
- `LoyaltyRedemption`

Modelagem de dados prevista:

- `loyalty_programs`
- `loyalty_points`
- `loyalty_redemptions`

Campos mais relevantes observados na especificação:

- `points_per_real`
- `redemption_rules`
- `client_id`
- `source_type`
- `is_blocked`
- `points_used`
- `reward_description`

Leitura:

- o desenho de fidelidade é mais amplo do que a tela legacy hoje deixa ver;
- há separação entre programa, crédito de pontos e evento de resgate;
- isso indica que o saldo do cliente é composto por lançamentos, e não só por um contador agregado sem histórico.

## 8. APIs previstas para fidelidade

Na especificação interna, a seção `17. FIDELIDADE` prevê:

- `GET /loyalty/points?clientId=`
- `POST /loyalty/points/award`
- `POST /loyalty/redeem`

O exemplo de request de resgate usa:

- `clientId`
- `pointsUsed`
- `rewardDescription`

Leitura:

- a API planejada confirma a centralidade do cliente;
- a concessão e o resgate são eventos separados;
- `rewardDescription` sugere que o benefício resgatado pode ser descrito semanticamente, o que combina com a leitura de prêmio em `produto` ou `serviço`.

Importante:

- essas rotas vieram da documentação interna do projeto e não foram observadas em chamada viva nesta passada;
- portanto elas devem ser lidas como especificação alvo, não como backend definitivamente confirmado do módulo legado atual.

## 9. Papel operacional na jornada

`Pontos` fecha um eixo que os módulos anteriores deixavam implícito: o da recompensa comercial ligada ao relacionamento com o cliente.

Síntese da jornada:

- `venda` ou outra origem comercial pode gerar crédito de pontos;
- `cliente` acumula saldo e histórico de lançamentos;
- o módulo `Resgate de Pontos` materializa o consumo desse saldo;
- o benefício resgatado pode repercutir em `produto` ou `serviço`;
- essa repercussão pode tocar atendimento, consumo assistencial e faturamento indireto.

Leitura:

- o programa de fidelidade atua como camada transversal;
- ele não substitui `venda`, `comanda`, `pacote` ou `financeiro`;
- ele modula o valor percebido e o benefício comercial ao redor dessas entidades.

## 10. Limitações da inspeção

Esta passada teve limites claros:

- a grade visível estava vazia, então não foi possível abrir um resgate concreto pelo botão `Abrir`;
- não houve submissão de `Incluir`, por restrição deliberada de não gravar no ERP;
- a inspeção de rede mostrou a navegação, os assets e o fluxo de SSO, mas não expôs endpoints modernos específicos de fidelidade em produção nessa rota legado;
- parte da leitura de domínio dependeu da documentação interna do projeto, que pode representar alvo arquitetural e não a implementação completa já entregue na UI atual.

## 11. Conclusão

O módulo `Resgate de Pontos` existe e está operacional no legado, com foco explícito em histórico de resgates por cliente.

O que ficou firme nesta rodada:

- a entidade é real, não só planejada;
- ela continua ancorada em `cliente`;
- ela possui histórico próprio de resgates;
- a tela sugere resgate aplicável a `produtos` e `serviços`.

O que ficou como melhor leitura arquitetural:

- `pontos` fecha o eixo de fidelização entre compra, benefício e consumo;
- `venda` tende a ser a origem do acúmulo;
- `comanda` e `pacote` podem ser contextos de consumo do benefício, mas isso ainda não foi provado diretamente por evidência de UI nesta passada.

Conclusão objetiva:

- `pontos` não é uma entidade assistencial;
- `pontos` não é uma entidade financeira pura;
- `pontos` é uma entidade comercial-relacional de fidelização, centrada em `cliente`, com potencial de conversão em benefícios consumíveis dentro da operação clínica e comercial.
