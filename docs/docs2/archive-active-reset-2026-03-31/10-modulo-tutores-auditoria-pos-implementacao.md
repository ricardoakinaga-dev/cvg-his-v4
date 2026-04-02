# Módulo Tutores — Auditoria Pós-Implementação

## 1. Objetivo

Definir o que deverá ser auditado após a implementação do módulo Tutores para validar aderência ao contrato documental e identificar divergências antes de avançar para novas etapas.

## 2. O que deverá ser auditado

- estrutura de banco aplicada;
- shape real das respostas da API;
- payloads enviados pelo frontend;
- consistência da listagem e do detalhe;
- regras de duplicidade;
- auditoria registrada;
- integração com pacientes;
- uso operacional pela recepção.

## 3. Consistência entre banco, backend e frontend

A auditoria deverá verificar:

- se todos os campos documentados existem ou possuem estratégia transitória explícita;
- se o backend persiste dados normalizados;
- se o frontend consome e exibe o mesmo contrato;
- se há divergência entre `owner`, `tutor`, `ownerId` e `tutorId` sem mapeamento claro;
- se endereço e contatos não estão sendo descartados parcialmente.

## 4. Aderência ao contrato documental

Perguntas obrigatórias:

- o create respeita o contrato de dados?
- o update respeita o contrato de dados?
- list e detail retornam estruturas coerentes?
- pacientes vinculados aparecem no detalhe do tutor?
- a criação rápida de paciente funciona a partir do tutor salvo?
- erros estruturados existem de forma utilizável?

## 5. Riscos de divergência

Principais riscos:

- backend aceitando shape diferente do documentado;
- frontend exibindo menos do que o módulo persiste;
- campos duplicados em nome diferente sem camada de tradução;
- contatos modelados de um jeito na UI e de outro no banco;
- vínculo com pacientes usando ids incompatíveis ou sem semântica clara.

## 6. Indicadores de módulo incompleto

O módulo deverá ser considerado incompleto se:

- ainda depender de id manual para fluxo de paciente;
- continuar com formulário reduzido sem contatos múltiplos;
- não expuser pacientes vinculados;
- não bloquear duplicidade forte;
- não tiver auditoria mínima;
- não possuir listagem operacional por múltiplas chaves.

## 7. Sinais de débito técnico

- uso excessivo de alias sem contrato formal;
- lógica de normalização espalhada e inconsistente;
- listagem e detalhe retornando campos diferentes sem justificativa;
- enums hardcoded no frontend sem contrato compartilhado;
- ausência de migration clara;
- dependência de `jsonb` sem disciplina de validação.

## 8. Critérios para aprovar o módulo para próxima etapa

Só aprovar para próxima etapa quando:

- banco, backend e frontend estiverem coerentes;
- fluxo tutor -> paciente estiver funcional;
- auditoria mínima estiver ativa;
- busca operacional estiver utilizável;
- critérios de aceite forem majoritariamente atendidos;
- pendências remanescentes não bloquearem staging real.

## 9. Saída esperada da auditoria

O relatório futuro de auditoria deverá produzir:

- conformidades encontradas;
- não conformidades com severidade;
- gaps entre contrato e implementação;
- riscos para staging/produção;
- decisão objetiva: `aprovado`, `aprovado com restrições` ou `reprovado`.
