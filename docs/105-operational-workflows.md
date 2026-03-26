# Operational Workflows

## 1. Cadastro mestre

1. recepcao ou equipe localiza tutor e paciente
2. sistema previne duplicidade por busca e conciliacao
3. relacionamento tutor-paciente e confirmado ou ajustado

## 2. Abertura de atendimento

1. recepcao confirma unidade, origem e tipo de atendimento
2. sistema abre encounter em estado inicial coerente
3. triagem ou atendimento direto assume o proximo passo

## 3. Encaminhamento e consumo assistencial

1. atendimento pode gerar pedidos diagnosticos, internacao, cirurgia ou uso de materiais
2. modulos consumidores recebem apenas referencias e eventos necessarios
3. consumo administrativo nao altera retrospectivamente a narrativa clinica

## 4. Fechamento operacional

1. encounter e encerrado por ator autorizado
2. pendencias assistenciais e administrativas sao verificadas
3. auditoria registra fechamento e contexto

## 5. Suporte transversal

- notificacoes derivam de eventos autorizados
- observabilidade correlaciona requests, jobs e eventos
- fila e worker executam efeitos assíncronos sem burlar policies
