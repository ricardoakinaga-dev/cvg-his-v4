import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();
const BOOTSTRAP_TOKEN = '0123456789abcdef'.repeat(4);

vi.mock('@/services/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

describe('setup service', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('returns the required and available installation state', async () => {
    mockApiRequest.mockResolvedValue({ setupRequired: true, setupAvailable: false });

    const { fetchSetupState } = await import('../setup');
    await expect(fetchSetupState()).resolves.toEqual({
      setupRequired: true,
      setupAvailable: false
    });
    expect(mockApiRequest).toHaveBeenCalledWith('/auth/setup/status', {
      method: 'GET',
      skipAuth: true
    });
  });

  it('keeps the legacy boolean status helper compatible', async () => {
    mockApiRequest.mockResolvedValue({ setupRequired: false, setupAvailable: true });

    const { fetchSetupStatus } = await import('../setup');
    await expect(fetchSetupStatus()).resolves.toBe(false);
  });

  it('fails closed when setup availability is missing from the response', async () => {
    mockApiRequest.mockResolvedValue({ setupRequired: true });

    const { fetchSetupState } = await import('../setup');
    await expect(fetchSetupState()).resolves.toEqual({
      setupRequired: true,
      setupAvailable: false
    });
  });

  it('rejects a status response that does not declare whether setup is required', async () => {
    mockApiRequest.mockResolvedValue({ setupAvailable: true });

    const { fetchSetupState } = await import('../setup');
    await expect(fetchSetupState()).rejects.toThrow('Invalid setup status response');
  });

  it('sends the operator-entered token in the body and excludes confirmation fields', async () => {
    mockApiRequest.mockResolvedValue({ setupCompleted: true, requiresLogin: true });

    const { completeInitialSetup } = await import('../setup');
    const result = await completeInitialSetup(
      {
        clinicName: 'Clínica Central',
        adminUsername: 'admin',
        adminFullName: 'Maria Silva',
        adminEmail: 'admin@clinica.test',
        adminPassword: 'Clinica2026!vet'
      },
      BOOTSTRAP_TOKEN
    );

    expect(result).toEqual({ setupCompleted: true, requiresLogin: true });
    expect(mockApiRequest).toHaveBeenCalledWith('/auth/setup', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        token: BOOTSTRAP_TOKEN,
        clinicName: 'Clínica Central',
        adminUsername: 'admin',
        adminFullName: 'Maria Silva',
        adminEmail: 'admin@clinica.test',
        adminPassword: 'Clinica2026!vet'
      })
    });
  });

  it('rejects a completion response that does not require a fresh login', async () => {
    mockApiRequest.mockResolvedValue({ setupCompleted: true, requiresLogin: false });

    const { completeInitialSetup } = await import('../setup');
    await expect(
      completeInitialSetup(
        {
          clinicName: 'Clínica Central',
          adminUsername: 'admin',
          adminFullName: '',
          adminEmail: 'admin@clinica.test',
          adminPassword: 'Clinica2026!vet'
        },
        BOOTSTRAP_TOKEN
      )
    ).rejects.toThrow('Invalid setup completion response');
  });
});
