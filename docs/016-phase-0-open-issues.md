# Phase 0 Open Issues

## Duvidas restantes

- quais regras do RBAC legado devem virar capability model formal no V2
- qual sera a estrategia definitiva de ownership para dados compartilhados entre encounter, prontuario e consumo assistencial
- quais exigencias regulatórias adicionais precisam ser consideradas para assinatura e retention de prontuario

## Lacunas observadas

- o legado permite inferir muita funcionalidade, mas nem sempre deixa claro o contrato conceitual de cada modulo
- alguns modulos administrativos aparentam sobreposicao sem mapa de contexto suficientemente explicito
- ainda falta matriz detalhada de migracao entre entidades legadas e agregados alvo do V2

## Riscos para a Fase 1

- iniciar arquitetura do V2 contaminada por naming e acoplamentos antigos
- usar schema legado como atalho conceitual
- permitir que shared packages virem nova zona de mistura entre dominios

## Recomendacao para a fase seguinte

A Fase 1 deve partir destes documentos como guardrails obrigatorios e nao deve assumir que a amplitude funcional do legado equivale a qualidade estrutural suficiente para o V2.
