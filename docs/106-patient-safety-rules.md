# Patient Safety Rules

## Regras obrigatorias de seguranca assistencial

1. Nenhuma entry clinica relevante pode ser criada sem autoria identificavel.
2. Prescricao, conduta e evolucao devem ser distinguiveis no modelo de dados e na auditoria.
3. Revisao de conteudo clinico nao pode apagar silenciosamente o historico anterior.
4. Alertas criticos de triagem devem permanecer visiveis no contexto do atendimento.
5. Encerramento de encounter deve respeitar permissao contextual e registrar justificativa quando aplicavel.
6. Anexos clinicos devem possuir origem e integridade verificaveis.
7. Fluxos administrativos nao podem alterar o significado clinico de um registro.

## Regras de desenho seguro

- UI pode orientar, mas a validacao soberana e do backend
- eventos criticos devem gerar auditoria
- modelos devem privilegiar recuperacao historica sobre edicao destrutiva
