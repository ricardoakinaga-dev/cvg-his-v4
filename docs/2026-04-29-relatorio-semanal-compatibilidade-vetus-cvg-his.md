# Relatorio semanal de compatibilidade Vetus vs CVG-HIS

**Data:** 2026-04-29
**Janela avaliada:** 2026-04-26 a 2026-04-29
**Escopo:** score operacional de compatibilidade Vetus vs `cvg-his-v2` apos fechamento dos gaps P0, P1, P2-01 a P2-05 e P3-01 a P3-04.
**Regra de privacidade:** nenhum dado pessoal real do Vetus foi transcrito neste relatorio.

---

## 1. Metodo de score

O score usa escala de 0 a 100 por dominio:

- `90-100`: fluxo principal implementado, testado e publicado; restam ajustes finos de paridade.
- `75-89`: fluxo operacional utilizavel, mas ainda com lacunas de tela, persistencia fina, relatorios ou automacao.
- `60-74`: cobertura parcial; operador consegue consultar ou executar parte do fluxo, mas ainda ha dependencias manuais.
- `<60`: modulo com placeholders relevantes ou sem paridade operacional suficiente.

Evidencias usadas nesta rodada:

- plano executivo de GAPs Vetus atualizado ate P3-04;
- workflow Vetus/paridade com registros de implementacao e publicacao;
- relatorio de auditoria Vetus Enterprise de 2026-04-27;
- contagem atual de rotas SPA: 16 chamadas diretas a `placeholderRoute(...)`, alem do helper;
- 20 rotas de relatorio materializadas via `reportWorkbenchRoute(...)`;
- registros de publicacao recentes com API e SPA healthy no compose v2.

---

## 2. Score executivo

| Dimensao | Score | Leitura |
|---|---:|---|
| Paridade clinica central | 91 | Cockpit do animal, prontuario, receituario, exames, comanda, agenda, internacao e preventivo ja operam com contexto do animal. |
| Paridade operacional Vetus | 82 | Atendimento e estoque/fiscal avancaram; Financeiro, Marketing, RH e Relatorios ainda limitam o espelho completo. |
| Qualidade UX/QA da pagina do paciente | 90 | P3-01 a P3-04 removeram falso sucesso, padronizaram vazios, reduziram densidade e melhoraram teclado/ARIA. |
| Paridade fiscal/estoque | 86 | ICMS, IPI, PIS, COFINS e CFOP foram ajustados; NFS-e e fluxos fiscais documentais ainda precisam revalidacao Vetus-like. |
| Score consolidado semanal | 86 | Sistema ja esta acima do minimo operacional clinico, mas nao deve ser declarado como paridade Vetus total. |

---

## 3. Score por navbar Vetus

| Navbar Vetus | Score | Status CVG-HIS | Justificativa curta | Proxima acao |
|---|---:|---|---|---|
| Inicio | 70 | Parcial | Dashboard existe, mas blocos reais do Inicio Vetus ainda precisam revalidacao funcional. | Mapear atalhos, lembretes, aniversariantes, comandas e indicadores. |
| Atendimento | 93 | Avancado | Tutor/animal, agenda, atendimento, prontuario, comanda, preventivo, internacao e importacao assistida estao integrados. | Manter regressao de cockpit e fechar ajustes finos por uso real. |
| Laboratorio | 93 | Avancado | Exames, laudos, anexos e integracao com prontuario estao cobertos; modularizacao dedicada ainda e pendencia arquitetural. | Validar fluxo e2e com anexos/laudos em ambiente real. |
| Estoque | 86 | Em andamento | Cadastros e varias configuracoes fiscais foram ajustados; NFS-e e transacoes avancadas de estoque seguem como frente prioritaria. | Retomar por `Estoque > Configuracoes Fiscais > Tabela NFS-e`. |
| Financeiro | 78 | Parcial/avancado | Comanda integrada melhorou o uso real, mas split, maquininhas, timeline e pagamentos avancados ainda aparecem como lacunas. | Priorizar itens financeiros que impactam baixa e conciliacao. |
| Marketing | 55 | Parcial | WhatsApp/notificacoes existem, mas SMS simples, layout de email de vacina e configuracoes ainda nao espelham Vetus. | Fechar comunicacoes preventivas apos fiscal/relatorios prioritarios. |
| RH | 66 | Parcial | Usuarios, acesso, profissionais e partes de comissao/folga existem; escala, disponibilidade e regras finas ainda carecem validacao. | Revalidar submenu RH contra Vetus e remover placeholders residuais. |
| Relatorios | 70 | Parcial em evolucao | Hubs e workbench reduzem placeholders, mas score ainda depende de filtros, colunas, totalizadores e exportacoes por dominio. | Consolidar relatorios por modulo depois da retomada fiscal. |

---

## 4. Pendencias por categoria

### Operacional

- Revalidar fluxo real Inicio -> agenda -> atendimento -> prontuario -> comanda sem depender de dados volateis.
- Manter teste regressivo do cockpit do animal como gate para novas mudancas de atendimento.
- Executar uma rodada e2e com navegador quando a ponte Playwright/Chrome estiver funcional.

### Fiscal

- Retomar macro Vetus por `Estoque > Configuracoes Fiscais > Tabela NFS-e`.
- Comparar a tela Vetus `Tabela NFS-e` com `/fiscal/nfse`, que hoje ja possui backoffice inicial de layouts e contratos API.
- Confirmar se a paridade esperada e cadastro simples Vetus-like ou manutencao do backoffice municipal mais rico ja existente.
- Validar NFS-e com testes de SPA, API, OpenAPI e smoke publicado.

### Financeiro

- Fechar lacunas de split, maquininhas, contas administrativas de cartao, timeline e dashboard de pagamentos.
- Revalidar conciliacao/baixa com dados persistentes e auditoria.
- Conectar relatorios financeiros aos mesmos totalizadores usados na operacao.

### Clinico

- Manter foco em durabilidade do prontuario, receituario, exames, preventivo e internacao.
- Expandir validacao de anexos e timeline clinica com teste e2e real.
- Evitar novos textos livres quando houver entidade estruturada disponivel.

### UX/QA

- Manter estados vazios acionaveis como padrao para novos cards/modulos.
- Preservar ARIA/teclado nos acordeoes ao adicionar cards no cockpit do animal.
- Reduzir placeholders residuais antes de elevar score de paridade geral acima de 90.

---

## 5. Leitura de risco

| Risco | Severidade | Estado atual | Mitigacao recomendada |
|---|---:|---|---|
| Declarar paridade Vetus completa antes de fechar Financeiro/Marketing/Relatorios | Alta | Ainda presente | Comunicar score consolidado como 86/100, nao 100/100. |
| NFS-e existente nao espelhar exatamente a tabela Vetus | Media | Provavel | Revalidar tela Vetus e ajustar superficie principal antes de expandir emissao. |
| Rotas placeholder residuais confundirem operador | Media | 16 chamadas diretas ativas | Priorizar placeholders por impacto operacional, nao por volume. |
| Testes automatizados nao cobrirem jornada real completa | Media | Parcial | Rodar e2e/integration quando ambiente de navegador estiver estavel. |

---

## 6. Veredito semanal

O `cvg-his-v2` atingiu boa compatibilidade clinica e operacional no cockpit do animal. A nota clinica central esta acima da meta minima de 80/100 e a qualidade UX/QA do detalhe do paciente subiu apos P3-01 a P3-04.

O sistema ainda nao deve ser comunicado como paridade Vetus completa. A nota consolidada semanal fica em **86/100**, limitada principalmente por Marketing, RH, Relatorios, Financeiro avancado e pela pendencia fiscal imediata de NFS-e.

Proxima acao recomendada: retomar a macro fiscal Vetus em `Estoque > Configuracoes Fiscais > Tabela NFS-e`.
