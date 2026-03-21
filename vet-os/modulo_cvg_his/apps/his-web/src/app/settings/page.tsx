'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import { ListPageLayout, PageHeader, ContentSection } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { PERMISSIONS, usePermission } from '@/lib/rbac';
import { px, theme } from '@/lib/theme';

export default function SettingsHubPage() {
  const canManageUsers = usePermission(PERMISSIONS.USERS_READ);
  const canManageRoles = usePermission(PERMISSIONS.ROLES_READ);

  return (
    <ListPageLayout>
      <PageHeader
        title="Conta e acessos"
        description="Central de configuracao do usuario e da administracao de acesso. Aqui voce encontra seu perfil e, quando permitido, a gestao de usuarios e privilegios."
        breadcrumbs={[{ label: 'Configurações' }]}
      />

      <ContentSection style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: px(16) }}>
        <SettingsCard
          title="Meu perfil"
          description="Atualize nome, e-mail, username e troque sua senha com seguranca."
          href="/settings/profile"
          cta="Abrir perfil"
        />

        {canManageUsers ? (
          <SettingsCard
            title="Usuarios"
            description="Crie contas, ative ou desative usuarios, redefina senhas e acompanhe sessoes."
            href="/settings/users"
            cta="Gerenciar usuarios"
          />
        ) : null}

        {canManageRoles ? (
          <SettingsCard
            title="Papeis e permissoes"
            description="Defina o que cada papel pode ver ou fazer e mantenha a matriz de acesso do sistema."
            href="/settings/roles"
            cta="Configurar acessos"
          />
        ) : null}
      </ContentSection>
    </ListPageLayout>
  );
}

function SettingsCard({
  title,
  description,
  href,
  cta
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody style={{ display: 'grid', gap: px(14) }}>
        <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: px(14), lineHeight: 1.5 }}>
          {description}
        </p>
        <Link href={href} style={linkButtonStyle}>
          {cta}
        </Link>
      </CardBody>
    </Card>
  );
}

const linkButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${px(10)} ${px(14)}`,
  borderRadius: px(theme.radius.sm),
  backgroundColor: theme.colors.primary,
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: px(14)
} satisfies CSSProperties;
