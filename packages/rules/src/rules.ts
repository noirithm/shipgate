import { compareAddresses } from './address.js';
import type { OrderFacts, RuleResult, RuleStatus } from './types.js';

/** Source URLs copied from RULES.md. Several are still unconfirmed on the US page (STATE.md U6, U8). */
export const SOURCES = {
  R1: 'https://www.paypal.com/us/security/seller-protection',
  R2: 'https://www.paypal.com/us/webapps/mpp/ua/seller-protection',
  R3: 'https://www.paypal.com/us/webapps/mpp/ua/seller-protection',
  R4: 'https://help.shopify.com/manual/payments/paypal/paypal-seller-protection/',
  R5: 'https://developer.paypal.com/sdk/orders/v2/definitions/capture',
  R6: 'https://pep.paypal.com/ca/webapps/mpp/ua/seller-protection',
} as const;

export const SIGNATURE_THRESHOLD_USD = 750;

type Severity = RuleResult['severity'];

function res(
  id: string,
  status: RuleStatus,
  severity: Severity,
  reasonCode: string,
  message: string,
  sourceUrl: string,
): RuleResult {
  return { id, status, severity, reasonCode, message, sourceUrl };
}

function hasText(s: string | null): s is string {
  return s !== null && s.trim() !== '';
}

/** R1 Ship to the transaction address (blocking). */
export function ruleR1(f: OrderFacts): RuleResult {
  const u = SOURCES.R1;
  if (f.txnShipTo === null) {
    return res(
      'R1',
      'UNKNOWN',
      'blocking',
      'NO_TXN_ADDRESS',
      'The transaction ship-to address is not on file, so the label address cannot be checked against it.',
      u,
    );
  }
  if (f.labelAddress === null) {
    return res(
      'R1',
      'UNKNOWN',
      'blocking',
      'NO_LABEL_ADDRESS',
      'No label address has been entered or confirmed yet.',
      u,
    );
  }
  switch (compareAddresses(f.labelAddress, f.txnShipTo)) {
    case 'EQUAL':
      return res(
        'R1',
        'PASS',
        'blocking',
        'ADDRESS_MATCH',
        'The label address matches the transaction ship-to address.',
        u,
      );
    case 'AMBIGUOUS':
      return res(
        'R1',
        'UNKNOWN',
        'blocking',
        'ADDRESS_AMBIGUOUS',
        'The label address is very close to the transaction ship-to address but not identical. Confirm it is the same place, or correct the label.',
        u,
      );
    case 'MISMATCH':
      return res(
        'R1',
        'FAIL',
        'blocking',
        'ADDRESS_MISMATCH',
        'The label address differs from the transaction ship-to address. PayPal publishes that shipping to a different address can remove eligibility.',
        u,
      );
  }
}

/** R2 Verifiable tracking (blocking, counts from stage shipped). */
export function ruleR2(f: OrderFacts): RuleResult {
  const u = SOURCES.R2;
  if (!f.shipped) {
    return res(
      'R2',
      'PENDING',
      'blocking',
      'PENDING_SHIPMENT',
      'Not shipped yet. A tracking number will be required once the order ships.',
      u,
    );
  }
  if (!hasText(f.trackingNumber)) {
    return res(
      'R2',
      'FAIL',
      'blocking',
      'NO_TRACKING',
      'The order is marked shipped but has no tracking number.',
      u,
    );
  }
  return res('R2', 'PASS', 'blocking', 'TRACKING_PRESENT', 'A tracking number is on file.', u);
}

/** R3 Proof of delivery (blocking, item-not-received claims only). */
export function ruleR3(f: OrderFacts): RuleResult {
  const u = SOURCES.R3;
  if (f.claimType !== 'INR') {
    return res(
      'R3',
      'N/A',
      'blocking',
      'CLAIM_NOT_INR',
      'Proof of delivery is checked for item-not-received claims only.',
      u,
    );
  }
  if (!f.shipped) {
    return res(
      'R3',
      'PENDING',
      'blocking',
      'PENDING_SHIPMENT',
      'Not shipped yet. Proof of delivery will be needed after shipping.',
      u,
    );
  }
  if (!hasText(f.trackingNumber)) {
    return res(
      'R3',
      'N/A',
      'blocking',
      'NO_TRACKING',
      'There is no tracking number, so there can be no proof of delivery. R2 reports this.',
      u,
    );
  }
  if (f.trackingStatus !== 'delivered') {
    return res(
      'R3',
      'PENDING',
      'blocking',
      'AWAITING_DELIVERY',
      'Tracking shows the package has not been delivered. In-transit tracking is not proof of delivery.',
      u,
    );
  }
  if (f.txnShipTo === null) {
    return res(
      'R3',
      'UNKNOWN',
      'blocking',
      'NO_TXN_ADDRESS',
      'Delivered, but the transaction ship-to address is not on file, so the delivery address cannot be compared.',
      u,
    );
  }
  if (f.deliveredAddress === null) {
    return res(
      'R3',
      'UNKNOWN',
      'blocking',
      'NO_DELIVERY_ADDRESS',
      'Delivered, but the delivery address is not recorded.',
      u,
    );
  }
  if (compareAddresses(f.deliveredAddress, f.txnShipTo) === 'EQUAL') {
    return res(
      'R3',
      'PASS',
      'blocking',
      'DELIVERED_TO_ADDRESS',
      'Delivered to the transaction ship-to address.',
      u,
    );
  }
  return res(
    'R3',
    'FAIL',
    'blocking',
    'DELIVERED_ELSEWHERE',
    'Delivered to an address that differs from the transaction ship-to address.',
    u,
  );
}

/** R4 Signature confirmation at high value (blocking). Threshold comes from a third-party page (U6). */
export function ruleR4(f: OrderFacts): RuleResult {
  const u = SOURCES.R4;
  if (f.amountUsd < SIGNATURE_THRESHOLD_USD) {
    return res(
      'R4',
      'N/A',
      'blocking',
      'BELOW_THRESHOLD',
      `Signature confirmation is checked at ${SIGNATURE_THRESHOLD_USD} USD or more.`,
      u,
    );
  }
  const note =
    ' (The 750 USD threshold is taken from a third-party page and is not yet confirmed on PayPal\u2019s US page.)';
  if (f.signatureConfirmation === true) {
    return res(
      'R4',
      'PASS',
      'blocking',
      'SIGNATURE_CONFIRMED',
      `Signature confirmation is set.${note}`,
      u,
    );
  }
  if (f.signatureConfirmation === false) {
    return res(
      'R4',
      'FAIL',
      'blocking',
      'SIGNATURE_MISSING',
      `This order is at or above the signature threshold and signature confirmation is not set.${note}`,
      u,
    );
  }
  return res(
    'R4',
    'UNKNOWN',
    'blocking',
    'SIGNATURE_UNDECIDED',
    `This order is at or above the signature threshold and signature confirmation has not been decided.${note}`,
    u,
  );
}

/** R5 PayPal's own capture status (blocking). In the sandbox this field may be a constant (U2). */
export function ruleR5(f: OrderFacts): RuleResult {
  const u = SOURCES.R5;
  switch (f.captureSellerProtection) {
    case null:
      return res(
        'R5',
        'UNKNOWN',
        'blocking',
        'NO_CAPTURE_STATUS',
        'PayPal capture field: no seller protection status is on file for this order.',
        u,
      );
    case 'NOT_ELIGIBLE':
      return res(
        'R5',
        'FAIL',
        'blocking',
        'CAPTURE_NOT_ELIGIBLE',
        'PayPal capture field: PayPal reported NOT_ELIGIBLE for this payment.',
        u,
      );
    case 'ELIGIBLE':
      return res(
        'R5',
        'PASS',
        'blocking',
        'CAPTURE_ELIGIBLE',
        'PayPal capture field: PayPal reported ELIGIBLE for this payment.',
        u,
      );
    case 'PARTIALLY_ELIGIBLE':
      if (f.claimType === 'INR') {
        return res(
          'R5',
          'PASS',
          'blocking',
          'CAPTURE_PARTIAL_INR',
          'PayPal capture field: PARTIALLY_ELIGIBLE, which is understood to cover item-not-received claims only.',
          u,
        );
      }
      if (f.claimType === 'UNAUTHORIZED') {
        return res(
          'R5',
          'FAIL',
          'blocking',
          'CAPTURE_PARTIAL_UNAUTHORIZED',
          'PayPal capture field: PARTIALLY_ELIGIBLE, which is understood not to cover unauthorized-transaction claims.',
          u,
        );
      }
      return res(
        'R5',
        'UNKNOWN',
        'blocking',
        'CAPTURE_PARTIAL_CLAIM_UNDEFINED',
        'PayPal capture field: PARTIALLY_ELIGIBLE. How this applies to this claim type is not defined in ShipGate\u2019s rules.',
        u,
      );
  }
}

/** R6 Buyer-arranged shipping (advisory, never changes the verdict). */
export function ruleR6(f: OrderFacts): RuleResult {
  const u = SOURCES.R6;
  if (f.buyerArrangedShipping === true) {
    return res(
      'R6',
      'FAIL',
      'advisory',
      'WARN_BUYER_ARRANGED',
      'Buyer-arranged shipping is advised against in PayPal\u2019s published guidance. This is a warning and does not change the verdict.',
      u,
    );
  }
  if (f.buyerArrangedShipping === false) {
    return res(
      'R6',
      'PASS',
      'advisory',
      'NOT_BUYER_ARRANGED',
      'Shipping is not buyer-arranged.',
      u,
    );
  }
  return res(
    'R6',
    'N/A',
    'advisory',
    'BUYER_ARRANGED_UNKNOWN',
    'Buyer-arranged shipping has not been recorded.',
    u,
  );
}
