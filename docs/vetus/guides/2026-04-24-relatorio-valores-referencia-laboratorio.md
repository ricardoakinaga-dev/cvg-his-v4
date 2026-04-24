# Relatório de Inspeção: Vlr. Ref. Hemograma e Vlr. Ref. Bioquímico

Data: 2026-04-24
Escopo: inspeção e planejamento dos módulos `Vlr. Ref. Hemograma` e `Vlr. Ref. Bioquímico`, com foco na camada normativa que sustenta os módulos analíticos do laboratório.

## 1. Evidência disponível nesta passada

Nesta rodada, os dois módulos de referência foram confirmados no legado, mas a abertura direta das rotas ficou bloqueada na borda.

Evidências objetivas:

- rota confirmada no menu legado para `Vlr. Ref. Hemograma`: `/Sistema/Laboratorio/ReferenciasHemograma.htm`;
- rota confirmada no menu legado para `Vlr. Ref. Bioquímico`: `/Sistema/Laboratorio/ReferenciasBioquimico.htm`;
- ambas aparecem dentro de `Laboratório`, separadas dos módulos analíticos e próximas de `Equipamentos` e `Tipos de Laudo`;
- tentativa direta de acesso HTTP em ambas retornando `HTTP/2 403` com `cf-mitigated: challenge`;
- documentação interna descrevendo `Vlr. Referência` como `Tabela de valores normais`;
- modelagem de dados explícita para `exam_reference_values`.

Este relatório foi fechado por:

- malha de navegação legacy já confirmada;
- documentação interna do projeto;
- modelo de dados documentado;
- consistência com os relatórios de `Hemogramas`, `Bioquímico` e `Laboratório`.

## 2. Papel da camada de referência

`Vlr. Ref. Hemograma` e `Vlr. Ref. Bioquímico` não são módulos assistenciais finais. Eles são a camada normativa que torna a leitura laboratorial comparável e automatizável.

Leitura:

- os módulos analíticos capturam resultados;
- os módulos de referência definem a faixa esperada;
- a comparação entre valor medido e valor esperado depende dessa camada;
- o destaque de desvios nasce daqui;
- o laudo e a interpretação clínica recebem apoio indireto dessa estrutura.

Sem essa camada, `Hemogramas` e `Bioquímico` seriam apenas telas de números. Com ela, viram módulos de resultado interpretável.

## 3. Modelagem confirmada

O modelo documentado para `exam_reference_values` é:

- `exam_type_id`
- `specie_id`
- `parameter_name`
- `unit`
- `min_value`
- `max_value`
- `age_min_months`
- `age_max_months`

Também há uma restrição de unicidade:

- `UNIQUE(exam_type_id, specie_id, parameter_name)`

Leitura estrutural:

- a referência é vinculada ao tipo de exame;
- a referência pode variar por espécie;
- a referência é parametrizada por nome de item analítico;
- a faixa pode mudar por idade;
- o sistema suporta unidade e limite mínimo/máximo.

Isso é muito mais do que uma tabela estática simples. É uma camada normativa contextual.

## 4. O que cada módulo provavelmente administra

### 4.1 Vlr. Ref. Hemograma

Tende a administrar:

- parâmetros hematológicos;
- unidade de cada parâmetro;
- faixas esperadas por espécie;
- possíveis faixas distintas por idade.

Isso sustenta diretamente:

- sinalização de valores fora da faixa em `Hemogramas`;
- comparação visual ou lógica no detalhe do exame;
- coerência na interpretação do painel hematológico.

### 4.2 Vlr. Ref. Bioquímico

Tende a administrar:

- parâmetros do painel bioquímico;
- unidade de cada parâmetro;
- faixas esperadas por espécie;
- possíveis variações por idade.

Isso sustenta diretamente:

- leitura automática do `Bioquímico`;
- comparação valor lançado vs faixa normal;
- geração de alertas ou destaque de alterações.

## 5. Relação com os módulos analíticos

Essa camada fecha o ciclo entre cadastro normativo e análise clínica.

Encadeamento mais coerente:

- o parâmetro existe no módulo analítico;
- a faixa normativa existe no módulo de referência;
- o resultado do exame consulta a faixa aplicável;
- a UI ou a regra marca o desvio;
- o laudo se apoia nessa leitura para a síntese final.

Leitura:

- `Hemogramas` e `Bioquímico` dependem fortemente dessas tabelas;
- `Urina` pode usar referências também, mas sua estrutura é menos claramente centrada em faixa numérica;
- a camada de referência é uma infraestrutura do laboratório, não um domínio isolado.

## 6. Papel de espécie e idade

Os campos `specie_id`, `age_min_months` e `age_max_months` são os pontos mais importantes da modelagem.

Eles mostram que o ERP reconhece:

- a faixa normal muda entre espécies;
- a faixa normal pode mudar com a idade;
- a comparação não deve ser universal e fixa;
- a interpretação depende de contexto biológico.

Isso eleva o nível técnico do módulo, porque evita uma leitura simplificada de resultado.

## 7. Diferença entre referência e resultado

É importante separar duas entidades:

- `exam_reference_values`: norma;
- `exam_results`: valor observado.

Leitura:

- a referência não é evento clínico;
- o resultado não é regra;
- o ERP cruza as duas estruturas para construir significado.

Essa separação é arquiteturalmente correta porque:

- permite atualizar referência sem regravar resultados históricos;
- mantém o dado bruto separado do critério de leitura;
- favorece escalabilidade para múltiplos tipos de exame.

## 8. Leitura de construção técnica

Pelo padrão do legado e pelo modelo documentado, a leitura mais forte é:

- módulos de cadastro normativo no legacy;
- grade orientada a parâmetro/faixa;
- dependência de seleção por tipo de exame e espécie;
- suporte a faixas numéricas e janela etária;
- uso transversal pelos módulos analíticos.

Esses módulos parecem funcionar como backoffice clínico-laboratorial.

## 9. Conclusão

`Vlr. Ref. Hemograma` e `Vlr. Ref. Bioquímico` fecham a camada normativa do laboratório.

O núcleo funcional ficou claro:

- definem faixas normais;
- contextualizam por espécie;
- suportam recorte por idade;
- organizam parâmetro, unidade, mínimo e máximo;
- alimentam a leitura automática dos resultados.

Eles são a base que transforma `Hemogramas` e `Bioquímico` em módulos analíticos realmente interpretáveis.

## 10. Limitações desta passada

Limitações objetivas:

- as telas reais de referência não abriram nesta sessão por bloqueio de borda;
- não houve captura direta da grade ou de um registro de referência;
- não foi possível confirmar nomes exatos de colunas da UI;
- não foi possível observar endpoints específicos das páginas.

Ainda assim, as rotas, o posicionamento, o modelo de dados e o papel arquitetural dessa camada ficaram suficientemente sustentados para esta fase de inspeção e planejamento.
