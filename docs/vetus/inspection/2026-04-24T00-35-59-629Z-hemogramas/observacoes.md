# Observações da tentativa de inspeção direta

Data: 2026-04-24

## Resultado técnico da tentativa

- o módulo `Hemogramas` foi atacado pela rota `https://erp.vetus.com.br/Sistema/Laboratorio/Hemogramas.htm`;
- a tentativa direta de acesso HTTP retornou `HTTP/2 403`;
- o cabeçalho de resposta trouxe `cf-mitigated: challenge`;
- a automação Playwright não chegou a renderizar a tela final nesta sessão.

## Consequência para a análise

O relatório desta passada foi fechado por:

- confirmação da rota no menu legado;
- documentação interna sobre o papel do hemograma;
- relação estrutural com `Vlr. Ref. Hemograma`;
- coerência com a modelagem já consolidada do domínio `Laboratório`.
