import { describe, expect, it } from 'vitest';
import { AlertSchema, DomainValidationError, OwnerCreateSchema, OwnerUpdateSchema, PatientCreateSchema, PatientUpdateSchema, parseOrThrow422 } from './index.js';
describe('domain contracts', () => {
    it('normaliza OwnerCreate email e telefone', () => {
        const parsed = OwnerCreateSchema.parse({
            fullName: '  Maria Silva  ',
            email: '  USER@EXAMPLE.COM ',
            phone: '(11) 98888-7777'
        });
        expect(parsed.fullName).toBe('Maria Silva');
        expect(parsed.email).toBe('user@example.com');
        expect(parsed.phone).toBe('11988887777');
    });
    it('rejeita OwnerUpdate vazio', () => {
        const parsed = OwnerUpdateSchema.safeParse({});
        expect(parsed.success).toBe(false);
    });
    it('rejeita PatientCreate com ownerId inválido', () => {
        const parsed = PatientCreateSchema.safeParse({
            ownerId: 'not-uuid',
            name: 'Rex',
            species: 'canine'
        });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.issues[0]?.message).toContain('UUID');
        }
    });
    it('rejeita PatientUpdate vazio', () => {
        const parsed = PatientUpdateSchema.safeParse({});
        expect(parsed.success).toBe(false);
    });
    it('normaliza AlertSchema', () => {
        const parsed = AlertSchema.parse({
            allergies: [' dipirona ', '  '],
            chronic_conditions: [' renal '],
            notes: '   '
        });
        expect(parsed.allergies).toEqual(['dipirona']);
        expect(parsed.chronic_conditions).toEqual(['renal']);
        expect(parsed.notes).toBeNull();
    });
    it('gera erro padronizado 422', () => {
        expect(() => parseOrThrow422(OwnerCreateSchema, { fullName: 'a' })).toThrow(DomainValidationError);
        try {
            parseOrThrow422(OwnerCreateSchema, { fullName: 'a' });
        }
        catch (error) {
            const validationError = error;
            const payload = validationError.toJSON();
            expect(payload.statusCode).toBe(422);
            expect(payload.code).toBe('VALIDATION_ERROR');
            expect(payload.issues.length).toBeGreaterThan(0);
        }
    });
});
//# sourceMappingURL=index.test.js.map