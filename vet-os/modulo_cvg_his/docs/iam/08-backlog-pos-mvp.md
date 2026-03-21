# Backlog Pós-MVP - IAM Hospitalar CVG-HIS

## Objetivo
Registrar a trilha recomendada de evolução após o MVP de IAM, priorizando segurança hospitalar, rastreabilidade clínica e governança operacional.

## Prioridade Alta

### 1. MFA e hardening de identidade
- MFA para perfis privilegiados:
  - `superadmin`
  - `administrativo`
  - `diretoria` / `gestao`
  - `coordenacao_medica`
- política de rotação de senha e segredo inicial temporário;
- revogação global de sessões por incidente;
- sessão por dispositivo com identificação amigável.

### 2. Escopos reais por setor/unidade/contexto
- enforcement em runtime de:
  - unidade
  - setor
  - internação/leito
  - laboratório
  - imagem
- vínculos temporários com expiração;
- escopo combinado com papel para evitar superexposição clínica.

### 3. Assinatura clínica e supervisão
- fluxo de assinatura eletrônica para nota/prontuário;
- residente com rascunho + supervisão obrigatória;
- validação de cosign por coordenador/veterinário supervisor;
- trilha explícita de:
  - quem escreveu
  - quem revisou
  - quem assinou
  - quando assinou

### 4. Break-glass controlado
- acesso emergencial extraordinário com justificativa obrigatória;
- auditoria destacada e revisão posterior;
- expiração curta e revogação automática.

## Prioridade Média

### 5. Versionamento longitudinal de prontuário
- adendo em vez de sobrescrita destrutiva;
- diff clínico entre versões;
- timeline consolidada por encounter e por paciente;
- rastreabilidade de anexos e laudos.

### 6. Revisão periódica de acesso
- recertificação trimestral/semestral de papéis;
- relatórios de papéis sem uso;
- detecção de privilégios excessivos;
- trilha de concessão/revogação com aprovador.

### 7. Auditoria expandida
- cobertura de leitura sensível em mais módulos;
- dashboard administrativo de auditoria;
- filtros por:
  - usuário
  - papel
  - recurso
  - ação
  - período
- alertas para comportamento anômalo.

### 8. Políticas contextuais ABAC
- regras por horário/plantão;
- regras por vínculo com paciente/caso;
- regras por setor ativo;
- bloqueios condicionais por status do atendimento.

## Prioridade Evolutiva

### 9. Aprovação em dupla checagem
- reset administrativo de senha com aprovação em pares;
- mudanças críticas de matriz de permissões com aprovação;
- fechamento financeiro sensível com segregação de funções.

### 10. Integrações e segurança operacional
- trilhas exportáveis para SIEM;
- webhooks/eventos de segurança;
- correlação com logs de infraestrutura;
- relatórios de incidentes de acesso.

### 11. UX administrativa avançada
- tela de sessões por dispositivo;
- escopos com editor visual;
- comparação entre papéis;
- simulação de permissões efetivas por usuário.

## Recomendações de ordem prática
1. Escopos reais por unidade/setor.
2. Assinatura clínica e supervisão de residente.
3. MFA para perfis críticos.
4. Dashboard de auditoria.
5. Versionamento clínico/adendos.
6. Break-glass com revisão posterior.
