# 0205 - Relatório de Gap entre Vetus, Plano Enterprise e Código Real

**Data:** 2026-04-12  
**Status:** concluído  
**Objetivo:** comparar o produto de referência documentado em `docs/vetus/guides`, o plano de construção em `docs/Enterprise` e o estado real implementado no repositório.

---

## 1. Fontes auditadas

### 1.1 Referência Vetus

- `docs/vetus/guides/01-overview-relatorio-mestre.md`
- `docs/vetus/guides/02-shell-estrutura-global.md`
- `docs/vetus/guides/03-shell-mapa-de-navegacao.md`
- `docs/vetus/guides/10-modulo-agenda.md`
- `docs/vetus/guides/11-modulo-comandas.md`
- `docs/vetus/guides/12-modulo-cadastros-animais-clientes.md`
- `docs/vetus/guides/13-arquitetura-rotas-e-api.md`
- `docs/vetus/guides/14-modulo-estoque-fiscal.md`
- `docs/vetus/guides/15-modulo-rh-marketing-relatorios.md`
- `docs/vetus/guides/20-anexo-atendimento.md`
- `docs/vetus/guides/21-anexo-financeiro.md`
- `docs/vetus/guides/22-anexo-comissoes.md`
- `docs/vetus/guides/23-anexo-internacao.md`
- `docs/vetus/guides/24-anexo-laboratorio.md`

### 1.2 Trilha Enterprise comparada

- `docs/Enterprise/0190-MASTER-TRILHA-PREMIUM-ENTERPRISE-CVGHISV2.md`
- `docs/Enterprise/0191-RELATORIO-EXECUTIVO-AVALIACAO-REAL-2026-04-12.md`
- `docs/Enterprise/0192-ROADMAP-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`

### 1.3 Código real inspecionado

- SPA:
  - `apps/spa/src/navigation.ts`
  - `apps/spa/src/router/routes.ts`
  - `apps/spa/src/pages/**`
  - `apps/spa/src/services/**`
- API:
  - `apps/api/src/server.ts`
  - `apps/api/src/runtime.ts`
  - `apps/api/src/routes/**`
- Domínio:
  - `packages/modules/**`
  - `packages/tenant-context/src/middleware.ts`

---

## 2. Veredito executivo

O `cvg-his-v2` já não é um produto “vazio” nem um shell falso. A base atual tem **estrutura SPA real, volume alto de rotas, backend expressivo e muitos domínios ativos**. Ao mesmo tempo, o repositório **ainda não atingiu a profundidade ERP do Vetus** em vários blocos administrativos e laboratoriais, e parte da documentação Enterprise continua **otimista demais** em relação ao que está materializado de ponta a ponta.

### Conclusão objetiva

1. **O gap com o Vetus não está mais na navegação principal.**  
   O shell atual já espelha a taxonomia Vetus em alto grau: `Início`, `Atendimento`, `Laboratório`, `Estoque`, `Financeiro`, `Marketing`, `RH`, `Relatórios`, além de `Console Enterprise`.

2. **O gap principal está na profundidade funcional por domínio.**  
   Atendimento, cadastros, internação, governança e boa parte do core clínico têm entrega real. Laboratório, fiscal, marketing, RH administrativo e relatórios ainda não têm a mesma profundidade do Vetus.

3. **Há diferença importante entre “rota publicada” e “domínio fechado”.**  
   O projeto tem `93` rotas SPA, `48` itens navegáveis e `155` padrões de endpoint na API, mas isso não significa que todos os domínios estejam plenamente integrados, persistidos e prontos para produção.

4. **O plano Enterprise está parcialmente alinhado com o código, mas superestima alguns fechamentos.**  
   Em especial: laboratório, fiscal, financeiro profundo, marketing, RH ampliado, relatórios por área e multi-tenancy pronto para produção.

5. **O produto atual é superior ao Vetus em stack, UX moderna e governança**, mas **inferior ao Vetus na profundidade de certos backoffices operacionais clássicos**.

---

## 3. Resumo quantitativo do estado real

| Métrica | Evidência atual |
| --- | --- |
| Páginas SPA Vue | `83` |
| Rotas declaradas no router | `93` |
| Itens navegáveis publicados | `48` |
| Padrões de endpoint na API | `155` |
| Módulos de domínio em `packages/modules` | `36` |

Leitura correta: o produto está grande e ativo, mas a cobertura é desigual entre os domínios.

---

## 4. Leitura comparativa: Vetus vs plano vs código

### 4.1 Shell e navegação

**Vetus**
- shell moderno para a camada beta
- menu principal com 8 macrogrupos
- topbar orientada à operação

**Plano Enterprise**
- reorganizar o CVG para a taxonomia Vetus
- manter uma segunda camada para governança e recursos enterprise

**Código real**
- `apps/spa/src/navigation.ts` já publica:
  - `Início`
  - `Atendimento`
  - `Laboratório`
  - `Estoque`
  - `Financeiro`
  - `Marketing`
  - `RH`
  - `Relatórios`
  - `Console Enterprise`

**Veredito**
- **alinhamento alto**
- o shell alvo já está materializado
- o gap restante aqui é de refinamento, não de ausência estrutural

### 4.2 Atendimento e cadastros

**Vetus**
- agenda madura
- comandas maduras
- cadastros de clientes e animais fortes
- parte do atendimento ainda híbrida entre beta e legado

**Plano Enterprise**
- transformar atendimento em jornada principal do produto
- hubs de tutores, pacientes, agenda, fila, atendimento e prontuário

**Código real**
- SPA e API reais para:
  - tutores `/owners`
  - pacientes `/patients`
  - agenda `/appointments`
  - fila `/queue`
  - atendimentos `/encounters`
  - triagem `/triage`
  - prontuário `/medical-records`
- endpoints correspondentes existem em `apps/api/src/server.ts`
- serviços SPA usam API real nesses domínios

**Veredito**
- **domínio mais maduro do sistema**
- aqui o CVG já deixou de ser “só plano”
- o gap com o Vetus é pequeno e tende mais a acabamento operacional do que a construção base

### 4.3 Internação, cirurgia, prescrições e altas

**Vetus**
- internação funcional principalmente no legado
- shell beta fraco para o domínio

**Plano Enterprise**
- elevar esse bloco assistencial para módulo real na SPA

**Código real**
- rotas e páginas publicadas para:
  - `/inpatient`
  - `/inpatient/board`
  - `/sectors`
  - `/beds`
  - `/discharges`
  - `/surgery`
  - `/prescriptions`
  - `/prescription-executions`
- backend com endpoints reais para internação, leitos, setores, altas e execuções
- módulos existentes em `packages/modules/inpatient`, `surgery`, `discharges`, `prescription-executions`

**Veredito**
- **o CVG já supera o Vetus observado na camada moderna**
- bloco assistencial real e mais coerente que a referência híbrida do Vetus

### 4.4 Laboratório

**Vetus**
- domínio forte no legado
- exames, laudos, hemogramas, urina, bioquímico, equipamentos, tipos de laudo e referências claramente presentes

**Plano Enterprise**
- publicar laboratório como grupo próprio
- construir rotas, hubs e depois fechar backend real

**Código real**
- SPA tem grupo dedicado e rotas para:
  - `/laboratory`
  - `/laboratory/orders`
  - `/laboratory/results`
  - `/laboratory/equipment`
  - `/laboratory/report-types`
  - `/laboratory/reference-values`
  - `/diagnostics`
- porém `apps/spa/src/services/laboratory.ts` ainda:
  - deriva pedidos por fallback a partir de `encounters`, `medical-records` e `attachments`
  - usa catálogos estáticos locais para exames
  - usa listas locais para equipamentos e valores de referência
- no backend há `/diagnostics/orders`, mas não há uma API laboratorial ampla equivalente ao Vetus

**Veredito**
- **forte em superfície, médio/fraco em backend especializado**
- o plano Enterprise e `0202` estão corretos ao chamar o domínio de parcial
- o laboratório atual ainda não tem a profundidade operacional do Vetus

### 4.5 Estoque

**Vetus**
- produtos, fornecedores, estoques, validade, entrada de nota e consultas

**Plano Enterprise**
- estoque como domínio próprio com inventário, movimentações e validade

**Código real**
- rotas SPA reais:
  - `/inventory`
  - `/inventory/movements`
  - `/inventory/validity`
  - `/products`
- backend real para:
  - `/inventory`
  - `/inventory/consumptions`
  - `/inventory/lots`
  - `/products`
- módulo `packages/modules/inventory` existe e tem persistência possível por repositório
- porém o módulo ainda usa seeds e pode operar em modo `in-memory`

**Veredito**
- **mais maduro que laboratório e fiscal**
- já existe operação real
- ainda não atingiu a profundidade total do Vetus em compras, fornecedores, entrada de NF e transferências

### 4.6 Fiscal

**Vetus**
- bloco fiscal profundo e explícito:
  - ICMS
  - IPI
  - PIS
  - COFINS
  - CFOP
  - NFS-e
  - matriz ICMS
  - IBS/CBS

**Plano Enterprise**
- publicar o domínio e, depois, conectá-lo a backend real

**Código real**
- a SPA já publica várias páginas fiscais
- `apps/spa/src/services/fiscal.ts` consome `/api/fiscal/*`
- `apps/api/src/routes/fiscal-routes.ts` e `packages/modules/fiscal/src/service.ts` publicam leitura real para `summary`, `tax-preview`, `icms`, `pis-cofins`, `cfop`, `nfse`, `ncm` e `icms-matrix`
- ainda não há persistência fiscal, emissão NFS-e transacional ou backoffice fiscal profundo
- portanto o domínio hoje é **API-backed em baseline mínimo**, mas ainda raso

**Veredito**
- o maior descompasso deixou de ser ausência total de backend
- a leitura correta agora é de **baseline API-backed**, ainda distante da profundidade fiscal do Vetus
- o Vetus ainda está muito à frente nesse domínio

### 4.7 Financeiro

**Vetus**
- profundidade grande em:
  - contas a receber
  - contas a pagar
  - gaveta
  - bancos
  - centros de custo
  - fluxo de caixa
  - transações
  - split
  - DRE

**Plano Enterprise**
- o CVG deveria reorganizar billing/cash/sales para um grupo financeiro Vetus-aligned
- backlog explícito para `Contas a Receber`, `Contas a Pagar`, `Fluxo de Caixa`, `Bancos`, `Formas de Pagamento`, `Centros de Custo`, `DRE`

**Código real**
- existem páginas e endpoints para:
  - faturamento
  - caixa
  - PIX
  - orçamentos
  - vendas assistidas
- `billing`, `cash`, `quotes` e `counter-sales` têm backend real
- `pix` existe, mas o provider atual é `local-pix`
- não encontrei no produto atual:
  - contas a receber como módulo próprio
  - contas a pagar
  - fluxo de caixa gerencial estilo Vetus
  - bancos
  - centros de custo
  - formas de pagamento como domínio visível
  - DRE operacional

**Veredito**
- **financeiro presente, mas ainda raso frente ao Vetus**
- o CVG tem núcleo transacional moderno
- o Vetus ainda ganha em profundidade administrativa e contábil

### 4.8 Marketing

**Vetus**
- campanhas, layout de e-mail e SMS aparecem no menu, mas nas capturas estão majoritariamente indisponíveis

**Plano Enterprise**
- aproveitar o ganho da stack CVG e transformar marketing em comunicação operacional e campanhas

**Código real**
- grupo `Marketing` existe na navegação
- mas, na prática, ele expõe:
  - `Central de Notificações`
  - `WhatsApp Operacional`
- não há módulo real de campanhas, templates ou automações de marketing comparável a um CRM

**Veredito**
- **melhor que o shell quebrado do Vetus, mas ainda não é um marketing ERP completo**
- hoje o domínio é muito mais “notificação operacional” do que marketing

### 4.9 RH

**Vetus**
- usuários, profissionais, grupos de acesso, folgas, regras de comissão e cálculo de comissões

**Plano Enterprise**
- consolidar usuários, staff, access-control e MFA
- depois abrir comissões, profissões, departamentos e folgas

**Código real**
- existe entrega forte para:
  - usuários
  - equipe
  - governança de acesso
  - MFA
- porém não encontrei módulos reais equivalentes a:
  - comissões
  - regras de comissão
  - folgas
  - grupos de acesso no sentido operacional do RH clássico
  - departamentos e profissões como cadastros autônomos

**Veredito**
- **RH atual é forte em identidade, acesso e equipe**
- **RH administrativo clássico do Vetus ainda não foi construído**

### 4.10 Relatórios

**Vetus**
- grupo próprio com relatórios por agenda, atendimento, cadastros, estoque, financeiro, fluxo de caixa e produção

**Plano Enterprise**
- criar `Relatórios` como macrogrupo e hubs por área

**Código real**
- o grupo `Relatórios` hoje está centrado em `Relatórios Comerciais`
- existe auditoria no `Console Enterprise`, mas isso não substitui portfólio de relatórios operacionais
- não há superfície equivalente ao conjunto de relatórios por área do Vetus

**Veredito**
- **um dos gaps mais claros**
- o grupo existe, mas a profundidade ainda não acompanha o nome

---

## 5. Gap real entre o plano Enterprise e o código

### 5.1 Onde o plano e o código estão alinhados

- shell Vetus-aligned já publicado
- SPA como frontend canônico
- atendimento/cadastros fortes
- bloco assistencial moderno robusto
- governança, auditoria, MFA, API keys e webhooks reais
- observabilidade e health/métricas reais

### 5.2 Onde o plano está correto, mas ainda não foi fechado

- laboratório com backend especializado real
- aprofundamento fiscal além do baseline API-backed mínimo
- financeiro profundo no estilo ERP clássico
- marketing com campanhas/templates
- RH administrativo clássico
- relatórios por macroárea
- rollout com UAT e maior cobertura funcional

### 5.3 Onde a documentação Enterprise está otimista demais

1. **Multi-tenancy pronta para produção**
   - ainda há forte presença de `acc_cvg_demo`
   - há seeds relevantes em `runtime` e vários módulos
   - o baseline existe, mas a maturidade operacional ainda não é “fechada”

2. **Domínios “DONE” que ainda aceitam fallback ou memória**
   - vários módulos expõem `persistenceMode: 'database' | 'in-memory'`
   - isso é útil para bootstrap/teste, mas reduz a força da palavra “concluído”

3. **Laboratório**
   - a UI está publicada
   - o domínio clínico especializado ainda não está fechado como produto backend-first

4. **Fiscal**
   - a UI existe
   - o backend fiscal agora existe como superfície mínima real do ERP
   - o que ainda falta é profundidade operacional e persistência fiscal

5. **Relatórios**
   - o grupo existe
   - o portfólio analítico ainda não existe na proporção declarada pelo objetivo

---

## 6. Principais evidências técnicas da auditoria

### 6.1 Evidências de maturidade real

- `apps/spa/src/navigation.ts`
  - taxonomia Vetus-aligned materializada
- `apps/spa/src/router/routes.ts`
  - grande cobertura de rotas SPA
- `apps/api/src/server.ts`
  - cobertura ampla de endpoints reais para core clínico e comercial
- `packages/modules/inpatient`
- `packages/modules/encounters`
- `packages/modules/medical-records`
- `packages/modules/access-control`
- `packages/modules/billing`
- `packages/modules/cash`
- `packages/modules/quotes`

### 6.2 Evidências de gap ainda aberto

- `apps/spa/src/services/laboratory.ts`
  - fallback derivado + catálogos locais
- `apps/spa/src/services/fiscal.ts`
  - SPA conectada à API fiscal real, sem importar `dist` local do módulo
- `apps/api/src/routes/fiscal-routes.ts`
  - endpoints fiscais mínimos reais publicados
- `apps/spa/src/services/pix.ts`
  - provider atual `local-pix`
- `apps/api/src/runtime.ts`
  - presença forte de seeds e dependência de `acc_cvg_demo`
- `packages/modules/users/src/index.ts`
  - ambiente de seed por `NODE_ENV`
- `packages/modules/staff/src/index.ts`
- `packages/modules/owners/src/index.ts`
- `packages/modules/patients/src/index.ts`
- `packages/modules/inventory/src/index.ts`
  - seeds e/ou capacidade de operação em memória

---

## 7. Matriz final por domínio

| Domínio | Vetus | Plano Enterprise | Código real | Veredito |
| --- | --- | --- | --- | --- |
| Shell e navbar | forte | alvo explícito | forte | alinhado |
| Atendimento | forte/híbrido | alvo explícito | forte | alinhado |
| Cadastros | forte | alvo explícito | forte | alinhado |
| Internação | legado forte | alvo explícito | forte | acima da referência observada |
| Laboratório | legado forte | parcial planejado | parcial | gap relevante |
| Estoque | forte | em progresso | médio/forte | gap moderado |
| Fiscal | forte | parcial planejado | médio | gap alto |
| Financeiro | muito forte | em construção | médio | gap alto |
| Marketing | fraco no shell | evolução prevista | fraco/médio | gap moderado |
| RH | médio/forte | em construção | médio | gap moderado |
| Relatórios | forte em portfólio | em construção | fraco | gap alto |
| Governança enterprise | inexistente no Vetus | diferencial CVG | forte | vantagem do CVG |

---

## 8. Conclusão final

O estado real do repositório é este:

- o **núcleo SPA e clínico-operacional** do `cvg-his-v2` já é real, consistente e grande;
- o **plano Vetus-aligned de navegação** já está em boa parte materializado;
- o **gap central** não é mais “arrumar rotas”, e sim **construir profundidade de domínio**;
- os blocos que mais precisam de construção real para atingir a promessa do plano são:
  - laboratório backend-first
  - aprofundamento fiscal além do baseline API-backed
  - financeiro administrativo profundo
  - RH administrativo clássico
  - relatórios por área
  - limpeza definitiva de seeds/demo para produção

### Síntese em uma frase

**O CVG-HIS V2 já venceu a fase de shell e estrutura; o que falta agora é fechar os domínios ERP onde o Vetus ainda tem profundidade funcional maior que a do código atual.**
