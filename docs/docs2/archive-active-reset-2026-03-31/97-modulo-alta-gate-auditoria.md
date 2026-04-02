# Módulo Alta — Gate de Auditoria

## Checklist de Auditoria

### Funcionalidades Core

- [ ] POST /discharges cria alta corretamente
- [ ] GET /discharges lista com filtros
- [ ] GET /discharges/:id retorna detalhe
- [ ] PATCH /discharges/:id atualiza
- [ ] Duplicidade bloqueada (409)
- [ ] encounterId válido obrigatório
- [ ] patientId válido obrigatório
- [ ] dischargeType obrigatório
- [ ] outcome obrigatório
- [ ] dischargedAt obrigatório

### Integração

- [ ] Evento registrado no timeline
- [ ] Auditoria registrada
- [ ] Encerramento de atendimento funciona
- [ ] Dados de paciente/tutor corretos

### Frontend

- [ ] Listagem exibe dados
- [ ] Formulário cria alta
- [ ] Detalhe funciona
- [ ] Rota registrada
- [ ] Menu configurado

### Consistência

- [ ] Backend valida dados
- [ ] Frontend sincronizado
- [ ] Tipos correspondem
- [ ] Nomes correspondem

### Qualidade

- [ ] Typecheck passa
- [ ] Build passa
- [ ] Testes passam

## Critérios de Pronto

| Critério                        | Status |
| ------------------------------- | ------ |
| Alta registrada corretamente    | -      |
| Vínculo com atendimento correto | -      |
| Não há duplicidade              | -      |
| Fluxo clínico fechado           | -      |
| Persistência como fonte         | -      |
| Frontend sincronizado           | -      |
| Pronto para auditoria           | -      |

## Defeitos Bloqueantes

Se encontrar:

- [ ] Duplicidade não bloqueada
- [ ] Dados não persistem
- [ ] Validações não funcionam
- [ ] Frontend quebrado

→ Corrigir antes de prosseguir

## Próximos Passos

1. Executar checklist
2. Corrigir defeitos
3. Documentar pendências
4. Confirmar auditoria

## Confirmação

Após completar checklist:

> **Módulo Alta pronto para auditoria**
