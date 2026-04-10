# PIX PAYMENT INTEGRATION — Requisitos
**Data:** 09/04/2026
**Status:** PENDENTE — Aguardando provedor PIX

---

## CONTEXTO

Módulo de billing existente (`packages/modules/billing`) gerencia:
- Registros de cobrança
- Itens de cobrança (serviços, produtos, procedimentos)
- Status: draft → estimated → open → settled

**Falta:** Integração com pagamentos PIX

---

## PROVIDERS SUPORTADOS

### 1. Pagar.me (Recomendado)

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

1. [ ] Selecionar provedor PIX (Pagar.me recomendado)
2. [ ] Criar módulo `packages/modules/pix`
3. [ ] Implementar PixProvider interface
4. [ ] Implementar adapter do provider
5. [ ] Integrar com BillingService
6. [ ] Adicionar webhook handler na API
7. [ ] Criar UI de pagamento no SPA

---

## DECISÃO NECESSÁRIA

**Qual provedor PIX usar?**
- Pagar.me (recomendado - taxa menor, focado BR)
- Stripe (mais caro mas global)
- GerenciaNet (mais barato mas mais complexo)

---

*Documento criado em 09/04/2026*
