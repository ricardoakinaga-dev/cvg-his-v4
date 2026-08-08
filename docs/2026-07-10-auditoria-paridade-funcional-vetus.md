# Auditoria de paridade funcional Vetus

**Data:** 10/07/2026
**Escopo:** `docs/vetus`, SPA, API, worker, modulos, migrations e testes do CVG-HIS v4
**Veredito:** **PARIDADE FUNCIONAL NAO VERIFICADA**

## 1. Resumo executivo

O CVG-HIS possui cobertura estrutural ampla e varios nucleos operacionais reais. Isso nao equivale, ainda, a entregar todas as funcionalidades do ERP Vetus.

O gate anterior `pnpm vetus:parity` retornava `91/100` porque verificava existencia de arquivos e expressoes no codigo. O gate clinico retornava `100/100` pelo mesmo motivo. Nenhum deles executava as jornadas usadas para calcular as notas.

A auditoria estrita encontrou:

- `543` artefatos em `docs/vetus`: `93` Markdown, `255` PNG, `128` JSON e `67` HTML;
- `11` macrodominios funcionais avaliados;
- cobertura de artefatos de prova de `85/100`;
- `0/11` dominios sem bloqueios conhecidos;
- telas operacionais reais convivendo com telas estaticas, read-only, mocks e fallback para memoria;
- testes importantes, mas sem cobertura ponta a ponta das quatro jornadas minimas do material enterprise.

O novo gate diferencia UI, API, persistencia, testes e E2E. Ele falha enquanto existir uma camada ausente ou um bloqueio funcional conhecido:

```bash
pnpm vetus:parity        # bloqueante; atualmente falha
pnpm vetus:parity:audit  # relatorio consultivo
pnpm vetus:parity:test   # testes do avaliador
```

## 2. Regra de fonte

O acervo Vetus documenta um produto hibrido: SPA moderna, legado operacional e rotas quebradas. Captura de tela e item de menu nao sao, isoladamente, requisito funcional aceito.

A hierarquia documental tambem esta desatualizada. `RELATORIO-ENTERPRISE-VETUS-LIKE.md` determina que um pacote `docs2` de 27 documentos prevaleca em conflitos, mas o atual `docs/docs2` possui outra taxonomia e centenas de artefatos. As contagens tambem divergem:

- exploratorio: `109` itens de menu e `292` chamadas;
- enterprise: `108` links, `316` chamadas brutas e `188` URLs unicas.

Por isso, esta auditoria usa a seguinte ordem:

1. fluxo efetivamente observado em HTML, rede ou tela funcional;
2. relatorio detalhado por entidade ou jornada;
3. capacidade enterprise como alvo, nao como prova de que o Vetus observado a executava;
4. inferencia apenas como requisito pendente de homologacao.

## 3. Matriz atual

| Dominio | Estado real | Bloqueadores principais |
| --- | --- | --- |
| Atendimento, agenda, comanda e internacao | Parcial | Sem E2E de transferencia setorial ate recebimento; internacao/cirurgia podem degradar para memoria por schema canonico incompativel. |
| Clientes, animais e auxiliares | Parcial forte | CRUD principal persiste, mas `owner_patient_links` nao existe nas migrations canonicas; faltam merge, troca de tutor e autorizados ponta a ponta. |
| Laboratorio e esteira de exames | Parcial forte | Fluxo completo Solicitado -> Coletado -> Analise -> Laudado -> Entregue nao e provado; specs possuem skips condicionais. |
| Estoque, compras e movimentacoes | Parcial | Saldo/lote/movimento existem; compra, transferencia e entrada documental de NF ainda nao fecham transacao persistida. |
| Fiscal | Parcial | Cadastros tributarios existem; NFS-e de producao, certificado, provedor municipal, rejeicao e estorno nao estao entregues. |
| Financeiro, caixa, cartoes e split | Parcial critico | Bancos, formas, maquininhas, split e habilitacao usam dados estaticos; PIX e mock; nao ha fechamento de caixa E2E. |
| Marketing e preventivo | Parcial | Campanhas persistem; configuracao SMS e layout de email nao salvam; falta consentimento/opt-out e entrega sandbox ponta a ponta. |
| Profissionais, folgas e comissoes | Parcial | Comissoes persistem; folgas e profissoes nao fecham CRUD; falta calculo ate pagamento E2E. |
| Relatorios | Parcial | Motor enterprise existe; varios workbenches sao somente leitura e falta prova worker/arquivo/entrega/retry. |
| Usuarios, acesso, auditoria e LGPD | Parcial critico | Runtime usa PostgreSQL privilegiado que ignora RLS; login nao resolve tenant; repositorios ainda escapam do contexto. |
| Integracoes e migracao Vetus | Parcial | Webhooks possuem boa base; Live Pet/Live Lab ausentes, consumidores do outbox nao ligados e importacao sem reconciliacao/rollback E2E. |

## 4. Falsas paridades encontradas

### 4.1 Financeiro cenografico

As paginas abaixo exibem registros hardcoded ou bloqueiam a operacao principal:

- `finance/BanksPage.vue`;
- `finance/PaymentMethodsPage.vue`;
- `finance/CardMachinesPage.vue`;
- `finance/SplitConfigurationPage.vue`;
- `finance/PaymentEnablementPage.vue`;
- `finance/AdvancePaymentsPage.vue`;
- `finance/CardAccountsPage.vue`;
- `finance/ChequesPage.vue`.

Elas nao podem ser usadas como evidencia de CRUD, captura, baixa, conciliacao ou repasse.

### 4.2 Estoque sem documento transacional completo

Produtos, lotes, saldos e movimentos possuem base real. Entretanto, compras e transferencias ainda montam linhas locais na SPA, e a entrada de NF deriva informacao de lotes em vez de registrar todo o documento fiscal de compra e seus efeitos atomicos.

### 4.3 Integracoes simuladas

- o adapter PIX e mock/in-memory;
- a emissao NFS-e exige SDK/certificado/provedor ainda nao configurados;
- sincronizacao PDV simula a progressao do job sem conector externo;
- email e SMS podem operar em mock;
- Live Pet e Live Lab nao possuem equivalentes comprovados.

### 4.4 Persistencia degradavel

O bootstrap verifica capacidades do schema e usa memoria quando tabelas ou colunas nao sao compativeis. Isso evita crash, mas nao entrega durabilidade Vetus. Os casos mais importantes sao `owner_patient_links`, `inpatient_progress` e `surgery_cases`, presentes apenas na trilha SQL legacy ou incompativeis com a migration canonica.

### 4.5 Seguranca multi-tenant nao efetiva

Existem policies RLS, mas API e worker usam credenciais privilegiadas. Diversos repositorios Drizzle ainda nao executam no mesmo client/transacao que configura o tenant. Enquanto isso nao for corrigido, nenhum teste funcional pode garantir isolamento em producao.

## 5. Qualidade da prova atual

Ha evidencia razoavel para:

- tutor -> paciente -> agendamento -> atendimento;
- check-in, fila, triagem, registro clinico, item faturavel e alta em happy paths;
- billing basico;
- persistencia de prontuario, timeline, triagem, anexos e handoff;
- CRUD e persistencia de webhooks.

Ainda nao existe prova suficiente para:

- comanda completa com desconto, autorizacao, multiplas formas, reabertura e estorno;
- abertura, sangria, deposito, fechamento e reconciliacao de caixa;
- NF de compra -> lote -> saldo -> obrigacao financeira;
- esteira com concorrencia de responsavel e historico setorial;
- laboratorio completo com recoleta, assinatura e entrega;
- internacao com ocupacao concorrente, medicacao, farmacia, diaria, alta e cobranca;
- preventivo -> execucao -> reagendamento -> comunicacao;
- NFS-e real, cartao, split e conciliacao;
- comissao do fato de producao ate pagamento;
- relatorio agendado pelo worker ate arquivo e destinatario;
- dois tenants usando roles PostgreSQL reais e sem `BYPASSRLS`;
- importacao Vetus idempotente e reconciliada.

Os E2E atuais tambem possuem skips condicionais em laboratorio, internacao e snapshots. O comando `test:e2e` cobre apenas `fluxos-criticos.spec.ts`, nao todo o conjunto Playwright.

## 6. Contrato para garantia

Uma capacidade Vetus so pode mudar para `verified` quando cumprir todos os itens:

1. regra de negocio e estados modelados;
2. UI operacional sem dados hardcoded ou acao principal desabilitada;
3. API validada e autorizada;
4. persistencia canonica, migration, FK, constraints e isolamento tenant;
5. testes unitarios de invariantes e erros;
6. integracao PostgreSQL com commit, rollback, concorrencia e idempotencia;
7. E2E autocontido, deterministico e sem skip;
8. auditoria e efeitos financeiros/estoque comprovados;
9. provider externo real ou sandbox homologado quando aplicavel;
10. criterio Vetus referenciado e homologado por responsavel operacional.

A nota de cobertura nao substitui esse contrato. A garantia so existe quando `pnpm vetus:parity` termina com `Functional parity: VERIFIED` e os gates completos de build, cobertura, integracao, E2E, seguranca e cutover passam no ambiente alvo.

## 7. Ordem de execucao

### P0 - Fundacao obrigatoria

1. separar roles de migration, API e worker;
2. migrar todos os repositorios tenant-scoped para transacao Drizzle tenant-aware;
3. tornar login tenant-aware;
4. unificar migrations canonicas e remover fallback silencioso em producao;
5. criar E2E PostgreSQL real para dois tenants.

### P0 - Quatro jornadas minimas Vetus

1. atendimento agendado -> comanda -> recebimento;
2. atendimento avulso -> comanda -> recebimento;
3. compra/NF -> estoque -> consumo/venda;
4. abertura -> movimentos -> fechamento de caixa.

### P1 - Hospital e fiscal

1. esteira setorial completa;
2. prontuario/receita versionada e imprimivel;
3. laboratorio ate laudo entregue;
4. internacao ate alta e cobranca;
5. NFS-e, cartao, PIX e split com providers homologados.

### P2 - Operacao ampliada

1. RH/folgas/comissoes;
2. marketing/preventivo com consentimento;
3. relatorios agendados e entregas;
4. Live Pet, Live Lab e migracao Vetus reconciliada.

## 8. Evidencia executavel adicionada

- `scripts/lib/vetus-parity-contract.mjs`: contrato por dominio e bloqueadores conhecidos;
- `scripts/lib/vetus-parity-audit.mjs`: avaliador sem piso artificial de nota;
- `scripts/vetus-parity-audit.test.mjs`: testes do avaliador;
- `scripts/check-vetus-parity.mjs`: gate estrito e modo consultivo.

## 9. Decisao

O CVG-HIS nao deve ser apresentado hoje como funcionalmente equivalente ao ERP Vetus inteiro. Ele possui varios nucleos mais modernos e robustos, mas ainda nao fecha as jornadas profundas de financeiro, estoque/compras, internacao, laboratorio, fiscal e integracoes.

Esta auditoria transforma a paridade em um resultado falsificavel: enquanto houver bloqueador conhecido, o gate falha. A implementacao deve avancar por jornadas completas e remover cada bloqueador da matriz somente junto com a respectiva prova automatizada e homologacao operacional.
