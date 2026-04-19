# PLANO OPERACIONAL — ONDA 3 (Meses 10-13)
## Integrações e API Premium

---

## 1. CONTEXTO

A Onda 3 tem como objetivo conectar o CVG-HIS-V2 ao ecossistema externo. Diferente das Ondas 1 e 2 que foram executadas com squads dedicados, a Onda 3 requer coordenação entre múltiplas integrações simultâneas.

**Score Atual:** 72/100 → **Meta:** 82/100

---

## 2. ESTRUTURA DE SQUADS

### Squad Backend Integrações (Mes 10-13)
| Papel | Qtd | Foco |
|-------|-----|------|
| Tech Lead | 1 | Arquitetura Event Bus, code review |
| Backend Senior | 2 | Event Bus, Webhooks, Fiscal |
| Backend Mid | 2 | PIX, WhatsApp, Email |
| QA | 1 | Contract testing, integração |

### Squad Frontend Integrações (Mes 11-13)
| Papel | Qtd | Foco |
|-------|-----|------|
| Frontend Senior | 1 | Telas de integração |
| Frontend Mid | 1 | Componentes de pagamento, notificações |

**Total por mês:** 7-9 pessoas

---

## 3. ETAPAS E DEPENDÊNCIAS

```
Mês 10: Event Bus
├── Escolha de tecnologia (Redis Streams vs RabbitMQ)
├── Outbox pattern nos módulos críticos
├── Event catalog inicial (30+ eventos)
└── Consumer framework com retry/DLQ

Mês 11: Pagamentos + Comunicação
├── PIX integration (QR Code + copia/cola)
├── Card payment (Stone/PagSeguro)
├── WhatsApp Business API
└── Email (SendGrid)

Mês 12: Fiscal + Webhooks
├── Motor fiscal paramétrico
├── NFS-e emission
├── Webhook management
└── API key management

Mês 13: API Premium
├── OpenAPI 3.1 spec completa
├── API Playground (Swagger UI)
├── Rate limiting per endpoint
└── Documentação auto-gerada
```

---

## 4. CRITÉRIOS DE ENTREGA POR ETAPA

### 4.1 Event Bus (Mês 10)
- [ ] Tecnologia escolhida e documentada
- [ ] Outbox pattern implementado em encounters, billing, inpatient
- [ ] 30+ eventos de domínio catalogados
- [ ] Consumer com retry exponencial e DLQ
- [ ] Monitoramento (publish rate, lag, failures)

### 4.2 Pagamentos (Mês 11)
- [ ] PIX funcionando em staging
- [ ] Card payment integrado
- [ ] Reconciliation automática validada
- [ ] Financial dashboard com dados reais

### 4.3 Comunicação (Mês 11-12)
- [ ] WhatsApp Business API connected
- [ ] Templates aprovados pelo WhatsApp
- [ ] Email transactional funcionando
- [ ] SMS fallback configurado

### 4.4 Fiscal (Mês 12-13)
- [ ] Motor fiscal paramétrico validado
- [ ] NFS-e emission em produção
- [ ] CFOP mapping correto
- [ ] Relatórios fiscais auditáveis

### 4.5 API Premium (Mês 13)
- [ ] OpenAPI spec completa (100% paths documentados)
- [ ] Swagger UI funcional
- [ ] Rate limiting testado
- [ ] API keys funcionando para parceiros

---

## 5. CRITÉRIOS DE SUCESSO

| Métrica | Baseline | Target |
|---------|----------|--------|
| Eventos processados/dia | 0 | 50K+ |
| PIX transacoes/dia | 0 | 200+ |
| WhatsApp mensagens/dia | 0 | 1K+ |
| NFS-e emitidas/dia | 0 | 100+ |
| Uptime Event Bus | N/A | 99.9% |
| Tempo médio webhook retry | N/A | < 5min |

---

## 6. RISCOS E MITIGAÇÕES

| Risco | Prob | Impacto | Mitigação |
|-------|------|---------|------------|
| Demora em aprovação WhatsApp Business | Alta | Alto | Iniciar processo de verificação antecipadamente |
| Integração PIX com banco specifics | Média | Alto | Usar gateway abstrato (Stripe/Pagar.me) |
| Motor fiscal complexo | Alta | Médio | Começar paramétrico simples, expandir |
| Mudanças regulatórias fiscais | Média | Alto | Monitorar mudanças, архитектура flexível |

---

## 7. ORQUESTRADOR E EXECUTORES

**Orquestrador:** Tech Lead Backend Sênior
- Coordena dependências entre etapas
- Garante alinhamento de eventos entre módulos
- Valida contract entre producer/consumer

**Executores:**
- Executor A: Event Bus + Webhooks (Backend 2)
- Executor B: Pagamentos (Backend 2)
- Executor C: Comunicação + Fiscal (Backend 2 + Frontend 2)

---

## 8. PRÓXIMOS PASSOS

1. Validar escolha de tecnologia Event Bus com benchmark
2. Iniciar processo de verificação WhatsApp Business
3. Mapear módulos que precisam de outbox pattern
4. Criar event catalog inicial com domínios
