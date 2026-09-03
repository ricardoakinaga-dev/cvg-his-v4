# Certificação de usabilidade

Este roteiro completa os gates manuais que não podem ser simulados por uma aprovação automática. A evidência deve apontar para o mesmo SHA usado nas três execuções do workflow `Usability Certification`.

## Pré-condições

- As três execuções técnicas estão verdes, sem retry e sem skip.
- Cada execução preservou JSON/HTML, traces, screenshots, descoberta e a auditoria 286/286.
- A regressão visual está 28/28 e o subconjunto essencial passou em Chromium, Firefox e WebKit.
- O ambiente usa dados sintéticos e não inclui credenciais no pacote.

## UAT por papel

Registre para cada linha: pessoa aprovadora, data/hora, SHA, ambiente, resultado (`aceite`, `ressalva` ou `bloqueio`) e link de evidência.

| Papel         | Roteiro obrigatório                               | Resultado | Aprovador | Evidência |
| ------------- | ------------------------------------------------- | --------- | --------- | --------- |
| Recepção      | login; tutor/animal; agenda; check-in; fechamento | pendente  |           |           |
| Veterinário   | busca; prontuário; ordem; prescrição; alta        | pendente  |           |           |
| Enfermagem    | fila; internação; evolução; prescrição            | pendente  |           |           |
| Administração | billing; relatórios; export; perfis e negações    | pendente  |           |           |

## Leitor de tela

Execute com NVDA + Firefox ou VoiceOver + Safari. Verifique landmarks e skip link; nomes e descrições de campos; estados de loading/erro/sucesso; leitura de tabelas; foco de modais; e anúncio do resultado de download nas jornadas de tutor/animal, agenda, prontuário, billing, relatórios e perfis. Qualquer bloqueador reprova o gate.

## Go/no-go

A decisão deve conter SHA, URLs das três rodadas, resultado 28/28, matriz cross-browser, UAT dos quatro papéis, validação de leitor de tela, riscos residuais com responsável/prazo e aprovadores de Produto, QA e Engenharia. `GO` só é permitido sem P0/P1 aberto e sem bloqueador manual.
