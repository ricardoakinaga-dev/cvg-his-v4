# Módulo Tutores — Integração com Pacientes

## 1. Objetivo

Definir como o módulo Tutores deve se integrar ao módulo Pacientes, com foco em fluxo operacional real, vínculo consistente e base para múltiplos responsáveis.

## 2. Estado atual observado

O sistema já possui:

- `patients.ownerId` no schema atual;
- rotas de pacientes e de `owner-patient-links`;
- formulário atual de paciente com campo `Tutor Principal ID`;
- fluxo manual de vínculo tutor-paciente.

Esse estado é útil como fundação, mas ainda é técnico e pouco amigável para a operação.

## 3. Princípio central

Paciente não deve depender de digitação manual de id de tutor em operação regular.

O fluxo preferencial deve ser:

1. localizar ou criar tutor;
2. salvar tutor;
3. criar paciente já vinculado a esse tutor.

## 4. Criação rápida de paciente a partir do tutor

### 4.1 Objetivo

Reduzir atrito da recepção e evitar perda de contexto entre módulos.

### 4.2 Regras

- o tutor precisa estar salvo antes da criação rápida de paciente;
- o botão `Adicionar paciente` deve existir no detalhe e pode existir na listagem;
- ao acionar a ação, o sistema deve abrir o fluxo de paciente com vínculo principal já preenchido;
- o usuário não deve digitar manualmente o identificador do tutor.

## 5. Necessidade de tutor salvo antes de criar paciente

### Regra obrigatória

Não permitir criação de paciente "pendurado" em tutor ainda não persistido.

### Justificativa

- garante integridade referencial;
- simplifica auditoria;
- evita vínculo com registro temporário;
- reduz inconsistência entre UI e banco.

## 6. Comportamento do botão "Adicionar paciente"

### 6.1 Na listagem

Pode existir como ação rápida:

- abre fluxo de paciente;
- injeta tutor selecionado;
- exibe nome do tutor vinculado no topo do formulário.

### 6.2 No detalhe

Deve existir obrigatoriamente:

- botão destacado;
- navegação para tela de paciente;
- vínculo pré-preenchido e bloqueado inicialmente, ou ao menos claramente selecionado.

## 7. Pré-preenchimento de vínculo

Ao abrir criação de paciente a partir do tutor:

- preencher `tutorId` ou equivalente compatível com backend;
- exibir nome do tutor e documento para conferência;
- permitir troca de tutor apenas se a regra de produto permitir;
- ao salvar paciente, criar ou manter vínculo principal automaticamente.

## 8. Regras de vínculo principal e secundário

### 8.1 Fase inicial

- cada paciente deve ter um tutor principal;
- esse vínculo principal deve continuar coerente com o campo direto do paciente;
- vínculos adicionais podem existir via tabela de links.

### 8.2 Regras mínimas

- só pode existir um vínculo principal por paciente;
- vínculo secundário não substitui o principal;
- remoção do vínculo principal exige promoção de outro responsável ou bloqueio operacional.

## 9. Cenários futuros para múltiplos responsáveis

O contrato deve suportar evolução para:

- casal ou família com múltiplos contatos;
- tutor principal e responsável financeiro distinto;
- ONG/abrigo com representante operacional;
- paciente compartilhado entre responsáveis.

Campos futuros por vínculo:

- `relationship`
- `isPrimary`
- `canAuthorizeCare`
- `canReceiveClinicalUpdates`
- `canReceiveFinancialCharges`

## 10. Comportamento na tela de detalhe do tutor

O detalhe do tutor deve exibir:

- lista de pacientes vinculados;
- indicação de vínculo principal/secundário;
- ação `Abrir paciente`;
- ação `Adicionar paciente`;
- eventual ação futura `Vincular paciente existente`.

## 11. Dependências com o módulo Pacientes

Para a integração funcionar de forma robusta, o módulo Pacientes deverá:

- aceitar referência clara ao tutor principal;
- exibir tutor vinculado sem depender só de id cru;
- consumir contratos estáveis de tutor;
- refletir mudanças relevantes de status;
- impedir fluxo operacional inconsistente quando não houver tutor válido.

## 12. Estratégia técnica recomendada

### Curto prazo

- manter compatibilidade com `ownerId`;
- usar `owner-patient-links` para vínculos adicionais;
- melhorar frontend para navegação entre módulos.

### Médio prazo

- padronizar naming de negócio para `Tutor`;
- alinhar `patient.ownerId` a `primaryTutorId` em nível semântico, mesmo que a coluna permaneça temporariamente;
- expandir detalhe do tutor com pacientes vinculados.

## 13. Critério de integração concluída

A integração só será considerada concluída quando:

- o tutor puder ser salvo com dados mínimos válidos;
- o paciente puder ser criado a partir do tutor salvo;
- o vínculo principal for criado ou preservado automaticamente;
- o detalhe do tutor mostrar pacientes vinculados;
- frontend e backend usarem o mesmo contrato de vínculo.
