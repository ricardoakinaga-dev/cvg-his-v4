# Reconstruction Rationale

## Objetivo deste documento

Formalizar por que o CVG-HIS precisa de reconstrucao deliberada e por que o legado nao deve ser promovido a baseline estrutural do V2.

## Contexto observado

O repositorio atual contem um sistema real, com cobertura funcional importante em autenticacao, RBAC, cadastro mestre, atendimento, internacao, exames, documentos, auditoria, notificacoes, financeiro e estoque. Esse valor operacional, no entanto, convive com sinais claros de acumulacao estrutural:

- crescimento orientado por iteracoes e entregas, nao por fundacao arquitetural unica
- fronteiras de dominio pouco consistentes entre clinico, administrativo e infraestrutura
- multiplicacao de modulos com naming heterogeneo
- presenca de regras e contratos espalhados entre apps, packages, schemas e documentacao historica
- risco de usar o legado como "atalho de aceleracao" e carregar a divida para o V2

## Por que reconstruir

O problema central nao e falta de funcionalidade. O problema central e que a base atual nao oferece fronteiras suficientemente claras para evoluir um HIS veterinario robusto, auditavel, seguro e preparado para crescimento real.

A reconstrucao e necessaria para:

1. separar claramente identidade, cadastro mestre, atendimento, prontuario, consumo assistencial e modulos administrativos
2. impedir que regra clinica relevante fique distribuida de forma opaca entre UI, handlers, services e schemas
3. transformar auditoria, autorizacao e versionamento em fundacao, nao em remendo tardio
4. criar uma estrutura em que novos modulos possam crescer sem replicar acoplamentos antigos
5. permitir migracao controlada do legado para o V2 por ondas, e nao por copia estrutural

## Riscos de continuar expandindo o legado

- aumento de sobreposicao entre modulos e perda de ownership
- proliferacao de naming inconsistente e conceitos duplicados
- maior chance de cruzamento indevido entre prontuario, faturamento e estoque
- endurecimento da divida tecnica em fluxos clinicos sensiveis
- dificuldade crescente de auditar comportamento real do sistema
- risco de autorizar acessos por conveniencia de tela em vez de politica centralizada

## Visao da reconstrucao

O V2 sera uma base nova, modular e orientada a bounded contexts, com o legado preservado como:

- referencia funcional
- fonte de regras descobertas
- fonte de comparacao para migracao

O legado nao sera usado como:

- baseline estrutural
- arvore principal de implementacao
- modelo automatico de package e ownership

## Principios da reconstrucao

1. O legado e material de referencia, nao alicerce do V2.
2. Regra clinica material deve viver em dominio e backend, nao apenas no frontend.
3. Autorizacao deve ser centralizada em policy layer, nunca hardcoded por tela.
4. Auditoria e rastreabilidade sao requisitos de fundacao.
5. Cada modulo precisa ter fronteira explicita, contratos publicos e ownership de dados.
6. Prontuario, financeiro e estoque nao compartilham modulo por conveniencia.
7. Toda heranca do legado precisa de justificativa tecnica explicita.

## Criterios para herdar algo do legado

Um artefato so pode ser herdado quando:

- expressa regra de negocio valida
- pode ser encapsulado em fronteira clara
- nao arrasta acoplamento estrutural ruim
- preserva seguranca, auditoria e rastreabilidade

## Decisao estrategica

O CVG-HIS V2 sera reconstruido em nova base e o legado ficara confinado ao papel de referencia funcional e fonte de migracao. Continuar expandindo o sistema antigo como se ele fosse a base do V2 e uma decisao explicitamente rejeitada nesta fase.
