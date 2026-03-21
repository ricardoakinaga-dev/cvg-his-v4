'use client';

import { FormEvent, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { isApiError } from '../../lib/api';
import { getAuthProfilePolicy, getAuthSession, isValidSession, performLogin, syncAuthSessionFromServer, type UserRole } from '../../lib/auth';
import { theme } from '../../lib/theme';
import { z } from 'zod';

// UI Components
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ToastProvider, useToast } from '../../components/ui/Toast';

// Login mode type
type LoginMode = 'email' | 'dev';

// Schema de Validação do Formulário
const EmailLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

const DevLoginSchema = z.object({
  accountId: z.string().uuid('ID da Conta inválido (deve ser UUID)'),
  role: z.enum(['admin', 'vet', 'enfermagem', 'recepcao'], {
    errorMap: () => ({ message: 'Selecione um perfil válido' })
  }),
  unitId: z.string().uuid('ID da Unidade inválido').optional().or(z.literal('')),
  userId: z.string().uuid('ID do Usuário inválido').optional().or(z.literal(''))
});

type FormErrors = {
  email?: string;
  password?: string;
  accountId?: string;
  role?: string;
  unitId?: string;
  userId?: string;
};

// Componente interno que usa useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [devForm, setDevForm] = useState({
    accountId: '',
    role: 'recepcao' as UserRole,
    unitId: '',
    userId: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const next = searchParams.get('next');
    if (!next || !next.startsWith('/')) {
      return '/';
    }
    return next;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    // Carrega sessão existente se houver
    const existingSession = getAuthSession();
    if (existingSession) {
      setDevForm(prev => ({
        ...prev,
        accountId: existingSession.accountId || '',
        role: (existingSession.role as UserRole) || 'recepcao',
        unitId: existingSession.unitId || '',
        userId: existingSession.userId || ''
      }));
    }

    async function resolveExistingSession() {
      if (isValidSession()) {
        router.replace('/');
        return;
      }

      try {
        const synced = await syncAuthSessionFromServer();
        if (!cancelled && synced) {
          router.replace('/');
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[his-web][login] failed to sync existing session', error);
        }
      }
    }

    void resolveExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleEmailChange = (field: 'email' | 'password', value: string) => {
    setEmailForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDevChange = (field: keyof typeof devForm, value: string) => {
    setDevForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const result = EmailLoginSchema.safeParse(emailForm);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof FormErrors] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast('Verifique os campos obrigatórios.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await performLogin({
        type: 'email',
        email: result.data.email,
        password: result.data.password
      });

      toast('Autenticado com sucesso!', 'success');
      const profilePolicy = await getAuthProfilePolicy();
      if (profilePolicy?.mustChangePassword) {
        router.replace(`/settings/profile?forcePasswordChange=1&next=${encodeURIComponent(redirectTo)}`);
        return;
      }
      router.replace(redirectTo);
    } catch (error) {
      console.error(error);
      let msg = 'Falha ao autenticar.';
      if (isApiError(error)) {
        msg = error.message;
        if (error.requestId) msg += ` (Req ID: ${error.requestId})`;
      } else if (error instanceof Error) {
        msg = error.message;
      }
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const result = DevLoginSchema.safeParse(devForm);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof FormErrors] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast('Verifique os campos obrigatórios.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = result.data;
      await performLogin({
        type: 'dev',
        accountId: data.accountId,
        role: data.role,
        unitId: data.unitId || undefined,
        userId: data.userId || undefined
      });

      toast('Autenticado com sucesso!', 'success');
      const profilePolicy = await getAuthProfilePolicy();
      if (profilePolicy?.mustChangePassword) {
        router.replace(`/settings/profile?forcePasswordChange=1&next=${encodeURIComponent(redirectTo)}`);
        return;
      }
      router.replace(redirectTo);
    } catch (error) {
      console.error(error);
      let msg = 'Falha ao autenticar.';
      if (isApiError(error)) {
        msg = error.message;
        if (error.requestId) msg += ` (Req ID: ${error.requestId})`;
      } else if (error instanceof Error) {
        msg = error.message;
      }
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card style={{ width: '100%', maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Entrar no CVG HIS</CardTitle>
        <p style={{ marginTop: 4, marginBottom: 0, color: theme.colors.textSecondary, fontSize: 13 }}>
          Acesso seguro via JWT.
        </p>
      </CardHeader>
      <CardBody>
        {/* Login Mode Tabs */}
        <div style={{ display: 'flex', marginBottom: 16, borderBottom: `1px solid ${theme.colors.border}` }}>
          <button
            type="button"
            onClick={() => setLoginMode('email')}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: loginMode === 'email' ? `2px solid ${theme.colors.primary}` : 'none',
              color: loginMode === 'email' ? theme.colors.primary : theme.colors.textSecondary,
              cursor: 'pointer',
              fontWeight: loginMode === 'email' ? 600 : 400
            }}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('dev')}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: loginMode === 'dev' ? `2px solid ${theme.colors.primary}` : 'none',
              color: loginMode === 'dev' ? theme.colors.primary : theme.colors.textSecondary,
              cursor: 'pointer',
              fontWeight: loginMode === 'dev' ? 600 : 400
            }}
          >
            Dev Login
          </button>
        </div>

        {loginMode === 'email' ? (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              id="email"
              type="email"
              label="Email"
              value={emailForm.email}
              onChange={(e) => handleEmailChange('email', e.target.value)}
              placeholder="admin@cvg.local"
              required
              autoFocus
              style={errors.email ? { borderColor: theme.colors.danger } : {}}
            />
            {errors.email && <span style={{ color: theme.colors.danger, fontSize: 12, marginTop: -12 }}>{errors.email}</span>}

            <Input
              id="password"
              type="password"
              label="Senha"
              value={emailForm.password}
              onChange={(e) => handleEmailChange('password', e.target.value)}
              placeholder="••••••••"
              required
              style={errors.password ? { borderColor: theme.colors.danger } : {}}
            />
            {errors.password && <span style={{ color: theme.colors.danger, fontSize: 12, marginTop: -12 }}>{errors.password}</span>}

            <Button type="submit" isLoading={isSubmitting} style={{ marginTop: 8 }}>
              Entrar
            </Button>
          </form>
        ) : (
          <form onSubmit={handleDevSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              id="accountId"
              type="text"
              label="Account ID"
              value={devForm.accountId}
              onChange={(e) => handleDevChange('accountId', e.target.value)}
              placeholder="UUID da Conta"
              required
              autoFocus
              style={errors.accountId ? { borderColor: theme.colors.danger } : {}}
            />
            {errors.accountId && <span style={{ color: theme.colors.danger, fontSize: 12, marginTop: -12 }}>{errors.accountId}</span>}

            <Select
              id="role"
              label="Role"
              value={devForm.role}
              onChange={(e) => handleDevChange('role', e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="vet">Veterinário</option>
              <option value="enfermagem">Enfermagem</option>
              <option value="recepcao">Recepção</option>
            </Select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Input
                  id="unitId"
                  label="Unit ID (Op.)"
                  value={devForm.unitId}
                  onChange={(e) => handleDevChange('unitId', e.target.value)}
                  placeholder="UUID"
                  style={errors.unitId ? { borderColor: theme.colors.danger } : {}}
                />
                {errors.unitId && <span style={{ color: theme.colors.danger, fontSize: 12 }}>{errors.unitId}</span>}
              </div>

              <div>
                <Input
                  id="userId"
                  label="User ID (Op.)"
                  value={devForm.userId}
                  onChange={(e) => handleDevChange('userId', e.target.value)}
                  placeholder="UUID"
                  style={errors.userId ? { borderColor: theme.colors.danger } : {}}
                />
                {errors.userId && <span style={{ color: theme.colors.danger, fontSize: 12 }}>{errors.userId}</span>}
              </div>
            </div>

            <Button type="submit" isLoading={isSubmitting} style={{ marginTop: 8 }}>
              Entrar (Dev)
            </Button>
            
            <p style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              ⚠️ Dev login disponível apenas em desenvolvimento
            </p>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

// Componente Principal da Página
export default function LoginPage() {
  return (
    <ToastProvider>
      <section
        style={{
          minHeight: '80vh',
          display: 'grid',
          placeItems: 'center',
          background: theme.colors.pageBg
        }}
      >
        <Suspense fallback={<div>Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </ToastProvider>
  );
}
