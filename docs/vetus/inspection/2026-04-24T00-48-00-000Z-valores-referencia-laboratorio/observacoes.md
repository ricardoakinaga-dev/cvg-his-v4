# Observações da tentativa de inspeção direta

Data: 2026-04-24

## Resultado técnico da tentativa

- a rota `ReferenciasHemograma.htm` retornou `HTTP/2 403`;
- a rota `ReferenciasBioquimico.htm` retornou `HTTP/2 403`;
- em ambas as respostas o cabeçalho trouxe `cf-mitigated: challenge`.

## Consequência para a análise

O relatório desta passada foi fechado por:

- confirmação das rotas no menu legado;
- documentação interna sobre `Vlr. Referência`;
- modelo de dados documentado para `exam_reference_values`;
- coerência com as entidades laboratoriais já inspecionadas.
