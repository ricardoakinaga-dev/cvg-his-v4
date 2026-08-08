# Plano de Rollback - Fase 2 (Encounter Refactoring)

**Data:** 20/02/2026
**Feature:** Refatoração da Página de Atendimento (/encounters/[id])
**Versão Anterior:** 1.x (monolítico)
**Versão Nova:** 2.0.0 (modular com TanStack Query)

---

## 1. Visão Geral

Este documento descreve o procedimento de rollback para reverter as mudanças da Fase 2 caso problemas críticos sejam detectados em produção.

### 1.1 Arquivos Modificados/Criados

**Novos Arquivos:**
- `apps/his-web/src/features/encounter/queries.ts`
- `apps/his-web/src/features/encounter/components/SoapEditor.tsx`
- `apps/his-web/src/features/encounter/components/ClinicalTimeline.tsx`
- `apps/his-web/src/features/encounter/components/DocumentsPanel.tsx`
- `apps/his-web/src/features/encounter/index.ts`
- `apps/his-web/src/features/encounter/__tests__/EncounterSmoke.test.tsx`

**Arquivos Modificados:**
- `apps/his-web/src/app/encounters/[id]/page.tsx`

---

## 2. Critérios para Rollback

### 2.1 Critérios Críticos (Rollback Imediato)

- [ ] Editor SOAP não salva dados
- [ ] Notas são perdidas após autosave
- [ ] Erros 500 em produção
- [ ] Dados de paciente incorretos exibidos
- [ ] Vulnerabilidade de segurança exposta

### 2.2 Critérios Menores (Avaliar Caso a Caso)

- [ ] Performance degradada (> 5s carregamento)
- [ ] Layout quebrado em dispositivos específicos
- [ ] Atalhos de teclado não funcionam
- [ ] Mensagens de erro confusas

---

## 3. Procedimento de Rollback

### 3.1 Rollback via Git (Recomendado)

```bash
# 1. Identificar o commit anterior à Fase 2
git log --oneline -20

# 2. Criar branch de backup
git checkout -b backup/phase2-rollback-$(date +%Y%m%d)

# 3. Voltar para a branch principal
git checkout main

# 4. Reverter para o commit anterior
git revert <commit-hash-da-fase2>

# OU, se preferir reset hard (CUIDADO):
git reset --hard <commit-hash-anterior>

# 5. Forçar push (se necessário)
git push origin main --force

# 6. Re-deployar
pnpm build && pnpm deploy
```

### 3.2 Rollback Seletivo de Arquivos

Se apenas alguns arquivos precisam ser revertidos:

```bash
# Restaurar arquivo específico da versão anterior
git checkout HEAD~1 -- apps/his-web/src/app/encounters/[id]/page.tsx

# Remover novos arquivos
rm apps/his-web/src/features/encounter/queries.ts
rm apps/his-web/src/features/encounter/components/SoapEditor.tsx
rm apps/his-web/src/features/encounter/components/ClinicalTimeline.tsx
rm apps/his-web/src/features/encounter/components/DocumentsPanel.tsx
rm apps/his-web/src/features/encounter/index.ts
rm -rf apps/his-web/src/features/encounter/__tests__/

# Commit e push
git add -A
git commit -m "rollback: revert phase2 encounter refactoring"
git push origin main
```

### 3.3 Rollback via Feature Flag (Se Implementado)

Se feature flags estiverem disponíveis:

```typescript
// No arquivo de configuração
const FEATURES = {
  ENCOUNTER_V2: false, // Desabilitar nova versão
};

// No page.tsx
export default function EncounterDetailsPage() {
  if (!FEATURES.ENCOUNTER_V2) {
    return <EncounterDetailsPageV1 />;
  }
  return <EncounterDetailsPageV2 />;
}
```

---

## 4. Verificação Pós-Rollback

### 4.1 Checklist de Verificação

- [ ] Página de atendimento carrega corretamente
- [ ] Notas SOAP podem ser criadas
- [ ] Notas SOAP podem ser editadas
- [ ] Notas SOAP podem ser assinadas
- [ ] Documentos podem ser anexados
- [ ] Timeline exibe eventos
- [ ] Sidebar exibe informações do paciente
- [ ] Prescrições funcionam
- [ ] Navegação entre abas funciona
- [ ] Atalhos de teclado funcionam

### 4.2 Testes de Fumaça

```bash
# Executar testes existentes
pnpm test apps/his-web/src/app/encounters

# Verificar build
pnpm build

# Verificar TypeScript
pnpm tsc --noEmit
```

---

## 5. Backup de Dados

### 5.1 Dados que NÃO são Afetados

A refatoração da Fase 2 é **apenas frontend**. Os seguintes dados NÃO são afetados:

- Notas clínicas no banco de dados
- Documentos anexados
- Timeline de eventos
- Prescrições médicas
- Dados de pacientes

### 5.2 Cache do TanStack Query

O cache do TanStack Query é armazenado em memória do navegador. Após rollback:

- Usuários podem precisar limpar cache do navegador
- Dados serão recarregados do servidor
- Nenhuma perda de dados permanente

---

## 6. Comunicação

### 6.1 Stakeholders a Notificar

- [ ] Equipe de desenvolvimento
- [ ] Equipe de QA
- [ ] Product Owner
- [ ] Suporte ao usuário
- [ ] Usuários finais (se necessário)

### 6.2 Template de Comunicação

```
ASSUNTO: Rollback - Refatoração da Página de Atendimento

Prezados,

Devido a [DESCRIÇÃO DO PROBLEMA], realizamos o rollback da refatoração 
da página de atendimento para a versão anterior.

Impacto:
- Funcionalidade: [LISTAR]
- Duração: [TEMPO]
- Usuários afetados: [NÚMERO/GRUPO]

Próximos passos:
1. [AÇÃO 1]
2. [AÇÃO 2]

A nova versão será re-lançada após correções.

Equipe de Desenvolvimento
```

---

## 7. Lições Aprendidas

Após o incidente, documentar:

1. **Causa Raiz:** O que causou o problema?
2. **Detecção:** Como o problema foi detectado?
3. **Prevenção:** Como evitar no futuro?
4. **Melhorias:** O que melhorar no processo?

---

## 8. Contatos de Emergência

| Papel | Nome | Contato |
|-------|------|---------|
| Tech Lead | | |
| DevOps | | |
| Product Owner | | |
| On-call | | |

---

**Documento gerado automaticamente pelo plano PHASE2_PLAN.md**
