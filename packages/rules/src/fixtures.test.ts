import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.js';
import { fixtures } from './fixtures.js';

// FX-A3 (buyer-side anecdote) is intentionally not a rules test; see FIXTURES.md.
describe('fixtures (FIXTURES.md)', () => {
  for (const fx of fixtures) {
    it(`${fx.id} [${fx.label}] ${fx.description}`, () => {
      const ev = evaluate(fx.facts);
      expect(ev.verdict).toBe(fx.expect.verdict);
      if (fx.expect.stage !== undefined) expect(ev.stage).toBe(fx.expect.stage);
      for (const [id, want] of Object.entries(fx.expect.rules ?? {})) {
        const got = ev.results.find((r) => r.id === id);
        expect(got?.status).toBe(want.status);
        if (want.reasonCode !== undefined) expect(got?.reasonCode).toBe(want.reasonCode);
      }
      if (fx.expect.outstanding !== undefined)
        expect(ev.outstanding).toEqual(fx.expect.outstanding);
      if (fx.expect.warningCodes !== undefined) {
        expect(ev.warnings.map((w) => w.reasonCode)).toEqual(fx.expect.warningCodes);
      }
      for (const note of fx.expect.scopeNotes ?? []) expect(ev.scopeNotes).toContain(note);
    });
  }
});
