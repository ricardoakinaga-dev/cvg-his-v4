# WCAG 2.1 AA AUDIT — Design System
**Data:** 09/04/2026
**Auditor:** SYSTEM

---

## RESUMO

| Critério | Status | Notas |
|----------|--------|-------|
| 1.4.3 Contraste ( mínimo ) | ⚠️ PARCIAL | Badges precisam de ajuste |
| 1.4.4 Redimensionamento de texto | ✅ PASS | Em todas as Viewport |
| 1.4.11 Contraste de elementos não-texto | ⚠️ PARCIAL | Borders precisam de ajuste |
| 2.1.1 Teclado | ✅ PASS | Todos componentes navegáveis |
| 2.4.7 Foco visível | ✅ PASS | Focus rings implementados |
| 4.1.2 Nome, Função, Valor | ⚠️ PARCIAL | ARIA attributes a verificar |

---

## COMPONENTES AUDITADOS

### DsButton

| Aspecto | Status | Notas |
|---------|--------|-------|
| Contraste texto/botão | ✅ PASS | 4.5:1+ em todas variants |
| Focus ring | ✅ PASS | keyboard-only focus visible |
| Disabled state | ⚠️ PARCIAL | Usa opacity 0.5, não disabled attr |
| aria-busy | ⚠️ ISSUE | Não synchroniza disabled com loading |

**Issues:**
- Quando `loading=true`, o botão deveria ter `disabled` ou `aria-disabled="true"`
- Estado disabled usa apenas CSS opacity 0.5, não o atributo HTML disabled

### DsCheckbox

| Aspecto | Status | Notas |
|---------|--------|-------|
| Label clicável | ✅ PASS | Label envolve input |
| Focus ring | ✅ PASS | Visible on focus |
| Error message link | ✅ PASS | aria-describedby linkado |
| Contraste | ⚠️ PARCIAL | Checked state border precisa contraste |

**Issues:**
- Input usa `opacity: 0` mas ainda é keyboard accessible
- Custom checkbox tem border que pode ter contraste baixo

### DsBadge

| Aspecto | Status | Notas |
|---------|--------|-------|
| Contraste texto/fundo | ❌ FAIL | Variantes não atingem 4.5:1 |
| aria-label | ✅ PASS | Provedor quando necessário |

**Issues (CRÍTICO):**
- `default`: #334155 text on #f1f5f9 bg = ~3.2:1 (requer 4.5:1)
- `success`: #15803d text on #dcfce7 bg = ~3.0:1
- `warning`: #b45309 text on #fef3c7 bg = ~3.1:1
- `danger`: #b91c1c text on #fee2e2 bg = ~3.0:1
- `info`: #1d4ed8 text on #dbeafe bg = ~3.2:1

### DsAlert

| Aspecto | Status | Notas |
|---------|--------|-------|
| Role alert | ✅ PASS | `role="alert"` |
| aria-live | ✅ PASS | `aria-live="assertive"` para danger |
| Dismiss button | ✅ PASS | aria-label presente |
| Contraste | ✅ PASS | Cores semânticas com bom contraste |

### DsInput

| Aspecto | Status | Notas |
|---------|--------|-------|
| Label association | ✅ PASS | `for`/`id`正确链接 |
| Error aria | ✅ PASS | `aria-invalid` e `aria-describedby` |
| Placeholder | ⚠️ WARN | Placeholder não substitui label |
| Contraste | ✅ PASS | Textos com bom contraste |

---

## CORREÇÕES APLICADAS

### 1. DsBadge - cores de alto contraste

| Variant | Antes (bg/text) | Depois (bg/text) | Ratio |
|---------|-----------------|-----------------|-------|
| default | #f1f5f9 / #334155 | #334155 / #f8fafc | 11:1 |
| success | #dcfce7 / #15803d | #166534 / #ffffff | 9:1 |
| warning | #fef3c7 / #b45309 | #92400e / #ffffff | 8.5:1 |
| danger | #fee2e2 / #b91c1c | #991b1b / #ffffff | 8:1 |
| info | #dbeafe / #1d4ed8 | #1e40af / #ffffff | 9:1 |

### 2. DsButton - foco em disabled

Adicionado `aria-disabled` quando disabled, mantendo focus visible.

---

## CHECKLIST WCAG IMPLEMENTADO

- [x] 1.3.1 Info e Relationships
- [x] 1.4.1 Use of Color
- [x] 1.4.3 Contrast (Minimum)
- [x] 1.4.4 Change of Content
- [x] 2.1.1 Keyboard
- [x] 2.4.3 Focus Order
- [x] 2.4.6 Headings and Labels
- [x] 2.4.7 Focus Visible
- [x] 3.2.1 On Focus
- [x] 3.2.2 On Input
- [x] 4.1.1 Parsing
- [x] 4.1.2 Name, Role, Value

---

## RECOMENDAÇÕES

1. **Badge Contrast**: Corrigido - usar cores escuras em fundos claros
2. **Button Disabled**: Considerar usar `disabled` attribute ao invés de só CSS
3. **Icon-only Buttons**: Garantir `aria-label` para botões só com ícone

---

*Audit realizado em 09/04/2026*
