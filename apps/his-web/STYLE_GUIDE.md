# CVG-HIS Style Guide

Este documento descreve o sistema de design do CVG-HIS, incluindo tokens, componentes e padrões de uso.

## Índice

1. [Tokens de Design](#tokens-de-design)
2. [Paleta de Cores (Premium Hospital Blue)](#paleta-de-cores)
3. [Componentes UI Base](#componentes-ui-base)
4. [Componentes Odoo-Style](#componentes-odoo-style)
5. [Float-First UI (Mobile)](#float-first-ui-mobile)
6. [Layout Responsivo](#layout-responsivo)
7. [Animações](#animações)
8. [Integração Odoo](#integração-odoo)

---

## Tokens de Design

Todos os valores visuais são centralizados em CSS variables definidas em [`globals.css`](src/app/globals.css).

### Paleta de Cores

#### Cores Primárias (Premium Hospital Blue)

```css
--cvg-primary: #1D4ED8;        /* Azul principal - ações primárias */
--cvg-primary-dark: #1E40AF;   /* Azul escuro - hover */
--cvg-primary-light: #3B82F6;  /* Azul claro - acentos */
--cvg-primary-bg: #EFF6FF;     /* Fundo primário - backgrounds sutis */
```

#### Cores de Acento

```css
--cvg-accent: #38BDF8;         /* Sky - acentos */
--cvg-accent-dark: #0EA5E9;    /* Sky escuro */
--cvg-accent-light: #7DD3FC;   /* Sky claro */
--cvg-accent-secondary: #22D3EE; /* Cyan - uso moderado */
```

#### Cores de Background

```css
--cvg-bg: #F6F8FC;             /* Fundo da página */
--cvg-bg-elevated: #FFFFFF;    /* Fundo elevado (modais) */
--cvg-bg-muted: #F1F5F9;       /* Fundo secundário */
```

#### Cores de Texto

```css
--cvg-text: #0B1220;           /* Texto principal */
--cvg-text-secondary: #334155; /* Texto secundário */
--cvg-text-muted: #5B6B86;     /* Texto desabilitado/muted */
--cvg-text-inverse: #FFFFFF;   /* Texto em fundos escuros */
```

#### Cores de Status

```css
--cvg-success: #16A34A;        /* Sucesso */
--cvg-warning: #F59E0B;        /* Aviso */
--cvg-danger: #DC2626;         /* Erro/Perigo */
--cvg-info: #0284C7;           /* Informação */
```

#### Cores de Status Odoo

```css
--cvg-status-draft: #6B7280;       /* Rascunho */
--cvg-status-active: #16A34A;      /* Ativo */
--cvg-status-archived: #9CA3AF;    /* Arquivado */
--cvg-status-pending: #F59E0B;     /* Pendente */
--cvg-status-done: #1D4ED8;        /* Concluído */
```

### Espaçamento

Baseado em 4px:

```css
--cvg-space-1: 4px;
--cvg-space-2: 8px;
--cvg-space-3: 12px;
--cvg-space-4: 16px;
--cvg-space-5: 20px;
--cvg-space-6: 24px;
--cvg-space-8: 32px;
--cvg-space-10: 40px;
--cvg-space-12: 48px;
--cvg-space-16: 64px;
```

### Border Radius

```css
--cvg-radius-sm: 6px;
--cvg-radius-md: 8px;
--cvg-radius-lg: 12px;
--cvg-radius-xl: 16px;
--cvg-radius-full: 9999px;
```

### Sombras

```css
--cvg-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--cvg-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--cvg-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--cvg-fab-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
--cvg-float-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
```

### Tipografia

```css
--cvg-font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--cvg-font-mono: "IBM Plex Mono", ui-monospace, monospace;

--cvg-text-xs: 0.75rem;    /* 12px */
--cvg-text-sm: 0.875rem;   /* 14px */
--cvg-text-base: 1rem;     /* 16px */
--cvg-text-lg: 1.125rem;   /* 18px */
--cvg-text-xl: 1.25rem;    /* 20px */
--cvg-text-2xl: 1.5rem;    /* 24px */
```

### Touch Targets (Acessibilidade)

```css
--cvg-touch-target: 44px;      /* Mínimo para touch */
--cvg-touch-target-sm: 36px;   /* Mínimo compacto */
```

---

## Componentes UI Base

### Button

```tsx
import { Button } from '@/components/ui/Button';

// Variantes
<Button variant="primary">Primário</Button>
<Button variant="secondary">Secundário</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Perigo</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>
<Button size="lg">Grande</Button>

// Estados
<Button loading>Carregando</Button>
<Button disabled>Desabilitado</Button>
```

### Input

```tsx
import { Input } from '@/components/ui/Input';

<Input 
  label="Nome"
  placeholder="Digite o nome"
  error="Campo obrigatório"
  required
/>
```

### Badge

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="success">Ativo</Badge>
<Badge variant="warning">Pendente</Badge>
<Badge variant="danger">Inativo</Badge>
```

---

## Componentes Odoo-Style

Componentes inspirados no Odoo para consistência com futuras integrações.

### OdooBreadcrumbs

```tsx
import { OdooBreadcrumbs, generateBreadcrumbsFromPath } from '@/components/odoo';

// Gerar automaticamente a partir da rota
const breadcrumbs = generateBreadcrumbsFromPath(pathname);

<OdooBreadcrumbs items={breadcrumbs} />
```

### OdooListView

```tsx
import { OdooListView, type OdooListColumn } from '@/components/odoo';

const columns: OdooListColumn<Cliente>[] = [
  { key: 'name', header: 'Nome', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status', render: (val) => <Badge>{val}</Badge> },
];

<OdooListView
  title="Clientes"
  columns={columns}
  data={clientes}
  keyField="id"
  searchPlaceholder="Buscar clientes..."
  onRowClick={(row) => router.push(`/geral/clientes/${row.id}`)}
/>
```

### OdooFormView

```tsx
import { OdooFormView, OdooFormSection, OdooFormField } from '@/components/odoo';

const tabs = [
  {
    id: 'dados',
    label: 'Dados',
    content: (
      <OdooFormSection title="Informações Básicas">
        <OdooFormField label="Nome" required>
          <Input />
        </OdooFormField>
      </OdooFormSection>
    ),
  },
  {
    id: 'endereco',
    label: 'Endereço',
    content: <EnderecoForm />,
  },
];

<OdooFormView
  title={cliente.name}
  status="active"
  tabs={tabs}
  onSave={handleSave}
  onDiscard={handleDiscard}
  hasChanges={isDirty}
/>
```

### OdooStatusBar

```tsx
import { OdooStatusBar, type OdooStatus } from '@/components/odoo';

<OdooStatusBar status="active" />
<OdooStatusBar status="draft" label="Rascunho" />
<OdooStatusBar status="archived" />
```

---

## Float-First UI (Mobile)

Componentes para navegação e ações em dispositivos móveis.

### BottomNav

Navegação inferior para mobile (aparece em viewport <= 900px).

```tsx
import { BottomNav } from '@/components/layout/BottomNav';

// Itens: Dashboard, Geral, Clínica, Financeiro, Mais
// O item "Mais" abre um Drawer com todos os módulos
<BottomNav />
```

### FloatingActionButton (FAB)

Botão de ação contextual para criar novos registros.

```tsx
import { FloatingActionButton } from '@/components/layout/FloatingActionButton';

// Aparece automaticamente baseado na rota atual
// /geral/clientes -> "Novo Cliente"
// /financeiro/servicos -> "Novo Serviço"
<FloatingActionButton />
```

### Drawer

Painel deslizante para navegação e formulários.

```tsx
import { Drawer, DrawerSection, DrawerItem } from '@/components/layout/Drawer';

<Drawer
  isOpen={isOpen}
  onClose={handleClose}
  title="Menu"
  position="left"
>
  <DrawerSection title="Módulos">
    <DrawerItem href="/dashboard" icon={<HomeIcon />}>Dashboard</DrawerItem>
    <DrawerItem href="/geral/clientes" icon={<UsersIcon />}>Clientes</DrawerItem>
  </DrawerSection>
</Drawer>
```

---

## Layout Responsivo

### Breakpoints

```css
--cvg-breakpoint-sm: 640px;   /* Mobile */
--cvg-breakpoint-md: 768px;   /* Tablet */
--cvg-breakpoint-lg: 1024px;  /* Desktop */
--cvg-breakpoint-xl: 1280px;  /* Large desktop */
```

### Comportamento por Dispositivo

| Dispositivo | Sidebar | Topbar | BottomNav | FAB |
|-------------|---------|--------|-----------|-----|
| Desktop (> 900px) | Fixa, expansível | Completa | Oculto | Oculto |
| Tablet (601-900px) | Colapsada (ícones) | Compacta | Oculto | Visível |
| Mobile (<= 600px) | Oculto | Minimalista | Visível | Visível |

### Classes Utilitárias

```css
.cvg-mobile-only { }    /* Visível apenas em mobile */
.cvg-desktop-only { }   /* Visível apenas em desktop */
```

---

## Animações

### AnimatedPage

```tsx
import { AnimatedPage } from '@/components/motion';

<AnimatedPage variant="slide">
  {children}
</AnimatedPage>
```

### FadeIn

```tsx
import { FadeIn } from '@/components/motion';

<FadeIn delay={0.1}>
  <Card>...</Card>
</FadeIn>
```

### StaggerContainer

```tsx
import { StaggerContainer, StaggerItem } from '@/components/motion';

<StaggerContainer staggerDelay={0.05}>
  {items.map(item => (
    <StaggerItem key={item.id}>
      <Card>{item.name}</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

### Respeitar prefers-reduced-motion

Todas as animações respeitam a preferência do usuário:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Integração Odoo

### Mapeamento de Campos

O arquivo [`src/lib/odoo/mapping.ts`](src/lib/odoo/mapping.ts) contém o mapeamento entre campos do CVG-HIS e modelos do Odoo.

#### Partner (res.partner)

```typescript
import { PARTNER_FIELD_MAPPING, mapPartnerToOdoo } from '@/lib/odoo/mapping';

// Mapear cliente para formato Odoo
const odooPartner = mapPartnerToOdoo(cliente);
```

#### Product (product.template)

```typescript
import { PRODUCT_FIELD_MAPPING, mapProductToOdoo } from '@/lib/odoo/mapping';

// Mapear serviço para formato Odoo
const odooProduct = mapProductToOdoo(servico);
```

### Campos de Integração

Todos os formulários devem incluir uma seção "Integração Odoo" (collapsed por padrão):

```tsx
<OdooFormSection title="Integração Odoo" collapsible defaultCollapsed>
  <OdooFormField label="ID Externo">
    <Input value={cliente.externalId} readonly />
  </OdooFormField>
  <OdooFormField label="Status de Sincronização">
    <OdooStatusBar status={cliente.syncStatus} />
  </OdooFormField>
  <OdooFormField label="Última Sincronização">
    <Input value={cliente.lastSyncAt} readonly />
  </OdooFormField>
</OdooFormSection>
```

---

## Personalização

### Alterando a Paleta de Cores

Para alterar as cores, modifique as variáveis em [`globals.css`](src/app/globals.css):

```css
:root {
  --cvg-primary: #1D4ED8;  /* Altere para sua cor primária */
  --cvg-primary-dark: #1E40AF;
  --cvg-primary-light: #3B82F6;
  --cvg-primary-bg: #EFF6FF;
}
```

### Adicionando Novos Componentes

1. Crie o componente em `src/components/ui/` ou `src/components/odoo/`
2. Use CSS Modules para estilos (`ComponentName.module.css`)
3. Use as variáveis CSS para cores, espaçamento, etc.
4. Exporte o componente no `index.ts` do diretório

---

## Checklist de Implementação

- [x] Paleta azulada aplicada via tokens
- [x] BottomNav para mobile
- [x] FAB contextual
- [x] Drawer acessível
- [x] Sidebar responsiva
- [x] OdooBreadcrumbs
- [x] OdooListView
- [x] OdooFormView com NotebookTabs
- [x] OdooStatusBar
- [x] Mapeamento Odoo
- [x] Animações com prefers-reduced-motion
- [ ] Aplicar Odoo-style em todos os módulos
