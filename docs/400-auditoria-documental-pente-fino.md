# 400 - Auditoria Documental: Docs vs Implementacao Atual

**Data da auditoria:** 2026-03-31
**Escopo auditado:** pasta `docs/` comparada com `apps/`, `packages/`, `infra/`, `tests/` e artefatos de deploy
**Criterio de nota:** 0-100, onde 100 significa aderencia alta, operacionalidade real e baixo risco de induzir erro

## Objetivo

Executar um pente fino na documentacao do repositorio para responder duas perguntas:

1. o que esta corretamente documentado em relacao ao que foi construido
2. o que hoje esta desatualizado, incompleto, duplicado, historico ou operacionalmente arriscado

## Metodologia

- leitura do indice documental em `docs/README.md`
- cruzamento com estrutura real de apps, modulos, schema, testes e deploy
- leitura dos documentos estruturantes das faixas `100-130` e `700-790`
- verificacao de evidencias diretamente em `apps/api/src/server.ts`, `apps/web/src/index.ts`, `apps/worker/src/index.ts`, `docker-compose.v2.yml`, `infra/*`, `tests/*`
- tentativa de execucao do gate `pnpm test:critical`

## Veredito executivo

A pasta `docs/` tem **massa critica forte**, mas esta **heterogenea**: mistura documentacao viva, historico de execucao, prompts operacionais, backlog, auditorias antigas e documentos ja ultrapassados pelo codigo. O repositorio real esta mais avancado do que parte da documentacao base sugere, especialmente em frontend, rotas HTTP, modulos implementados e camada de testes.

O principal risco nao e ausencia total de documentacao. O principal risco e **documentacao conflitante**: um leitor novo pode encontrar um documento correto, depois um documento parcialmente correto, e em seguida um documento operacionalmente perigoso sem uma sinalizacao clara de qual e a fonte de verdade.

## Placar geral

| Eixo auditado | Nota | Leitura rapida |
| --- | ---: | --- |
| Estrutura geral da pasta `docs/` | 58 | Existe organizacao por faixas, mas ha excesso de material paralelo e pouca curadoria do que e vigente |
| Indice `docs/README.md` | 52 | Bom como espinha dorsal da trilha principal, fraco como mapa real do que existe hoje no diretorio |
| Arquitetura alvo e principios | 84 | A direcao geral bate com o codigo atual |
| Documentacao de frontend | 46 | Documento estrutural relevante, mas com descricao tecnica defasada |
| Documentacao de backend | 78 | Boa aderencia conceitual, pouca profundidade operacional |
| Documentacao de worker | 70 | Aderencia conceitual boa, mas cobertura funcional rasa |
| Instalacao e publicacao do V2 real | 61 | Documento util, mas com lacunas e divergencias operacionais reais |
| Documentacao de modulos de negocio | 55 | Boa cobertura em alguns dominios, mas desigual e incompleta frente aos 20 modulos implementados |
| Documentacao de testes e validacao sistemica | 73 | Diagnostico recente e forte, mas parte da operacionalizacao ainda nao esta redonda |
| Governanca de numeracao e unicidade | 35 | Ha duplicidade de numeros e isso degrada rastreabilidade |
| Cobertura documental dos modulos implementados | 55 | Cerca de 11 de 20 modulos aparecem com algum material identificavel |

## Principais acertos

- A trilha arquitetural canonica `apps/api`, `apps/web`, `apps/worker` esta coerente com o repositorio real.
- A base documental de fundacao `100-123` ainda e util para orientar arquitetura, fases e modulos.
- A faixa `700-790` traz diagnostico recente, com linguagem mais aderente ao estado real do repositorio.
- O guia `130-instalacao-publicacao-cvg-his-v2-real.md` esta na direcao certa e e melhor do que a maioria dos documentos operacionais historicos.
- Existe material suficiente para reconstruir intencao arquitetural, fronteiras de modulo, estrategia de testes e deploy.

## Principais problemas

- O diretorio mistura documentos vivos com historico, prompts e artefatos de execucao sem uma taxonomia forte.
- O `docs/README.md` indexa apenas uma fracao do que existe no diretorio.
- Existem **duplicidades de numeracao** como `130`, `134`, `135`, `136`, `137`, `138`, `51`, `88`, `89`, `90`, `91`.
- A documentacao de frontend afirma hash routing e um conjunto pequeno de paginas, mas o frontend real usa path routing e 25 rotas.
- O guia de instalacao considera apenas 4 migrations SQL legadas no fluxo principal, embora existam 16 arquivos em `packages/shared/database/src/migrations/`.
- O `docker-compose.v2.yml` publica portas invertidas em relacao ao que o documento 130 apresenta como porta externa sugerida.
- A trilha de modulos documentados e menor que a trilha de modulos efetivamente implementados.

## Evidencias objetivas encontradas

- `apps/api/src/server.ts` expoe 58 combinacoes rota/metodo, cobrindo auth, prontuario, anexos, internacao, cirurgia, exames, billing, estoque, notificacoes, agenda, fila, encounters, triagem, busca global, owners, patients, users, staff, access-control, auditoria, setores, leitos, CEP, altas e execucao de prescricao.
- `apps/web/src/index.ts` registra 25 rotas de pagina, incluindo modulos administrativos e assistenciais que nao aparecem no documento principal de frontend.
- `apps/worker/src/index.ts` mostra worker ativo em loop de processamento, e nao apenas um placeholder textual.
- Ha 20 modulos implementados em `packages/modules/*`.
- Foram encontrados testes em `apps/api`, `packages/modules`, `tests/integration` e `e2e/tests`.
- O comando `pnpm test:critical` iniciou corretamente, mas falhou por autenticacao de banco PostgreSQL (`28P01`), evidenciando que a trilha existe, porem exige alinhamento operacional de credenciais.

## Conclusao

**Nota geral da pasta `docs/`: 57/100.**

O repositorio nao sofre de falta de documentacao. Sofre de **excesso de documentacao sem governanca editorial suficiente**. A base atual ajuda quem ja conhece o projeto, mas ainda oferece risco de desorientacao para quem precisa identificar rapidamente o que e vigente, o que e historico e o que pode ser usado como fonte operacional confiavel.

Os detalhes por eixo, com evidencias e recomendacoes, estao em `docs/410-matriz-aderencia-documental.md` e o plano priorizado esta em `docs/420-plano-atualizacao-documental.md`.
