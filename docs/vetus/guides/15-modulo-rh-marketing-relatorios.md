# VETUS — RH, Marketing e Relatórios
**Evidências principais:** `rh-*.png`, `marketing-*.png`, `relatorios-*.png`, `modulos/com-*.png`

## 1. Leitura geral do bloco

Esses três domínios aparecem no menu principal, mas com maturidade bem desigual:

- **RH** tem pelo menos um módulo SPA claramente funcional;
- **Comissões** aparecem melhor documentadas no legacy;
- **Marketing** e **Relatórios** estão representados majoritariamente por indisponibilidade no shell.

## 2. RH

### 2.1 Profissionais

`rh-profissionais-01.png` mostra uma tela funcional com:

- breadcrumb `RH > Cadastro > Profissionais`;
- busca por id ou nome;
- lista de profissionais ativos;
- id visível em cada card;
- accordion de contato;
- CTA `+ Incluir Novo Profissional`;
- ação `Ver Detalhes`.

Esse é o melhor indício de maturidade do bloco de RH dentro da SPA.

### 2.2 Rotas indisponíveis

As seguintes capturas registram indisponibilidade:

- `rh-usuarios-01.png`
- `rh-grupos-acesso-01.png`
- `rh-comissoes-01.png`
- `rh-folgas-01.png`
- `rh-regras-comissao-01.png`

Interpretação:

- o menu e a arquitetura de informação existem;
- a entrega SPA ainda não está completa;
- parte importante do domínio permanece fora do fluxo beta.

### 2.3 Comissões como exceção

O legado mostra o domínio de comissões funcional em:

- `modulos/com-01-calculo.png`
- `modulos/com-02-regras.png`

Portanto, RH não está ausente do produto; ele está apenas parcialmente distribuído entre beta e legacy.

## 3. Marketing

As capturas analisadas são:

- `marketing-campanhas-01.png`
- `marketing-layout-email-01.png`
- `marketing-sms-simples-01.png`

No shell, o conjunto aparece como indisponível. Isso sugere um domínio:

- presente no menu;
- conceitualmente previsto;
- mas não operacional dentro da camada SPA observada.

## 4. Relatórios

As capturas são:

- `relatorios-agenda-01.png`
- `relatorios-atendimento-01.png`
- `relatorios-atendimento-profissional-01.png`
- `relatorios-cadastros-01.png`
- `relatorios-estoque-01.png`
- `relatorios-financeiros-01.png`
- `relatorios-fluxo-caixa-01.png`
- `relatorios-producao-01.png`

A leitura do acervo indica baixa cobertura funcional no shell. Em vez de relatórios efetivamente carregados, predominam estados de indisponibilidade.

## 5. Interpretação estratégica

Esses três domínios funcionam como sinal de maturidade incompleta da transição beta:

- RH já tem pontos úteis no shell;
- Comissões sobrevivem no legado;
- Marketing e Relatórios ainda não oferecem material funcional forte na camada moderna.

## 6. Conclusão

Na documentação do Vetus, este bloco deve ser tratado com honestidade:

- **RH:** parcialmente funcional na SPA
- **Comissões:** melhor documentadas no legacy
- **Marketing e Relatórios:** majoritariamente não entregues nas capturas do shell

Esse recorte evita transformar placeholder ou indisponibilidade em requisito falso de produto.
