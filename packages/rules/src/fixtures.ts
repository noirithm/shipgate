import { S1_NOTE, S4_NOTE } from './evaluate.js';
import type { Address, OrderFacts, RuleStatus, Stage, Verdict } from './types.js';

export type FixtureLabel = 'synthetic' | 'unverified anecdote';

export interface ExpectedRule {
  status: RuleStatus;
  reasonCode?: string;
}

export interface Fixture {
  id: string;
  label: FixtureLabel;
  description: string;
  facts: OrderFacts;
  expect: {
    verdict: Verdict;
    stage?: Stage;
    rules?: Record<string, ExpectedRule>;
    outstanding?: string[];
    warningCodes?: string[];
    scopeNotes?: string[];
  };
}

const city = { city: 'Springfield', region: 'IL', postal: '62701', country: 'US' };
export const ADDR_MAIN: Address = { line1: '123 Main St', ...city };
export const ADDR_OFFICE: Address = { line1: '500 Office Park Dr', ...city };

/** Base "good" order G from FIXTURES.md. Stage: delivered. */
export const G: OrderFacts = {
  amountUsd: 120,
  goodsType: 'tangible',
  paymentSource: 'paypal_checkout',
  txnShipTo: ADDR_MAIN,
  labelAddress: ADDR_MAIN,
  shipped: true,
  trackingNumber: 'SIM-TRACK-0001',
  trackingStatus: 'delivered',
  deliveredAddress: ADDR_MAIN,
  signatureConfirmation: null,
  buyerArrangedShipping: null,
  addressChangeRequested: false,
  captureSellerProtection: 'ELIGIBLE',
  claimType: 'INR',
};

const make = (over: Partial<OrderFacts>): OrderFacts => ({ ...G, ...over });
const PRE_SHIP: Partial<OrderFacts> = {
  shipped: false,
  trackingNumber: null,
  trackingStatus: 'none',
  deliveredAddress: null,
};

// Anecdote facts that FIXTURES.md lists as unknown are null here. Placeholders are marked.
export const fixtures: Fixture[] = [
  {
    id: 'FX-A1',
    label: 'unverified anecdote',
    description:
      '$900 delivered with signature; txn address, capture status, payment source unknown',
    facts: make({
      amountUsd: 900,
      paymentSource: 'unknown',
      txnShipTo: null,
      labelAddress: null,
      deliveredAddress: null,
      trackingNumber: 'PLACEHOLDER-A1',
      signatureConfirmation: true,
      captureSellerProtection: null,
    }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      stage: 'delivered',
      rules: {
        R1: { status: 'UNKNOWN', reasonCode: 'NO_TXN_ADDRESS' },
        R2: { status: 'PASS' },
        R3: { status: 'UNKNOWN' },
        R4: { status: 'PASS' },
        R5: { status: 'UNKNOWN', reasonCode: 'NO_CAPTURE_STATUS' },
      },
    },
  },
  {
    id: 'FX-A2',
    label: 'unverified anecdote',
    description:
      '$50 shipped, in transit when the INR claim opened; txn address, capture status unknown',
    facts: make({
      amountUsd: 50,
      txnShipTo: null,
      labelAddress: null,
      deliveredAddress: null,
      trackingNumber: 'PLACEHOLDER-A2',
      trackingStatus: 'in_transit',
      captureSellerProtection: null,
    }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      stage: 'shipped',
      rules: {
        R1: { status: 'UNKNOWN', reasonCode: 'NO_TXN_ADDRESS' },
        R2: { status: 'PASS' },
        R3: { status: 'PENDING', reasonCode: 'AWAITING_DELIVERY' },
      },
    },
  },
  {
    id: 'FX-A4',
    label: 'unverified anecdote',
    description:
      'SNAD claim, tracking present; amount unspecified (100 is a placeholder), txn address and capture unknown',
    facts: make({
      amountUsd: 100,
      txnShipTo: null,
      labelAddress: null,
      deliveredAddress: null,
      trackingNumber: 'PLACEHOLDER-A4',
      captureSellerProtection: null,
      claimType: 'SNAD',
    }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      rules: {
        R1: { status: 'UNKNOWN', reasonCode: 'NO_TXN_ADDRESS' },
        R2: { status: 'PASS' },
        R3: { status: 'N/A', reasonCode: 'CLAIM_NOT_INR' },
      },
      scopeNotes: [S1_NOTE],
    },
  },
  {
    id: 'FS-01',
    label: 'synthetic',
    description: 'happy path, stage delivered',
    facts: make({}),
    expect: {
      verdict: 'MEETS',
      stage: 'delivered',
      rules: {
        R1: { status: 'PASS' },
        R2: { status: 'PASS' },
        R3: { status: 'PASS' },
        R4: { status: 'N/A' },
        R5: { status: 'PASS' },
        R6: { status: 'N/A' },
      },
      outstanding: [],
      warningCodes: [],
    },
  },
  {
    id: 'FS-02',
    label: 'synthetic',
    description: 'pre_ship, otherwise G',
    facts: make(PRE_SHIP),
    expect: {
      verdict: 'MEETS',
      stage: 'pre_ship',
      rules: {
        R1: { status: 'PASS' },
        R2: { status: 'PENDING' },
        R3: { status: 'PENDING' },
        R5: { status: 'PASS' },
      },
      outstanding: ['R2', 'R3'],
    },
  },
  {
    id: 'FS-03',
    label: 'synthetic',
    description: 'pre_ship, label is 500 Office Park Dr',
    facts: make({ ...PRE_SHIP, labelAddress: ADDR_OFFICE }),
    expect: {
      verdict: 'FAILS',
      stage: 'pre_ship',
      rules: { R1: { status: 'FAIL', reasonCode: 'ADDRESS_MISMATCH' } },
    },
  },
  {
    id: 'FS-04',
    label: 'synthetic',
    description: 'shipped, in transit',
    facts: make({ trackingStatus: 'in_transit', deliveredAddress: null }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      stage: 'shipped',
      rules: { R2: { status: 'PASS' }, R3: { status: 'PENDING', reasonCode: 'AWAITING_DELIVERY' } },
      outstanding: [],
    },
  },
  {
    id: 'FS-05',
    label: 'synthetic',
    description: 'shipped, tracking number null',
    facts: make({ trackingNumber: null, trackingStatus: 'none', deliveredAddress: null }),
    expect: {
      verdict: 'FAILS',
      stage: 'shipped',
      rules: { R2: { status: 'FAIL', reasonCode: 'NO_TRACKING' }, R3: { status: 'N/A' } },
    },
  },
  {
    id: 'FS-06',
    label: 'synthetic',
    description: 'delivered at a different address',
    facts: make({ deliveredAddress: { line1: '77 Elm St', ...city } }),
    expect: {
      verdict: 'FAILS',
      stage: 'delivered',
      rules: { R3: { status: 'FAIL', reasonCode: 'DELIVERED_ELSEWHERE' } },
    },
  },
  {
    id: 'FS-07',
    label: 'synthetic',
    description: '$900, signature true',
    facts: make({ amountUsd: 900, signatureConfirmation: true }),
    expect: { verdict: 'MEETS', rules: { R4: { status: 'PASS' } } },
  },
  {
    id: 'FS-08',
    label: 'synthetic',
    description: '$900, signature false',
    facts: make({ amountUsd: 900, signatureConfirmation: false }),
    expect: {
      verdict: 'FAILS',
      rules: { R4: { status: 'FAIL', reasonCode: 'SIGNATURE_MISSING' } },
    },
  },
  {
    id: 'FS-09',
    label: 'synthetic',
    description: '$900, signature null',
    facts: make({ amountUsd: 900, signatureConfirmation: null }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      rules: { R4: { status: 'UNKNOWN', reasonCode: 'SIGNATURE_UNDECIDED' } },
    },
  },
  {
    id: 'FS-10',
    label: 'synthetic',
    description: 'capture NOT_ELIGIBLE',
    facts: make({ captureSellerProtection: 'NOT_ELIGIBLE' }),
    expect: { verdict: 'FAILS', rules: { R5: { status: 'FAIL' } } },
  },
  {
    id: 'FS-11',
    label: 'synthetic',
    description: 'capture PARTIALLY_ELIGIBLE, claim INR',
    facts: make({ captureSellerProtection: 'PARTIALLY_ELIGIBLE' }),
    expect: { verdict: 'MEETS', rules: { R5: { status: 'PASS' } } },
  },
  {
    id: 'FS-12',
    label: 'synthetic',
    description: 'capture PARTIALLY_ELIGIBLE, claim UNAUTHORIZED',
    facts: make({ captureSellerProtection: 'PARTIALLY_ELIGIBLE', claimType: 'UNAUTHORIZED' }),
    expect: { verdict: 'FAILS', rules: { R3: { status: 'N/A' }, R5: { status: 'FAIL' } } },
  },
  {
    id: 'FS-13',
    label: 'synthetic',
    description: 'buyer-arranged shipping true',
    facts: make({ buyerArrangedShipping: true }),
    expect: { verdict: 'MEETS', warningCodes: ['WARN_BUYER_ARRANGED'] },
  },
  {
    id: 'FS-14',
    label: 'synthetic',
    description: 'off_platform, txnShipTo null',
    facts: make({ paymentSource: 'off_platform', txnShipTo: null }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      rules: { R1: { status: 'UNKNOWN', reasonCode: 'NO_TXN_ADDRESS' } },
    },
  },
  {
    id: 'FS-15',
    label: 'synthetic',
    description: 'chat asks to ship elsewhere, label = new address, txn unchanged (pre_ship)',
    facts: make({ ...PRE_SHIP, addressChangeRequested: true, labelAddress: ADDR_OFFICE }),
    expect: {
      verdict: 'FAILS',
      stage: 'pre_ship',
      rules: { R1: { status: 'FAIL', reasonCode: 'ADDRESS_MISMATCH' } },
      scopeNotes: [S4_NOTE],
    },
  },
  {
    id: 'FS-16',
    label: 'synthetic',
    description: 'chat asks to ship elsewhere, seller keeps txn address',
    facts: make({ addressChangeRequested: true }),
    expect: { verdict: 'MEETS', rules: { R1: { status: 'PASS' } }, scopeNotes: [S4_NOTE] },
  },
  {
    id: 'FS-17',
    label: 'synthetic',
    description: 'intangible goods',
    facts: make({ goodsType: 'intangible' }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      rules: { S3: { status: 'UNKNOWN', reasonCode: 'INTANGIBLE_NOT_SUPPORTED' } },
    },
  },
  {
    id: 'FS-18',
    label: 'synthetic',
    description: '"123 main street, #4" vs "123 Main St Apt 4"',
    facts: make({
      txnShipTo: { line1: '123 Main St Apt 4', ...city },
      labelAddress: { line1: '123 main street, #4', ...city },
      deliveredAddress: { line1: '123 Main St Apt 4', ...city },
    }),
    expect: { verdict: 'MEETS', rules: { R1: { status: 'PASS' }, R3: { status: 'PASS' } } },
  },
  {
    id: 'FS-19',
    label: 'synthetic',
    description: 'label 125 Main St vs txn 123 Main St',
    facts: make({ labelAddress: { line1: '125 Main St', ...city } }),
    expect: { verdict: 'FAILS', rules: { R1: { status: 'FAIL', reasonCode: 'ADDRESS_MISMATCH' } } },
  },
  {
    id: 'FS-20',
    label: 'synthetic',
    description: 'label "123 Mian St" (typo), same postal',
    facts: make({ labelAddress: { line1: '123 Mian St', ...city } }),
    expect: {
      verdict: 'CANNOT_EVALUATE',
      rules: { R1: { status: 'UNKNOWN', reasonCode: 'ADDRESS_AMBIGUOUS' } },
    },
  },
];
