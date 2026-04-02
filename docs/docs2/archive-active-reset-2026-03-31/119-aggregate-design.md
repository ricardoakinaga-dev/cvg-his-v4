# Aggregate Design

## Agregados principais

### Owner

- representa o responsavel relacional e administrativo
- controla contatos, situacao e vinculos com pacientes

### Patient

- representa o animal assistido
- controla identidade clinica e relacionamento com tutores

### Encounter

- representa episodio operacional do cuidado
- controla estado, origem, equipe e referencias clinicas

### Medical Record Entry

- representa uma entrada versionavel do prontuario
- controla autoria, tipo, conteudo e historico de revisoes

### Attachment

- representa metadado de artefato externo
- controla origem, integridade e vinculo com agregados

### Audit Event

- representa evidencia imutavel de acao relevante
- controla correlacao, ator, acao e referencia de entidade

## Regra de desenho

Cada agregado deve proteger suas invariantes e expor contratos publicos compativeis com seu bounded context, sem acessar internals de outros agregados.
