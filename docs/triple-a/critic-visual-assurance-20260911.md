# Revisão visual e de UX — escopo delimitado

**SHA revisado:** `b77539c9891eef89cbbe8160bf6e30a0fb369d48`
**Tipo:** revisão interna bounded; não é aprovação independente nem UAT.

A superfície SPA contém jornadas de atendimento, inpatient, handover,
Patient 360 e busca mestre. Os testes versionados cobrem axe em jornadas
críticas, overflow e foco em viewports responsivos, além de capturas visuais
em 1280×720 e jornadas mobile em 390×844. O CI #126 terminou o job de Visual
Regression com sucesso no SHA exato, e a SPA focada passou `32/32` localmente.

Os limites observados são de evidência, não um defeito visual reproduzido:
não houve revisão humana independente com contexto fresco nesta coleta,
aceite clínico/UAT, teste de toque em dispositivo real, zoom/reflow assistivo
ou prova de screenshots autenticados no ambiente alvo. A tentativa de iniciar
um crítico visual fresco foi impedida pelo limite de threads da sessão; por
isso este documento deve permanecer classificado como bounded e não pode
fechar `UX-001`.

O estado correto é `NOT PROVEN` até que um crítico visual independente e UAT
hospitalar sejam ligados ao SHA candidato, com artefatos de render e registro
de aceite. Nenhum claim Triple-A é emitido por esta revisão.
