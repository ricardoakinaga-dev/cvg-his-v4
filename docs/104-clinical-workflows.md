# Clinical Workflows

## 1. Admissao ambulatorial

1. localizar ou criar `owner`
2. localizar ou criar `patient`
3. confirmar contexto institucional e unidade
4. abrir `encounter` diretamente ou via agenda
5. encaminhar para triagem ou atendimento imediato

## 2. Triagem

1. identificar actor e vinculacao operacional
2. coletar sinais, queixas, alertas e classificacao inicial
3. registrar riscos imediatos
4. publicar dados estruturados para o encounter

## 3. Atendimento clinico

1. profissional acessa encounter vigente
2. registra evolucao, impressao e conduta
3. emite prescricao, pedido diagnostico ou encaminhamento
4. produz eventos de auditoria e timeline clinica

## 4. Consolidacao do prontuario

1. associar entries clinicas ao historico longitudinal do paciente
2. manter versoes, autoria e contexto
3. permitir revisao auditavel sem perda do historico anterior

## 5. Operacao assistencial avancada

- internacao preserva referencia ao encounter e ao prontuario
- cirurgia registra indicacao, preparo, ato e desfecho
- diagnostico registra pedido, coleta, resultado e artefatos associados

## Invariantes clinicos

- informacao clinica relevante precisa de autor identificavel
- mudancas de estado clinico precisam ser auditadas
- historico clinico precisa permanecer recuperavel
