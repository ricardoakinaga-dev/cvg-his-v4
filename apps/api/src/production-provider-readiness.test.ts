import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ClamAvAttachmentSecurityScanner,
  S3CompatibleFileStorage
} from '@cvg-his-v2/module-attachments';

import { assertProductionProviderReadiness } from './server.js';

test('production provider readiness rejects certificate-only NFS-e that the emitter cannot sign', () => {
  const ready = {
    environment: 'production',
    pagarmeApiKey: 'pagarme-test-key',
    pagarmePixKey: 'pagarme-test-pix-key',
    nfseProvider: 'abrasf' as const,
    nfseApiUrl: 'https://nfse.test.example',
    nfseApiKey: 'nfse-test-key',
    nfseMunicipalityCode: '3550308',
    nfseIssuer: {
      cnpj: '12345678000190',
      inscricaoMunicipal: '123456',
      razaoSocial: 'CVG HIS Teste',
      address: {
        street: 'Rua Teste',
        number: '1',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01000000',
        country: 'BR'
      }
    },
    resendApiKey: 'resend-test-key',
    smsApiKey: 'sms-test-key',
    googleCalendarAccessToken: 'calendar-test-token',
    googleCalendarCalendarId: 'calendar-test-id',
    attachmentScanner: new ClamAvAttachmentSecurityScanner({ host: 'clamav.test' }),
    fileStorage: new S3CompatibleFileStorage({
      endpoint: 'https://s3.test.example',
      bucket: 'cvg-test',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret'
    })
  };
  assert.doesNotThrow(() => assertProductionProviderReadiness(ready as never));
  assert.throws(
    () =>
      assertProductionProviderReadiness({
        ...ready,
        nfseApiKey: undefined,
        nfseCertificate: Buffer.from('pfx')
      } as never),
    /certificate-only signing is not supported/
  );
});
