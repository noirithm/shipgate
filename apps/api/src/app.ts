import Fastify from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Db } from './db/index.js';
import { PayPalError } from './paypal/client.js';
import { NotCapturedError } from './paypal/map.js';
import type { OrdersGateway } from './paypal/orders.js';
import { registerOrderRoutes } from './routes/orders.js';

export interface AppDeps {
  db: Db;
  gateway: OrdersGateway;
  config: Pick<Config, 'paypalClientId' | 'paypalBaseUrl'>;
  logger?: boolean;
}

export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: deps.logger ?? false });

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Invalid request', detail: error.issues });
    }
    if (error instanceof NotCapturedError) {
      return reply.code(409).send({ error: error.message });
    }
    if (error instanceof PayPalError) {
      return reply
        .code(502)
        .send({ error: error.message, paypalStatus: error.status, detail: error.detail });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal error' });
  });

  registerOrderRoutes(app, deps);
  return app;
}
