# 📊 ANÁLISE DO SISTEMA VETUS ERP

> **Data da análise:** 02/04/2026  
> **URL analisada:** https://erp-beta.vetus.com.br  
> **API Backend:** https://dorylus.vetus.com.br
>
> **Nota de governança:** este documento é uma análise exploratória do sistema observado. Em caso de divergência com o pacote consolidado em `docs2`, prevalece `docs2`.

---

## 1. RESUMO EXECUTIVO

O Vetus ERP é um sistema de gestão para **clínicas veterinárias e pet shops** em operação desde 2012. O sistema está em processo de migração de uma arquitetura monolítica (HTML/PrimeFaces) para uma SPA moderna (Vue.js/PrimeVue).

### Métricas da Análise

| Métrica                        | Valor  |
| ------------------------------ | ------ |
| Páginas inspecionadas          | 107    |
| Chamadas de API capturadas     | 292    |
| Itens de menu mapeados         | 109    |
| Módulos principais             | 11     |
| Páginas SPA (Vue.js)           | ~25    |
| Páginas Legado (HTML)          | ~82    |
| Tabelas de dados identificadas | 50+    |
| Formulários identificados      | 200+   |
| Campos de input identificados  | 1.500+ |

---

## 2. ARQUITETURA ATUAL

### 2.1 Sistema Híbrido

O Vetus opera em dois fronts simultaneamente:

| Front         | URL                         | Tecnologia        | Status             |
| ------------- | --------------------------- | ----------------- | ------------------ |
| Novo (SPA)    | `erp-beta.vetus.com.br`     | Vue.js + PrimeVue | Em desenvolvimento |
| Legado (HTML) | `erp.vetus.com.br/Sistema/` | HTML + PrimeFaces | Em produção        |
| Backend API   | `dorylus.vetus.com.br`      | REST API          | Produção           |

### 2.2 Fluxo de Autenticação

```
1. POST /auth/v1/login → Retorna JWT
2. GET /users/{id}/access-groups → Busca permissões
3. GET /menu → Carrega menu do usuário
4. Redirect para /inicio (Dashboard)
```

**JWT Payload:**

```json
{
  "sub": "vetus",
  "vetusid": "220319",
  "hash": "...",
  "sessionId": "...",
  "iat": 1775171042,
  "exp": 1775171642
}
```

**Expiração:** 600 segundos (10 minutos)

### 2.3 Tecnologias Identificadas

| Camada             | Tecnologia                                                   |
| ------------------ | ------------------------------------------------------------ |
| Frontend Framework | Vue.js (SPA)                                                 |
| UI Components      | PrimeVue (p-button, p-input, p-datatable, p-dialog, p-toast) |
| CSS Framework      | PrimeFlex (p-col-12, p-grid, p-field)                        |
| Ícones             | Material Symbols Outlined, Remix Icons, PrimeIcons           |
| Fontes             | Open Sans (400, 600, 700)                                    |
| Backend            | REST API em `dorylus.vetus.com.br`                           |
| Auth               | JWT (Bearer token)                                           |
| Routing            | Vue Router (router-link)                                     |
| State              | Vuex ou Pinia                                                |
| Analytics          | Hotjar, Microsoft Clarity, Google Analytics                  |
| NPS                | SoluCX                                                       |
| Onboarding         | Inline Manual                                                |

---

## 3. MÓDULOS E FUNCIONALIDADES

### 3.1 Atendimento (11 funcionalidades)

| Funcionalidade       | URL                                    | Tipo   | Complexidade |
| -------------------- | -------------------------------------- | ------ | ------------ |
| Início/Dashboard     | `/inicio`                              | SPA    | Alta         |
| Agenda               | `/agenda`                              | SPA    | Alta         |
| Comandas             | `/comandas`                            | SPA    | Alta         |
| Vendas               | `.../Atendimento/Vendas.htm`           | Legado | Alta         |
| Pacotes              | `/pacotes`                             | SPA    | Média        |
| Esteira              | `.../Atendimento/Esteira.htm`          | Legado | Média        |
| Esteira de Exames    | `.../Atendimento/EsteiraExames.htm`    | Legado | Média        |
| Vacinas e Vermífugos | `.../Vacina/Vacinas.htm`               | Legado | Alta         |
| Orçamentos           | `.../Atendimento/Orcamentos.htm`       | Legado | Média        |
| Resgate de Pontos    | `.../Atendimento/PontuacaoResgate.htm` | Legado | Média        |
| Internação           | `.../Internacao/Internacao.htm`        | Legado | Muito Alta   |

### 3.2 Cadastros (12 funcionalidades)

| Funcionalidade             | URL                                | Tipo   |
| -------------------------- | ---------------------------------- | ------ |
| Animais                    | `/cadastro/animais`                | SPA    |
| Clientes                   | `/cadastro/clientes`               | SPA    |
| Serviços                   | `.../Cadastros/Servicos.htm`       | Legado |
| Importar Dados Serviços    | `/importar-dados-servicos`         | SPA    |
| Termos de Responsabilidade | `.../Cadastros/Termos.htm`         | Legado |
| Raças                      | `.../Cadastros/Racas.htm`          | Legado |
| Espécies                   | `.../Cadastros/Especies.htm`       | Legado |
| Cores                      | `.../Cadastros/Cores.htm`          | Legado |
| Grupos de Clientes         | `.../Cadastros/GrupoClientes.htm`  | Legado |
| Boxes de Internação        | `.../Internacao/InternacaoBox.htm` | Legado |
| Webhooks                   | `.../Cadastros/Webhooks.htm`       | Legado |
| Profissões                 | `.../Cadastros/Profissoes.htm`     | Legado |

### 3.3 Laboratório (9 funcionalidades)

| Funcionalidade       | URL                                         | Tipo   |
| -------------------- | ------------------------------------------- | ------ |
| Exames               | `.../Laboratorio/Exames.htm`                | Legado |
| Laudos               | `.../Laboratorio/Laudos.htm`                | Legado |
| Hemogramas           | `.../Laboratorio/Hemogramas.htm`            | Legado |
| Urina                | `.../Laboratorio/Urina.htm`                 | Legado |
| Bioquímico           | `.../Laboratorio/Bioquimico.htm`            | Legado |
| Equipamentos         | `.../Laboratorio/Equipamentos.htm`          | Legado |
| Tipos de Laudo       | `.../Laboratorio/TiposDeLaudo.htm`          | Legado |
| Vlr. Ref. Hemograma  | `.../Laboratorio/ReferenciasHemograma.htm`  | Legado |
| Vlr. Ref. Bioquímico | `.../Laboratorio/ReferenciasBioquimico.htm` | Legado |

### 3.4 Estoque (19 funcionalidades)

| Funcionalidade               | URL                                          | Tipo   |
| ---------------------------- | -------------------------------------------- | ------ |
| Consulta de Preços           | `.../Estoque/ConsultaDePrecos.htm`           | Legado |
| Entrada de Nota Fiscal       | `.../Estoque/EntradaNotaFiscal.htm`          | Legado |
| Transação no Estoque         | `.../Estoque/TransacaoNoEstoque.htm`         | Legado |
| Requisição à Farmácia        | `.../Estoque/RequisicaoFarmacia.htm`         | Legado |
| Validade de Produtos         | `.../Estoque/ValidadeDeProdutos.htm`         | Legado |
| Auditoria de Estoque         | `.../Estoque/AuditoriaDeEstoque.htm`         | Legado |
| Auditoria de Preços          | `.../Estoque/AuditoriaDePrecos.htm`          | Legado |
| Transferência entre Estoques | `.../Estoque/TransferenciaEntreEstoques.htm` | Legado |
| Compras                      | `.../Estoque/Compras.htm`                    | Legado |
| Reajuste de Preços           | `.../Estoque/ReajustePrecos.htm`             | Legado |
| Coletores de Dados           | `.../Estoque/ColetoresDeDados.htm`           | Legado |
| Produtos                     | `/produtos`                                  | SPA    |
| Importar Dados Produtos      | `/importar-dados-produtos`                   | SPA    |
| Fornecedores e Despesas      | `/fornecedores-e-despesas`                   | SPA    |
| Estoques                     | `/estoques`                                  | SPA    |
| Fabricantes                  | `/fabricantes`                               | SPA    |
| Grupos de Produtos           | `/grupos-de-produto`                         | SPA    |
| Setores da Empresa           | `/setores`                                   | SPA    |
| Unidades de Medida           | `/unidades-de-medida`                        | SPA    |
| Tabelas de Preço             | `/tabelas-de-preco`                          | SPA    |
| Ponto de Venda               | `/pontos-de-venda`                           | SPA    |

### 3.5 Tabelas Fiscais (8 funcionalidades)

| Funcionalidade     | URL                   |
| ------------------ | --------------------- |
| Tabela ICMS        | `/icms`               |
| Tabela IPI         | `/ipi`                |
| Tabela PIS         | `/pis`                |
| Tabela COFINS      | `/cofins`             |
| Tabela CFOP        | `/cfop`               |
| Tabela NFS-e       | `/tabela-fiscal-nfse` |
| Matriz Estado ICMS | `/matriz-icms`        |
| Tabela IBS/CBS     | `/pacote-ibs-cbs`     |

### 3.6 Financeiro (21 funcionalidades)

| Funcionalidade           | URL                                       | Tipo   |
| ------------------------ | ----------------------------------------- | ------ |
| Gaveta                   | `.../Financeiro/Gaveta.htm`               | Legado |
| Contas a Receber         | `.../Financeiro/ContasAReceber.htm`       | Legado |
| Contas a Pagar           | `.../Financeiro/ContasAPagar.htm`         | Legado |
| Pagamento Antecipado     | `.../Financeiro/PagamentoAntecipado.htm`  | Legado |
| Contas Adm. Cartão       | `.../Financeiro/ContasAReceberCartao.htm` | Legado |
| Cheques                  | `.../Financeiro/Cheques.htm`              | Legado |
| Fluxo de Caixa           | `.../Grafico/FluxoDeCaixaGrafico.htm`     | Legado |
| Curva ABC Clientes       | `.../Grafico/CurvaABCClientes.htm`        | Legado |
| Curva ABC Produtos       | `.../Grafico/CurvaABCProdutos.htm`        | Legado |
| DashBoard do Multifilial | `.../DashboardMultiFilial.htm`            | Legado |
| Dashboard Financeiro     | `/dashboard-financeiro`                   | SPA    |
| Linha do Tempo           | `.../Financeiro/LinhaDoTempo.htm`         | Legado |
| Configuração do Split    | `.../Financeiro/SplitConfig.htm`          | Legado |
| Maquininhas              | `.../Cadastros/Maquininhas.htm`           | Legado |
| Simulador de Split       | `.../Financeiro/SplitSimulador.htm`       | Legado |
| Transações de Cartão     | `.../Financeiro/Transacoes.htm`           | Legado |
| Exportador de Split      | `.../Financeiro/SplitExport.htm`          | Legado |
| Habilitar Pagamento      | `.../Cadastros/HabilitaPagamento.htm`     | Legado |
| Pagamento Dashboard      | `.../Financeiro/PagamentosDashboard.htm`  | Legado |
| Formas de Pagamento      | `.../Cadastros/FormasDePagamento.htm`     | Legado |
| Centros de Custo         | `.../Cadastros/CentrosDeCusto.htm`        | Legado |
| Custos e Despesas        | `.../Cadastros/CustosDespesas.htm`        | Legado |
| Cartões Débito/Crédito   | `.../Cadastros/Cartoes.htm`               | Legado |
| Bancos                   | `.../Cadastros/Bancos.htm`                | Legado |

### 3.7 Marketing (4 funcionalidades)

| Funcionalidade             | URL                                 |
| -------------------------- | ----------------------------------- |
| Envio de SMS Simples       | `.../Marketing/SMSSimples.htm`      |
| Campanhas de SMS Marketing | `.../Marketing/SMSCampanhaP.htm`    |
| Layout de Email de Vacina  | `.../Vacina/VacinaLayoutEmail.htm`  |
| Configurações de SMS       | `.../Marketing/SMSConfiguracao.htm` |

### 3.8 Usuários e Acesso (2 funcionalidades)

| Funcionalidade   | URL                               |
| ---------------- | --------------------------------- |
| Usuários         | `.../Usuarios/Usuarios.htm`       |
| Grupos de Acesso | `.../Usuarios/GruposDeAcesso.htm` |

### 3.9 Comissões e Profissionais (5 funcionalidades)

| Funcionalidade       | URL                                    | Tipo   |
| -------------------- | -------------------------------------- | ------ |
| Cálculo de Comissões | `.../Comissoes/CalculoDeComissoes.htm` | Legado |
| Profissionais        | `/cadastro/profissionais`              | SPA    |
| Regras de Comissão   | `.../Comissoes/RegrasDeComissao.htm`   | Legado |
| Folgas               | `.../Agenda/Folgas.htm`                | Legado |
| Profissões           | `.../Cadastros/Profissoes.htm`         | Legado |

### 3.10 Relatórios (13 funcionalidades)

| Relatório                         | URL                                                  |
| --------------------------------- | ---------------------------------------------------- |
| DRE - Demonstrativo de Resultados | `.../Relatorio/DRE.htm`                              |
| Contas Recebidas                  | `.../Relatorio/ContasRecebidasRelatorio.htm`         |
| Contas Pagas                      | `.../Relatorio/ContasPagasRelatorio.htm`             |
| Comandas/Vendas                   | `.../Relatorio/ComandasVendasRelatorio.htm`          |
| Produtos/Serviços Produzidos      | `.../Relatorio/ProdutosEServicosProduzidos.htm`      |
| Produção                          | `.../Relatorio/ProducaoRelatorio.htm`                |
| Atendimento por Profissional      | `.../Relatorio/AtendimentoPorProfissional.htm`       |
| NF de Serviços Prestados          | `.../Relatorio/RelatoriosDinamicosExecutor.htm?id=1` |
| Fornecedores                      | `.../Relatorio/FornecedoresRelatorio.htm`            |
| Exclusão de Vendas e Comandas     | `.../Relatorio/ExclusaoVendaComandaRelatorio.htm`    |
| Estoque                           | `.../Relatorio/EstoqueRelatorio.htm`                 |
| Movimentações no Estoque          | `.../Relatorio/MovimentacaoEstoqueRelatorio.htm`     |
| Entrada de NF                     | `.../Relatorio/EntradaNotaFiscalRelatorio.htm`       |

### 3.11 Integrações (2 funcionalidades)

| Integração | URL                     |
| ---------- | ----------------------- |
| Live Pet   | `.../LivePet/Login.htm` |
| Live Lab   | `.../LiveLab/Login.htm` |

---

## 4. ENDPOINTS DE API IDENTIFICADOS

### 4.1 Autenticação

| Método | Endpoint         | Descrição                       |
| ------ | ---------------- | ------------------------------- |
| POST   | `/auth/v1/login` | Login (idVetus, usuario, senha) |
| GET    | `/auth/me`       | Dados do usuário logado         |

### 4.2 Usuários e Acesso

| Método | Endpoint                    | Descrição                   |
| ------ | --------------------------- | --------------------------- |
| GET    | `/users/{id}/access-groups` | Grupos de acesso do usuário |
| GET    | `/menu`                     | Menu de navegação           |

### 4.3 Dashboard

| Método | Endpoint                       | Descrição                |
| ------ | ------------------------------ | ------------------------ |
| GET    | `/home/reminder`               | Lembretes                |
| GET    | `/home/birthdays`              | Aniversariantes          |
| GET    | `/notification/count/{userId}` | Contador de notificações |

### 4.4 Agenda

| Método | Endpoint                                                                | Descrição              |
| ------ | ----------------------------------------------------------------------- | ---------------------- |
| GET    | `/agenda/marcadores`                                                    | Marcadores de cores    |
| GET    | `/professional/basic`                                                   | Lista de profissionais |
| GET    | `/schedule?startDateTime=&endDateTime=`                                 | Agendamentos           |
| GET    | `/service?active=true&hasSchedule=true`                                 | Serviços agendáveis    |
| GET    | `/schedule/profissional/disponibilidades?diaDaSemana=&profissionalIds=` | Disponibilidades       |

### 4.5 Comandas

| Método | Endpoint                                     | Descrição        |
| ------ | -------------------------------------------- | ---------------- |
| GET    | `/commands/page-query?size=20&page=0&query=` | Lista paginada   |
| GET    | `/commands/open?`                            | Comandas abertas |

### 4.6 Clientes

| Método | Endpoint        | Descrição           |
| ------ | --------------- | ------------------- |
| GET    | `/clients/{id}` | Detalhes do cliente |

### 4.7 Estrutura de Dados Identificada

**Cliente:**

```json
{
  "id": 7574,
  "name": "Yasmin Xavier Santiago",
  "phone": "11978266098",
  "gender": "FEMALE",
  "peopleType": "PHYSICAL_PERSON",
  "cpfCnpj": "477.576.378-48",
  "rg": "581473875",
  "birthday": "04/06/2013",
  "active": true,
  "address": {
    "state": "SP",
    "city": "São Paulo",
    "district": "Alto da Riviera",
    "address": "Rua Ernesto Farrar",
    "number": 582,
    "complement": "casa",
    "zipCode": "04929160"
  },
  "contact": {
    "cellPhone": "11978266098"
  },
  "animalList": [
    {
      "id": 9928,
      "name": "Marley",
      "age": "13 anos, 3 meses e 8 dias",
      "breed": "SRD CANINO",
      "specie": "CANINA"
    }
  ]
}
```

**Profissional:**

```json
[
  { "id": 120, "name": "FLAVIA ULTRASSOM (10H AS 13H, QUINTA APÓS 11HS)" },
  { "id": 29, "name": "FLAVIO CARDIOLOGISTA" },
  { "id": 115, "name": "GUILHERME DERMATO" },
  { "id": 141, "name": "NATALIA AONA ENDOCRINOLOGISTA" },
  { "id": 14, "name": "RICARDO" }
]
```

**Serviço:**

```json
{
  "id": 1535,
  "description": "17 HIDROXI PROGESTERONA VETVISION",
  "value": 570,
  "durationInMinutes": 30
}
```

**Agendamento:**

```json
{
  "id": "69c1c8cd8fb99aab2c7d6e4f",
  "description": "03:30  04:30 - mastectomia unilateral total cadela",
  "client": { "id": "7386", "name": "Andréa Albuquerque da Silva" },
  "type": "SERVICO",
  "status": "CANCELADO",
  "period": {
    "startDateTime": "2026-04-02T03:30:00",
    "endDateTime": "2026-04-02T04:30:00"
  },
  "items": [
    {
      "id": "118",
      "description": "mastectomia unilateral total cadela",
      "participants": [
        { "id": "14", "name": "RICARDO AKINAGA", "type": "PROFISSIONAL" },
        { "id": "9690", "name": "Snoopy", "type": "ANIMAL" }
      ]
    }
  ]
}
```

---

## 5. DESIGN SYSTEM

### 5.1 Paleta de Cores

| Token                     | Valor     | Uso                    |
| ------------------------- | --------- | ---------------------- |
| `--primary-color`         | `#f19436` | Laranja (cor primária) |
| `--primary-pumpkin-light` | `#ffedda` | Fundo claro primário   |
| `--surface-a`             | `#fff`    | Superfície principal   |
| `--surface-b`             | `#efefef` | Superfície secundária  |
| `--surface-c`             | `#e9ecef` | Superfície terciária   |
| `--surface-d`             | `#dee2e6` | Bordas                 |
| `--surface-e`             | `#fff`    | Superfície de input    |
| `--surface-f`             | `#fff`    | Superfície de overlay  |
| `--text-color`            | `#212529` | Texto principal        |
| `--text-color-secondary`  | `#6c757d` | Texto secundário       |
| `--badges-orange-light`   | `#fff4de` | Fundo de badges        |

### 5.2 Tipografia

- **Font Family:** Open Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif
- **Pesos:** 400 (Regular), 600 (Semibold), 700 (Bold)

---

## 6. INTEGRAÇÕES EXTERNAS IDENTIFICADAS

| Serviço            | URL                    | Função                          |
| ------------------ | ---------------------- | ------------------------------- |
| Hotjar             | `script.hotjar.com`    | Gravação de sessões e analytics |
| Microsoft Clarity  | `clarity.ms`           | Analytics de comportamento      |
| Google Analytics   | `G-K76CN0SZLT`         | Analytics de acesso             |
| Google Tag Manager | `GTM-5ZV9KZ9`          | Gerenciamento de tags           |
| Google Fonts       | `fonts.googleapis.com` | Fontes Open Sans                |
| SoluCX             | `survey.solucx.com.br` | Pesquisa NPS                    |
| Inline Manual      | `cdn.inlinemanual.com` | Onboarding/tutoriais            |

---

## 7. PONTOS DE ATENÇÃO

### 7.1 Dívida Técnica

- Sistema híbrido (SPA + Legado) gera complexidade de manutenção
- 82 páginas legado precisam ser migradas
- Autenticação compartilhada entre dois domínios diferentes

### 7.2 Segurança

- JWT com expiração muito curta (10 minutos) — pode impactar UX
- Sem refresh token identificado
- Dados sensíveis (CPF, RG) trafegam sem mascaramento nas APIs

### 7.3 Performance

- Páginas com muitas tabelas (Linha do Tempo: 21 tabelas)
- Páginas com muitos inputs (Entrada de NF: 53 inputs, Internação: 52 inputs)
- Sem paginação server-side identificada em algumas páginas legado

### 7.4 UX

- Navegação entre SPA e Legado quebra a experiência
- Sidebar colapsável mas sem transição suave
- Sem modo escuro identificado
- Mobile não otimizado (viewport restrito)

---

_Documento gerado em 02/04/2026 — Análise baseada em inspeção automatizada do sistema Vetus ERP_
