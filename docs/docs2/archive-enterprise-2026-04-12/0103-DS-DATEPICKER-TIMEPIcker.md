# DATEPICKER E TIME PICKER IMPLEMENTATION — CVG-HIS-V2

## Data: 09/04/2026
## Executor: SYSTEM
## Status: ✅ CONCLUÍDO

---

## 1. RESUMO DA ENTREGA

Dois novos componentes implementados no Design System: **DsDatePicker** e **DsTimePicker**.

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `packages/design-system/src/vue/DsDatePicker.vue` | Componente DatePicker completo |
| `packages/design-system/src/vue/DsTimePicker.vue` | Componente TimePicker completo |
| `packages/design-system/src/vue/types.ts` | Tipos atualizados com DsDatePickerProps e DsTimePickerProps |
| `packages/design-system/src/vue/index.ts` | Exports atualizados |

---

## 2. DsDatePicker — Funcionalidades

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `modelValue` | `string \| Date \| null` | - | Valor selecionado |
| `label` | `string` | - | Label do campo |
| `placeholder` | `string` | `'Selecione uma data'` | Placeholder |
| `error` | `string` | - | Mensagem de erro |
| `hint` | `string` | - | Dica |
| `disabled` | `boolean` | `false` | Desabilitado |
| `required` | `boolean` | `false` | Obrigatório |
| `readonly` | `boolean` | `true` | Somente leitura |
| `min` | `string \| Date` | - | Data mínima |
| `max` | `string \| Date` | - | Data máxima |
| `locale` | `string` | `'pt-BR'` | Localização |
| `format` | `string` | `'DD/MM/YYYY'` | Formato de exibição |
| `showTime` | `boolean` | `false` | Mostrar seletor de hora |
| `id` | `string` | auto | ID único |

### Funcionalidades

| Feature | Status | Descrição |
|---------|--------|-----------|
| Calendário dropdown | ✅ | Navegação por mês/ano |
| Seleção de data | ✅ | Click ou Enter para selecionar |
| Validação min/max | ✅ | Dates fora do range desabilitadas |
| Data atual (Hoje) | ✅ | Botão para ir para hoje |
| Limpar | ✅ | Botão para limpar seleção |
| Suporte a Time | ✅ | Integração com TimePicker |
| Locale pt-BR | ✅ | Nomes dos dias em português |
| Acessibilidade | ✅ | ARIA labels, keyboard navigation |
| Teleport to body | ✅ | Renderiza no body para evitar overflow |
| Error state | ✅ | Estilos de erro |
| Disabled state | ✅ | Estado desabilitado |

### Eventos

| Evento | Descrição |
|--------|-----------|
| `blur` | Quando o calendário fecha |
| `focus` | Quando o calendário abre |

---

## 3. DsTimePicker — Funcionalidades

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `modelValue` | `string` | - | Valor no formato HH:mm |
| `label` | `string` | - | Label do campo |
| `placeholder` | `string` | `'Selecione um horario'` | Placeholder |
| `error` | `string` | - | Mensagem de erro |
| `hint` | `string` | - | Dica |
| `disabled` | `boolean` | `false` | Desabilitado |
| `required` | `boolean` | `false` | Obrigatório |
| `readonly` | `boolean` | `true` | Somente leitura |
| `id` | `string` | auto | ID único |
| `format24h` | `boolean` | `true` | Formato 24h |

### Funcionalidades

| Feature | Status | Descrição |
|---------|--------|-----------|
| Dropdown de seleção | ✅ | UI moderna com scroll |
| Seletor de horas | ✅ | Grid 4x6 para 24 horas |
| Seletor de minutos | ✅ | Intervalos de 5 minutos |
| Botão Agora | ✅ | Vai para hora atual |
| Limpar | ✅ | Limpa seleção |
| Formato 24h | ✅ | Padrão brasileiro |
| Acessibilidade | ✅ | ARIA labels, keyboard |
| Teleport to body | ✅ | Renderiza no body |
| Error state | ✅ | Estilos de erro |

### Eventos

| Evento | Descrição |
|--------|-----------|
| `blur` | Quando o dropdown fecha |
| `focus` | Quando o dropdown abre |

---

## 4. USO

### DatePicker Básico

```vue
<template>
  <DsDatePicker
    v-model="data"
    label="Data de Nascimento"
    placeholder="Selecione uma data"
  />
</template>

<script setup>
import { ref } from 'vue';
import { DsDatePicker } from '@cvg-his-v2/design-system/vue';

const data = ref('');
</script>
```

### DatePicker com Time

```vue
<template>
  <DsDatePicker
    v-model="dataHora"
    label="Data e Hora"
    show-time
  />
</template>

<script setup>
import { ref } from 'vue';
import { DsDatePicker } from '@cvg-his-v2/design-system/vue';

const dataHora = ref(null);
</script>
```

### DatePicker com Validação

```vue
<template>
  <DsDatePicker
    v-model="data"
    label="Agendamento"
    :min="new Date()"
    :max="maxDate"
    required
    error="Data inválida"
  />
</template>
```

### TimePicker

```vue
<template>
  <DsTimePicker
    v-model="horario"
    label="Horário da Consulta"
  />
</template>

<script setup>
import { ref } from 'vue';
import { DsTimePicker } from '@cvg-his-v2/design-system/vue';

const horario = ref('14:30');
</script>
```

---

## 5. VALIDAÇÕES

```bash
# Typecheck
pnpm --filter @cvg-his-v2/design-system run typecheck ✅ PASS

# Testes
pnpm --filter @cvg-his-v2/design-system run test ✅ PASS (17/17)
```

---

## 6. CRITÉRIOS DE ACEITE ATENDIDOS

- [x] DsDatePicker implementado com calendário dropdown
- [x] DsTimePicker implementado com seleção de hora/minuto
- [x] Suporte a locale pt-BR
- [x] Navegação por teclado funcional
- [x] Estados de erro e disabled
- [x] TypeScript types exportados
- [x] Typecheck passa
- [x] Testes passam

---

## CHANGELOG

| Data | Executor | Mudança |
|------|----------|---------|
| 09/04/2026 | SYSTEM | DsDatePicker e DsTimePicker implementados |

---

*Documento criado em 09/04/2026 via implementação automatizada*
