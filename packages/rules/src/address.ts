import type { Address } from './types.js';

export interface NormalizedAddress {
  houseNumber: string | null;
  unit: string | null;
  streetTokens: string[];
  city: string;
  region: string;
  postal: string;
  country: string;
  /** Canonical string. Two addresses are "equal" when their keys are equal. */
  key: string;
}

export type AddressComparison = 'EQUAL' | 'MISMATCH' | 'AMBIGUOUS';

/** Street-token overlap at or above this, with everything else matching, is "ambiguous". */
export const AMBIGUOUS_OVERLAP = 0.6;

const TOKEN_MAP = new Map<string, string>([
  ['st', 'street'],
  ['street', 'street'],
  ['ave', 'avenue'],
  ['av', 'avenue'],
  ['avenue', 'avenue'],
  ['rd', 'road'],
  ['road', 'road'],
  ['dr', 'drive'],
  ['drive', 'drive'],
  ['blvd', 'boulevard'],
  ['boulevard', 'boulevard'],
  ['ln', 'lane'],
  ['lane', 'lane'],
  ['ct', 'court'],
  ['court', 'court'],
  ['pl', 'place'],
  ['place', 'place'],
  ['apt', 'unit'],
  ['apartment', 'unit'],
  ['unit', 'unit'],
  ['ste', 'unit'],
  ['suite', 'unit'],
  ['n', 'north'],
  ['north', 'north'],
  ['s', 'south'],
  ['south', 'south'],
  ['e', 'east'],
  ['east', 'east'],
  ['w', 'west'],
  ['west', 'west'],
]);

const US_ALIASES = new Set([
  'us',
  'usa',
  'u s',
  'u s a',
  'united states',
  'united states of america',
]);

/** Lowercase, turn "#" into a unit marker, strip punctuation, collapse whitespace. ASCII only (US rules). */
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/#/g, ' unit ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalTokens(text: string): string[] {
  const out: string[] = [];
  for (const raw of normalizeText(text).split(' ')) {
    if (raw === '') continue;
    const t = TOKEN_MAP.get(raw) ?? raw;
    if (t === 'unit' && out[out.length - 1] === 'unit') continue;
    out.push(t);
  }
  return out;
}

function normalizeCountry(country: string): string {
  const c = normalizeText(country);
  return US_ALIASES.has(c) ? 'us' : c.replace(/ /g, '');
}

function normalizePostal(postal: string, country: string): string {
  const p = postal.toLowerCase().replace(/[^a-z0-9]/g, '');
  // ZIP+4 and plain ZIP are the same place for US addresses.
  if (country === 'us' && /^\d{9}$/.test(p)) return p.slice(0, 5);
  return p;
}

export function normalizeAddress(a: Address): NormalizedAddress {
  const tokens = canonicalTokens(`${a.line1} ${a.line2 ?? ''}`);

  let houseNumber: string | null = null;
  const first = tokens[0];
  if (first !== undefined && /^\d+[a-z]?$/.test(first)) {
    houseNumber = first;
    tokens.shift();
  }

  let unit: string | null = null;
  const streetTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === undefined) continue;
    if (t === 'unit') {
      const next = tokens[i + 1];
      if (next !== undefined) {
        unit = next;
        i++;
      }
      continue;
    }
    streetTokens.push(t);
  }

  const country = normalizeCountry(a.country);
  const postal = normalizePostal(a.postal, country);
  const city = normalizeText(a.city);
  const region = normalizeText(a.region ?? '');
  const key = [
    houseNumber ?? '',
    unit ?? '',
    streetTokens.join(' '),
    city,
    region,
    postal,
    country,
  ].join('|');
  return { houseNumber, unit, streetTokens, city, region, postal, country, key };
}

/** True when x and y differ by at most one insertion, deletion, substitution or adjacent swap. */
function withinOneEdit(x: string, y: string): boolean {
  if (Math.abs(x.length - y.length) > 1) return false;
  if (x.length === y.length) {
    let i = 0;
    while (i < x.length && x[i] === y[i]) i++;
    if (i === x.length) return true;
    if (x.slice(i + 1) === y.slice(i + 1)) return true;
    return x[i] === y[i + 1] && x[i + 1] === y[i] && x.slice(i + 2) === y.slice(i + 2);
  }
  const [shorter, longer] = x.length < y.length ? [x, y] : [y, x];
  let i = 0;
  while (i < shorter.length && shorter[i] === longer[i]) i++;
  return shorter.slice(i) === longer.slice(i + 1);
}

function tokensMatch(x: string, y: string): boolean {
  if (x === y) return true;
  // Tokens containing digits (e.g. "5th") and very short tokens must match exactly.
  if (/\d/.test(x) || /\d/.test(y)) return false;
  if (x.length < 4 || y.length < 4) return false;
  return withinOneEdit(x, y);
}

/** Matched tokens (one-to-one, typo-tolerant) divided by the larger token count. 0..1. */
export function streetOverlap(a: string[], b: string[]): number {
  const denom = Math.max(a.length, b.length);
  if (denom === 0) return 1;
  const used = new Set<number>();
  let matched = 0;
  for (const ta of a) {
    for (let j = 0; j < b.length; j++) {
      const tb = b[j];
      if (tb === undefined || used.has(j)) continue;
      if (tokensMatch(ta, tb)) {
        used.add(j);
        matched++;
        break;
      }
    }
  }
  return matched / denom;
}

export function compareAddresses(a: Address, b: Address): AddressComparison {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  if (na.key === nb.key) return 'EQUAL';
  if (na.houseNumber !== nb.houseNumber || na.unit !== nb.unit) return 'MISMATCH';
  if (na.postal !== nb.postal || na.country !== nb.country) return 'MISMATCH';
  return streetOverlap(na.streetTokens, nb.streetTokens) >= AMBIGUOUS_OVERLAP
    ? 'AMBIGUOUS'
    : 'MISMATCH';
}
