import { describe, expect, it } from 'vitest';
import { compareAddresses, normalizeAddress } from './address.js';
import { evaluate } from './evaluate.js';
import { ADDR_MAIN, G } from './fixtures.js';
import type { Address, OrderFacts } from './types.js';

const base = { city: 'Springfield', region: 'IL', postal: '62701', country: 'US' };
const addr = (line1: string, over: Partial<Address> = {}): Address => ({ line1, ...base, ...over });
const rule = (f: OrderFacts, id: string) => evaluate(f).results.find((r) => r.id === id);

describe('normalizeAddress / compareAddresses (not fixtures)', () => {
  it('treats St/Street, Apt/#/Unit and punctuation as the same', () => {
    const a = normalizeAddress(addr('123 main street, #4'));
    const b = normalizeAddress(addr('123 Main St.', { line2: 'Apt 4' }));
    expect(a.key).toBe(b.key);
    expect(a.houseNumber).toBe('123');
    expect(a.unit).toBe('4');
  });
  it('treats ZIP+4 and country aliases as equal', () => {
    expect(
      compareAddresses(
        addr('123 Main St'),
        addr('123 Main St', { postal: '62701-1234', country: 'USA' }),
      ),
    ).toBe('EQUAL');
  });
  it('same number and postal but a different street is a mismatch (overlap below 0.6)', () => {
    expect(compareAddresses(addr('123 Oak Ave'), addr('123 Main St'))).toBe('MISMATCH');
  });
  it('different postal or country is a mismatch', () => {
    expect(compareAddresses(addr('123 Main St'), addr('123 Main St', { postal: '62702' }))).toBe(
      'MISMATCH',
    );
    expect(compareAddresses(addr('123 Main St'), addr('123 Main St', { country: 'CA' }))).toBe(
      'MISMATCH',
    );
  });
  it('missing unit on one side is a mismatch', () => {
    expect(compareAddresses(addr('123 Main St'), addr('123 Main St Apt 4'))).toBe('MISMATCH');
  });
  it('only the city differing is ambiguous, not a failure', () => {
    expect(compareAddresses(addr('123 Main St'), addr('123 Main St', { city: 'Springfeld' }))).toBe(
      'AMBIGUOUS',
    );
  });
});

describe('rule edges (not fixtures)', () => {
  it('R4 applies at exactly 750 and not at 749.99', () => {
    expect(rule({ ...G, amountUsd: 750 }, 'R4')?.status).toBe('UNKNOWN');
    expect(rule({ ...G, amountUsd: 749.99 }, 'R4')?.status).toBe('N/A');
  });
  it('R5 PARTIALLY_ELIGIBLE with an SNAD claim is UNKNOWN (undefined in RULES.md)', () => {
    expect(
      rule({ ...G, captureSellerProtection: 'PARTIALLY_ELIGIBLE', claimType: 'SNAD' }, 'R5')
        ?.status,
    ).toBe('UNKNOWN');
  });
  it('R3 with a tracking number but status none is PENDING AWAITING_DELIVERY (assumption)', () => {
    const r = rule({ ...G, trackingStatus: 'none', deliveredAddress: null }, 'R3');
    expect(r?.status).toBe('PENDING');
    expect(r?.reasonCode).toBe('AWAITING_DELIVERY');
  });
  it('a blank tracking number counts as missing', () => {
    expect(rule({ ...G, trackingNumber: '  ', trackingStatus: 'none' }, 'R2')?.reasonCode).toBe(
      'NO_TRACKING',
    );
  });
  it('an advisory warning never changes the verdict', () => {
    expect(evaluate({ ...G, buyerArrangedShipping: true, txnShipTo: ADDR_MAIN }).verdict).toBe(
      'MEETS',
    );
  });
});
