export interface SkeletonProps {
  variant?: 'text' | 'heading' | 'avatar' | 'button' | 'card' | 'table-row' | 'table-cell';
  width?: string;
  height?: string;
  animate?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function renderSkeleton(props: SkeletonProps = {}): string {
  const {
    variant = 'text',
    width,
    height,
    animate = true,
    ariaLabel = 'Carregando...',
    className = ''
  } = props;

  const variantHeights: Record<NonNullable<SkeletonProps['variant']>, string> = {
    text: '16px',
    heading: '24px',
    avatar: '40px',
    button: '44px',
    card: '120px',
    'table-row': '48px',
    'table-cell': '20px'
  };

  const variantWidths: Record<NonNullable<SkeletonProps['variant']>, string> = {
    text: '100%',
    heading: '60%',
    avatar: '40px',
    button: '120px',
    card: '100%',
    'table-row': '100%',
    'table-cell': '100%'
  };

  const classes = [
    'ds-skeleton',
    `ds-skeleton--${variant}`,
    animate ? 'ds-skeleton--animate' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const style = `style="width:${width ?? variantWidths[variant]};height:${height ?? variantHeights[variant]};"`;

  return `<div class="${classes}" ${style} role="status" aria-label="${ariaLabel}"></div>`;
}
