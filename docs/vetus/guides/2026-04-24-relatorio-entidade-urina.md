# Relatório de Inspeção: Urina

Data: 2026-04-24
Escopo: inspeção e planejamento da entidade `Urina`, com foco em como o ERP materializa resultado estruturado para a trilha urinária e como isso difere de `Hemogramas`.

## 1. Evidência disponível nesta passada

Nesta rodada, o módulo `Urina` foi confirmado no legado, mas a abertura direta da rota ficou bloqueada na borda.

Evidências objetivas:

- rota confirmada no menu legado: `/Sistema/Laboratorio/Urina.htm`;
- submódulo listado dentro de `Laboratório`, ao lado de `Exames`, `Laudos`, `Hemogramas` e `Bioquímico`;
- tentativa direta de acesso HTTP retornando `403` com `cf-mitigated: challenge`;
- documentação interna descrevendo `Urina` como módulo especializado do laboratório;
- planejamento definindo a análise urinária como `física, química e microscópica`.

Este relatório foi fechado por:

- malha de navegação legacy já confirmada;
- documentação interna do projeto;
- consistência com os relatórios de `laboratório` e `hemogramas`.

## 2. Papel do módulo no domínio

`Urina` é uma trilha analítica especializada do laboratório, equivalente em hierarquia a `Hemogramas`, mas com estrutura de resultado diferente.

Leitura:

- `Exames` representa a ordem laboratorial;
- `Urina` registra o resultado estruturado da análise urinária;
- `Laudos` consolida a leitura interpretativa final;
- `Urina` materializa a fase analítica do exame para essa família diagnóstica.

Assim como em `Hemogramas`, o módulo não é apenas um anexo documental. Ele é a camada de captura técnica do resultado.

## 3. Construção funcional esperada

O planejamento interno descreve o módulo assim:

- `Análise urinária completa`
- `Exame físico, químico e microscópico`

Essa descrição delimita com bastante clareza a construção funcional:

- o resultado é seccionado por grupos de observação;
- não é apenas uma lista única de números;
- há mistura de valores estruturados, observações qualitativas e achados microscópicos;
- o módulo tende a comportar uma leitura mais descritiva do que `Hemogramas`.

## 4. Estrutura de dados inferida

Sem a UI final aberta nesta passada, a modelagem abaixo é leitura arquitetural sustentada pela documentação do domínio.

Cada registro de `Urina` tende a carregar:

- identificação do exame;
- `animal`;
- `cliente` como contexto relacional;
- data/hora da coleta;
- data/hora da análise;
- observações do exame físico;
- resultados do exame químico;
- achados do exame microscópico;
- observações complementares;
- vínculo com laudo.

Agrupamentos mais prováveis:

- macroscopia/físico;
- química;
- microscopia;
- observação livre;
- referência ou interpretação assistida, quando aplicável.

## 5. Diferença estrutural em relação a hemogramas

A diferença central entre `Urina` e `Hemogramas` está no tipo de resultado materializado.

`Hemogramas` tende a operar com:

- grade tabular;
- valores quantitativos;
- referência automática;
- comparação histórica numérica.

`Urina` tende a operar com:

- blocos por natureza do exame;
- combinação de dados qualitativos e semi-quantitativos;
- achados observacionais;
- composição mais clínica do que estatística.

Isso sugere duas famílias de UI e modelagem dentro do mesmo laboratório:

- uma paramétrica/tabular;
- outra descritiva/multisseção.

## 6. Relação com a esteira de exames

Na cadeia laboratorial já mapeada, `Urina` entra na etapa de `Em Análise`.

Encadeamento mais coerente:

- o exame é solicitado;
- entra na `Esteira de Exames`;
- ocorre a coleta;
- o material segue para análise urinária;
- `Urina` registra os achados estruturados;
- `Laudos` consolida a interpretação final;
- o item avança para `Laudado` e `Entregue`.

Assim, `Urina` é uma materialização concreta da análise dentro da esteira, não um módulo periférico.

## 7. Relação com laudo e decisão clínica

O módulo `Urina` tende a alimentar o laudo e a decisão clínica com uma estrutura de resultado mais narrativa do que `Hemogramas`.

Leitura:

- o dado nasce no módulo analítico;
- o laudo sintetiza e comunica a conclusão;
- a análise de urina pode combinar achados objetivos com leitura clínica contextual;
- isso favorece uso direto em atendimento, acompanhamento e decisão diagnóstica.

## 8. Leitura de construção técnica

Pelo padrão do legado laboratorial, a leitura mais forte é:

- módulo server-rendered clássico;
- rota `*.htm` dentro do bloco legacy;
- tela segmentada por seções de exame;
- integração com o domínio laboratorial já consolidado;
- dependência maior de modelagem clínica do que de casca beta.

## 9. Conclusão

`Urina` é a segunda trilha analítica concreta do laboratório e mostra que o ERP não modela todos os exames especializados do mesmo jeito.

O núcleo do módulo ficou bem delimitado:

- resultado estruturado por natureza do exame;
- leitura `física + química + microscópica`;
- integração direta com o fluxo analítico do laboratório;
- ponte para `laudo` como saída documental.

Se `Hemogramas` representa o resultado tabular-paramétrico, `Urina` representa o resultado clínico estruturado em camadas de observação.

## 10. Limitações desta passada

Limitações objetivas:

- a tela final de `Urina` não abriu nesta sessão por bloqueio de borda;
- não houve captura direta da listagem ou detalhe real;
- não foi possível confirmar nomes exatos dos campos da UI;
- não foi possível observar endpoints específicos da página.

Ainda assim, a rota, o posicionamento, o papel funcional e a diferença estrutural para `Hemogramas` ficaram suficientemente sustentados para esta fase de inspeção e planejamento.
