import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { seedFixtures } from './db/seed.js';
import { fixtures } from 'rules';

const cfg = loadConfig();
const db = createDb(cfg.databasePath);
const n = seedFixtures(db);
console.log(`Seeded ${n} new fixture orders (${fixtures.length} fixtures total).`);
