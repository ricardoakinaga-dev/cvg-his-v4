# Observações de inspeção: Ponto de Venda

Data: 2026-04-24
Escopo: consolidação de evidências da rota beta `/pontos-de-venda`.

## Evidências diretas confirmadas

- rota SPA confirmada: `https://erp-beta.vetus.com.br/pontos-de-venda`
- breadcrumb visível: `Estoque > Cadastro > Pontos de venda`
- título principal: `Pontos de venda`
- texto de apoio: `Selecione o tipo de sincronização com o Sistema de Pontos de Venda`
- ações visíveis:
  - `Sincronizar Estoque`
  - `Sincronizar clientes`
- feedback capturado:
  - `Sincronização iniciada com sucesso!`
  - processamento em `background`
  - `Sincronização finalizada`
  - botão `Ok`

## Sinais estruturais relevantes

- `forms: []`
- `tables: []`
- `buttons`: `Sincronizar Estoque`, `Sincronizar clientes`, `Ok`
- sem grade/listagem de PDVs exposta nesta captura
- sem formulário de configuração detalhada exposto nesta captura

## Leitura operacional

A rota é melhor entendida como `painel administrativo de sincronização` do ecossistema PDV. Ela mantém coerência entre o ERP e o sistema de ponto de venda, especialmente nas dimensões:

- `estoque/produtos/preços`
- `clientes`

## Leitura arquitetural

Esta página não prova o caixa operacional do PDV. Ela prova apenas a camada de `sincronização`. O domínio maior de `Ponto de Venda` no acervo de planejamento inclui capacidades adicionais como:

- leitura de código de barras
- busca rápida de produtos
- controle de estoque em tempo real
- NFC-e
- cancelamento com auditoria

Essas capacidades devem ser tratadas como pertencentes ao domínio PDV mais amplo, não como funções confirmadas desta rota específica.

## Limitações

- endpoint backend da sincronização não ficou identificado de forma inequívoca no recorte consultado
- não há prova direta, nesta passada, de múltiplos PDVs, parâmetros por filial ou histórico de sincronização
- não há prova direta, nesta passada, da frente de caixa operacional

## Arquivos-base usados

- `docs/vetus/inspection/2026-04-23T22-00-01-706Z/artifacts.json`
- `docs/vetus/inspection/2026-04-23T22-00-01-706Z/screenshots/-pontos-de-venda.png`
- `docs/vetus/guides/2026-04-23-inspecao-erp-beta-shell-rotas-integracoes.md`
- `docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md`
- `docs/vetus/guides/02-ANALISE-SISTEMA-VETUS.md`
