# VETUS — Relatório Anexo do Domínio Financeiro
**Pastas-base:** `docs/vetus/screenshots` e `docs/vetus/modulos`

## 1. Síntese

Financeiro aparece em duas naturezas bem distintas:

- um **dashboard SPA** e poucos pontos de entrada modernos;
- uma **camada legacy extensa** com forte cobertura funcional de rotina.

## 2. Evidências funcionais mais fortes

### 2.1 No beta

- `financeiro-dashboard-01.png` mostra dashboard financeiro funcional, com:
  - cartões de arquivos, clientes, estoque e serviços;
  - entradas e saídas;
  - gráfico de receita;
  - listas de contas a pagar vencidas e contas a receber.

### 2.2 No legacy

As capturas `modulos/fin-01` a `modulos/fin-20` são a melhor base para compreensão do domínio:

- gaveta;
- contas a receber;
- contas a pagar;
- pagamento antecipado;
- contas adm. cartão;
- cheques;
- fluxo de caixa gráfico;
- curva ABC clientes;
- curva ABC produtos;
- dashboard multifilial;
- linha do tempo;
- split de pagamento;
- simulador;
- transações;
- exportação;
- formas de pagamento;
- centros de custo;
- custos e despesas;
- cartões;
- bancos.

## 3. Evidências de falha no shell

Os seguintes screenshots do shell aparecem indisponíveis:

- `financeiro-bancos-01.png`
- `financeiro-centros-custo-01.png`
- `financeiro-contas-pagar-01.png`
- `financeiro-contas-receber-01.png`
- `financeiro-dre-01.png`
- `financeiro-fluxo-caixa-01.png`
- `financeiro-formas-pagamento-01.png`
- `financeiro-gaveta-01.png`
- `financeiro-transacoes-cartao-01.png`

Isso não invalida o domínio, apenas mostra que a superfície beta ainda não cobre bem essas rotinas.

## 4. Leitura de arquitetura

O Financeiro do Vetus é fortemente ERP:

- cadastros auxiliares;
- contas;
- cartões;
- analytics;
- conciliações;
- visão gerencial.

O dashboard SPA funciona como fachada ou porta de entrada, enquanto o trabalho pesado ainda está no legado.

## 5. Conclusão

Para qualquer documentação séria, o Financeiro deve ser modelado assim:

- **camada moderna:** dashboard e pontos de navegação
- **camada operacional real:** telas legacy de `modulos/fin-*`
- **lacunas:** rotas shell que não chegam corretamente ao destino
