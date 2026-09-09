# Baseline de tarefa e informação — 07/09/2026

Este protocolo atende ao recorte documental de FEA-002 sem fingir uma medição
humana. O arquivo [task-baseline-2026-09-07.json](task-baseline-2026-09-07.json)
é a fonte estruturada do roteiro, da massa sintética, dos perfis e das colunas
de coleta. O estado atual é `PROTOCOL_READY_HUMAN_MEASUREMENT_PENDING`.

## Tarefas prioritárias

| ID | Função/contexto | Superfície | Resultado observável |
| --- | --- | --- | --- |
| T01 | Recepção; rotina/plantão | `/reception` | localizar tutor/paciente e iniciar o próximo passo sem criar encontro implícito |
| T02 | Recepção/veterinário; rotina/plantão | `/appointments?...agendaView=week` | encontrar o compromisso das 09:40, abrir detalhe e voltar preservando contexto |
| T03 | Recepção/apoio; baixa familiaridade | `/owners/new` → `/patients/new` | cadastrar o essencial, recuperar validação/falha e proteger rascunho/duplicidade |
| T04 | Veterinário/apoio; plantão | `/patients/:id` | revisar identidade/contexto clínico e salvar atualização sem perder rascunho |
| T05 | Caixa/veterinário; fechamento/plantão | `/encounters/:id` | distinguir elegibilidade, pending e confirmação PIX sem cobrança duplicada |

Cada tarefa tem no JSON: prompt neutro, pré-condições, conteúdo obrigatório,
sucesso, erros adversos, métricas e referências sintéticas existentes. A massa
usa somente IDs e dados fictícios (`Rosa Almeida`, `Mimo`, `R$ 189,00`).

## Amostra e execução

O plano prevê dez sessões, duas por perfil: recepção padrão, recepção com pouca
familiaridade digital, médico-veterinário de plantão, caixa/financeiro e apoio
de plantão. Cada pessoa executa as cinco tarefas em uma de duas ordens
balanceadas. O moderador lê o cenário, não ensina o caminho e registra apenas
um `session_id` aleatório, função/contexto, familiaridade declarada e dados
agregáveis. Vídeo é opcional e depende de consentimento separado.

Executar nos grupos `390x844`, `768x1024` e `1440x900`, claro/escuro quando a
sessão permitir. Medir tempo até a primeira ação significativa, duração total,
ativações de ponteiro/teclado, rolagem, erros, assistência, erro crítico e
conclusão. Publicar mediana/distribuição, denominador e perdas por tarefa e
perfil; separar falha da pessoa de indisponibilidade do ambiente.

Erro crítico significa perda de conteúdo, registro errado ou confirmação
financeira indevida. A tarefa deve ser encerrada e encaminhada para revisão,
sem tentar “corrigir” a observação durante a sessão.

## Estado atual e limites

Não há participantes recrutados, observações humanas, tempos, cliques, taxas
de conclusão ou vídeos neste artefato. Os links `continuity-*` no JSON são
dry-runs Chromium com respostas sintéticas e servem somente para confirmar que
os cenários são exercitáveis no candidato. Eles não substituem OP, UAT, FEA-033,
serviços reais, backend/RLS, dispositivo físico ou leitor de tela.
