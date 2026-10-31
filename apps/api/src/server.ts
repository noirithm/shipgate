import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { seedFixtures } from './db/seed.js';
import { PayPalHttp } from './paypal/client.js';
import { PayPalOrders } from './paypal/orders.js';

const config = loadConfig();
const db = createDb(config.databasePath); // creates tables on boot
seedFixtures(db); // re-seeds fixtures on boot (D11); idempotent

const http = new PayPalHttp({
  baseUrl: config.paypalBaseUrl,
  clientId: config.paypalClientId,
  clientSecret: config.paypalClientSecret,
});
const app = buildApp({ db, gateway: new PayPalOrders(http), config, logger: true });

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
