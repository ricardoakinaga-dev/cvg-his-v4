# Módulo Tutores — Fase 04 — Detalhe do Tutor e Integração com Pacientes

## 1. Objetivo

Fechar o fluxo operacional mais importante do módulo: usar o Tutor como ponto de entrada para criação e gestão dos pacientes vinculados.

## 2. Necessidade de tela de detalhe do tutor

O detalhe atual é insuficiente. O módulo precisa de uma tela ou bloco de detalhe que permita:

- visualizar dados completos;
- editar dados relevantes;
- consultar pacientes vinculados;
- acionar rapidamente a criação de paciente;
- confiar no cadastro antes de seguir para o atendimento.

## 3. Exibição de dados completos

O detalhe do tutor deve exibir:

- nome completo;
- nome de exibição;
- documento;
- status;
- origem;
- contatos;
- método preferencial de contato;
- endereço;
- observações administrativas;
- metadados de criação/atualização;
- pacientes vinculados.

## 4. Exibição de pacientes vinculados

### Conteúdo mínimo

- nome do paciente;
- espécie;
- status;
- papel do vínculo;
- indicador de principal;
- ação para abrir paciente.

### Fonte dos dados

- idealmente no próprio `GET /owners/:id`;
- ou via chamada complementar padronizada com `owner-patient-links`.

## 5. Ação rápida "Adicionar paciente"

### Requisito

Deve existir no detalhe do tutor e pode existir também na listagem.

### Objetivo

Eliminar o fluxo atual de digitação manual de `Tutor Principal ID` em [`patients.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts).

## 6. Pré-condição obrigatória: tutor salvo

Antes de permitir `Adicionar paciente`, o sistema precisa ter:

- `id` persistido do tutor;
- retorno de sucesso de create/update;
- estado consistente no frontend.

Não é permitido navegar para paciente com tutor ainda “em rascunho”.

## 7. Comportamento esperado após salvar tutor

### Salvar padrão

- mensagem de sucesso;
- detalhe atualizado;
- botão `Adicionar paciente` habilitado;
- listagem refletindo o novo tutor.

### Salvar e adicionar paciente

- confirmação de persistência concluída;
- navegação para fluxo de paciente;
- `ownerId` ou `tutorId` pré-preenchido;
- identificação visual do tutor no topo da tela de paciente.

## 8. Integração com owner-patient-links

### Uso mínimo

- listar vínculos existentes por tutor;
- criar vínculo adicional quando necessário;
- manter coerência com `patients.ownerId`.

### Regras

- não criar estrutura paralela de relacionamento;
- vínculo principal do paciente deve continuar estável;
- detalhe do tutor deve refletir a realidade dos vínculos.

## 9. Possíveis ajustes no fluxo de pacientes

Arquivo provável:

- [`apps/web/src/pages/patients.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)

### Ajustes esperados

- substituir UX baseada em id cru por tutor pré-selecionado;
- aceitar contexto de navegação vindo do módulo Tutores;
- exibir tutor selecionado de forma clara;
- reduzir uso manual de `ownerId`.

## 10. Arquivos candidatos a alteração

- [`apps/web/src/pages/owners.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- [`apps/web/src/pages/patients.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/patients.ts)
- [`apps/api/src/server.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)
- [`apps/api/src/bootstrap.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/bootstrap.ts)

## 11. Dependências

- Fase 02 com detalhe expandido ou endpoint auxiliar funcional;
- Fase 03 com listagem e formulário já estáveis;
- retorno consistente de `id` do tutor.

## 12. Ordem recomendada da fase

1. ampliar detalhe do tutor no backend;
2. renderizar detalhe completo no frontend;
3. listar pacientes vinculados;
4. introduzir botão `Adicionar paciente`;
5. ajustar fluxo de pacientes para pré-preenchimento;
6. validar criação de paciente a partir do tutor salvo;
7. validar vínculo refletido no detalhe do tutor.

## 13. Critérios de conclusão da fase

- detalhe do tutor exibe dados completos;
- pacientes vinculados aparecem;
- `Adicionar paciente` funciona;
- paciente não depende de id manual em fluxo regular;
- vínculo tutor-paciente é preservado;
- recepção consegue executar o fluxo completo sem desvio manual.

## 14. Riscos operacionais se essa fase ficar incompleta

- recepção continuará usando ids manualmente;
- cadastro de tutor e paciente seguirá desconectado;
- duplicidade continuará alta por falta de reuso do tutor;
- detalhe do tutor continuará pouco útil;
- o módulo parecerá parcialmente implementado, mas sem resolver o problema operacional central.
