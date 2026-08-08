# 889 - Roadmap de Fluxos Especializados

Data: 2026-04-28
Status: rascunho para priorizacao
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/886-modelo-operacional-queue-encounter.md`

## 0. Guardrail

Este documento nao autoriza implementacao.

Ele nao cria telas, componentes, rotas, migrations, schema ou API. Ele organiza discovery e priorizacao de fluxos especializados para PRDs futuros.

BUILD so pode ocorrer depois de PRD/SPEC aprovado e autorizacao explicita do responsavel.

## 1. Objetivo

Planejar fluxos especializados sem permitir que cada setor vire um sistema isolado.

Todos os fluxos devem se conectar, quando aplicavel, a Tutor, Animal, `Encounter`, `Queue`, prontuario, recepcao e financeiro.

## 2. Regra central

Fluxos especializados podem ter estado, fila, tela de trabalho e rotina propria.

Eles nao podem perder:

- origem;
- responsavel atual;
- proximo setor;
- retorno operacional;
- rastreabilidade financeira;
- vinculo com `Encounter`;
- comunicacao com recepcao e prontuario.

## 3. Fluxos cobertos

### 3.1 Internacao

Escopo candidato:

- admissao;
- setor/leito;
- evolucao;
- prescricao/execucao;
- transferencia;
- alta;
- retorno para recepcao/financeiro.

### 3.2 Laboratorio

Escopo candidato:

- pedido;
- coleta;
- analise;
- laudo;
- resultado critico;
- retorno ao prontuario.

### 3.3 Imagem, ultrassom e RX

Escopo candidato:

- pedido;
- agenda;
- execucao;
- laudo;
- imagens/anexos;
- retorno ao veterinario e recepcao.

### 3.4 Cirurgia

Escopo candidato:

- pre-operatorio;
- autorizacao;
- procedimento;
- recuperacao;
- consumo e cobranca;
- alta ou internacao.

### 3.5 Especialidades

Escopo candidato:

- encaminhamento;
- consulta especializada;
- conduta;
- retorno ao clinico;
- retorno para recepcao/financeiro.

## 4. Vinculos obrigatorios

| Vinculo | Regra |
| --- | --- |
| Tutor | Obrigatorio quando houver cliente identificavel |
| Animal | Obrigatorio quando houver paciente envolvido |
| Encounter | Obrigatorio quando o fluxo deriva de atendimento ou gera continuidade operacional |
| Queue | Obrigatorio quando houver trabalho pendente, setor destino ou retorno |
| Financeiro | Obrigatorio quando houver cobranca, consumo, orcamento ou pendencia financeira |
| Prontuario | Obrigatorio quando houver evento clinico relevante |

## 5. Priorizacao sugerida

| Prioridade | Fluxo | Motivo |
| --- | --- | --- |
| 1 | Internacao | Alto risco assistencial e necessidade de pendencias visiveis |
| 2 | Laboratorio | Impacta diagnostico e continuidade clinica |
| 3 | Imagem/ultrassom/RX | Exige agenda, laudo e retorno ao prontuario |
| 4 | Cirurgia | Alto risco e forte dependencia financeira/assistencial |
| 5 | Especialidades | Depende de encaminhamento e retorno operacional |

## 6. Documentos filhos futuros

- PRD de internacao.
- PRD de laboratorio.
- PRD de imagem/ultrassom/RX.
- PRD de cirurgia.
- PRD de especialidades.
- SPEC de retorno operacional especializado.
- Checklist de validacao por setor.

## 7. Criterios de aceite

O roadmap sera considerado pronto quando:

- cada fluxo tiver dono de discovery;
- vinculos obrigatorios estiverem claros;
- retorno para recepcao/prontuario/financeiro estiver definido;
- prioridades estiverem aprovadas;
- DEV permanecer bloqueado.

## 8. Proximos passos

1. Validar prioridade com responsavel.
2. Iniciar discovery read-only do fluxo de internacao.
3. Definir PRD filho por fluxo antes de qualquer BUILD.
4. Manter fluxos especializados dependentes de `886-modelo-operacional-queue-encounter.md`.
