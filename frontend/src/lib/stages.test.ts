import { describe, expect, it } from 'vitest';
import { darkTokens, lightTokens } from '../test/tokens';
import { STAGE_COLORS, STAGES } from './stages';

describe('STAGE_COLORS', () => {
  it('uses a stage token for every stage', () => {
    for (const stage of STAGES) {
      expect(STAGE_COLORS[stage]).toBe(`var(--stage-${stage.toLowerCase()})`);
    }
  });

  it('defines each stage token in both light and dark mode', () => {
    for (const stage of STAGES) {
      const token = `--stage-${stage.toLowerCase()}`;
      expect(lightTokens[token], token).toMatch(/^#[0-9a-f]{6}$/);
      expect(darkTokens[token], token).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
