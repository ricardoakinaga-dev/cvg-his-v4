# Navbar Esquerda - Relatorio de Status

Data: 2026-03-28
Escopo avaliado: `apps/web`
Tipo de atividade: avaliacao sem alteracao de codigo funcional

## Nota Atual

**76/100**

## Resumo Executivo

A navbar esquerda ja existe em estado funcional no frontend oficial. A implementacao atual cobre estrutura visual real, agrupamento por modulos, destaque de rota ativa, estado expandido/recolhido com persistencia em `localStorage`, topbar integrada e responsividade basica.

Ela nao esta mais em fase de prototipo. Ao mesmo tempo, ainda nao parece encerrada como melhoria totalmente consolidada para producao visual. Os principais gaps estao em consistencia arquitetural, experiencia mobile e acabamento de acessibilidade/comportamento.

## Evidencias Principais

- Implementacao principal da sidebar em `apps/web/src/index.ts`
- Estilos da sidebar, topbar e comportamento responsivo em `apps/web/src/styles.ts`
- Existencia de layout antigo paralelo em `apps/web/src/pages/layout.ts`

## Achados

### 1. Implementacao real existe e esta integrada ao shell principal

A sidebar esta montada diretamente no HTML principal do app, com grupos como `Essencial`, `Administrativo`, `Operacao`, `Assistencial`, `Backoffice` e `Governanca`.

Ha:

- item ativo por rota
- grupos expansivos via `details/summary`
- bloco de branding
- area de usuario/logoff
- topbar conectada ao mesmo shell

Leitura: melhoria ja materializada e visivel no fluxo principal.

### 2. Estado de colapso ja foi implementado

O shell usa `data-sidebar-state="expanded|collapsed"` e persiste o estado em `localStorage` pela chave `cvg-his-v2.sidebar.state`.

Leitura: comportamento importante ja foi entregue e vai alem de uma mudanca apenas estetica.

### 3. Responsividade basica existe, mas ainda incompleta para mobile

Em telas menores, a sidebar passa a funcionar como painel lateral fixo. Isso resolve a ocupacao de espaco, mas ainda nao ha sinais de:

- overlay de fundo
- fechamento por clique fora
- fechamento por tecla `Escape`
- controle claro de foco
- bloqueio de scroll do fundo

Leitura: funcional para testes e uso inicial, mas ainda com sensacao de primeira iteracao no mobile.

### 4. Ha drift arquitetural por manter layout antigo em paralelo

O arquivo `apps/web/src/pages/layout.ts` ainda contem uma implementacao antiga de navegacao superior e layout, aparentemente sem uso atual.

Leitura: isso reduz clareza estrutural e cria risco de manutencao futura, porque a navegacao nova vive em `index.ts`, enquanto o layout anterior continua no projeto.

### 5. Acessibilidade e semantica ainda estao em nivel intermediario

Os botoes principais possuem `aria-label`, o que e positivo. Porem, nao ha evidencia clara de:

- `aria-expanded` sincronizado no toggle
- `aria-controls` para o painel
- tratamento de foco ao abrir/fechar
- comportamento assistivo mais refinado

Leitura: base aceitavel, mas ainda nao pronta para ser tratada como navegacao madura.

### 6. Navegacao ainda esta hardcoded no bootstrap principal

Os grupos e links estao definidos diretamente no servidor/render principal, sem camada mais clara de composicao por permissao, configuracao ou feature flag.

Leitura: suficiente para o estado atual, mas ainda com baixa flexibilidade para evolucao futura.

## Pontos Fortes

- Sidebar esquerda ja implementada de verdade
- Visual intencional e consistente com o shell do sistema
- Organizacao por grupos
- Rota ativa destacada
- Colapso com persistencia
- Integracao com topbar e status bar
- Adaptacao basica para telas menores

## Pendencias que Seguram a Nota

- layout antigo ainda coexistindo no codigo
- experiencia mobile sem overlay e sem interacoes de fechamento mais robustas
- acessibilidade incompleta para toggle/painel
- ausencia de maior desacoplamento da definicao de navegacao
- falta de evidencia de validacao visual/funcional formal

## Faixa de Maturidade

- `0-40`: inexistente ou conceitual
- `41-70`: implementada, mas ainda crua
- `71-85`: funcional com pendencias de maturidade
- `86-100`: pronta e consolidada

Classificacao atual: **71-85**

## Conclusao

A condicao atual da melhoria da navbar esquerda e **boa, funcional e claramente em andamento**, mas ainda nao totalmente consolidada como entrega final.

Nota recomendada neste momento: **76/100**.
