# Histórico de cancelamentos de vendas e comandas

O relatório em **Relatórios → Cadastros → Exclusão de Vendas e Comandas**
permite consultar quais vendas foram canceladas no período, por quem e por quê.

Em **Consultar**, escolha:

- **Histórico por data de cancelamento**: apresenta os eventos registrados,
  incluindo responsável, motivo, instante e valores no momento do cancelamento.
- **Canceladas por data de abertura**: mantém a consulta anterior de comandas
  atualmente canceladas, filtradas pela data de abertura.

As datas inicial e final são inclusivas e representam dias em UTC, conforme o
[contrato de datas](engineering/REPORT_DATE_SEMANTICS.md). No histórico, uma
venda aberta em agosto e cancelada em setembro aparece no período de setembro.
A busca aceita número da comanda, motivo e identificadores do responsável, da
venda ou da referência de auditoria. O responsável é identificado pelo ID
registrado; o relatório não inventa um nome para um usuário indisponível.

**Exportar CSV** gera um arquivo auditado com os mesmos fatos da consulta. Os
valores do histórico vêm do registro do cancelamento e não são recalculados
com o estado atual da venda. A exportação contém o ID do evento e a referência
de auditoria para rastreabilidade.

Se o período ultrapassar 10.000 eventos, reduza o intervalo ou refine a busca.
Um evento antigo sem os fatos necessários produz erro explícito. O sistema não
completa esses campos com a data de atualização nem apresenta um relatório
parcial como se estivesse completo.

O novo histórico usa `commercial-cancellation-history`; a consulta anterior usa
`commercial-deleted-sales`. Definições e agendamentos existentes mantêm o
contrato anterior. API, exportação e agendador usam a mesma fonte persistida,
limitada à conta autorizada. A consulta não cancela vendas nem altera pagamentos.
