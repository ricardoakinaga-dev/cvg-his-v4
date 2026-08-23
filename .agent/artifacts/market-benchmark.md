# Benchmark de mercado — PIMS veterinário Premium Enterprise

Pesquisa atualizada em 2026-08-22. As fontes são páginas oficiais atuais; servem para definir expectativas competitivas, não para validar o CVG HIS. A ausência de uma capacidade nesta síntese não significa que um concorrente não a possua.

## Capacidades recorrentes nos líderes

| Expectativa competitiva | Evidência de mercado | Consequência para o MVP |
| --- | --- | --- |
| Prontuário e fluxo clínico unificados | ezyVet, IDEXX Neo, Shepherd, Vetspire e Instinct apresentam prontuário/fluxo clínico como núcleo | Priorizar o percurso completo encontro→alta/cobrança antes de ampliar menus |
| Operação cloud e multiunidade | ezyVet, Covetrus Pulse, Provet e Digitail enfatizam operação conectada, grupos ou múltiplas localizações | Tenant, unidade, sessão compartilhada e relatórios consolidados são fundação, não complemento |
| Automação e captura de receita | Covetrus Pulse, Shepherd, Vetspire e Instinct destacam automação, templates ou charge capture | Eventos clínicos devem produzir cobranças auditáveis e reconciliáveis sem duplicação |
| Comunicação e autosserviço do tutor | IDEXX Neo, Provet e Digitail incluem lembretes, comunicação, booking ou portal/app | Portal/comunicação entram na barra competitiva depois que consentimento e privacidade estiverem seguros |
| Integrações e ecossistema | ezyVet, Provet, Vetspire, Digitail e Instinct promovem integrações laboratoriais, diagnósticas, pagamentos ou API | O MVP precisa contratos extensíveis e uma cadeia homologável; mocks não equivalem a integração aceita |
| Relatórios e gestão | ezyVet, IDEXX Neo, Provet e Digitail expõem relatórios/analytics | Métricas devem reconciliar com livro-caixa/estoque e respeitar tenant/unidade |
| IA assistiva | Vetspire, Digitail e fornecedores adjacentes destacam automação/IA | IA é assistiva e posterior à consistência, autorização e rastreabilidade do núcleo |

## Funções modernas que elevam a barra

| Função | Evidência primária | Regra de produto para o CVG HIS |
| --- | --- | --- |
| Treatment sheet e status board em tempo real | Instinct conecta tratamentos, medicamentos e diagnósticos a status, estoque e cobrança | Uma execução clínica deve alterar o estado assistencial e gerar efeitos financeiros/estoque exatamente uma vez |
| Segurança medicamentosa no ponto de cuidado | Instinct descreve calculadoras de dose, alertas de paciente, terapia duplicada e prevenção de overdose | Alertas precisam ser explicáveis, rastreáveis e não bloqueantes sem regra clínica explícita |
| Scribe/IA incorporado ao prontuário | Provet, Shepherd, Digitail e Covetrus promovem documentação assistida por IA | Conteúdo gerado deve permanecer rascunho, exigir autoria humana e conservar proveniência/auditoria |
| Portal/app e comunicação bidirecional | Digitail, Provet, Shepherd e IDEXX Neo conectam agenda, mensagens, formulários e lembretes | Consentimento, opt-out, identidade do tutor, entrega e retry idempotente são parte do fluxo, não pós-processamento informal |
| Open API e ecossistema | Provet declara API aberta e mais de 150 integrações; ezyVet enfatiza API e integrações corporativas | Contratos versionados, webhooks assinados, idempotência, DLQ e observabilidade são requisitos do MVP de integração |
| Operação corporativa multiunidade | ezyVet e Provet destacam padronização, governança e visão entre clínicas | Tenant/unidade devem atravessar autenticação, autorização, banco, filas, relatórios e auditoria |

## Práticas transferidas dos melhores ERPs gerais

| Prática | Referência | Aplicação obrigatória |
| --- | --- | --- |
| Fonte financeira única e trilhas completas | Oracle Fusion Cloud ERP destaca ledger/subledgers, segregação de funções e audit trails | Caixa, contas, cobrança e conciliação não podem depender de agregados de UI ou mutações sem lançamento imutável |
| Analytics no fluxo transacional | SAP Cloud ERP destaca analytics em tempo real, order-to-cash e visibilidade operacional | Indicadores devem derivar de eventos reconciliáveis, com freshness e escopo de tenant/unidade observáveis |
| Automação modular e governada | SAP e Microsoft Dynamics 365 apresentam automação/IA por funções e processos | Toda automação precisa de permissão, idempotência, modo de falha, intervenção humana e auditoria |
| Planejamento e supply chain conectados | SAP e Dynamics conectam demanda, compras, estoque e execução | Compra, recebimento, lote/validade, consumo clínico e inventário precisam formar uma cadeia documental persistida |

## Padrões não negociáveis para produção

| Padrão | Barra adotada |
| --- | --- |
| WCAG 2.2 AA | Foco não oculto, alvo mínimo, alternativa a arrastar, entrada redundante evitada e autenticação acessível entram nos E2E críticos |
| OWASP ASVS 5.0 | Sessões, MFA, autorização, validação, criptografia, logging e configuração são verificados por requisito, não por alegação genérica |
| OpenTelemetry | Traces, métricas e logs correlacionados, propagação de contexto e SLIs orientados à jornada cobrem API, workers e integrações |

## Fontes primárias

- ezyVet Features: <https://www.ezyvet.com/features>
- ezyVet Corporate Groups: <https://www.ezyvet.com/corporate-groups>
- Covetrus Pulse: <https://covetrus.com/covetrus-platform/workflow-and-productivity-tools/covetrus-pulse/>
- IDEXX Neo Features: <https://software.idexx.com/products/neo/features>
- Provet Cloud for first-opinion clinics: <https://www.provet.cloud/product/first-opinion-clinics>
- Provet Enterprise one-pager: <https://www.provet.cloud/hubfs/provet_enterprise_one_pager_US.pdf>
- Shepherd Features: <https://www.shepherd.vet/features/>
- Vetspire Features: <https://www.vetspire.ai/features/all>
- Digitail Plans: <https://digitail.com/plans/>
- Instinct: <https://instinct.vet/>
- Instinct EMR: <https://instinct.vet/products/instinct-emr/>
- SAP Cloud ERP product tour: <https://www.sap.com/products/erp/s4hana/product-tour.html>
- Oracle Fusion Cloud ERP Financials: <https://www.oracle.com/erp/erp-finance-accounting/>
- Microsoft Dynamics 365 Supply Chain Management: <https://www.microsoft.com/en-us/dynamics-365/products/supply-chain-management>
- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- OWASP ASVS 5.0: <https://owasp.org/www-project-application-security-verification-standard/>
- OpenTelemetry signals: <https://opentelemetry.io/docs/concepts/signals/>

## Limite de decisão

O diferencial que importa nesta fase não é quantidade de telas nem uma alegação de IA. É uma única operação multiunidade na qual contexto clínico, cobrança, estoque, comunicação e auditoria permanecem coerentes. Por isso o benchmark reforça, mas não muda, a ordem técnica já derivada da auditoria: identidade/tenancy, encontro-até-recebimento, prova comportamental, paridade e somente então integrações/otimizações.

## Atualização de pesquisa oficial — 23 de agosto de 2026

Uma nova consulta a páginas oficiais confirmou sinais competitivos que devem
ser tratados como requisitos verificáveis, não como cópia de marketing:

| Fonte oficial | Sinal observado | Requisito executável no CVG HIS |
| --- | --- | --- |
| [Shepherd features](https://www.shepherd.vet/features/) | SOAP, autosave, activity log, charge capture, alta, portal, inventário, tarefas e whiteboard no mesmo fluxo | Prontuário colaborativo deve versionar/autosalvar, exigir autoria humana e derivar cobrança/alta/tarefas com correlação auditável. |
| [ezyVet API applications](https://developers.ezyvet.com/apply.html) e [VetRec integration](https://docs.ezyvet.com/en/see-all-integrations/veterinary-care/vetrec/about-the-vetrec-integration) | Integrações comerciais/privadas, scribe e receptionist com confirmação explícita antes de agir | Integrações precisam ambientes separados, escopos mínimos, consentimento, idempotência, revogação e confirmação humana para ações assistidas. |
| [Digitail platform](https://digitail.com/) | Flowboard, hospitalização/boarding, AI SOAP, vitais, treatment plans, record collaboration, laboratório/farmácia, portal e relatórios | Flowboard 24h, jornada clínica-financeira única e portal do tutor devem compartilhar o mesmo episódio e trilha de auditoria. |
| [Covetrus Ascend](https://software.covetrus.com/emea/veterinary-solutions/ascend-cloud-veterinary-software/) e [stocktake](https://software.covetrus.com/emea/stocktake/) | Acesso multi-dispositivo, multi-local, inpatients workflow, inventário, stocktake com responsável/ajuste/aprovação | Estoque deve suportar contagem cíclica aprovada, localização, rastreabilidade e reconciliação; internação deve ser operável em tablet/whiteboard. |
| [Vetspire developer portal](https://developer.vetspire.com/) | API GraphQL tipada com orientação explícita de breaking changes e boas práticas | A API pública do CVG HIS deve ser versionada, possuir sandbox, limites, webhooks assinados, replay/DLQ e documentação de compatibilidade. |

Estas fontes reforçam seis tarefas ainda não fechadas no backlog: prontuário
versionado/autosave, flowboard hospitalar 24h, laboratório/imagem com
proveniência e correção, portal do tutor, interoperabilidade com sandbox e
governança de IA assistiva. Nenhuma delas é considerada implementada apenas
por existir uma tela ou uma integração mockada.
