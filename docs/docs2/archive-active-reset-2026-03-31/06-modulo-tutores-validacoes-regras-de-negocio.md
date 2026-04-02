# Módulo Tutores — Validações e Regras de Negócio

## 1. Objetivo

Formalizar as regras de negócio do módulo Tutores para evitar implementação permissiva demais, inconsistência cadastral e perda de rastreabilidade.

## 2. Obrigatoriedade mínima

Para cadastro regular de tutor, exigir no mínimo:

- nome completo;
- pelo menos um contato válido;
- status inicial;
- origem do cadastro;
- indicador de responsável financeiro;

Documento pode ser tratado como obrigatoriedade operacional forte, com exceções controladas para cenários específicos de recepção, desde que a ausência seja rastreável e revisável.

## 3. Regras para telefone

- aceitar telefone com máscara no frontend;
- persistir telefone normalizado;
- permitir mais de um telefone;
- marcar um contato principal;
- impedir dois contatos principais simultâneos;
- impedir valor vazio em contato marcado como principal;
- permitir flag de WhatsApp separada do tipo principal do contato.

## 4. Regras para e-mail

- e-mail deve ser opcional no primeiro corte;
- se informado, deve ter formato válido;
- persistir em lowercase normalizado;
- não permitir duplicidade evidente no mesmo array de contatos;
- se houver e-mail principal, ele deve ser coerente com `preferredContactMethod`.

## 5. Regras para documento

- documento deve aceitar tipo e número;
- número deve ser normalizado;
- CPF/CNPJ devem ter validação compatível com formato;
- documentos inválidos não devem passar para persistência;
- documento ausente em cadastro excepcional deve gerar status ou flag de revisão futura.

## 6. Regras para endereço

- endereço é opcional no primeiro corte, mas sua estrutura deve existir;
- CEP deve ser normalizado;
- estado deve seguir padrão de UF quando o país for BR;
- não consolidar tudo em uma string única na persistência;
- endereço vazio não deve quebrar listagem ou detalhe.

## 7. Regras para status

Valores aceitos:

- `active`
- `inactive`
- `restricted`
- `pending_review`

### Regras

- cadastro novo padrão deve nascer como `active` ou `pending_review`, conforme decisão final de produto;
- inativação exige motivo;
- tutor inativo não deve ser usado silenciosamente em fluxos críticos sem aviso;
- tutor restrito exige destaque visual e validação adicional.

## 8. Regras de duplicidade

### 8.1 Duplicidade forte

Bloqueio:

- mesmo documento normalizado na mesma conta.

### 8.2 Duplicidade potencial

Sinalização ou revisão:

- mesmo telefone principal;
- mesmo e-mail principal;
- nome muito próximo combinado com contato semelhante.

## 9. Regras de edição

- `PATCH` parcial é permitido;
- atualização parcial não pode quebrar consistência global;
- ao trocar contato principal, o anterior deve deixar de ser principal;
- alteração de documento deve disparar nova checagem de duplicidade;
- mudança de status deve ser auditada.

## 10. Regras de inativação

- não apagar tutor para resolver duplicidade ou erro operacional;
- preferir inativação auditável;
- inativação exige motivo;
- tutor inativado com pacientes vinculados deve permanecer consultável;
- criação de novo paciente com tutor inativo deve ser bloqueada ou exigir confirmação explícita, conforme política final.

## 11. Restrições operacionais

- não depender de id manual para vínculo com paciente;
- não permitir salvar tutor sem contatos em fluxo regular;
- não permitir dois contatos marcados como principais;
- não permitir paciente produtivo sem tutor principal válido;
- não permitir frontend aceitar campos que backend ignora silenciosamente.

## 12. Regras de consistência de dados

- `preferredContactMethod` deve existir entre os contatos disponíveis ou ser nulo;
- `primaryContactId` deve apontar para item existente em `contacts`;
- `email` raiz, se mantido por compatibilidade, deve refletir o contato de e-mail principal;
- `phone` raiz, se mantido por compatibilidade, deve refletir o contato telefônico principal;
- status e inativação devem ser coerentes;
- vínculo tutor-paciente principal deve ser único por paciente.

## 13. Critérios de rastreabilidade

Cada alteração relevante deve permitir responder:

- quem criou o tutor;
- quem atualizou;
- quando foi criado;
- quando foi alterado;
- qual era o status anterior;
- por que foi inativado, se aplicável;
- quando foi usado para criar paciente;
- quais pacientes estão vinculados.

## 14. Regras para uso futuro

O contrato deve deixar espaço para:

- múltiplos responsáveis;
- diferenciação entre responsável clínico e financeiro;
- consentimentos futuros;
- integrações externas.

Nenhuma implementação inicial deve bloquear essa evolução por decisão simplista de modelagem.
