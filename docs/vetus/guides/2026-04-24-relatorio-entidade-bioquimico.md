# Relatório de Inspeção: Bioquímico

Data: 2026-04-24
Escopo: inspeção e planejamento da entidade `Bioquímico`, com foco em como o ERP fecha a terceira trilha analítica principal do laboratório e completa a comparação entre famílias de resultado.

## 1. Evidência disponível nesta passada

Nesta rodada, o módulo `Bioquímico` foi confirmado no legado, mas a abertura direta da rota ficou bloqueada na borda.

Evidências objetivas:

- rota confirmada no menu legado: `/Sistema/Laboratorio/Bioquimico.htm`;
- submódulo listado dentro de `Laboratório`, ao lado de `Exames`, `Laudos`, `Hemogramas` e `Urina`;
- dependência explícita de `Vlr. Ref. Bioquímico`;
- documentação interna descrevendo o módulo como `Resultado tabular`;
- planejamento definindo `Painel bioquímico completo` com `valores de referência por espécie`;
- tentativa direta de acesso HTTP retornando `403` com `cf-mitigated: challenge`.

Este relatório foi fechado por:

- malha de navegação legacy já confirmada;
- documentação interna do projeto;
- consistência com os relatórios de `laboratório`, `hemogramas` e `urina`.

## 2. Papel do módulo no domínio

`Bioquímico` é a terceira trilha analítica principal do laboratório e fecha o conjunto de resultados especializados mais explícitos do ERP.

Leitura:

- `Exames` representa a ordem laboratorial;
- `Bioquímico` registra o painel de resultados bioquímicos;
- `Laudos` consolida interpretação e comunicação final;
- `Vlr. Ref. Bioquímico` sustenta a leitura comparativa e o destaque de desvios.

Assim como `Hemogramas`, trata-se de uma camada analítica paramétrica. Ao contrário de `Urina`, seu desenho tende a ser mais tabular que descritivo.

## 3. Construção funcional esperada

O planejamento interno descreve este módulo assim:

- `Painel bioquímico completo`
- `Valores de referência por espécie`

Outro documento interno reforça:

- `Resultado tabular`
- `12-15 campos`

Isso delimita bem a construção funcional:

- existe uma grade de parâmetros bioquímicos;
- o conjunto de parâmetros é mais compacto que `Hemogramas`;
- o módulo depende fortemente de referência contextual;
- o foco está em captura, comparação e leitura objetiva do painel.

## 4. Estrutura de dados inferida

Sem a UI final aberta nesta passada, a modelagem abaixo é leitura arquitetural sustentada pela documentação do domínio.

Cada registro de `Bioquímico` tende a carregar:

- identificação do exame;
- `animal`;
- `cliente` como contexto relacional;
- data/hora da coleta;
- data/hora da análise;
- equipamento e/ou profissional responsável;
- conjunto de parâmetros bioquímicos;
- valores de referência aplicados;
- marcação de fora da faixa;
- observações e vínculo com laudo.

Pelo desenho indicado, o módulo tende a ser:

- mais compacto que `Hemogramas`;
- mais quantitativo que `Urina`;
- mais diretamente dependente de tabela de referência.

## 5. Papel dos valores de referência

`Vlr. Ref. Bioquímico` aparece como dependência estrutural do módulo.

Leitura:

- o ERP não trata o bioquímico apenas como inserção de números;
- a interpretação inicial depende da espécie;
- a faixa esperada organiza leitura e sinalização;
- o módulo tende a gerar alertas ou destaque visual para desvios.

Isso faz do bioquímico uma entidade de resultado quantitativo guiado por regras de referência.

## 6. Relação com a esteira de exames

Na cadeia laboratorial já mapeada, `Bioquímico` entra na etapa de `Em Análise`.

Encadeamento mais coerente:

- o exame é solicitado;
- entra na `Esteira de Exames`;
- ocorre a coleta;
- o material segue para análise bioquímica;
- `Bioquímico` registra o painel de parâmetros;
- `Laudos` consolida interpretação;
- o item avança para `Laudado` e `Entregue`.

Assim, `Bioquímico` fecha a terceira família analítica concreta que alimenta a esteira e o laudo.

## 7. Comparação com hemogramas e urina

Com os três relatórios juntos, a diferença estrutural entre as famílias fica clara.

`Hemogramas`:

- tabular;
- mais extenso;
- comparativo;
- fortemente orientado a parâmetros hematológicos.

`Urina`:

- multisseção;
- mais descritivo;
- mistura achados qualitativos e estruturados;
- organizado por `físico + químico + microscópico`.

`Bioquímico`:

- tabular;
- mais compacto;
- centrado em painel objetivo de parâmetros;
- fortemente ancorado em referência por espécie.

Leitura de conjunto:

- `Hemogramas` e `Bioquímico` formam o eixo quantitativo-tabular do laboratório;
- `Urina` forma o eixo clínico-estruturado por camadas de observação.

## 8. Leitura de construção técnica

Pelo padrão do legado laboratorial, a leitura mais forte é:

- módulo server-rendered clássico;
- rota `*.htm` dentro do bloco legacy;
- grade de parâmetros com referência associada;
- dependência de tabelas clínicas auxiliares;
- integração direta com o fluxo laboratorial já consolidado.

## 9. Conclusão

`Bioquímico` fecha a terceira trilha analítica principal do laboratório e completa o desenho das famílias de resultado especializadas do ERP.

O núcleo do módulo ficou bem delimitado:

- painel bioquímico quantitativo;
- estrutura tabular;
- referência por espécie;
- comparação entre valor lançado e faixa esperada;
- ponte direta para `laudo`.

Se `Hemogramas` é o tabular extenso e `Urina` é o estruturado descritivo, `Bioquímico` é o tabular compacto orientado a painel.

## 10. Limitações desta passada

Limitações objetivas:

- a tela final de `Bioquímico` não abriu nesta sessão por bloqueio de borda;
- não houve captura direta da listagem ou detalhe real;
- não foi possível confirmar nomes exatos dos campos da UI;
- não foi possível observar endpoints específicos da página.

Ainda assim, a rota, o posicionamento, a responsabilidade funcional e a comparação estrutural com as demais trilhas laboratoriais ficaram suficientemente sustentados para esta fase de inspeção e planejamento.
