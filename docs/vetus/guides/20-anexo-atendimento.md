# VETUS — Relatório Anexo do Domínio Atendimento
**Pastas-base:** `docs/vetus/screenshots` e `docs/vetus/modulos`  
**Objetivo:** registrar o status real das rotinas de atendimento, sem misturar beta funcional com legacy quebrado

## 1. Síntese

O domínio de Atendimento é o mais heterogêneo do acervo. Ele contém:

- módulos SPA funcionais e bem resolvidos;
- rotinas legacy funcionais;
- telas direct legacy com `404` e `500`;
- rotas abertas pelo shell que terminam em indisponibilidade.

## 2. Status por rotina

| Rotina | Evidência | Leitura |
|---|---|---|
| Agenda | `agenda-*.png` | Funcional no beta |
| Comandas | `comandas-*.png` | Funcional no beta |
| Animais / Clientes | `animais-*`, `clientes-*` | Funcional no beta |
| Pacotes | `screenshots/atendimento-pacotes-01.png` | Funcional no beta |
| Vendas | `modulos/att-01-vendas.png` | Funcional no legacy |
| Pacotes legacy | `modulos/att-02-pacotes.png` | `HTTP 404` |
| Orçamentos legacy | `modulos/att-03-orcamentos.png` | Captura preservada, sem evidência de shell indisponível no relatório-base |
| Esteira legacy | `modulos/att-04-esteira.png` | Funcional no legacy |
| Esteira de exames legacy | `modulos/att-05-esteira-exames.png` | Funcional no legacy |
| Cotação | `modulos/att-06-cotacao.png` | `HTTP 500` |
| Resgate de pontos | `modulos/att-07-pontuacao-resgate.png` | Funcional no legacy |
| Pontuação | `modulos/att-08-pontuacao.png` | duplicata de erro `500` |
| SMS | `modulos/att-09-sms.png` | duplicata de erro `500` |
| Tipo de frete | `modulos/att-10-tipo-frete.png` | duplicata de erro `500` |
| Contador | `modulos/att-11-contador.png` | duplicata de erro `500` |
| Esteira beta | `screenshots/atendimento-esteira-01.png` | indisponível no shell |
| Esteira exames beta | `screenshots/atendimento-esteira-exames-01.png` | indisponível no shell |
| Orçamentos beta | `screenshots/atendimento-orcamentos-01.png` | indisponível no shell |
| Vacinas beta | `screenshots/atendimento-vacinas-01.png` | indisponível no shell |
| Vendas beta | `screenshots/atendimento-vendas-01.png` | indisponível no shell |

## 3. Leitura por camada

### 3.1 Atendimento que já parece SPA nativo

- Agenda
- Comandas
- Cadastros associados
- Pacotes

São as evidências mais coerentes e produtivas para benchmark.

### 3.2 Atendimento que continua dependendo do legacy

- Vendas
- Esteira
- Esteira de Exames
- Resgate de Pontos
- parte de Orçamentos

Quando acessado por captura direta, o legado ainda preserva valor operacional.

### 3.3 Atendimento com falha aberta

Os erros preservados mostram falhas reais de entrega:

- `404` em `att-02-pacotes`;
- `500` em `att-06-cotacao`;
- duplicações de `500` em `att-08` a `att-11`;
- indisponibilidade no shell para várias rotinas que o menu anuncia.

## 4. Conclusão

O domínio Atendimento não deve ser tratado como um bloco único. Para documentação de produto ou reconstrução, a divisão correta é:

- **Atendimento beta maduro:** agenda, comandas, cadastros, pacotes
- **Atendimento legacy ainda operacional:** vendas, esteiras, resgate
- **Rotas problemáticas:** cotação, parte do legado exposto pelo shell e utilitários administrativos
