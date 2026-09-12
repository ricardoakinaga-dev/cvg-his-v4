import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateMasterPromptCrosswalk } from '../../../scripts/validate-master-prompt-crosswalk.mjs';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

function fixture() {
  return {
    crosswalk: JSON.parse(read('docs/triple-a/18-master-prompt-crosswalk.json')),
    promptText: read('docs/triple-a/MASTER_PROMPT.md'),
    missionText: read('docs/triple-a/MASTER_PROMPT_STATE_OF_ART.md'),
    qualityBar: JSON.parse(read('docs/triple-a/QUALITY_BAR_V1.json')),
    traceabilityText: read('docs/triple-a/16-requirement-traceability.md')
  };
}

describe('master prompt crosswalk', () => {
  it('accepts the frozen prompt, expanded mission and complete matrix mapping', () => {
    expect(validateMasterPromptCrosswalk(fixture())).toEqual([]);
  });

  it('rejects a prompt hash drift', () => {
    const input = fixture();
    input.promptText += '\n';
    expect(validateMasterPromptCrosswalk(input).join('\n')).toContain('source prompt hash');
  });

  it('rejects a removed or duplicated phase', () => {
    const input = fixture();
    input.crosswalk.phases[3] = { ...input.crosswalk.phases[2] };
    expect(validateMasterPromptCrosswalk(input).join('\n')).toMatch(/out-of-order|duplicate/);
  });

  it('rejects an uncovered traceability row', () => {
    const input = fixture();
    input.crosswalk.phases[0].traceability_ids = [];
    input.crosswalk.phases[0].unmapped_reason = 'fixture';
    expect(validateMasterPromptCrosswalk(input).join('\n')).toContain(
      'matrix id F00 has no prompt phase mapping'
    );
  });

  it('rejects an unsupported PASS without executable evidence', () => {
    const input = fixture();
    input.crosswalk.phases[0].status = 'PASS';
    input.crosswalk.phases[0].acceptance = { commands: [], artifacts: [] };
    expect(validateMasterPromptCrosswalk(input).join('\n')).toContain('cannot be PASS');
  });
});
