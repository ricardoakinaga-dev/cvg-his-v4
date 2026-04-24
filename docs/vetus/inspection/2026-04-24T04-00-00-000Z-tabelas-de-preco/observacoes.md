# Observações da consolidação — Tabelas de Preço

## Escopo

Segundo relatório da nova trilha de gaps prioritários:

- `Tabelas de Preço`

## Base usada

- screenshot da rota beta `/tabelas-de-preco`
- artefato estrutural em `docs/vetus/inspection/2026-04-23T22-00-01-706Z/artifacts.json`
- [2026-04-23-relatorio-entidade-servico.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-servico.md:152)
- [01-PLANEJAMENTO-ERP-ENTERPRISE.md](/root/cvg-his-v2/docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md:531)

## Achados principais

- rota beta confirmada: `/tabelas-de-preco`;
- endpoint confirmado: `GET /tableprice`;
- breadcrumb confirmado: `Estoque > Cadastros > Tabelas de Preço`;
- busca por `ID ou descrição`;
- CTA `Incluir Nova Tabela`;
- registros reais capturados:
  - `TABELA FINAL DE SEMANA`
  - `TABELA MADRUGADA`
- forte relação com `Produtos` e `Serviços`.

## Limitação

Nesta rodada não houve abertura do detalhe de uma tabela nem do formulário de criação/edição.

## Resultado

- `docs/vetus/guides/2026-04-24-relatorio-tabelas-de-preco.md`
