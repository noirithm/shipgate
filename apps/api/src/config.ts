import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Load the repo-root .env if present. Secrets stay in .env only (never in chat or git).
try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // .env is optional: the grid and seed work without PayPal credentials.
}

const Env = z.object({
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_BASE_URL: z.string().min(1).default('https://api-m.sandbox.paypal.com'),
  PORT: z.coerce.number().int().default(3001),
  DATABASE_PATH: z.string().min(1).default('data/shipgate.db'),
});

export interface Config {
  paypalClientId: string | undefined;
  paypalClientSecret: string | undefined;
  paypalBaseUrl: string;
  port: number;
  databasePath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = Env.parse(env);
  return {
    paypalClientId: e.PAYPAL_CLIENT_ID,
    paypalClientSecret: e.PAYPAL_CLIENT_SECRET,
    paypalBaseUrl: e.PAYPAL_BASE_URL,
    port: e.PORT,
    databasePath: e.DATABASE_PATH,
  };
}
