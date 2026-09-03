# Ownership e orçamento de complexidade

**Vigente desde:** 2026-09-02  
**Owner do processo:** Arquitetura CVG-HIS  
**Fonte executável:** [`complexity-hotspots.json`](./complexity-hotspots.json)

## Regra

Os oito maiores arquivos do produto não podem crescer além do número de linhas
registrado no manifesto. Uma mudança que precise tocar um hotspot deve manter ou
reduzir seu tamanho; exceção temporária exige ADR, responsável, prazo e redução
planejada. Arquivos extraídos devem ter responsabilidade única e testes do
comportamento movido — apenas deslocar código não encerra o plano.

O comando `pnpm complexity:check` confere existência, owner, plano e orçamento.
O CI o executa como guard bloqueante. Os limites são recalculados na revisão
mensal somente para registrar redução ou incluir um novo hotspot, nunca para
absorver crescimento sem decisão.

## Ownership lógico

| Código | Responsabilidade | Revisão obrigatória |
|---|---|---|
| `PLAT` | composição da API, persistência e contratos internos | Plataforma |
| `RUNTIME` | worker, filas, leases, retry e shutdown | Plataforma/Operações |
| `WEB` | shell, navegação e arquitetura SPA | Frontend |
| `WEB-CLIN` | jornada clínica e paciente na SPA | Frontend + Clínica |
| `WEB-FIN` | venda, caixa e pagamentos na SPA | Frontend + Financeiro |
| `WEB-REPORTS` | workbench e exportações | Frontend + Reports |
| `WEB-SCHED` | agenda e atendimento | Frontend + Operação clínica |
| `REPORTS` | consultas, relatórios e agendamento server-side | Reports + Plataforma |

O [`CODEOWNERS`](../../.github/CODEOWNERS) converte a responsabilidade em pedido
de revisão no GitHub. Enquanto só houver um mantenedor nominal no repositório,
ele é o aprovador técnico; os códigos acima continuam identificando a disciplina
que precisa participar da decisão.

## Ordem de decomposição

1. `apps/api/src/server.ts`: retirar registro e composição por domínio.
2. páginas de vendas e relatórios: separar estado, efeitos e renderização.
3. detalhe do paciente e agenda: separar tabs/jornadas e reduzir acoplamento.
4. `routes.ts`, módulo de reports e runner: criar agregadores pequenos após as
   fronteiras anteriores estarem estabilizadas.

Cada extração deve publicar antes/depois em linhas, complexidade quando
disponível, testes afetados e owner do novo módulo.
