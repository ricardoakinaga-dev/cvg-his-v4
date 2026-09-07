# Contrato incremental de tokens — FEA-009 / FEA-013

Data: 2026-09-06. Estado: **REVIEW REQUIRED**. Esta entrega estabelece aliases e evidência de cálculo; não encerra os tickets nem aprova a direção visual.

## Intenção e limite

Operadores clínicos precisam ler nomes, doses, horários e estados rapidamente, mantendo a continuidade entre fila, detalhe e ação. A tese desta etapa é usar superfícies discretas, hierarquia tipográfica e movimento curto para apoiar esse trabalho. A ação principal deve ser reconhecível sem transformar toda a área operacional em uma superfície saturada.

Referências de decisão: [plano executivo, seção 3](../../2026-09-06-plano-executivo-frontend-premium.md) e [backlog FEA-009/013](../../2026-09-06-backlog-frontend-premium.md). Foram aplicadas as orientações de design systems, tipografia, cor e movimento da skill `design-director`.

Meio: CSS e exports TypeScript. Alteração aditiva em `packages/design-system/src/tokens/variables.css` e `packages/design-system/src/tokens/index.ts`. Nenhuma família tipográfica, paleta primitiva, cor de alerta, componente, regra global da SPA, logo ou asset foi substituído. Os tokens propostos mineral/petróleo/champagne do plano permanecem candidatos, sem aplicação global nesta etapa.

## Fonte e inventário

`apps/spa/src/main.ts` importa primeiro os tokens CSS e depois `apps/spa/src/styles/main.css`. O segundo arquivo redefine parte da paleta em `:root`, tema escuro, `.app-layout` e `.sidebar`. Por isso, os valores do design system isolado e da SPA podem diferir.

O export novo `semanticTokens` contém **55 referências `var(...)`** aos aliases CSS. Os exports literais existentes `colors`, `typography`, `transitions` e os objetos de `src/themes/index.ts` conservam seus valores de compatibilidade. Eles ainda refletem azul/Inter e outra paleta de superfícies; **não representam o tema CSS atual**. Não usar esses literais como evidência de cor renderizada. Uma futura migração precisa identificar consumidores e tratar essa divergência explicitamente.

| Papel novo | Origem existente / valor | Uso previsto |
| --- | --- | --- |
| `--material-canvas` | `--color-bg` | Fundo operacional |
| `--material-panel` | `--color-surface` | Área de trabalho e cartões |
| `--material-inset` | `--color-bg-subtle` | Área subordinada |
| `--material-raised` | `--color-bg-elevated` | Conteúdo elevado |
| `--material-hover` | `--color-surface-hover` | Realce de superfície |
| `--material-scrim` | `--color-bg-overlay` | Fundo de sobreposição |
| `--material-border[-strong]` | `--color-border[-strong]` | Separação de superfície |
| `--material-radius-control/panel/editorial` | `--radius-md/lg/2xl` | 8/12/20 px com raiz de 16 px |
| `--material-elevation-panel/floating/drawer` | `none` / `--shadow-md/lg` | Painel silencioso; elevação em conteúdo flutuante |
| `--space-control-gap/panel-padding/section-gap` | `--space-2/6/6` | 8/24/24 px com raiz de 16 px |
| `--content-primary/secondary/muted/link` | `--color-text`, `--color-text-secondary/muted/link` | Hierarquia textual |
| `--action-primary-bg/hover/pressed` | `--color-primary-700/800/900` | Estados de uma ação dominante |
| `--action-primary-content` | `--color-text-inverse` | Primeiro plano pareado à ação |

A escolha da etapa 700 para a ação nova evita depender da etapa 600 mais clara no CSS isolado. É um alias opt-in: os botões existentes continuam com seu contrato anterior até uma implementação de componente verificada. Sucesso, aviso, erro e informação continuam usando suas próprias famílias e precisam manter rótulo/ícone.

### Escopo de herança

Os aliases estão em `:root` e resolvem suas dependências nesse elemento. Uma redefinição posterior do token primitivo em um descendente **não recalcula um alias já herdado**. Isso afeta especialmente `.sidebar`, cujo fundo e texto são locais. Ao migrar um componente inserido nesse contexto, redeclarar os aliases necessários no próprio escopo temático, ou consumir o papel local apropriado. Não aplicar automaticamente `--material-panel`/`--content-primary` a todos os descendentes da sidebar.

## Tipografia

| Papel | Tokens | Valor atual |
| --- | --- | --- |
| Interface | `--type-family-interface` | Alias da pilha Aptos / Segoe UI / sistema já usada pelo CSS |
| Editorial | `--type-family-editorial` | Alias da serifada existente; uso reservado a editorial |
| Código | `--type-family-code` | Alias da pilha monoespaçada existente |
| Corpo | `--type-size-body`, `--type-weight-body`, `--type-leading-body` | 15 px / 400 / 1,5 |
| Rótulo | `--type-size-label`, `--type-weight-label` | 13 px / 600 |
| Metadado | `--type-size-metadata` | 13 px |
| Título de página | `--type-size-page-title`, `--type-weight-title`, `--type-leading-title` | 24 px / 600 / 1,25 |
| Editorial | `--type-size-editorial` | `clamp(2.5rem, 4vw, 3.5rem)`; 40–56 px com raiz de 16 px |
| Tracking | `--type-tracking-body/title` | 0 / −0,025 em |
| Números | `--type-numeric-variant` | `tabular-nums`; horários, dosagens, valores |
| Texto corrido | `--type-measure-prose` | 65 ch |

O corpo e os títulos seguem a faixa inicial do plano. O rótulo de 13 px mantém o tamanho já existente: a decisão de elevar rótulos de controles para 14–16 px depende da prancha e dos consumidores, sem alteração automática nesta etapa.

A busca de arquivos `.woff`, `.woff2`, `.ttf` e `.otf` em `apps`/`packages` não encontrou fontes locais. Não houve download ou redistribuição de fonte. A pilha resolve fontes disponíveis no sistema operacional; isso não constitui seleção de uma família licenciada e hospedada pelo produto. A validação de licença/hospedagem de uma eventual fonte distribuída, métricas reais, acentos, números e nomes longos continua pendente.

## Movimento

| Evento | Token de duração | Valor | Deslocamento máximo disponível |
| --- | --- | --- | --- |
| Hover/foco | `--motion-duration-hover` | 120 ms | Sem deslocamento; cor e borda |
| Pressão | `--motion-duration-press` | 80 ms | `--motion-distance-press`: 1 px |
| Detalhe | `--motion-duration-detail` | 180 ms | `--motion-distance-detail`: 4 px |
| Drawer | `--motion-duration-drawer` | 240 ms | `--motion-distance-drawer`: 16 px |
| Módulo/rota | `--motion-duration-route` | 160 ms | `--motion-distance-route`: 6 px |
| Saída | `--motion-duration-exit` | 120 ms | Encerrar antes da entrada equivalente |

Curvas: entrada `cubic-bezier(0.2, 0.8, 0.2, 1)`, estado `cubic-bezier(0.2, 0, 0, 1)`, saída `cubic-bezier(0.4, 0, 1, 1)`, pelos tokens `--motion-ease-enter/state/exit`. Transform e opacidade são opções de implementação; foco permanece imediato e perceptível. Deslocamentos são limites disponíveis, não obrigação de animar cada região.

Com `prefers-reduced-motion: reduce`, as seis durações tornam-se `0ms`, os quatro deslocamentos `0px` e as três curvas `linear`. Os tokens antigos `--duration-fast/normal/slow` permanecem 150/250/400 ms fora dessa preferência, para evitar alterar consumidores não examinados.

Não utilizar esses valores como espera de operação ou debounce. Não aguardar `transitionend` para exibir resultado, mover foco, habilitar ação ou efetivar navegação. Componentes futuros precisam permitir interrupção, cliques rápidos, foco devolvido ao gatilho e feedback de sucesso ligado à resposta real. As referências TypeScript são valores CSS; não são números para temporizadores JavaScript. Vídeo, autoplay e animações JavaScript não são resolvidos por esses tokens.

## Evidência de contraste

**OBSERVED:** Chromium 145.0.7632.6, página isolada com os arquivos CSS reais carregados em sua ordem de importação. `getComputedStyle(document.documentElement).getPropertyValue(...)` forneceu as cores abaixo, tanto com apenas o DS quanto com DS + CSS global da SPA. Tema foi alternado via `data-theme`. O cálculo usa cores sRGB opacas; não representa pixels de uma rota clínica.

Para cada canal `c = canal / 255`, linearizar por `c / 12.92` se `c ≤ 0.04045`, senão `((c + 0.055) / 1.055) ** 2.4`. Luminância: `0.2126 R + 0.7152 G + 0.0722 B`. Razão: `(max(L1,L2)+0.05)/(min(L1,L2)+0.05)`. Arredondamento exibido a três casas; nenhuma opacidade foi aplicada.

| Primeiro plano / fundo | Claro DS e SPA: cores → razão | Escuro DS: cores → razão | Escuro SPA: cores → razão |
| --- | --- | --- | --- |
| Texto principal / painel | `#112530 / #ffffff` → 15,776 | `#eff7f5 / #112337` → 14,622 | `#edf8f7 / #102533` → 14,516 |
| Texto secundário / painel | `#3e5c67 / #ffffff` → 7,163 | `#b4cbd0 / #112337` → 9,393 | `#b0c8ca / #102533` → 8,963 |
| Texto discreto / painel | `#55717a / #ffffff` → 5,212 | `#96b0b7 / #112337` → 6,966 | `#91afb3 / #102533` → 6,734 |
| Link / painel | `#066b80 / #ffffff` → 6,136 | `#70e0e5 / #112337` → 10,219 | `#86e9ea / #102533` → 11,134 |
| Texto principal / canvas | `#112530 / #eef4f6` → 14,203 | `#eff7f5 / #091522` → 16,894 | `#edf8f7 / #091722` → 16,738 |
| Conteúdo da ação / default | `#ffffff / #066b80` → 6,136 | `#091522 / #86e9ea` → 13,010 | `#071722 / #86e9ea` → 12,867 |
| Conteúdo da ação / hover | `#ffffff / #075466` → 8,505 | `#091522 / #b3f2f1` → 14,788 | `#071722 / #b3f2f1` → 14,625 |
| Conteúdo da ação / pressed | `#ffffff / #093d4c` → 11,775 | `#091522 / #d7faf8` → 16,567 | `#071722 / #d7faf8` → 16,385 |
| Sucesso / fundo de sucesso | `#0d5145 / #e8f8f1` → 8,390 | `#a9efd0 / #102d29` → 11,155 | `#a9efd0 / #123d35` → 9,139 |
| Aviso / fundo de aviso | `#603d05 / #fff6e4` → 9,024 | `#ffdda2 / #342914` → 10,939 | `#ffdda2 / #463618` → 8,947 |
| Erro / fundo de erro | `#823037 / #fff0ef` → 7,813 | `#ffc0b7 / #351e24` → 9,890 | `#ffc0b7 / #4b2027` → 8,778 |
| Informação / fundo informativo | `#075466 / #e8f8fa` → 7,792 | `#98e9ed / #102c3b` → 10,525 | `#98e9ed / #123b45` → 8,757 |

Os pares medidos superam 4,5:1 no cenário opaco declarado. Isso não estabelece conformidade de uma página: estados com opacidade, foco sobre superfícies distintas, texto sobre imagem, overlays e bordas ainda precisam ser medidos no componente real.

Reprodução do cálculo de um par, sem dependência externa:

```js
const luminance = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map((channel) => {
    const c = parseInt(channel, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (foreground, background) => {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
console.log(contrast('#ffffff', '#066b80').toFixed(3)); // 6.136
```

## Verificação, identidade e reversão

| Evidência | Resultado |
| --- | --- |
| `pnpm --filter @cvg-his-v2/design-system typecheck` | Exit 0: TypeScript + Vue typecheck |
| Referências de `semanticTokens` verificadas contra declarações CSS | 55/55 encontradas |
| Chromium: durações normais | Seis valores iguais ao orçamento declarado |
| Chromium: movimento reduzido | 13 propriedades verificadas: duração zero, distância zero, curvas lineares |
| Chromium: preferência de sistema escura + escolha explícita clara | Painel `#112337` e depois `#ffffff`, respectivamente |
| Chromium: amostra tipográfica computada | Pilha de interface existente, `15px`, `tabular-nums` |
| `git diff --check` nos dois arquivos de tokens | Sem erros |

Identidades Git blob do conteúdo examinado:

- `packages/design-system/src/tokens/variables.css`: `81f3901009d144db4579f1e981a6216222e6fa88`.
- `packages/design-system/src/tokens/index.ts`: `a409af15ee43e3a5505e5c3f77e456eeafd35c29`.
- `apps/spa/src/styles/main.css`, lido sem alteração por esta etapa: `b3c4ab20922addd909e869546ff4f42b9de1a7b9`.

Reversão: remover o bloco CSS “Semantic contract for new consumers”, suas 13 propriedades novas no bloco de movimento reduzido, o export `semanticTokens` e este documento. Preservar as alterações preexistentes do worktree; não restaurar arquivos inteiros contra `HEAD`.

## Pendências que não podem ser inferidas dos tokens

- **NOT RUN:** prancha renderizada e página clínica preenchida usando os aliases novos; não houve inspeção visual de componentes nesta etapa.
- **NOT RUN:** contraste de foco, disabled/loading com opacidade, bordas, scrim/vidro e contexto local da sidebar.
- **NOT RUN:** zoom/reflow, nomes longos, acentos e dosagens na fonte realmente selecionada pelo navegador; a propriedade `font-family` computada não identifica o arquivo efetivamente usado para cada glifo.
- **NOT RUN:** gravação, timeline de performance, CPU limitada, interrupção de transições, retorno de foco e remoção de autoplay nas rotas reais.
- **OBSERVED:** coexistência de literais TypeScript antigos, tokens CSS e overrides da SPA; reconciliação de todos os consumidores segue pendente.
- **REVIEW REQUIRED:** decisão de UX e revisão independente de materialidade, hierarquia, tipografia e movimento. Esta entrega não contém nota autoatribuída nem veredito de aprovação visual.
