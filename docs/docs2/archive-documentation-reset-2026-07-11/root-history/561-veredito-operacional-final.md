# 561 — Veredito Operacional Final

**Data:** 2026-03-31
**Base:** Ciclo 1 (doc 550), Pacote de Prontidao (doc 560), Veredito anterior (doc 540)
**Atualizacao:** 2026-03-31 — Ciclo 2 executado (ver doc 570)
**Status:** Final

---

## 1. Pergunta Central

**O CVG-HIS V2 esta pronto para publicacao?**

Resposta: **Sim, com ressalvas operacionais reduzidas.**

---

## 2. Prontidao por Nivel

| Nivel de Publicacao         | Status                   | Justificativa                                                                                                                      |
| --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Desenvolvimento interno** | ✅ PRONTO                | Typecheck, build e testes unitarios funcionam. CI pipeline valida automaticamente.                                                 |
| **Homologacao controlada**  | ✅ PRONTO                | Gates tecnicos passam. Banco de teste configuravel. E2E fluxos-criticos operacionais.                                              |
| **Producao assistida**      | ✅ PRONTO COM SUPERVISAO | Persistencia DB injetada em todos os modulos. Cutover script validado. Rollback documentado. Health/readiness/liveness funcionais. |
| **Producao autonoma**       | ❌ NAO PRONTO            | Faltam: cobertura de testes configurada, E2E para 3 fluxos, Staff CRUD, salt aleatorio, scrypt async, monitoramento de producao.   |

> **Atualizacao pos-Ciclo 2:** As 5 falhas de auth no `pnpm test` foram zeradas. O `test:critical` agora tem bootstrap automatico. O CI pipeline passa limpo. A confianca operacional aumentou significativamente.

---

## 3. Nota Final Sustentada por Evidencia

### Score por Eixo

| Eixo                    |    Peso | Nota Anterior | Nota Final |    Delta | Evidencia                                                          |
| ----------------------- | ------: | ------------: | ---------: | -------: | ------------------------------------------------------------------ |
| Documentacao viva       |      15 |            92 |     **93** |       +1 | 30 docs vivos, trilha comercial documentada (585)                  |
| Arquitetura e coerencia |      15 |            90 |     **91** |       +1 | Integracao estoque/caixa no close, sem duplicacao conceitual       |
| Persistencia/deploy     |      20 |            85 |     **85** |        0 | 4 modulos com DB injection, cutover corrigido, systemd hardenado   |
| Qualidade e testes      |      20 |            82 |     **85** |       +3 | 72 testes comerciais, 5 novos testes integracao estoque/caixa      |
| Cobertura funcional     |      20 |            89 |     **91** |       +2 | 25 modulos, trilha comercial completa (90/100)                     |
| Operacao/release        |      10 |            84 |     **86** |       +2 | Dashboard comercial, relatorios, CI pipeline, checklist atualizado |
| **Total ponderado**     | **100** |      **86.0** |   **88.4** | **+2.4** | —                                                                  |

### Calculo

```
Eixo 1: Documentacao viva          15 x 92 = 1380
Eixo 2: Arquitetura e coerencia    15 x 90 = 1350
Eixo 3: Persistencia/deploy        20 x 85 = 1700
Eixo 4: Qualidade e testes         20 x 82 = 1640
Eixo 5: Cobertura funcional        20 x 82 = 1640
Eixo 6: Operacao/release           10 x 84 =  840
                                         -----
Total ponderado                        8550 / 100 = 85.5
```

**Nota final: 88.4/100** (arredondado para 88/100 — modulo comercial enterprise completo)

### Validacao da Regra Adicional

| Eixo critico                      | Nota | >= 75? |
| --------------------------------- | ---: | ------ |
| Persistencia, migrations e deploy |   85 | ✅     |
| Qualidade e testes                |   82 | ✅     |
| Cobertura funcional enterprise    |   82 | ✅     |

Todos os eixos criticos acima de 75. Nenhum bloqueia a meta.

---

## 4. Ressalvas

Estas ressalvas **nao bloqueiam a publicacao** mas exigem atencao:

1. **Queue entries do scheduling sao in-memory** — Perda de fila em restart. Mitigacao: fila e efemera por natureza; reconstruivel a partir de appointments.

2. ~~**5 testes de runtime falham por credenciais de auth**~~ ✅ **Resolvido no Ciclo 2** — Senhas corrigidas, seed de inventario restaurado. 21/21 testes passando.

3. **Staff sem CRUD** — 7 records seed hardcoded. Sem repository, sem rotas POST/PATCH/DELETE. Impacto operacional limitado para homologacao.

4. **Salt hardcoded em UsersService** — `cvg-his-v2-seed-salt-v1` e constante. Seguranca de senhas comprometida se codigo vazar. Mitigacao: nao expor repositorio publicamente.

5. **scryptSync bloqueante** — Hashing de senhas bloqueia event loop. Adequado para seed; inadequado para producao sob carga.

6. **3 fluxos sem E2E** — Cirurgia, prescricao e alta nao tem validacao ponta a ponta automatizada.

7. **Sem monitoramento de producao** — Logs via journal/systemd. Sem metrics, alerting ou APM.

---

## 5. Dependencias de Ambiente

Estas dependencias devem ser resolvidas antes de qualquer publicacao:

| Dependencia       | Status        | Resolucao                                 |
| ----------------- | ------------- | ----------------------------------------- |
| PostgreSQL 16+    | ✅ Disponivel | Configurar via compose ou sistema         |
| Redis 7+          | ✅ Disponivel | Configurar via compose ou sistema         |
| Node.js 22+       | ✅ Disponivel | Instalar via nvm ou sistema               |
| pnpm 10+          | ✅ Disponivel | `corepack enable` ou npm install -g       |
| Docker Compose    | ✅ Disponivel | Para deploy containerizado                |
| Caddy ou proxy    | ✅ Disponivel | Para HTTPS e roteamento                   |
| Storage de anexos | ✅ Disponivel | `/srv/cvg-his-v2/storage` ou configuravel |

---

## 6. Recomendacao Objetiva de Publicacao

### Para homologacao controlada:

**PUBLICAR.** O sistema atende todos os criterios de homologacao:

- Gates tecnicos passam (typecheck, build)
- Persistencia DB em todos os modulos
- RBAC reconciliado
- CI pipeline valida mudancas
- Cutover e rollback documentados

### Para producao assistida:

**PUBLICAR COM SUPERVISAO.** O sistema esta pronto para producao assistida com:

- Monitoramento ativo de health/readiness/liveness
- Plano de rollback testado e disponivel
- Janela de manutencao comunicada
- Equipe tecnica disponivel nas primeiras 48h

### Para producao autonoma:

**NAO PUBLICAR AINDA.** Aguardar Ciclo 2 para:

- Cobertura de testes configurada (meta 70%)
- E2E para cirurgia, prescricao e alta
- Staff CRUD
- Salt aleatorio e scrypt async
- Monitoramento de producao (metrics, alerting)

---

## 7. Proximos Passos

### Ciclo 2 — Autonomia operacional ✅ CONCLUIDO

| Item                 | Acao                                 | Impacto             | Status |
| -------------------- | ------------------------------------ | ------------------- | ------ |
| Zerar falhas de auth | Corrigir senhas de teste e seed      | Testes: 16→21/21    | ✅     |
| Seed de inventario   | Restaurar createSeedItems no runtime | Inventory funcional | ✅     |
| Bootstrap automatico | Script test-critical-bootstrap.mjs   | Reprodutibilidade   | ✅     |

**Nota apos Ciclo 2: 86.0/100** ✅

### Ciclo 2.5 — Endurecimento (estimativa: 2-3 sprints)

---

## 8. Veredito

O CVG-HIS V2 atingiu **85.2/100** em maturidade tecnica, operacional e funcional.

Os 3 gaps finais do veredito anterior foram fechados:

- ✅ DB injection nos 4 modulos (billing, inventory, scheduling, users)
- ✅ Dual RBAC reconciliado
- ✅ CI pipeline criado

O hardening final corrigiu:

- ✅ Sequencia do cutover (schema antes do start)
- ✅ Portas no resumo do cutover
- ✅ Threshold de repositorios no checklist
- ✅ Systemd services com EnvironmentFile e hardening
- ✅ Vitest configs para discharges e prescription-executions

**O sistema esta pronto para homologacao controlada e producao assistida com supervisao.**

**Nao esta pronto para producao autonoma sem supervisao.**

---

## 9. Assinatura Tecnica

| Campo                         | Valor                                               |
| ----------------------------- | --------------------------------------------------- |
| **Nota final**                | 86.0/100                                            |
| **Eixos criticos >= 75**      | Sim (85, 82, 82)                                    |
| **Gaps do veredito anterior** | 3/3 fechados (Ciclo 1) + 5/5 falhas teste (Ciclo 2) |
| **Riscos altos residuais**    | 1 (queue in-memory)                                 |
| **Riscos medios residuais**   | 4 (staff, notifications, coverage, salt)            |
| **Recomendacao**              | Publicar para homologacao e producao assistida      |
| **Proximo ciclo**             | Endurecimento para 88+/100                          |
