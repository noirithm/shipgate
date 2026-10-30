import { describe, expect, it } from 'vitest';
import { DISCLAIMER, RULES_VERSION, evaluate, fixtures } from './index.js';

describe('public API and wording', () => {
  it('exports the disclaimer and a rules version', () => {
    expect(DISCLAIMER).toContain('PayPal decides eligibility in its sole discretion');
    expect(RULES_VERSION).toContain('v1');
  });
  it('never uses the word "protected" and always carries a reason code and message', () => {
    for (const fx of fixtures) {
      const ev = evaluate(fx.facts);
      for (const r of [...ev.results, ...ev.warnings]) {
        expect(r.message).not.toMatch(/protected/i);
        expect(r.reasonCode.length > 0).toBe(true);
        expect(r.message.length > 0).toBe(true);
      }
      for (const n of ev.scopeNotes) expect(n).not.toMatch(/protected/i);
    }
  });
});
