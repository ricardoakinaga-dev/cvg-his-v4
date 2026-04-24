# Observações da consolidação — cockpit clínico do detalhe de animal

## Escopo

Consolidação documental da estrutura das rotas:

- `https://erp-beta.vetus.com.br/cadastro/animais`
- `https://erp-beta.vetus.com.br/cadastro/animais/detalhes/10117`

## Base efetiva de evidência usada

Foi usado o acervo local já coletado anteriormente:

- `docs/vetus/inspection/2026-04-23T22-48-13-795Z-cadastros/animais-lista.json`
- `docs/vetus/inspection/2026-04-23T22-48-13-795Z-cadastros/animais-detalhe-expandido.json`
- `docs/vetus/inspection/2026-04-23T22-48-13-795Z-cadastros/animais-detalhe-expandido.html`
- `docs/vetus/inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/animais-detalhe-expandido.png`
- `docs/vetus/screenshots/animais-03-detalhe.png`
- `docs/vetus/guides/12-modulo-cadastros-animais-clientes.md`

## Nota metodológica

O pedido citou explicitamente a rota `detalhes/10117`. No entanto, a captura estrutural detalhada disponível no acervo é da rota `detalhes/10115`. O relatório produzido descreve a arquitetura confirmada do cockpit clínico com base nessa evidência, sem afirmar identidade de conteúdo clínico paciente-específico.

## Achados principais amarrados nesta rodada

- A listagem de animais funciona como pré-cockpit operacional, com busca, busca avançada, card por paciente e atalho para detalhe/comanda.
- O detalhe do animal é uma tela de duas colunas:
  - coluna esquerda para identidade do paciente, alertas rápidos e vínculo com tutor;
  - coluna direita para cards clínicos longitudinais.
- Os cards confirmados foram:
  - `Últimos Atendimentos`
  - `Anamneses`
  - `Vacinas e Vermífugos`
  - `Agenda`
  - `Exames`
  - `Internação`
  - `Receituário`
  - `Gráfico de peso`
  - `Imagens`
  - `Histórico Clinico`
- Ficaram confirmados CTAs importantes de ação clínica direta no cockpit:
  - `Abrir Nova Comanda`
  - `Incluir Nova Anamnese`
  - `Incluir Nova Vacina/Vermífugo`
  - `Upload de Exame PDF`
  - `Incluir Nova Receita`
  - `Atualizar peso`
- O card `Gráfico de peso` é um dos mais ricos estruturalmente no HTML salvo, com recortes `3 meses`, `6 meses`, `1 ano`, exibição de peso atual e canvas gráfico.
- O card `Histórico Clinico` é o principal ponto narrativo do prontuário dentro da tela.

## Resultado

Foi gerado o relatório:

- `docs/vetus/guides/2026-04-24-relatorio-cockpit-clinico-detalhe-animal.md`
