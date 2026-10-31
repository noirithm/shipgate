import { fixtures } from 'rules';
import type { Db } from './index.js';
import { orders } from './schema.js';

/** Inserts every fixture from packages/rules as source='fixture'. Idempotent. Returns new rows. */
export function seedFixtures(db: Db): number {
  let inserted = 0;
  const now = new Date().toISOString();
  for (const f of fixtures) {
    const res = db
      .insert(orders)
      .values({
        id: f.id,
        source: 'fixture',
        paypalOrderId: null,
        captureId: null,
        amountValue: f.facts.amountUsd.toFixed(2),
        currency: 'USD',
        paymentSource: f.facts.paymentSource,
        txnShipTo: f.facts.txnShipTo,
        captureSellerProtection: f.facts.captureSellerProtection,
        goodsType: f.facts.goodsType,
        label: f.label,
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();
    inserted += res.changes;
  }
  return inserted;
}
