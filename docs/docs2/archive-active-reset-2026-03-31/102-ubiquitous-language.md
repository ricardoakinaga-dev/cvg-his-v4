# Ubiquitous Language

## Termos canonicos

- Account: tenant institucional isolado por dados e politicas.
- Actor: identidade em execucao responsavel pela acao atual.
- User: identidade autenticavel do sistema.
- Staff Member: colaborador com atribuicoes operacionais ou assistenciais.
- Owner: tutor ou responsavel pelo paciente.
- Patient: animal assistido pela instituicao.
- Encounter: episodio clinico operacional.
- Triage: classificacao inicial e coleta estruturada de risco e sinais.
- Medical Record: conjunto longitudinal de registros clinicos do paciente.
- Clinical Entry: item do prontuario, como evolucao, prescricao, conduta ou observacao.
- Attachment: artefato externo associado a prontuario, encounter ou diagnostico.
- Audit Event: registro imutavel de acao material relevante.
- Policy: regra contextual de autorizacao.
- Capability: permissao derivada de role, atribuicao e contexto.
- Soft Delete: desativacao logica com historico preservado.
- Versioning: manutencao de revisoes explicitas de conteudo sensivel.

## Termos a evitar

- `cliente` quando o conceito correto e `owner`
- `ficha` como sinonimo tecnico de prontuario
- `conta` para misturar tenancy, caixa e contas a receber
- `nota` como termo generico quando ha distincao entre entry clinica, laudo e anexo

## Regras de linguagem

- usar o mesmo termo em documentacao, contratos e codigo publico
- nome de modulo deve refletir capacidade de negocio, nao workaround tecnico
- mudanças de linguagem ubiqua exigem atualizacao documental antes da implementacao
