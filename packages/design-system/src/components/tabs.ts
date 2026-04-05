export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  panels: Record<string, string>;
  activeTab?: string;
  className?: string;
}

export function renderTabs(props: TabsProps): string {
  const { tabs, panels, activeTab = tabs[0]?.id ?? '', className = '' } = props;

  const classes = ['ds-tabs', className].filter(Boolean).join(' ');

  const tablistHtml = `
    <div class="ds-tabs__list" role="tablist" aria-label="Navegação por abas">
      ${tabs
        .map((tab) => {
          const isActive = tab.id === activeTab;
          const disabled = tab.disabled ? 'aria-disabled="true" tabindex="-1"' : '';
          return `<button class="ds-tabs__tab ${isActive ? 'ds-tabs__tab--active' : ''}"
          role="tab"
          id="tab-${tab.id}"
          aria-controls="panel-${tab.id}"
          aria-selected="${isActive ? 'true' : 'false'}"
          tabindex="${isActive ? '0' : '-1'}"
          ${disabled}>${tab.label}</button>`;
        })
        .join('')}
    </div>
  `;

  const panelsHtml = tabs
    .map((tab) => {
      const isActive = tab.id === activeTab;
      const content = panels[tab.id] ?? '';
      return `<div class="ds-tabs__panel ${isActive ? 'ds-tabs__panel--active' : ''}"
      role="tabpanel"
      id="panel-${tab.id}"
      aria-labelledby="tab-${tab.id}"
      tabindex="0"
      ${isActive ? '' : 'hidden'}>${content}</div>`;
    })
    .join('');

  return `<div class="${classes}">${tablistHtml}${panelsHtml}</div>`;
}
