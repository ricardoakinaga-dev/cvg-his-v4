# Relatório de Inspeção: Hemogramas

Data: 2026-04-24
Escopo: inspeção e planejamento da entidade `Hemogramas`, com foco em como o ERP materializa o resultado laboratorial dentro da trilha analítica concreta.

## 1. Evidência disponível nesta passada

Nesta rodada, o módulo `Hemogramas` foi confirmado na arquitetura legacy, mas a abertura direta da tela voltou a ficar bloqueada na borda.

Evidências objetivas:

- rota confirmada no menu legado: `/Sistema/Laboratorio/Hemogramas.htm`;
- submódulo listado dentro de `Laboratório`, ao lado de `Exames`, `Laudos`, `Urina` e `Bioquímico`;
- dependência explícita de `Vlr. Ref. Hemograma`;
- planejamento interno descrevendo o hemograma como resultado especializado;
- tentativa direta de acesso HTTP retornando `403` com `cf-mitigated: challenge`;
- tentativa de automação Playwright ficando parada antes da renderização final da tela.

Este relatório, portanto, foi fechado com base em:

- malha de navegação legacy já confirmada;
- documentação interna do projeto;
- consistência com o relatório de `laboratório`;
- catálogo de evidências já existente para o domínio laboratorial.

## 2. Papel do módulo no domínio

`Hemogramas` não aparece como a ordem do exame, nem como o laudo final. Ele materializa a camada analítica do resultado.

Leitura do papel do módulo:

- `Exames` representa a ordem ou fila diagnóstica;
- `Hemogramas` registra os valores laboratoriais da família hematológica;
- `Laudos` consolida interpretação e emissão documental;
- `Vlr. Ref. Hemograma` sustenta faixa esperada, alerta e comparação.

Isso faz de `Hemogramas` o ponto em que o ERP deixa de tratar o exame como solicitação e passa a tratá-lo como dado clínico estruturado.

## 3. Construção funcional esperada

O planejamento interno descreve este módulo assim:

- `Registro completo de hemograma`
- `Valores de referência automáticos`
- `Flag de valores fora da faixa`
- `Histórico comparativo`

Esses quatro sinais são suficientemente fortes para delimitar a construção funcional:

- há um formulário ou grade de parâmetros hematológicos;
- o sistema conhece faixas normais por contexto clínico;
- a UI deve sinalizar desvios relevantes;
- o resultado não é apenas pontual, mas comparável no tempo.

## 4. Estrutura de dados inferida

Sem a UI final aberta nesta passada, a modelagem abaixo é leitura arquitetural sustentada pela documentação e pela composição do domínio.

Cada hemograma tende a carregar:

- identificação do exame;
- `animal`;
- `cliente` como contexto relacional;
- data/hora da coleta;
- data/hora da análise;
- profissional e/ou equipamento;
- conjunto de parâmetros hematológicos;
- valores de referência aplicados;
- marcação de fora da faixa;
- observações e ligação com laudo.

Pelo tipo de módulo, os grupos de dados mais prováveis são:

- série vermelha;
- série branca;
- plaquetas;
- observações morfológicas;
- comparação com exames anteriores.

## 5. Papel dos valores de referência

O vínculo com `Vlr. Ref. Hemograma` é estrutural, não acessório.

Leitura:

- o módulo não registra apenas números brutos;
- ele compara cada valor com faixas normativas;
- a comparação depende de tabela própria;
- a interpretação inicial do resultado nasce dessa camada.

Na prática, isso sugere que o ERP suporta:

- preenchimento assistido por faixa normal;
- destaque visual para alterações;
- consistência entre diferentes espécies e perfis;
- base para histórico comparativo mais inteligível.

## 6. Relação com a esteira de exames

Na cadeia laboratorial já confirmada, `Hemogramas` entra na etapa de `Em Análise`.

Encadeamento mais coerente:

- exame é solicitado;
- entra na `Esteira de Exames`;
- ocorre a coleta;
- o item segue para análise;
- `Hemogramas` registra os resultados numéricos;
- `Laudos` consolida a interpretação;
- o fluxo avança para `Laudado` e `Entregue`.

Isso torna `Hemogramas` uma trilha analítica concreta dentro da esteira, e não uma entidade isolada.

## 7. Relação com laudo e decisão clínica

O módulo de hemograma tende a ser fonte primária para o laudo, não destino final.

Leitura:

- o hemograma organiza os dados laboratoriais estruturados;
- o laudo transforma esses dados em documento clínico;
- o veterinário usa ambos, mas com funções diferentes;
- o hemograma serve a comparação técnica e o laudo serve à comunicação diagnóstica final.

Essa separação é importante porque mostra duas camadas do ERP:

- camada analítica e paramétrica;
- camada documental e assistencial.

## 8. Leitura de construção técnica

Pelo padrão do legado laboratorial, a leitura mais forte é:

- módulo server-rendered clássico;
- navegação por rota `*.htm`;
- formulário ou grade densa de parâmetros;
- integração com tabelas de referência;
- comportamento orientado a registro clínico estruturado.

O módulo também parece depender mais de modelagem de domínio do que de UX moderna: o valor central está no dado técnico e nas regras de referência, não em visualização beta.

## 9. Conclusão

`Hemogramas` é a primeira trilha analítica concreta do laboratório em que o ERP transforma uma requisição de exame em resultado clínico estruturado.

O núcleo do módulo ficou bem delimitado:

- entrada de parâmetros hematológicos;
- aplicação automática de referência;
- sinalização de desvios;
- comparação histórica;
- ponte direta para laudo.

Ele é, na prática, uma entidade de resultado especializado e uma peça central da fase `Em Análise`.

## 10. Limitações desta passada

Limitações objetivas:

- a tela final de `Hemogramas` não abriu nesta sessão por bloqueio de borda;
- não houve captura direta da listagem ou de um detalhe real;
- não foi possível confirmar os nomes exatos das colunas/campos da UI;
- não foi possível observar endpoints específicos da página.

Ainda assim, a rota, o posicionamento, a responsabilidade funcional e a integração com referência, esteira e laudo ficaram suficientemente sustentados para esta fase de inspeção e planejamento.
