# Especificação Técnica — Evolução da Camada de Inputs (Design System V2)

## 1. Contexto e Motivação
A migração estrutural para o Design System Vue esbarrou em limitadores crônicos do `DsInput` atual. A padronização progressiva das `Form Pages` isolou problemas recorrentes onde a API do componente atual acarreta débitos técnicos de tipo, UX empobrecida para moedas e impossibilidade de delegação limpa para booleanos e *Dates*, exigindo intervenções arquitetônicas.

---

## 2. Parte A — Evolução do `DsInput` Core

### 2.1. Problema Atual (Eventos e Tipagem)
Atualmente, o `DsInput` utiliza `defineProps` com `modelValue: string` e emite estritamente `update:modelValue` passando o valor lido pelo template HTML via `$event.target.value`. Não há suporte para Modifiers do Vue nativo.
**Impacto Real**: Em `PatientFormPage.vue`, o campo numérico de `baseWeightKg` forçou a preservação do `<input type="number">` nativo para garantir o parse do `v-model.number`. Em `BillingDetailPage.vue`, a submissão de faturamento demanda `Number(addItemForm.value.quantity)` local.

### 2.2. Solução Proposta
Adoção do *Pattern* `defineModel()` introduzido no Vue 3.4.
```vue
<script setup lang="ts">
// Novo Padrão
const [modelValue, modifiers] = defineModel<string | number>({
  set(value) {
    if (modifiers.number) return Number(value);
    if (modifiers.trim && typeof value === 'string') return value.trim();
    return value;
  }
})
</script>
```
**Classificação**: Mudança **Segura (Non-Breaking)**. O componente que não declara `.number` continua recebendo Strings nativas transparentemente.
**Rollout**: Atualização direta do `DsInput.vue` na raiz, seguida pela higienização dos casts de `Number()` nas store/pages.

---

## 3. Parte B — Proposta de `DsMoneyInput`

### 3.1. Problema Atual
Campos de Faturamento e transação.
**Impacto Real**: No `BillingDetailPage.vue`, as adições de preços usam instâncias puras numéricas de `<DsInput>`. Não há vírgulas renderizadas preventivamente (onBlur/onFocus) e o placeholder de UX é apenas "0.00".

### 3.2. Solução Proposta
Uma premissa de especialização: `DsMoneyInput.vue` deve ser um componente **SEPARADO** e não acoplado ao `DsInput`.
A complexidade de aplicar `Intl.NumberFormat` ou bibliotecas subjacentes genéricas poluiria o input base.
- **Formato Visual Local (UX)**: A máscara deve ser aplicada visualmente enquanto focado/unfocado, porém emitir invariavelmente valores `Float` numéricos formatados sob o capô (Model Driven).
- **Adoção Direta**: `BillingDetailPage.vue` (Modal de Adição de Item) requer a migração instantânea para evitar erros de leitura de centavos por faturistas.

---

## 4. Parte C — Controles Booleanos

### 4.1. Problema Atual
Ausência completa de wrappers do DS para `booleanos`.
**Impacto Real**: Em `OwnerFormPage.vue`, o input `Responsável financeiro` exige markup nativo (`<input type="checkbox">`), e a indicação de telefone `Principal` demanda radios puramente manuais, divergindo o Design System do formulário global.

### 4.2. Solução Proposta
Criação imediata de:
1. **`DsCheckbox.vue`**: API simples com `defineModel<boolean>()`, suportando `label` como prop direta e adequando CSS var states para hover/checked.
2. **`DsRadio.vue`**: Recebe array ou atua livre, ideal para fluxos enxutos.
A longo prazo, planejar um **`DsSwitch.vue`** para painéis de configs, não prioritários para clinical forms.

---

## 5. Parte D — Selects Dinâmicos

### 5.1. Problema Atual
O `<DsInput type="select">` demanda o re-desenho literal da tag `<option>` localmente no template do invocador, falhando em se popular dinamicamente e carecendo de abstração completa.
**Impacto Real**: Utilizado intensamente em `UserFormPage` (Setores e Roles).

### 5.2. Solução Proposta
Preservar o `<DsInput>` generalista operando o slot por retrocompatibilidade, mas estender a prop nativa suportando entrada via Array:
```typescript
interface OptionItem { label: string; value: string | number }
```
Deste modo, `<DsInput type="select" :options="RoleOptions">` cuidaria do loop `v-for` interno.

---

## 6. Estratégia de Rollout e Recomendações (Lote 4)

1. **Sprint Atual (Core Libs)**: Altera a API mecânica base do `DsInput.vue` usando `defineModel({modifiers})`, sem quebrar páginas atuais.
2. **Criação Paralela**: Erguer o `DsCheckbox.vue` devido à severidade baixa e rápido isolamento dos inputs desconfigurados nas páginas `OwnerFormPage` e fluxos de Anamnese.
3. **Criação do DsMoneyInput**: Isolar a implementação visual sob `BillingForm` para estressar os handlers JS e não inflar o design system precipitadamente. Migrar o faturamento no Lote 4.
4. **Dates Limitadores**: O tratamento do `datetime-local` se manterá encapsulado pelo dev local até a importação madura de composables de parse como Date-fns no utilitário cross do repo.
