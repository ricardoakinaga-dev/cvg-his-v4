# Mobile Enterprise Report — CVG-HIS-V2

> Data: 2026-03-31 01:55 UTC
> Escopo: Otimização mobile para smartphone e tablet

## O que foi implementado

### 1. Bottom Navigation Bar (Smartphone)
Barra de navegação fixa na parte inferior com 5 atalhos essenciais:
- 🏥 Inicio (Dashboard)
- 👥 Tutores
- 🩺 Atendimentos
- 📋 Prontuario
- 📅 Agenda

**Características:**
- Glassmorphism (backdrop-filter blur)
- Indicador ativo com gradiente no topo
- Touch feedback (scale on press)
- Safe area support (notch devices via `env(safe-area-inset-bottom)`)
- Z-index 150 (acima do conteúdo, abaixo do drawer)

### 2. Drawer Sidebar Premium
Sidebar transformada em drawer deslizante no mobile:
- Largura: `min(85vw, 320px)`
- Animação suave (translateX com ease)
- Overlay com blur de fundo
- **Swipe-to-close**: arraste para a esquerda para fechar
- Fechamento por Escape key
- Fechamento ao clicar em link
- `overscroll-behavior: contain` (não propaga scroll)
- Safe area insets para notch

### 3. Tables → Card View (Mobile)
No mobile (≤768px), tables são transformadas automaticamente em cards:
- Headers ficam ocultos
- Cada row vira um card com `data-label` como título do campo
- Script auto-adiciona `data-label` baseado nos headers da tabela
- Visual limpo com border e shadow

### 4. Touch-Optimized Forms
- Inputs com `min-height: 44px` (touch target padrão)
- `font-size: 16px` em inputs (previne zoom no iOS)
- Botões em coluna (stacked) no mobile
- Labels com uppercase e letter-spacing

### 5. Responsive Breakpoints
| Breakpoint | Dispositivo | Sidebar | Grid | Nav |
|-----------|-------------|---------|------|-----|
| ≤375px | Smartphone pequeno | Drawer | 1 col | Bottom |
| ≤768px | Smartphone | Drawer | 1 col | Bottom |
| 769-1024px | Tablet | Fixa 200px | 2 cols | Sidebar |
| ≥1025px | Desktop | Fixa 260px | Auto | Sidebar |

### 6. Safe Area Support
- `env(safe-area-inset-bottom)` no bottom nav e workspace padding
- `env(safe-area-inset-top)` no drawer padding
- Suporte a notch, dynamic island, home indicator

### 7. Performance
- `100dvh` (dynamic viewport height) — ajusta com barra de URL
- `backdrop-filter` com `-webkit-` prefix para Safari
- `passive: true` nos touch listeners
- `overscroll-behavior: contain` no drawer

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `apps/web/src/styles.ts` | +200 linhas de CSS mobile (bottom nav, drawer, card view, touch, safe area) |
| `apps/web/src/index.ts` | +bottom nav HTML, +swipe-to-close JS, +auto-responsify tables script |

## CSS Mobile — Highlights

```css
/* Bottom Nav — Glassmorphism */
.mobile-bottom-nav {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
}

/* Drawer — Slide com shadow */
.sidebar {
  transform: translateX(-105%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
body.sidebar-open .sidebar {
  box-shadow: 20px 0 60px rgba(0, 0, 0, 0.2);
}

/* Tables → Cards */
tbody tr {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--line);
  border-radius: 12px;
  margin-bottom: 10px;
}
tbody td::before {
  content: attr(data-label); /* Header como label do campo */
}
```

## Testes
| Suite global | **92 passando** | ✅ Sem regressão |
| Web TypeScript | **Compila limpo** | ✅ |

## Usabilidade Enterprise
- ✅ Touch targets ≥44px
- ✅ Font-size 16px em inputs (sem zoom iOS)
- ✅ Swipe gestures (drawer close)
- ✅ Keyboard support (Escape fecha drawer)
- ✅ Safe area insets (notch devices)
- ✅ Dynamic viewport height (100dvh)
- ✅ Passive touch listeners (performance)
- ✅ Stacked buttons (mobile)
- ✅ Card view tables (mobile)
- ✅ Bottom navigation (reachability)
