# Módulo Alta — Testes

## Escopo de Testes

### Testes Unitários (Backend)

1. **Criar Alta**
   - Criar com dados válidos
   - Criar sem encounterId (erro)
   - Criar sem patientId (erro)
   - Criar sem dischargeType (erro)
   - Criar sem outcome (erro)
   - Criar sem dischargedAt (erro)

2. **Duplicidade**
   - Criar segunda alta para mesmo encounter (erro)

3. **Coerência**
   - Criar com patientId divergente do encounter (erro)

4. **Listagem**
   - Listar todas
   - Listar por encounter
   - Listar por patient

5. **Atualização**
   - Atualizar campos válidos
   - Incrementar versionNumber

6. **Encerramento**
   - Alta encerra atendimento

### Testes de Integração (API)

1. **POST /discharges**
   - Sucesso
   - Erro de validação
   - Duplicidade

2. **GET /discharges**
   - Listagem vazia
   - Listagem com dados
   - Filtros

3. **GET /discharges/:id**
   - Encontrado
   - Não encontrado

4. **PATCH /discharges/:id**
   - Atualização válida
   - Atualização inválida

### Testes de UI

1. **Listagem**
   - Renderiza corretamente
   - Filtros funcionam

2. **Formulário**
   - Validações client-side
   - Submit funciona
   - Erros exibidos

## Critérios de Aceite

- [ ] Todos os testes unitários passam
- [ ] API responde corretamente
- [ ] Duplicidade bloqueada
- [ ] Encerramento funciona
- [ ] Frontend sincronizado

## Executar Testes

```bash
# Unit tests
pnpm test --filter @cvg-his-v2/module-discharges

# API tests
pnpm test --filter @cvg-his-v2/api

# All tests
pnpm test:all
```
