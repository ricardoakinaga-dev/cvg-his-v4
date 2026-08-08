# Relatório - Vetus vs Implementação Atual

Data: 2026-05-28

Escopo analisado:

- `docs/vetus`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/api/src/routes`
- `packages/modules`
- `supabase/migrations`

## Resumo executivo

O sistema atual já implementa uma parte relevante do que foi documentado no acervo Vetus. A cobertura é forte em agenda, comandas, cadastros de clientes/animais, estoque, fiscal, laboratório, orçamentos e parte do financeiro. Em algumas áreas, o sistema atual vai além do beta documentado do Vetus, porque já possui módulos modernos de API, migrations e telas próprias onde o Vetus dependia de telas legadas.

A aderência geral estimada ao Vetus documentado é de 76/100.

Essa nota considera evidência de código existente, não validação completa de produção. Na auditoria anterior, a validação OpenAPI passou, mas os typechecks ainda falhavam em alguns pacotes. Portanto, algumas áreas devem ser consideradas implementadas em código, mas ainda não totalmente comprovadas por gates técnicos.

## Matriz de implementação

| Área Vetus | Status no sistema atual | Nota |
|---|---|---:|
| Shell, layout global e navegação | Parcial. O menu e as rotas existem, mas não há clone visual completo do shell Vetus, nem evidência do widget NPS. | 75 |
| Dashboard inicial | Parcial. Existe dashboard, mas não há comprovação de todos os widgets e indicadores do Vetus. | 70 |
| Agenda | Implementado. Há módulo de scheduling, appointments, filas e telas SPA. | 88 |
| Comandas | Implementado. O módulo `counter-sales` cobre o fluxo operacional de comanda/venda. | 86 |
| Clientes e animais | Implementado. `owners`, `patients`, detalhe do paciente e histórico clínico têm boa cobertura. | 90 |
| Serviços | Implementado. Existem telas, rotas e API para serviços. | 84 |
| Vendas | Parcial. Existe superfície de vendas via comandas/counter-sales, mas não replica totalmente a venda legada Vetus. | 76 |
| Pacotes | Parcial. Há tela de pacotes, mas a implementação parece baseada em orçamentos/quotes, sem domínio próprio robusto. | 58 |
| Orçamentos | Implementado. Quotes possuem ciclo de aprovação, rejeição, cancelamento, impressão e conversão em venda. | 86 |
| Esteira de atendimento | Parcial. Há fila/queue e handoffs clínicos, mas não há paridade exata com o fluxo legado Vetus. | 72 |
| Esteira de exames | Parcial. Coberta por pedidos/resultados laboratoriais, mas o fluxo Vetus específico não parece completo. | 70 |
| Vacinas e vermífugos | Parcial/forte. Há eventos preventivos ligados a paciente e tutor. | 78 |
| Resgate de pontos/fidelidade | Parcial. Existem tabelas, API e tela de loyalty, mas a maturidade operacional parece menor. | 72 |
| Produtos, fornecedores, fabricantes e estoques | Implementado. Boa cobertura de cadastros e estrutura de estoque. | 88 |
| Controles de estoque: NF, validade, compras e transferências | Parcial. As telas existem, mas a profundidade transacional varia por rotina. | 74 |
| Fiscal: ICMS, IPI, PIS, COFINS, CFOP, NFS-e, IBS/CBS | Implementado. Existem API, migrations e telas para as principais tabelas fiscais. | 90 |
| Financeiro dashboard/core | Parcial/forte. Caixa, billing, recebíveis, PIX e cartões existem. | 80 |
| Financeiro legado completo | Parcial. Muitas rotas existem, mas nem todas demonstram profundidade equivalente às rotinas legadas Vetus. | 68 |
| Laboratório | Implementado/parcial forte. Pedidos, resultados, hemogramas, urina, bioquímica, equipamentos e referências existem. | 84 |
| Internação e boxes | Parcial/forte. Internação, leitos, setores e board existem; subfluxos legados específicos ainda não estão totalmente claros. | 76 |
| RH: usuários, profissionais e acesso | Implementado/parcial. Usuários, staff e controle de acesso existem. | 78 |
| Comissões | Parcial fraco. Há páginas, mas parecem derivadas de staff/relatórios, sem motor dedicado robusto. | 48 |
| Marketing | Parcial. SMS, notificações e WhatsApp existem; campanhas e layouts avançados não parecem completos. | 60 |
| Relatórios | Parcial. Há workbench e hubs administrativos, mas não um motor completo de relatórios/exportação equivalente ao Vetus. | 62 |
| Integrações e governança | Implementado/parcial. API keys, webhooks, LGPD, MFA, auth e notificações existem. | 82 |

## O que está de fato bem implementado

- Agenda e marcações.
- Comandas e vendas de balcão.
- Cadastros de clientes, tutores e pacientes.
- Serviços.
- Orçamentos.
- Estoque cadastral.
- Tabelas fiscais.
- Parte relevante do laboratório.
- Parte relevante do financeiro moderno.
- Internação em nível estrutural: setores, leitos, board e relacionamento com paciente.
- Integrações técnicas como API keys, webhooks, autenticação, MFA, LGPD, notificações e WhatsApp.

## O que está parcialmente implementado

- Vendas legadas completas.
- Pacotes.
- Esteira de atendimento.
- Esteira de exames.
- Vacinas e vermífugos.
- Fidelidade/resgate de pontos.
- Controles transacionais avançados de estoque.
- Financeiro legado profundo.
- Laboratório com paridade total de telas legadas.
- Internação com ocorrência, diária e prescrição no mesmo desenho do legado.
- RH operacional completo.
- Marketing.
- Relatórios.

## Gaps principais

1. Comissões precisam virar um módulo real, com regras, cálculo, histórico, auditoria e fechamento.
2. Pacotes precisam de domínio próprio, em vez de depender principalmente de orçamentos.
3. Relatórios precisam de motor consistente, contratos de dados e exportação.
4. Financeiro precisa ser comparado rotina a rotina contra o legado Vetus.
5. Marketing precisa evoluir de notificações/SMS para campanhas completas.
6. Internação precisa fechar subfluxos de ocorrência, diária e prescrição.
7. Esteira e esteira de exames precisam de validação funcional contra os fluxos Vetus documentados.

## Conclusão

O sistema atual tem boa cobertura estrutural do Vetus, com uma base moderna bem mais ampla que uma simples cópia de telas. A maior parte dos módulos centrais já existe, mas a maturidade não é homogênea. O próximo foco técnico deve ser transformar as áreas parciais em domínios completos, começando por comissões, pacotes, relatórios, financeiro profundo e internação.
