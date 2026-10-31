import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

// Plain DDL instead of drizzle-kit migrations: the DB is re-seeded on boot (D11) and I cannot run
// drizzle-kit here. Add columns with new idempotent statements below.
const DDL = `
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('sandbox', 'fixture')),
  paypal_order_id TEXT,
  capture_id TEXT,
  amount_value TEXT NOT NULL,
  currency TEXT NOT NULL,
  payment_source TEXT NOT NULL CHECK (payment_source IN ('paypal_checkout', 'off_platform', 'unknown')),
  txn_ship_to TEXT,
  capture_seller_protection TEXT CHECK (capture_seller_protection IN ('ELIGIBLE', 'PARTIALLY_ELIGIBLE', 'NOT_ELIGIBLE')),
  goods_type TEXT NOT NULL CHECK (goods_type IN ('tangible', 'intangible')),
  label TEXT,
  created_at TEXT NOT NULL
);
`;

export function createDb(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.exec(DDL);
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;
