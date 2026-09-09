---
document_status: current
document_kind: hospital-uat-protocol
effective_date: 2026-09-09
owner: Clinical Safety + Hospital Operations
review_cycle: per release candidate and after clinical workflow change
---

# Protocolo de UAT hospitalar

Este protocolo prepara uma validação humana em homologação com PostgreSQL e
dados sintéticos. Ele não autoaprova nada. O estado inicial e o estado deste
repositório são `NOT PROVEN` até que pessoas reais, autorizadas pelo hospital,
executem os cenários e anexem evidência estável ao SHA candidato.

## Perfis obrigatórios

| Perfil | ID de evidência | Responsabilidade mínima |
|---|---|---|
| Recepção | `reception` | check-in, identificação correta do tutor/paciente e encaminhamento |
| Veterinário | `veterinarian` | atendimento, prescrição, exames e decisão clínica |
| Internação | `inpatient` | internação, medicação, exames, alta e pendências de plantão |
| Admin | `admin` | permissões, setores, usuários e conferência de negações |

O workflow histórico de certificação visual possui cinco funções técnicas,
incluindo patologia e ultrassonografia. Ele continua sendo uma barreira
adicional quando disparado; este protocolo hospitalar não substitui seus
checks, e acrescenta os quatro perfis operacionais exigidos para a aceitação
clínica transversal.

## Cenários

Cada cenário deve registrar início/fim, resultado, passos observados,
evidência imutável e incidentes. Um cenário bloqueado não é convertido em
aceito por comentário ou retry.

| ID | Perfil primário | Resultado observável |
|---|---|---|
| `check-in` | `reception` | tutor/paciente corretos, atendimento/queue criados sem trocar conta |
| `atendimento` | `veterinarian` | anamnese/atendimento e prescrição são salvos com ator e auditoria |
| `internacao` | `inpatient` | admissão, leito e contexto do paciente permanecem consistentes |
| `medicacao` | `inpatient`, `veterinarian` | execução única, validações clínicas e dedupe preservados |
| `exames` | `veterinarian`, `inpatient` | pedido, resultado e timeline permanecem no paciente/tenant correto |
| `alta` | `veterinarian`, `inpatient` | alta válida cria o follow-up correto e não perde pendências |
| `workflow` | `inpatient`, `veterinarian` | acknowledge/complete/cancel, overdue e histórico de eventos |
| `handover` | `inpatient` | pendências, alertas, exames e medicações são recebidos e reconhecidos |

## Preparação e execução

1. Fixar o SHA completo do candidato, ambiente, versão de banco e inventário
   de dados sintéticos.
2. Criar usuários nominativos sem compartilhar senha ou token. Registrar nome,
   identificador corporativo, função/delegação e aprovador responsável.
3. Executar todos os cenários aplicáveis aos quatro perfis, incluindo um caso
   negativo de tenant/permission/lifecycle por área.
4. Capturar logs redigidos, URLs internas/IDs de execução, screenshots quando
   úteis e export de auditoria. Não capturar PHI real.
5. Repetir somente após corrigir a causa documentada; retries não podem
   esconder falha, skip ou flaky.
6. Fazer revisão conjunta de Produto/QA/Engenharia/Operação Clínica e registrar
   `go` ou `no-go` com ata e responsáveis.

## Contrato do artefato

O gerador local produz o esqueleto em
`artifacts/usability/uat-evidence.json`, mas o esqueleto é deliberadamente
`NOT_PROVEN` e não pode ser usado como aprovação. O pacote real deve conter,
no mínimo:

```json
{
  "schemaVersion": 1,
  "evidenceType": "cvg-his-hospital-uat",
  "candidateSha": "<sha de 40 caracteres>",
  "status": "PASS",
  "decision": "go",
  "profiles": [],
  "goNoGo": {
    "decision": "go",
    "evidenceReference": "<ata/artefato imutável>",
    "approvers": {}
  }
}
```

`PASS/go` exige os quatro perfis, todos os cenários aplicáveis aceitos,
acessibilidade/teclado revisados, nenhum risco P0/P1 aberto, aprovadores
nominativos e referência que possa ser verificada por terceiro. Placeholder,
aprovação sem pessoa, link sem SHA ou resultado apenas local mantém
`BLOCKED / NOT PROVEN`.

## Critério de promoção

O protocolo só fecha quando o artefato real está vinculado ao SHA do release,
o workflow técnico correspondente está verde e o gate
`pnpm release:triple-a` o recebe por `TRIPLE_A_UAT_EVIDENCE`. O owner do
hospital é a autoridade para aceitar risco clínico; o CI não pode substituir
essa decisão.
