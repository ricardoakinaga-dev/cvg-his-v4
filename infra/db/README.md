# Database Bootstrap

Na Fase 2, `packages/shared/database` expõe apenas um adapter placeholder e status de dependencia.

## Objetivo

- reservar o espaco operacional para banco
- impedir que a camada de dados fique implícita

## Proximo passo

A wiring real de banco entra nas fases de identidade e modulos core, sem transformar este pacote em acoplamento central indevido.
