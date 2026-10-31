import { fixtures } from 'rules';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createDb } from './db/index.js';
import { seedFixtures } from './db/seed.js';
import type { OrdersGateway } from './paypal/orders.js';
import { PpOrder } from './paypal/schemas.js';
import { REAL_ORDER } from './test/real-order.js';

function setup(status = 'COMPLETED') {
  const db = createDb(':memory:');
  seedFixtures(db);
  const order = PpOrder.parse({ ...structuredClone(REAL_ORDER), status });
  const gateway: OrdersGateway = {
    create: async () => ({ id: 'FAKE12345', status: 'PAYER_ACTION_REQUIRED', approveUrl: null }),
    capture: async () => order,
    get: async () => order,
  };
  const app = buildApp({
    db,
    gateway,
    config: { paypalClientId: 'test-id', paypalBaseUrl: 'https://api-m.sandbox.paypal.com' },
  });
  return { db, app };
}

describe('orders API', () => {
  it('seeds every fixture as source=fixture and re-seeding adds nothing', async () => {
    const { db, app } = setup();
    expect(seedFixtures(db)).toBe(0);
    const rows = (await app.inject({ url: '/api/orders' })).json();
    expect(rows).toHaveLength(fixtures.length);
    expect(rows.every((r: { source: string }) => r.source === 'fixture')).toBe(true);
  });

  it('sync stores the real order and lists it first with PayPal seller_protection', async () => {
    const { app } = setup();
    const res = await app.inject({ method: 'POST', url: '/api/orders/75L28331XD192951T/sync' });
    expect(res.statusCode).toBe(200);
    expect(res.json().captureSellerProtection).toBe('ELIGIBLE');
    const rows = (await app.inject({ url: '/api/orders' })).json();
    expect(rows).toHaveLength(fixtures.length + 1);
    expect(rows[0].id).toBe('75L28331XD192951T');
    expect(rows[0].txnShipTo.line1).toBe('123 Main St');
  });

  it('returns 409 when the order is not captured', async () => {
    const { app } = setup('PAYER_ACTION_REQUIRED');
    const res = await app.inject({ method: 'POST', url: '/api/orders/75L28331XD192951T/sync' });
    expect(res.statusCode).toBe(409);
  });

  it('rejects a malformed order id', async () => {
    const { app } = setup();
    const res = await app.inject({ method: 'POST', url: '/api/orders/bad!id/capture' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a malformed amount on create', async () => {
    const { app } = setup();
    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: { amount: '12' } });
    expect(res.statusCode).toBe(400);
  });
});
