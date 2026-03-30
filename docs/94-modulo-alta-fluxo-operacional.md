# Módulo Alta — Fluxo Operacional

## Fluxo Principal: Criar Alta

### Pré-condições

- Atendimento existe e está em estado que permite alta
- Paciente e tutor identificados
- Caso clínico concludedo

### Passo a Passo

```
1. Profissional acessa módulo de Alta
   ↓
2. Seleciona atendimento para dar alta
   ↓
3. Sistema carrega dados do paciente/tutor
   ↓
4. Profissional preenche:
   - Tipo de alta
   - Outcome
   - Data/hora
   - Diagnóstico final
   - Resumo clínico
   - Procedimentos
   - Medicações
   - Recomendações
   - Follow-up
   ↓
5. Sistema valida dados
   ↓
6. Profissional confirma
   ↓
7. Sistema:
   - Cria registro de alta
   - Registra evento no timeline
   - Encerra atendimento
   - (Se aplicável) Encerra internação
   - Registra auditoria
   ↓
8. Retorna confirmação
```

## Fluxo Alternativo: Alta de Internação

```
1. Internação ativa
   ↓
2. Médico decide pela alta
   ↓
3. Seleciona opção "Alta de Internação"
   ↓
4. Preenche dados clínicos
   ↓
5. Sistema vincula hospitalizationId
   ↓
6. Ao salvar:
   - Cria alta
   - Encerra internação (status → 'discharged')
   - Encerra atendimento
```

## Fluxo Alternativo: Alta Ambulatório

```
1. Atendimento ambulatorial
   ↓
2. Após consulta/treatment
   ↓
3. Seleciona "Alta Ambulatorial"
   ↓
4. Preenche dados
   ↓
5. Sem internação para encerrar
   ↓
6. Encerra apenas atendimento
```

## Fluxo: Atualizar Alta

```
1. Localizar alta existente
   ↓
2. Abrir detalhe
   ↓
3. Editar campos necessários
   ↓
4. Salvar
   ↓
5. Sistema atualiza + registra evento
```

## Fluxo: Listar Altas

```
1. Acessar listagem
   ↓
2. (Opcional) Aplicar filtros
   ↓
3. Visualizar registros
   ↓
4. Selecionar para detalhar
```

## Integração com Timeline

- **Criação**: Evento `discharge_created`
- **Atualização**: Evento `discharge_updated`

Cada evento inclui:

- Usuário que realizou
- Timestamp
- Dados relevantes

## Estados

### Encounter

- Aberto → Em andamento → Alta → Encerrado

### Hospitalization (se aplicável)

- Admitido → Em tratamento → Alta → Encerrado

### Discharge

- Criado → Atualizado (se necessário)
