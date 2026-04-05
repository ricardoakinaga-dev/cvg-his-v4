# ONDA 3 — INTEGRAÇÕES E API (Meses 10-13)
## Score: 72 → 82 (+10 pontos)

## Objetivo
Conectar o CVG-HIS-V2 ao ecossistema externo: pagamentos, comunicação, fiscal e event bus para integração desacoplada.

## Etapas

### Etapa 3.1 — Event Bus e Arquitetura Assíncrona (Mês 10)
**Entregas:**
- [ ] Event Bus (Redis Streams ou RabbitMQ) configurado
- [ ] Outbox pattern em módulos críticos (encounters, billing, inpatient)
- [ ] Event catalog com 30+ eventos de domínio
- [ ] Consumer framework com retry e DLQ
- [ ] Event schema registry
- [ ] Observability de eventos (publish rate, lag, failures)

**Eventos Prioritários:**
```
encounter.started, encounter.closed
command.finalized, command.cancelled
appointment.created, appointment.cancelled
inpatient.admitted, inpatient.discharged
stock.moved, stock.low
receivable.paid, payable.paid
notification.sent
```

### Etapa 3.2 — Pagamentos (Mês 10-11)
**Entregas:**
- [ ] PIX integration (QR Code + copia e cola)
- [ ] Card payment (Stone ou PagSeguro)
- [ ] Payment reconciliation automática
- [ ] Split de pagamento (clínica + profissional)
- [ ] Cash register com fechamento automático
- [ ] Financial dashboard em tempo real

### Etapa 3.3 — Comunicação (Mês 11-12)
**Entregas:**
- [ ] WhatsApp Business API integration
- [ ] Confirmação de agendamento via WhatsApp
- [ ] Resultados de exame via WhatsApp
- [ ] Lembretes de vacina/retorno
- [ ] Email (SendGrid) para notificações transacionais
- [ ] SMS (Zenvia) como fallback
- [ ] Template management por canal

### Etapa 3.4 — Fiscal (Mês 12-13)
**Entregas:**
- [ ] Motor fiscal paramétrico (ICMS, IPI, PIS, COFINS)
- [ ] NFS-e emission
- [ ] NF-e entrada (XML parsing)
- [ ] CFOP configuration
- [ ] Fiscal reports
- [ ] Tabelas de ICMS por estado

### Etapa 3.5 — Webhooks e API Premium (Mês 13)
**Entregas:**
- [ ] Webhook management (register, test, retry, logs)
- [ ] API documentation (OpenAPI 3.1 auto-generated)
- [ ] API Playground (Swagger UI)
- [ ] Rate limiting per endpoint
- [ ] API key management para parceiros

## Score Esperado: 72 → 82
