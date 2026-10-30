import { ruleR1, ruleR2, ruleR3, ruleR4, ruleR5, ruleR6 } from './rules.js';
import type { Evaluation, OrderFacts, RuleResult, Stage, Verdict } from './types.js';

export const RULES_VERSION = 'v1-us-2026-10-29';

export const DISCLAIMER =
  'Checks published requirements only. PayPal decides eligibility in its sole discretion.';

// Scope notes are informational and never change the verdict.
export const S1_NOTE =
  'Significantly-not-as-described claims are generally described as outside PayPal Seller Protection (source not yet confirmed on PayPal\u2019s US page).';
export const S3_NOTE = 'Intangible goods are not supported in this version.';
export const S4_NOTE =
  'The buyer asked in chat to ship elsewhere. ShipGate compares the label only against the transaction ship-to address.';

export function getStage(f: OrderFacts): Stage {
  if (!f.shipped) return 'pre_ship';
  return f.trackingStatus === 'delivered' ? 'delivered' : 'shipped';
}

export function evaluate(f: OrderFacts): Evaluation {
  const stage = getStage(f);
  const scopeNotes: string[] = [];
  if (f.claimType === 'SNAD') scopeNotes.push(S1_NOTE);
  if (f.addressChangeRequested) scopeNotes.push(S4_NOTE);

  if (f.goodsType === 'intangible') {
    scopeNotes.push(S3_NOTE);
    const s3: RuleResult = {
      id: 'S3',
      status: 'UNKNOWN',
      severity: 'blocking',
      reasonCode: 'INTANGIBLE_NOT_SUPPORTED',
      message: S3_NOTE,
      sourceUrl: '',
    };
    return {
      stage,
      verdict: 'CANNOT_EVALUATE',
      results: [s3],
      warnings: [],
      outstanding: [],
      scopeNotes,
      rulesVersion: RULES_VERSION,
    };
  }

  const results = [ruleR1(f), ruleR2(f), ruleR3(f), ruleR4(f), ruleR5(f), ruleR6(f)];
  const outstanding =
    stage === 'pre_ship' ? results.filter((r) => r.status === 'PENDING').map((r) => r.id) : [];
  const warnings = results.filter(
    (r) => r.severity === 'advisory' && r.status !== 'PASS' && r.status !== 'N/A',
  );

  const blocking = results.filter((r) => r.severity === 'blocking');
  let verdict: Verdict;
  if (blocking.some((r) => r.status === 'FAIL')) {
    verdict = 'FAILS';
  } else if (
    blocking.some((r) => r.status === 'UNKNOWN' || (r.status === 'PENDING' && stage !== 'pre_ship'))
  ) {
    verdict = 'CANNOT_EVALUATE';
  } else {
    verdict = 'MEETS';
  }

  return {
    stage,
    verdict,
    results,
    warnings,
    outstanding,
    scopeNotes,
    rulesVersion: RULES_VERSION,
  };
}
