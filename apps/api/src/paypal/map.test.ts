import { describe, expect, it } from 'vitest';
import { REAL_ORDER } from '../test/real-order.js';
import { NotCapturedError, orderToRow } from './map.js';
import { PpOrder } from './schemas.js';

const parse = () => PpOrder.parse(structuredClone(REAL_ORDER));

describe('orderToRow (real sandbox JSON)', () => {
  it('maps the captured order', () => {
    expect(orderToRow(parse())).toEqual({
      id: '75L28331XD192951T',
      source: 'sandbox',
      paypalOrderId: '75L28331XD192951T',
      captureId: '1PC61470YS347600L',
      amountValue: '120.00',
      currency: 'USD',
      paymentSource: 'paypal_checkout',
      txnShipTo: {
        line1: '123 Main St',
        city: 'Springfield',
        region: 'IL',
        postal: '62701',
        country: 'US',
      },
      captureSellerProtection: 'ELIGIBLE',
      goodsType: 'tangible',
      label: null,
      createdAt: '2026-10-31T06:44:08Z',
    });
  });

  it('refuses an order that is not COMPLETED', () => {
    const o = parse();
    o.status = 'PAYER_ACTION_REQUIRED';
    expect(() => orderToRow(o)).toThrow(NotCapturedError);
  });

  it('maps an unknown protection status to null', () => {
    const o = parse();
    o.purchase_units[0]!.payments!.captures[0]!.seller_protection = { status: 'SOMETHING_NEW' };
    expect(orderToRow(o).captureSellerProtection).toBeNull();
  });

  it('maps a missing seller_protection object to null', () => {
    const o = parse();
    delete o.purchase_units[0]!.payments!.captures[0]!.seller_protection;
    expect(orderToRow(o).captureSellerProtection).toBeNull();
  });

  it('maps a missing shipping address to null', () => {
    const o = parse();
    delete o.purchase_units[0]!.shipping;
    expect(orderToRow(o).txnShipTo).toBeNull();
  });
});
