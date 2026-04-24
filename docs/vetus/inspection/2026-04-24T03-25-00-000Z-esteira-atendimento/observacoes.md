# Observações da consolidação — Esteira de Atendimento

## Escopo

Relatório focado na página:

- `https://erp.vetus.com.br/Sistema/Atendimento/Esteira.htm`

Com ênfase em:

- funcionamento da esteira;
- papel no ritmo do hospital;
- transferências entre setores;
- acesso rápido a comanda/prontuário;
- início e finalização do atendimento;
- responsável pelo caso.

## Evidências usadas

- `docs/vetus/modulos/att-04-esteira.png`
- `docs/vetus/screenshots/atendimento-esteira-01.png`
- `docs/vetus/guides/2026-04-23-relatorio-entidade-comanda.md`
- `docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md`
- `docs/vetus/guides/20-anexo-atendimento.md`

## Achados principais

- A esteira legacy abriu e a esteira no shell beta apareceu indisponível.
- A tela legacy usa filtros por `Setor Atual`, `Profissional Responsável`, `Cliente` e `ID Animal`.
- A grade principal confirmou as colunas:
  - `Setor Atual`
  - `Recebido em`
  - `Enviado por`
  - `Cliente`
  - `Animal`
  - `Em atendimento com`
  - `Atendimento`
  - `Urgência`
  - `Comanda`
- A transferência entre setores ficou fortemente sustentada pelo cruzamento com a `Comanda`, que já expõe `Histórico de Esteira` e ação `Encaminhar Esteira`.
- O vínculo com `Comanda` está diretamente confirmado.
- O vínculo com `Prontuário` é leitura arquitetural forte, mas não ficou visualmente comprovado na captura vazia da própria esteira.

## Limitação crítica

A captura funcional da esteira ficou em estado vazio:

- `Nenhuma comanda nesta esteira.`

Por isso, os CTAs concretos por linha/caso não puderam ser lidos diretamente nesta rodada.

## Resultado

Foi gerado o relatório:

- `docs/vetus/guides/2026-04-24-relatorio-esteira-de-atendimento.md`
