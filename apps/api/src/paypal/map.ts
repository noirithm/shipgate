import type { CaptureSellerProtection } from 'rules';
import type { NewOrder } from '../db/schema.js';
import type { PpOrderT } from './schemas.js';

export class NotCapturedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotCapturedError';
  }
}

const PROTECTION: readonly CaptureSellerProtection[] = [
  'ELIGIBLE',
  'PARTIALLY_ELIGIBLE',
  'NOT_ELIGIBLE',
];

/**
 * Maps a captured PayPal order (capture or get response) to an orders row.
 * Ship-to of record: purchase_units[0].shipping.address (payer.address has only country_code).
 * Seller protection: purchase_units[0].payments.captures[0].seller_protection.status.
 * A status outside the three RULES.md values becomes null (R5 then returns UNKNOWN).
 */
export function orderToRow(o: PpOrderT): NewOrder {
  if (o.status !== 'COMPLETED') {
    throw new NotCapturedError(`Order ${o.id} has status ${o.status}, not COMPLETED`);
  }
  const unit = o.purchase_units[0];
  const cap = unit?.payments?.captures[0];
  if (!unit || !cap) throw new NotCapturedError(`Order ${o.id} has no capture`);
  const a = unit.shipping?.address;
  return {
    id: o.id,
    source: 'sandbox',
    paypalOrderId: o.id,
    captureId: cap.id,
    amountValue: cap.amount.value,
    currency: cap.amount.currency_code,
    paymentSource: 'paypal_checkout',
    txnShipTo: a
      ? {
          line1: a.address_line_1,
          city: a.admin_area_2,
          region: a.admin_area_1,
          postal: a.postal_code,
          country: a.country_code,
        }
      : null,
    captureSellerProtection: PROTECTION.find((p) => p === cap.seller_protection?.status) ?? null,
    goodsType: 'tangible',
    label: null,
    createdAt: cap.create_time ?? new Date().toISOString(),
  };
}
