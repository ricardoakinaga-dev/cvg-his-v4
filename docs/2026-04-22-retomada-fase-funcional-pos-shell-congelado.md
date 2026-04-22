# Retomada da fase funcional após congelamento do shell

Data: 2026-04-22
Repositório: `/root/cvg-his-v2`
Status de partida: shell Vetus-aligned consolidado e congelado como baseline visual

## Diretriz executiva
O shell não é mais a frente principal.

A partir deste checkpoint, o investimento prioritário volta para a evolução funcional dos módulos, usando o shell estabilizado como base fixa.

## Princípio de retomada
Retomar pela frente com melhor relação entre:
- maturidade estrutural já existente;
- ROI funcional incremental;
- capacidade de validar SPA + API + runtime real;
- continuidade com o trabalho já feito.

## Recomendação principal
A retomada mais forte continua sendo no domínio:
- `Financeiro`

Subtrilha prioritária:
- consolidar a continuidade de `Custos e Despesas + Centros de Custo`
- e, em seguida, reabrir `Cartões` como próxima frente funcional real

## Por que esta é a melhor retomada agora

### 1. Shell já não é bloqueador
A camada de shell/topbar/sidebar/breadcrumbs foi suficientemente estabilizada.

### 2. Financeiro já tem lastro real
Nos últimos ciclos, `Financeiro` deixou de ser apenas estrutura e passou a ter:
- páginas reais;
- CRUDs funcionais;
- API dedicada;
- persistência DB-backed ativada no runtime;
- validações focadas e regressões representativas verdes.

### 3. Há continuidade natural
Depois de levar `Custos e Despesas` e `Centros de Custo` até o runtime DB-backed, o próximo ganho marginal relevante não está em shell — está em aprofundar o comportamento gerencial/operacional do domínio financeiro.

## Sequência recomendada de retomada

### Etapa 1 — Congelamento do shell
Concluída nesta rodada.

Artefato de referência:
- `/root/cvg-his-v2/docs/2026-04-22-baseline-visual-shell-vetus-congelado.md`

### Etapa 2 — Consolidação final da trilha `Custos e Despesas`
Objetivo:
- transformar o subdomínio de catálogo governado em base gerencial mais madura.

Candidatos fortes:
- auditoria consultável real por item;
- filtros/ordenação mais ricos no front;
- seed/defaults mais governados por conta;
- políticas explícitas de fallback vs fail-fast do runtime;
- limpeza da transição file-backed -> DB-backed onde apropriado.

### Etapa 3 — Reabertura de `Cartões`
Objetivo:
- voltar ao módulo `Cartões` agora com shell estável e domínio financeiro mais sólido.

Candidatos fortes:
- filtros por provider/status/bandeira;
- leitura operacional mais rica;
- reconciliação/captura/baixa;
- integração maior com recebíveis e fluxo financeiro.

### Etapa 4 — Próxima expansão funcional após financeiro
Só depois disso faz mais sentido escolher entre:
- nova profundidade em outro subdomínio financeiro;
- ou avanço para outro macrodomínio com shell já consolidado.

## Backlog resumido da retomada

### P1 — imediato
1. registrar shell como baseline congelado
2. reabrir backlog funcional a partir do financeiro consolidado
3. escolher explicitamente a próxima onda funcional do financeiro

### P2 — próxima onda recomendada
4. consolidar governança e operação de `Custos e Despesas`
5. decidir política final do fallback file-backed no runtime financeiro
6. ampliar observabilidade/auditoria funcional do domínio

### P3 — onda seguinte
7. aprofundar `Cartões`
8. conectar melhor leitura operacional + reconciliação + status
9. validar impacto no front e no runtime real

## Critério de decisão para a próxima implementação
A próxima implementação deve ser escolhida pelo maior composto de:
- valor de produto visível;
- continuidade com o que já foi entregue;
- baixo retrabalho estrutural;
- validação objetiva via testes e runtime local.

Hoje, isso favorece claramente `Financeiro` antes de qualquer nova onda ampla de shell ou de domínio estrutural.

## Conclusão
O baseline visual do shell foi congelado.

O projeto está pronto para sair do modo “ajuste de casca” e voltar ao modo “profundidade funcional”.

Direção recomendada:
- manter o shell como contrato estável;
- retomar a trilha funcional do `Financeiro`;
- consolidar o que já amadureceu em `Custos e Despesas + Centros de Custo`;
- depois reabrir `Cartões` como próxima frente forte.
