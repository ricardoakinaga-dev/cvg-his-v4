type HandoverRenderItem = {
  stayId: string;
  patientSnapshot: Record<string, unknown>;
  problems: unknown[];
  plan: unknown[];
  criticalMeds: unknown[];
  alerts: Record<string, unknown>;
  pending: unknown[];
  escalation: Record<string, unknown>;
  notes: string | null;
};

export type HandoverRenderInput = {
  handoverId: string;
  wardName: string;
  shiftDate: string;
  shiftPeriod: string;
  items: HandoverRenderItem[];
  generatedAt: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatJsonValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function renderList(title: string, values: unknown[]): string {
  const content =
    values.length === 0
      ? '<li><em>n/a</em></li>'
      : values.map((item) => `<li>${escapeHtml(formatJsonValue(item))}</li>`).join('');

  return `<section><h4>${escapeHtml(title)}</h4><ul>${content}</ul></section>`;
}

function renderSnapshot(snapshot: Record<string, unknown>): string {
  const entries = Object.entries(snapshot);

  if (entries.length === 0) {
    return '<p><em>Sem snapshot</em></p>';
  }

  return `<dl>${entries
    .map(
      ([key, value]) =>
        `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(formatJsonValue(value))}</dd>`
    )
    .join('')}</dl>`;
}

function renderItem(item: HandoverRenderItem, index: number): string {
  return `
    <article class="item">
      <h3>#${index + 1} Stay ${escapeHtml(item.stayId)}</h3>
      <section>
        <h4>Patient Snapshot</h4>
        ${renderSnapshot(item.patientSnapshot)}
      </section>
      ${renderList('Problems', item.problems)}
      ${renderList('Plan', item.plan)}
      ${renderList('Critical Medications', item.criticalMeds)}
      ${renderList('Pending', item.pending)}
      <section>
        <h4>Escalation</h4>
        ${renderSnapshot(item.escalation)}
      </section>
      <section>
        <h4>Alerts</h4>
        ${renderSnapshot(item.alerts)}
      </section>
      <section>
        <h4>Notes</h4>
        <p>${item.notes ? escapeHtml(item.notes) : '<em>n/a</em>'}</p>
      </section>
    </article>
  `;
}

export function renderHandoverHtml(input: HandoverRenderInput): string {
  const itemsHtml =
    input.items.length === 0
      ? '<p><em>Sem itens</em></p>'
      : input.items.map((item, index) => renderItem(item, index)).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Handover ${escapeHtml(input.handoverId)}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #1f2937; }
    header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    h1, h2, h3, h4 { margin: 0 0 8px; }
    .meta { color: #475569; margin: 4px 0; }
    .item { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin: 12px 0; }
    section { margin: 8px 0; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 4px 8px; margin: 0; }
    dt { font-weight: 600; }
    dd { margin: 0; }
    ul { margin: 0; padding-left: 20px; }
    footer { margin-top: 24px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <h1>Consolidação de Plantão</h1>
    <p class="meta"><strong>Handover:</strong> ${escapeHtml(input.handoverId)}</p>
    <p class="meta"><strong>Ala:</strong> ${escapeHtml(input.wardName)}</p>
    <p class="meta"><strong>Turno:</strong> ${escapeHtml(input.shiftDate)} (${escapeHtml(input.shiftPeriod)})</p>
  </header>
  <main>
    <h2>Itens</h2>
    ${itemsHtml}
  </main>
  <footer>
    Gerado em ${escapeHtml(input.generatedAt)}
  </footer>
</body>
</html>`;
}
