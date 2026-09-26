# Ownership e orçamento de complexidade

**Vigente desde:** 2026-09-02  
**Owner do processo:** Arquitetura CVG-HIS  
**Fonte executável:** [`complexity-hotspots.json`](./complexity-hotspots.json)

## Regra

Os arquivos cobertos pelo manifesto não podem crescer além do limite registrado.
O manifesto v3 também descobre automaticamente arquivos `.ts`, `.tsx`, `.js`,
`.jsx`, `.mjs`, `.cjs`, `.vue`, `.css`, `.scss` e `.sql` com mais de 2.000 linhas
nas raízes configuradas `apps`, `packages`, `scripts`, `tests`, `e2e` e
`docs/frontend/implementation`. Cada arquivo descoberto deve ter owner,
risco, motivo, plano e orçamento não crescente. Diretórios gerados configurados
(`build`, `coverage`, `dist`, `node_modules` e `vite-cache`, além dos caches
listados no manifesto) são ignorados e links simbólicos não são seguidos. O guard também rejeita
caminhos de manifesto, roots e hotspots fora do repositório, com travessia ou
com componentes simbólicos, e só lê arquivos regulares contidos na raiz
canônica. Para um arquivo incluído agora, `previous_max_lines` e `max_lines`
começam na primeira medição observada; isso cria um limite futuro e não declara
redução histórica.

O manifesto congela `current_lines`, registra `previous_max_lines` e exige que
`max_lines` seja menor ou igual ao limite anterior. Uma mudança que precise
tocar um hotspot deve manter ou reduzir seu tamanho; exceção temporária exige
ADR, responsável, prazo e redução planejada. Arquivos extraídos devem ter
responsabilidade única e testes do comportamento movido — apenas deslocar
código não encerra o plano.

O comando `pnpm complexity:check` confere existência, owner no registro de
responsabilidades, plano, medição atual, limite não crescente, risk rank, risk
level, motivo, orçamento e cobertura dos arquivos descobertos. O CI o executa
como guard bloqueante. Os limites são recalculados na revisão mensal somente
para registrar redução ou incluir um novo hotspot, nunca para absorver
crescimento sem decisão. A lista deve estar em `risk_rank` crescente e sem
lacunas; a ordem é uma priorização operacional explícita, não aprovação dos
owners.

## Ownership lógico

| Código                | Responsabilidade                                     | Revisão obrigatória          |
| --------------------- | ---------------------------------------------------- | ---------------------------- |
| `PLAT`                | composição da API, persistência e contratos internos | Plataforma                   |
| `RUNTIME`             | worker, filas, leases, retry e shutdown              | Plataforma/Operações         |
| `WEB`                 | shell, navegação e arquitetura SPA                   | Frontend                     |
| `WEB-CLIN`            | jornada clínica e paciente na SPA                    | Frontend + Clínica           |
| `WEB-FIN`             | venda, caixa e pagamentos na SPA                     | Frontend + Financeiro        |
| `WEB-REPORTS`         | workbench e exportações                              | Frontend + Reports           |
| `WEB-SCHED`           | agenda e atendimento                                 | Frontend + Operação clínica  |
| `REPORTS`             | consultas, relatórios e agendamento server-side      | Reports + Plataforma         |
| `WEB-OPS`             | dashboard e resumos operacionais                     | Frontend + Operações         |
| `WEB-CUSTOMER`        | detalhe e relações do tutor                          | Frontend + Atendimento       |
| `SEC-SUPPLY`          | validação de cadeia de suprimentos                   | Segurança de Plataforma      |
| `QUALITY-GATES`       | coordenação dos gates de release                     | Qualidade + Plataforma       |
| `API-TEST`            | testes de composição e resposta da API               | Plataforma                   |
| `API-REPORTS-TEST`    | testes de rotas de relatórios                        | Reports + Plataforma         |
| `API-SECURITY-TEST`   | testes de autenticação e autorização                 | Segurança de Plataforma      |
| `RUNTIME-TEST`        | testes do ciclo de vida do worker                    | Plataforma/Operações         |
| `PROCESS-TEST`        | testes de processo do worker                         | Plataforma/Operações         |
| `DB-INTEGRATION-TEST` | testes verticais de banco e fluxo clínico-financeiro | Dados + Clínica + Financeiro |
| `WEB-REPORTS-TEST`    | testes do workbench SPA de relatórios                | Frontend + Reports           |
| `QUALITY-TEST`        | testes da política de skips                          | Qualidade de Engenharia      |
| `API-RUNTIME-TEST`    | testes de lifecycle do servidor API                  | Plataforma                   |
| `ACCESS-CONTROL-TEST` | testes do módulo de controle de acesso               | Segurança de Plataforma      |
| `SUPPLY-CHAIN-TEST`   | testes do validador de cadeia de suprimentos         | Segurança de Plataforma      |
| `DOCS-BROWSER-TEST`   | harness executável de continuidade do navegador      | Frontend + Qualidade         |

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

## Inventário atual e ordem de risco

O manifesto executável mantém 28 entradas; o guard descobre todos os arquivos
acima de 2.000 linhas nas raízes configuradas e falha quando algum ainda não
tem owner e limite. A lista inclui páginas SPA, composição e testes de API,
scripts de supply chain/release/qualidade, runtime, fluxos de integração e o
harness de continuidade do navegador. Para os 20 arquivos incluídos neste
inventário, o limite inicial é exatamente a medição atual. `risk_reason` explica
a classificação local; uma revisão de owner
pode alterar a prioridade, mas não pode elevar `max_lines` para acomodar
crescimento.
