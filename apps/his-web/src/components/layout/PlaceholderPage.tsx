/**
 * PlaceholderPage - Premium placeholder component for pages under construction
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { PageShell } from './PageShell';
import { Card, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import styles from './PlaceholderPage.module.css';

export interface PlaceholderPageProps {
  /** Page title */
  title: string;
  /** Module/sector name for breadcrumb */
  moduleName: string;
  /** Description of what this module will do */
  description: string;
  /** Optional features list */
  features?: string[];
  /** Optional icon name */
  iconName?: string;
}

/**
 * Module icons
 */
function ModuleIcon({ name }: { name?: string }) {
  const iconMap: Record<string, JSX.Element> = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  };

  return (
    <div className={styles.iconWrapper}>
      <span className={styles.icon}>
        {iconMap[name || 'default'] || iconMap.default}
      </span>
    </div>
  );
}

/**
 * PlaceholderPage Component
 */
export function PlaceholderPage({
  title,
  moduleName,
  description,
  features,
  iconName,
}: PlaceholderPageProps) {
  return (
    <PageShell
      title={title}
      breadcrumbs={[
        { title: moduleName },
        { title },
      ]}
    >
      <div className={styles.container}>
        <ModuleIcon name={iconName} />

        <Badge variant="warning" size="lg">
          Em Construção
        </Badge>

        <h2 className={styles.title}>
          {title}
        </h2>

        <p className={styles.description}>
          {description}
        </p>

        {features && features.length > 0 && (
          <Card variant="outlined" className={styles.featuresCard}>
            <CardBody>
              <h3 className={styles.featuresTitle}>
                Funcionalidades Planejadas
              </h3>
              <ul className={styles.featuresList}>
                {features.map((feature, index) => (
                  <li key={index} className={styles.featureItem}>
                    <svg className={styles.featureIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

/**
 * Create a placeholder page with standard configuration
 */
export function createPlaceholderPage(
  title: string,
  moduleName: string,
  description: string,
  features?: string[]
) {
  return function Placeholder() {
    return (
      <PlaceholderPage
        title={title}
        moduleName={moduleName}
        description={description}
        features={features}
      />
    );
  };
}
