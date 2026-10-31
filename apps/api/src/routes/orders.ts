import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db/index.js';
import { orders, type NewOrder } from '../db/schema.js';
import type { OrdersGateway } from '../paypal/orders.js';
import { orderToRow } from '../paypal/map.js';

const OrderId = z.string().regex(/^[A-Za-z0-9]{8,32}$/, 'invalid PayPal order id');
const CreateBody = z.object({
  amount: z
    .string()
    .regex(/^\d{1,7}\.\d{2}$/, 'amount must look like 120.00')
    .default('120.00'),
  line1: z.string().trim().min(1).max(100).default('123 Main St'),
});

function upsert(db: Db, row: NewOrder) {
  const set: Partial<NewOrder> = { ...row };
  delete set.id;
  db.insert(orders).values(row).onConflictDoUpdate({ target: orders.id, set }).run();
  return db.select().from(orders).where(eq(orders.id, row.id)).get();
}

export interface RouteDeps {
  db: Db;
  gateway: OrdersGateway;
  config: Pick<Config, 'paypalClientId' | 'paypalBaseUrl'>;
}

export function registerOrderRoutes(app: FastifyInstance, { db, gateway, config }: RouteDeps) {
  // The client id is public by design (the PayPal JS SDK needs it in the browser). The secret is not.
  app.get('/api/config', async () => ({
    paypalClientId: config.paypalClientId ?? null,
    sandbox: config.paypalBaseUrl.includes('sandbox'),
  }));

  // Real (sandbox) orders first, then fixtures.
  app.get('/api/orders', async () =>
    db.select().from(orders).orderBy(desc(orders.source), desc(orders.createdAt)).all(),
  );

  app.get('/api/orders/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(orders).where(eq(orders.id, id)).get();
    if (!row) return reply.code(404).send({ error: 'Order not found' });
    return row;
  });

  // Creates the PayPal order only. The DB row is written at capture (or sync).
  app.post('/api/orders', async (req) => {
    const body = CreateBody.parse(req.body ?? {});
    const created = await gateway.create(body);
    return { paypalOrderId: created.id, status: created.status, approveUrl: created.approveUrl };
  });

  app.post('/api/orders/:id/capture', async (req) => {
    const id = OrderId.parse((req.params as { id: string }).id);
    return upsert(db, orderToRow(await gateway.capture(id)));
  });

  // Imports an already-captured sandbox order via GET (no new purchase needed).
  app.post('/api/orders/:id/sync', async (req) => {
    const id = OrderId.parse((req.params as { id: string }).id);
    return upsert(db, orderToRow(await gateway.get(id)));
  });
}
