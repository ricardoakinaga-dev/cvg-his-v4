# Storybook do Design System - CVG-HIS V2

**Status:** Em producao
**Data:** 2026-04-11
**Versao:** 0.2.0

---

## Sobre Este Storybook

Este Storybook documenta os componentes Vue 3 do Design System do CVG-HIS V2, o sistema de design oficial para a interface do produto.

## Componentes Disponíveis

### Layout
- **DsCard** - Container de conteudo com variantes default, elevated, outlined e compact
- **DsTabs** - Navegacao por abas com suporte a contagem

### Form Controls
- **DsButton** - Botao com variantes primary, secondary, ghost, danger e success
- **DsInput** - Campo de entrada com suporte a tipos variados
- **DsCheckbox** - Selecao binaria
- **DsRadio** - Selecao exclusiva
- **DsDatePicker** - Selecao de data
- **DsTimePicker** - Selecao de horario
- **DsFileUpload** - Upload com drag-drop

### Display
- **DsBadge** - Indicador de status
- **DsAlert** - Feedback contextual
- **DsSpinner** - Indicador de carregamento
- **DsCharts** - Graficos (Bar, Line, Doughnut, Pie)

### Overlay
- **DsModal** - Dialogo sobreposto

## Arquitetura de Tokens

O design system utiliza CSS Custom Properties como fonte unica de verdade para valores visuais:

```
tokens/variables.css  -> Variaveis CSS globais
tokens/index.ts       -> Constantes TypeScript
themes/index.ts       -> Light e Dark theme
```

### Cores (Light Theme)
- `--color-surface: #ffffff`
- `--color-bg: #f0f4f8`
- `--color-border: #e2e8f0`
- `--color-text: #0f172a`

### Cores (Dark Theme)
- `--color-surface: #1e293b`
- `--color-bg: #0f172a`
- `--color-border: #334155`
- `--color-text: #f1f5f9`

## Uso

```bash
# Development
pnpm -C packages/design-system storybook

# Build para producao
pnpm -C packages/design-system build-storybook
```

## Dark Mode

O suporte a dark mode e automatico via `prefers-color-scheme: dark` do sistema operacional, ou pode ser forcado com o atributo `data-theme="dark"` ou `data-theme="light"` no elemento raiz.

## Accessiblity

Todos os componentes seguem WCAG 2.1 AA com:
- Contraste minimo 4.5:1
- Labels ARIA
- Focus visible
- Touch targets minimos de 44px

---

Para duvidas sobre uso de componentes, consulte a documentacao em `packages/design-system/README.md`.
