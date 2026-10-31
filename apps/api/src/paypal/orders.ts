import type { PayPalHttp } from './client.js';
import { PpCreated, PpOrder, type PpOrderT } from './schemas.js';

export interface CreateInput {
  amount: string;
  line1: string;
}
export interface CreatedOrder {
  id: string;
  status: string;
  approveUrl: string | null;
}

/** What the routes need from PayPal. Tests inject a fake. */
export interface OrdersGateway {
  create(input: CreateInput): Promise<CreatedOrder>;
  capture(id: string): Promise<PpOrderT>;
  get(id: string): Promise<PpOrderT>;
}

/** Same request body that worked in the 2026-10-31 curl test, with amount and street varied. */
export function buildCreateBody({ amount, line1 }: CreateInput) {
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: { currency_code: 'USD', value: amount },
        shipping: {
          name: { full_name: 'Test Buyer' },
          address: {
            address_line_1: line1,
            admin_area_2: 'Springfield',
            admin_area_1: 'IL',
            postal_code: '62701',
            country_code: 'US',
          },
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: 'SET_PROVIDED_ADDRESS',
          return_url: 'https://example.com/return',
          cancel_url: 'https://example.com/cancel',
        },
      },
    },
  };
}

// Raw fetch, not @paypal/paypal-server-sdk: I have no SDK doc text and may not guess method names.
// The endpoints below are the ones verified by curl. Swap this class for the SDK once U1/U3 docs exist.
export class PayPalOrders implements OrdersGateway {
  constructor(private readonly http: PayPalHttp) {}

  async create(input: CreateInput): Promise<CreatedOrder> {
    const r = await this.http.request('POST', '/v2/checkout/orders', PpCreated, {
      body: buildCreateBody(input),
      idempotent: true,
    });
    const approve = r.links.find((l) => l.rel === 'payer-action');
    return { id: r.id, status: r.status, approveUrl: approve?.href ?? null };
  }

  capture(id: string): Promise<PpOrderT> {
    return this.http.request(
      'POST',
      `/v2/checkout/orders/${encodeURIComponent(id)}/capture`,
      PpOrder,
      { idempotent: true },
    );
  }

  get(id: string): Promise<PpOrderT> {
    return this.http.request('GET', `/v2/checkout/orders/${encodeURIComponent(id)}`, PpOrder);
  }
}
