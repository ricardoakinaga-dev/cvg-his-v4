# Relatório do Módulo RH: Usuários, Acesso, Comissões e Cadastros Profissionais

Data: 2026-04-24
Escopo: leitura consolidada do módulo `RH` do Vetus, com foco em `Usuários`, `Grupos de Acesso`, `Comissões`, `Cálculo de Comissões`, `Cadastros`, `Profissionais`, `Regras de Comissão`, `Folgas` e `Profissões`.

## 1. Síntese executiva

O módulo `RH` do Vetus não é homogêneo.

Leitura consolidada:

- `Profissionais` aparece como módulo beta funcional e navegável;
- `Usuários`, `Grupos de Acesso`, `Comissões`, `Folgas` e `Regras de Comissão` aparecem no menu e na arquitetura, mas a camada SPA registrada no acervo mostra indisponibilidade;
- `Cálculo de Comissões`, `Regras de Comissão`, `Folgas` e `Profissões` permanecem ancorados majoritariamente no legado;
- o bloco `RH` opera como domínio híbrido entre `gestão humana`, `governança de acesso` e `produtividade econômica`.

Conclusão objetiva:

- o RH existe com clareza na taxonomia do produto;
- a parte mais madura no beta é `Profissionais`;
- a parte mais madura no legado é `Comissões`;
- `Usuários` e `Grupos de Acesso` têm papel estrutural forte, mas a evidência visual disponível nesta trilha os mostra mais como superfície prevista do que como jornada SPA estável.

## 2. Posicionamento do RH no produto

No shell principal, `RH` aparece como macroárea própria.

Itens confirmados no mapa de navegação:

- `Usuários`
- `Profissionais`
- `Grupos de Acesso`
- `Folgas`
- `Regras de Comissão`
- `Cálculo de Comissões`

Além disso, pela análise estrutural do sistema, o bloco se conecta a:

- `Profissões`
- `Cadastros`
- componentes de governança e acesso

Leitura arquitetural:

- `RH` no Vetus não é só folha ou equipe;
- ele mistura `identidade`, `papel operacional`, `disponibilidade`, `produtividade` e `regra de remuneração variável`.

## 3. Estado de maturidade por submódulo

### 3.1 Funcional no beta

- `Profissionais`

### 3.2 Funcional no legado

- `Cálculo de Comissões`
- `Regras de Comissão`
- `Folgas`
- `Profissões`
- rotas clássicas de `Usuários` e `Grupos de Acesso` mapeadas no sistema legado

### 3.3 Indisponível ou não confirmado como funcional no shell beta

- `Usuários`
- `Grupos de Acesso`
- `Comissões`
- `Folgas`
- `Regras de Comissão`

Leitura:

- a arquitetura de informação do RH está publicada;
- a cobertura funcional no frontend moderno ainda é desigual;
- o domínio precisa ser lido como híbrido, e não como suíte SPA completa.

## 4. Submódulo: Usuários

### 4.1 Papel funcional

`Usuários` é o ponto de entrada da identidade operacional humana no ERP.

Papel inferido e sustentado pelo acervo:

- cadastro de contas de uso interno;
- associação a acesso e escopo;
- ligação com grupos de acesso;
- base de autenticação e contexto do operador.

### 4.2 Evidência disponível

O mapa estrutural registra a rota legada:

- `.../Usuarios/Usuarios.htm`

Na camada SPA documentada no acervo visual:

- `rh-usuarios-01.png` registra estado de `página indisponível`.

### 4.3 Leitura arquitetural

Mesmo sem tela funcional completa no shell observado, `Usuários` é claramente uma entidade-base do ecossistema administrativo.

Ela conversa com:

- `Grupos de Acesso`
- permissões
- contexto organizacional
- auditoria

### 4.4 Conclusão do submódulo

`Usuários` deve ser tratado como capacidade estrutural existente, mas não como módulo RH beta plenamente comprovado nesta trilha visual.

## 5. Submódulo: Grupos de Acesso

### 5.1 Papel funcional

`Grupos de Acesso` é a camada de governança coletiva de permissão.

Função esperada e coerente com o acervo:

- agrupar permissões por papel;
- simplificar concessão de acesso;
- controlar escopo de navegação e operação.

### 5.2 Evidência disponível

Rota estrutural mapeada:

- `.../Usuarios/GruposDeAcesso.htm`

No shell documentado:

- `rh-grupos-acesso-01.png` mostra `página indisponível`.

Além disso, a leitura de integração do sistema já identificava:

- `GET /users/{id}/access-groups`

### 5.3 Leitura arquitetural

`Grupos de Acesso` não é um acessório de RH; ele é a ponte entre RH e segurança operacional.

Na prática, ele articula:

- quem entra no sistema;
- o que cada usuário pode ver;
- que área do ERP cada perfil opera.

### 5.4 Conclusão do submódulo

É uma capacidade claramente prevista e relevante, mas a evidência desta rodada não comprova a superfície beta como madura.

## 6. Submódulo: Profissionais

### 6.1 Papel funcional

`Profissionais` é a entidade humana operacional do ERP.

Ele representa:

- médicos veterinários;
- anestesistas;
- técnicos;
- demais pessoas vinculadas à execução clínica ou operacional.

### 6.2 Evidência beta confirmada

A captura `rh-profissionais-01.png` mostra uma tela beta funcional com:

- breadcrumb `RH > Cadastro > Profissionais`;
- campo de busca `por ID ou nome`;
- CTA `+ Incluir Novo Profissional`;
- cards/listagem com status `Ativo`;
- `ID` visível por registro;
- seção expansível de `Informações de Contato`;
- ação `Ver Detalhes`.

### 6.3 Leitura da construção

Esse é o submódulo de RH mais maduro no shell observado.

A tela indica uma construção moderna com:

- listagem por cards em vez de grade clássica;
- foco em consulta rápida e detalhamento;
- modelagem orientada a pessoa operacional, não a usuário técnico do sistema.

### 6.4 Estrutura de dados documentada

O modelo de dados exploratório do acervo registra a entidade `professionals` com campos coerentes com a UI:

- `name`
- `profession_id`
- `phone`
- `email`
- `cpf`
- `photo_url`
- `status`

Também há relação com:

- `professional_schedules`
- `time_off`

### 6.5 Integrações do submódulo

`Profissionais` conversa diretamente com:

- `Agenda`, como agenda/disponibilidade de atendimento;
- `Folgas`, como indisponibilidade formal;
- `Comissões`, como beneficiário do cálculo;
- `Profissões`, como classificação funcional;
- `Laudos` e fluxos clínicos, como executor ou signatário em vários contextos.

### 6.6 Conclusão do submódulo

`Profissionais` é a espinha humana operacional do RH e a parte mais claramente produtizada do domínio no beta.

## 7. Submódulo: Comissões

### 7.1 Papel funcional

`Comissões` representa a camada de produtividade econômica vinculada ao profissional.

Ela conecta:

- produção assistencial ou comercial;
- regra de remuneração variável;
- cálculo devido;
- eventual liquidação/pagamento.

### 7.2 Evidência consolidada

No shell:

- `rh-comissoes-01.png` mostra indisponibilidade.

No legado:

- o domínio aparece funcional e melhor documentado.

### 7.3 Leitura arquitetural

`Comissões` não é um módulo isolado. Ele depende de:

- `Profissionais`
- `Regras de Comissão`
- fatos de produção
- serviços, vendas ou comandas que geram base de cálculo

### 7.4 Modelagem inferida documentada

O acervo Enterprise-like consolida o domínio com entidades como:

- `CommissionRule`
- `CommissionRuleService`
- `CommissionSettlement`
- `ProductivityFact`

O modelo exploratório ainda registra uma tabela `commissions` com:

- `professional_id`
- `reference_type`
- `reference_id`
- `base_value`
- `percent`
- `amount`
- `calculated_at`
- `paid_at`
- `status`

### 7.5 Conclusão do submódulo

`Comissões` deve ser lido como um domínio forte no legado e ainda raso no shell beta.

## 8. Submódulo: Cálculo de Comissões

### 8.1 Evidência direta

A captura `modulos/com-01-calculo.png` mostra uma tela legacy funcional com:

- título explícito `Cálculo de Comissões`;
- botão `Incluir`;
- filtro por `Profissional`;
- filtro por `Data do Cálculo`;
- botão `Pesquisar`;
- grade com colunas `Profissional`, `Data de Cálculo` e `Abrir`.

### 8.2 Leitura funcional

Essa tela materializa a comissão como processo operacional, não só como regra.

Ela sugere:

- geração de cálculos por profissional e período;
- reconsulta de cálculos anteriores;
- abertura de registros calculados;
- armazenamento do resultado do cálculo como entidade própria.

### 8.3 Relações do processo

O cálculo depende de:

- profissional elegível;
- fatos de produção;
- regras previamente cadastradas;
- janela temporal.

### 8.4 Conclusão do submódulo

`Cálculo de Comissões` é uma das evidências mais fortes de que o RH no Vetus também cobre remuneração variável operacional.

## 9. Submódulo: Regras de Comissão

### 9.1 Evidência direta

A captura `modulos/com-02-regras.png` mostra uma tela legacy funcional com:

- título `Cadastro de Regras de Comissão`;
- botão `Incluir`;
- filtros por `Id` e `Descrição`;
- botão `Pesquisar`;
- grade com colunas `Id`, `Descrição` e `Abrir`.

### 9.2 Leitura funcional

Essa camada define a norma do cálculo.

Ela provavelmente estabelece:

- percentual;
- escopo da regra;
- critérios por profissional;
- critérios por serviço, grupo ou contexto.

### 9.3 Evidência complementar

No shell:

- `rh-regras-comissao-01.png` está indisponível.

Na camada documental de API:

- `GET /commission-rules?professionalId=`
- `POST /commission-rules`
- `PUT /commission-rules/{id}`
- `DELETE /commission-rules/{id}`

### 9.4 Conclusão do submódulo

`Regras de Comissão` é claramente uma entidade de manutenção normativa e sustenta o submódulo de cálculo.

## 10. Submódulo: Folgas

### 10.1 Papel funcional

`Folgas` registra indisponibilidade formal do profissional.

Ele opera como camada de agenda administrativa e impacta:

- disponibilidade;
- escalas;
- marcação;
- alocação de equipe.

### 10.2 Evidência disponível

Rota estrutural identificada:

- `.../Agenda/Folgas.htm`

No shell:

- `rh-folgas-01.png` mostra indisponibilidade.

Na documentação de API:

- `GET /time-off?professionalId=&dateFrom=&dateTo=`
- `POST /time-off`
- `DELETE /time-off/{id}`

No modelo exploratório:

- tabela `time_off` com `professional_id`, `start_date`, `end_date`, `reason`, `status`.

### 10.3 Leitura arquitetural

Embora apareça dentro do bloco humano-administrativo, `Folgas` conversa diretamente com `Agenda`.

Ele é um submódulo transversal entre:

- RH
- agenda
- operação clínica

### 10.4 Conclusão do submódulo

`Folgas` é peça importante de gestão operacional de equipe, mas sua superfície funcional observada ainda é majoritariamente legada.

## 11. Submódulo: Profissões

### 11.1 Papel funcional

`Profissões` é o cadastro mestre classificatório que tipifica o profissional.

Função:

- normalizar papéis ocupacionais;
- alimentar o cadastro de profissionais;
- sustentar filtros, relatórios e regras.

### 11.2 Evidência disponível

Rota estrutural identificada:

- `.../Cadastros/Profissoes.htm`

Na modelagem:

- entidade/tabela `professions`
- relação por `profession_id` no cadastro de `professionals`

### 11.3 Leitura arquitetural

`Profissões` é um cadastro mestre simples, mas crítico.

Sem ele, o sistema perde:

- padronização de função;
- base para regras de comissão;
- coerência entre agenda, equipe e produtividade.

### 11.4 Conclusão do submódulo

`Profissões` opera como cadastro-base do RH clássico, com evidência mais estrutural do que visual nesta trilha.

## 12. Submódulo: Cadastros

### 12.1 Leitura do bloco

Dentro de `RH`, o termo `Cadastros` funciona como agrupador dos mestres humanos.

Pelo acervo, ele abrange ao menos:

- `Profissionais`
- `Profissões`

E possivelmente desdobra:

- contatos;
- classificação funcional;
- manutenção de dados humanos operacionais.

### 12.2 Leitura arquitetural

Esse agrupamento separa:

- entidade humana operacional (`Profissionais`);
- taxonomia de função (`Profissões`);
- governança de uso do sistema (`Usuários` e `Grupos de Acesso`);
- regras de produtividade (`Comissões`).

## 13. Conexões internas do módulo RH

As conexões mais fortes do bloco são:

- `Usuários -> Grupos de Acesso`
- `Profissionais -> Profissões`
- `Profissionais -> Folgas`
- `Profissionais -> Comissões`
- `Regras de Comissão -> Cálculo de Comissões`

Leitura:

- `Usuário` representa conta e acesso;
- `Profissional` representa pessoa operacional;
- os dois conceitos se relacionam, mas não são a mesma entidade.

Esse é um ponto importante da construção do Vetus.

## 14. Integrações transversais

O módulo RH conversa com vários domínios do ERP:

- `Agenda`, por disponibilidade e folgas;
- `Atendimento`, por profissional executor;
- `Comanda` e `Vendas`, como origem econômica potencial da comissão;
- `Laudos` e clínico, quando o profissional aparece como responsável;
- `Segurança`, por usuários e grupos de acesso.

## 15. Leitura de construção do domínio

O RH do Vetus pode ser resumido em quatro camadas:

- `identidade e acesso`
- `cadastro humano operacional`
- `disponibilidade e escala`
- `produtividade e comissão`

Essa composição é mais madura do que um RH puramente cadastral, mas ainda aparece fragmentada entre beta e legado.

## 16. Conclusão final

O bloco `RH` do Vetus é funcionalmente relevante, porém tecnicamente distribuído.

O que fica mais forte no acervo:

- `Profissionais` é o melhor representante beta do domínio;
- `Comissões` é o melhor representante legado do domínio;
- `Usuários` e `Grupos de Acesso` são fundamentais para a arquitetura, mas não ficaram plenamente demonstrados como jornadas SPA maduras nas evidências desta trilha;
- `Folgas` e `Profissões` funcionam como cadastros e restrições estruturais que sustentam agenda, equipe e remuneração variável.

Conclusão objetiva:

- o módulo RH não deve ser lido como um único bloco pronto;
- ele deve ser lido como um conjunto de capacidades humanas e administrativas em transição;
- a distinção entre `usuário`, `profissional`, `acesso`, `disponibilidade` e `comissão` é a chave correta para entender sua construção.
