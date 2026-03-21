'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ContentSection, ListPageLayout, PageHeader } from '@/components/ui/PageHeader';
import { ApiError, changeMyPassword, getMyProfile, type MyProfile, updateMyProfile } from '@/lib/api';
import { px, theme } from '@/lib/theme';

type ProfileFormState = {
  email: string;
  username: string;
  fullName: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SettingsProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ email: '', username: '', fullName: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const mustChangePassword = searchParams.get('forcePasswordChange') === '1' || profile?.must_change_password === true;
  const nextPath = searchParams.get('next');

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyProfile();
        setProfile(response.profile);
        setProfileForm({
          email: response.profile.email,
          username: response.profile.username ?? '',
          fullName: response.profile.full_name
        });
      } catch (err) {
        setError(err instanceof ApiError ? err : new ApiError('Falha ao carregar perfil.', 500, null));
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const permissionPreview = useMemo(() => (profile?.permissions ?? []).slice(0, 16), [profile]);

  async function handleSaveProfile() {
    if (!profileForm.email || !profileForm.fullName) {
      setProfileMessage('Preencha e-mail e nome completo.');
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const response = await updateMyProfile({
        email: profileForm.email,
        username: profileForm.username.trim() ? profileForm.username.trim() : null,
        fullName: profileForm.fullName
      });
      setProfile(response.profile);
      setProfileForm({
        email: response.profile.email,
        username: response.profile.username ?? '',
        fullName: response.profile.full_name
      });
      setProfileMessage('Dados pessoais atualizados com sucesso.');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'Falha ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage('A nova senha precisa ter ao menos 8 caracteres.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('A confirmacao da senha nao confere.');
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setProfile((current) => current ? { ...current, must_change_password: false, password_changed_at: new Date().toISOString() } : current);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Senha alterada com sucesso.');
      if (mustChangePassword && nextPath && nextPath.startsWith('/')) {
        router.replace(nextPath);
      }
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Falha ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading && !profile) {
    return <LoadingState message="Carregando perfil do usuario..." />;
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Meu perfil"
        description="Area do usuario para atualizar dados pessoais, acompanhar papeis e trocar a propria senha."
        breadcrumbs={[
          { label: 'Configurações', href: '/settings' },
          { label: 'Meu perfil' }
        ]}
      />

      {error ? <ErrorBanner title="Erro ao carregar perfil" message={error.message} requestId={error.requestId} /> : null}
      {mustChangePassword ? (
        <ErrorBanner
          title="Troca de senha obrigatoria"
          message="Este usuario precisa alterar a senha antes de continuar navegando no sistema."
        />
      ) : null}

      <ContentSection style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', gap: px(16) }}>
        <div style={{ display: 'grid', gap: px(16) }}>
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(16) }}>
              <div style={gridStyle}>
                <Input label="Nome completo" value={profileForm.fullName} onChange={(e) => setProfileForm((current) => ({ ...current, fullName: e.target.value }))} />
                <Input label="E-mail" type="email" value={profileForm.email} onChange={(e) => setProfileForm((current) => ({ ...current, email: e.target.value }))} />
                <Input label="Username" value={profileForm.username} onChange={(e) => setProfileForm((current) => ({ ...current, username: e.target.value }))} helperText="Opcional. Pode ser usado no login quando habilitado." />
              </div>

              {profileMessage ? (
                <p style={{ margin: 0, color: profileMessage.includes('sucesso') ? '#166534' : theme.colors.danger }}>
                  {profileMessage}
                </p>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => void handleSaveProfile()} isLoading={savingProfile}>
                  Salvar dados
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguranca</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(16) }}>
              <div style={gridStyle}>
                <Input
                  label="Senha atual"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((current) => ({ ...current, currentPassword: e.target.value }))}
                />
                <Input
                  label="Nova senha"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                />
              </div>

              {passwordMessage ? (
                <p style={{ margin: 0, color: passwordMessage.includes('sucesso') ? '#166534' : theme.colors.danger }}>
                  {passwordMessage}
                </p>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => void handleChangePassword()} isLoading={savingPassword}>
                  Alterar senha
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: px(16) }}>
          <Card>
            <CardHeader>
              <CardTitle>Resumo de acesso</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(10) }}>
              <DetailRow label="Conta" value={profile?.account_id ?? '-'} />
              <DetailRow label="Unidade" value={profile?.unit_id ?? 'Nao definida'} />
              <DetailRow label="Ultimo login" value={formatDate(profile?.last_login_at)} />
              <DetailRow label="Senha alterada em" value={formatDate(profile?.password_changed_at)} />
              <DetailRow label="Troca obrigatoria de senha" value={profile?.must_change_password ? 'Sim' : 'Nao'} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Papeis atribuidos</CardTitle>
            </CardHeader>
            <CardBody style={chipsWrapStyle}>
              {(profile?.roles ?? []).length === 0 ? <span style={mutedTextStyle}>Nenhum papel atribuido.</span> : null}
              {(profile?.roles ?? []).map((role) => (
                <span key={role.id} style={chipStyle}>{role.name}</span>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissoes visiveis</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(10) }}>
              <div style={chipsWrapStyle}>
                {permissionPreview.length === 0 ? <span style={mutedTextStyle}>Nenhuma permissao carregada.</span> : null}
                {permissionPreview.map((permission) => (
                  <span key={permission.id} style={chipStyle}>{permission.key}</span>
                ))}
              </div>
              {(profile?.permissions?.length ?? 0) > permissionPreview.length ? (
                <span style={mutedTextStyle}>
                  Mostrando {permissionPreview.length} de {profile?.permissions.length} permissao(oes).
                </span>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </ContentSection>
    </ListPageLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: px(4) }}>
      <span style={{ color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 600 }}>{label}</span>
      <span style={{ color: theme.colors.textPrimary, fontSize: px(14) }}>{value}</span>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Nao informado';
  }

  return new Date(value).toLocaleString('pt-BR');
}

const gridStyle = {
  display: 'grid',
  gap: px(12)
} satisfies CSSProperties;

const chipsWrapStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: px(8)
} satisfies CSSProperties;

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: `${px(6)} ${px(10)}`,
  borderRadius: px(999),
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontSize: px(12),
  fontWeight: 600
} satisfies CSSProperties;

const mutedTextStyle = {
  color: theme.colors.textSecondary,
  fontSize: px(13)
} satisfies CSSProperties;
