import { LgpdDsrStateError, type LgpdErasureExecutor } from '@cvg-his-v2/module-lgpd';
import type { OwnersService } from '@cvg-his-v2/module-owners';

/**
 * Data kept after an elimination request because another legal obligation
 * requires it (LGPD art. 16). Product decision of 2026-09-26: the tutor's
 * registration is kept by default and only the titular's request removes
 * contact, profile and marketing data.
 */
export const OWNER_ERASURE_RETAINED = [
  {
    dataType: 'owner_identity',
    reason:
      'Nome, CPF e endereço vinculados a documentos fiscais e ao prontuário veterinário (LGPD art. 16, I).'
  },
  {
    dataType: 'clinical_records',
    reason: 'Prontuário do paciente mantido por obrigação profissional do médico-veterinário.'
  },
  {
    dataType: 'financial_records',
    reason: 'Registros financeiros e fiscais mantidos por obrigação contábil e tributária.'
  },
  {
    dataType: 'audit_trail',
    reason: 'Trilha de auditoria mantida para segurança e exercício regular de direitos (art. 7º, VI).'
  }
] as const;

export function createLgpdErasureExecutor(
  owners: Pick<OwnersService, 'eraseContactAndProfileData'>
): LgpdErasureExecutor {
  return async ({ accountId, subjectId, subjectType }) => {
    if (subjectType === 'patient') {
      // The animal is not a data subject; its tutor's data is erased through a
      // request filed for the tutor. Nothing personal is stored about the pet.
      return {
        executedAt: new Date().toISOString(),
        erasedDataTypes: [],
        retainedDataTypes: [
          {
            dataType: 'patient_profile',
            reason:
              'Paciente animal não é titular de dados pessoais; a eliminação dos dados do tutor exige solicitação em nome do tutor.'
          }
        ]
      };
    }
    if (subjectType !== 'owner') {
      throw new LgpdDsrStateError(
        'DSR_ERASURE_NOT_EXECUTED',
        'Eliminação de dados de usuários do sistema é feita pela administração de acesso, não por este fluxo.'
      );
    }

    const { erasedFields } = await owners.eraseContactAndProfileData(
      accountId as never,
      subjectId as never
    );
    const erasedDataTypes = erasedFields.map((field) =>
      field === 'contacts'
        ? 'owner_contacts'
        : field === 'profile'
          ? 'owner_profile'
          : 'owner_administrative_notes'
    );
    return {
      executedAt: new Date().toISOString(),
      erasedDataTypes,
      retainedDataTypes: [...OWNER_ERASURE_RETAINED]
    };
  };
}
