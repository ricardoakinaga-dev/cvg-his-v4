# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `68600d6a55dcf18bd04c28ff3ee7528cc686efdb` (código funcional; reconciliação documental acompanha o candidato) |
| MAIN / ORIGIN | Coincidiram no SHA funcional `68600d6a`; atualização foi fast-forward, sem force-push |
| CURRENT CI | [#129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250): `failure`, 15/16 jobs; somente Performance falhou |
| LOCAL STRICT GATE | `BLOCKED`, score `54`, critical `54`, open P0 `16`, `publication_allowed=false` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0 |
| QUALITY BAR ASSESSMENT | score `31`, crítico `33`, open P0 `7` antes da decisão agregada do gate |
| LOCAL VALIDATION | checks estáticos, typecheck, lint e build PASS; cobertura `2.525/2.525` testes executados, E2E clínico `2/2`, SPA focada `32/32` |
| CURRENT VERDICT | **BLOCKED / NOT PROVEN**; nenhum release ou claim Triple-A autorizado |

O gate local executado no SHA atual confirmou a integridade do checkout e
passou os comandos locais de documentação, namespaces, migration source,
OpenAPI, RLS estático, superfície de deploy, Helm estático, supply chain,
dependências, schema clínico, secrets, complexidade, typecheck, lint e build.
Ele permaneceu bloqueado porque o manifesto/security evidence não estão
vinculados a um pacote externo válido e porque as evidências de CI, runtime,
recovery, UAT, governança e autoridade não foram fornecidas ao gate.

O CI #129 aprovou os contratos, testes unitários e de integração, E2E SPA,
visual, segurança, typecheck, lint, build e o contrato Windows. Performance
terminou com exit 99/1 nos passos do benchmark/SLO; o artefato e sua limitação
de acesso estão na auditoria independente em
[critic-performance-assurance-20260911.md](./critic-performance-assurance-20260911.md);
nenhuma threshold foi alterada.

O scorecard não emite `main green` nem `TRIPLE-A VERIFIED`. A baseline atual,
as limitações e o hash do prompt estão em
[15-current-baseline.md](./15-current-baseline.md).
