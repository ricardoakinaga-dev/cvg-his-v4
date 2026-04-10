# PIX PAYMENT INTEGRATION — Requisitos e primeira abstracao
**Data:** 09/04/2026
**Status:** AVANÇADO — confirmacao PIX implementada, fluxo outbox operacao

---

## CONTEXTO

Módulo de billing existente (`packages/modules/billing`) gerencia:
- Registros de cobrança
- Itens de cobrança (serviços, produtos, procedimentos)
- Status: draft → estimated → open → settled

**Falta:** Integração com pagamentos PIX completa e decisão final de provedor

---

## PROVIDERS SUPORTADOS

### 1. Pagar.me (Ainda candidato)

| Aspecto | Detalhes |
|---------|----------|
| Documentação | https://docs.pagar.me/ |
| Suporte PIX | ✅ Completo |
| QR Code | ✅ Gerado via API |
| Webhook | ✅ Confirmação automática |
| Taxa | ~2.99% + taxa PIX |

### 2. Stripe

| Aspecto | Detalhes |
|---------|----------|
| Documentação | https://stripe.com/docs/payments/pix |
| Suporte PIX | ✅ Completo |
| QR Code | ✅ Gerado via API |
| Webhook | ✅ Confirmação automática |
| Taxa | ~3.49% |

### 3. GerenciaNet

| Aspecto | Detalhes |
|---------|----------|
| Documentação | https://dev.gerencianet.com.br/ |
| Suporte PIX | ✅ Completo |
| QR Code | ✅ Gerado via API |
| Webhook | ✅ Confirmação automática |
| Taxa | ~0.79% + R$0.89 fixo |

---

## ARQUITETURA PROPOSTA

### Componentes a Criar

```
packages/modules/pix/
├── src/
│   ├── index.ts                    # Exports
│   ├── types.ts                    # PixTransaction, PixQRCode, etc.
│   ├── pix.service.ts              # PixService
│   ├── adapters/
│   │   ├── pagarme.adapter.ts      # Pagar.me implementation
│   │   ├── stripe.adapter.ts        # Stripe implementation
│   │   └── interface.ts           # PixProvider interface
│   └── repositories/
│       └── database-pix.repository.ts
├── pix.test.ts
└── package.json
```

### Tipos Necessários

```typescript
interface PixTransaction {
  id: PixTransactionId;
  billingRecordId: BillingRecordId;
  amount: number;
  currency: 'BRL';
  pixKey: string;
  qrCodeBase64: string;
  qrCodePayload: string;  // EMV string
  expiresAt: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  completedAt?: string;
  providerTransactionId?: string;
  createdAt: string;
}

interface PixPaymentRequest {
  billingRecordId: BillingRecordId;
  amount: number;
  description: string;
  expirationMinutes?: number;
}
```

### Environment Variables

```bash
# Pagar.me
PIX_PROVIDER=pagarme
PAGARME_API_KEY=your_key
PAGARME_PIX_KEY=your_pix_key

# ou Stripe
PIX_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PIX_KEY=your_pix_key
```

---

## FLUXO DE PAGAMENTO

```
1. Cliente inicia pagamento PIX
   ↓
2. Sistema gera QR Code via provider
   ↓
3. Cliente paga via app bancário
   ↓
4. Provider envia webhook de confirmação
   ↓
5. Sistema atualiza billing record → 'settled'
   ↓
6. Cliente recebe confirmação
```

---

## PRÓXIMOS PASSOS

1. [ ] Selecionar provedor PIX final
2. [x] Criar módulo `packages/modules/pix` com abstracao PixProvider
3. [x] Implementar `PixProvider` via `MockPixAdapter` e `PagarMePixAdapter` (stub)
4. [x] Expor a primeira superficie executavel de intent em `POST /payments/pix/intents`
5. [x] Publicar evento `payment.pix.intent.created` no outbox do runtime
6. [x] Adicionar hook de confirmacao PIX em `POST /payments/pix/intents/:intentId/confirm`
7. [x] Publicar evento `payment.pix.confirmed` no outbox após confirmacao
8. [x] Integrar confirmação PIX com `BillingService.updateStatus(encounterId, {status:'settled'})` — via eventBus.subscribe() handler em runtime.ts
9. [ ] Adicionar webhook handler de confirmação real do provedor (Pagar.me/Stripe)
10. [ ] Criar UI de pagamento no SPA

---

## DECISÃO NECESSÁRIA

**Qual provedor PIX usar?**
- Pagar.me (recomendado - taxa menor, focado BR)
- Stripe (mais caro mas global)
- GerenciaNet (mais barato mas mais complexo)

---

*Documento atualizado em 10/04/2026 com a primeira superficie executável e o contrato de abstracao local*
