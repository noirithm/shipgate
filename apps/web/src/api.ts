export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal: string;
  country: string;
}

export interface OrderRow {
  id: string;
  source: 'sandbox' | 'fixture';
  paypalOrderId: string | null;
  captureId: string | null;
  amountValue: string;
  currency: string;
  paymentSource: string;
  txnShipTo: Address | null;
  captureSellerProtection: string | null;
  goodsType: string;
  label: string | null;
  createdAt: string;
}

export interface AppConfig {
  paypalClientId: string | null;
  sandbox: boolean;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: string; detail?: unknown };
      if (j.error) msg = j.error;
      if (typeof j.detail === 'string' && j.detail) msg += `: ${j.detail.slice(0, 300)}`;
    } catch {
      /* keep the HTTP status message */
    }
    throw new Error(msg);
  }
  return JSON.parse(text) as T;
}

export const api = {
  config: () => call<AppConfig>('/api/config'),
  listOrders: () => call<OrderRow[]>('/api/orders'),
  createOrder: (amount: string, line1: string) =>
    call<{ paypalOrderId: string; status: string; approveUrl: string | null }>('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, line1 }),
    }),
  captureOrder: (id: string) =>
    call<OrderRow>(`/api/orders/${encodeURIComponent(id)}/capture`, { method: 'POST' }),
  syncOrder: (id: string) =>
    call<OrderRow>(`/api/orders/${encodeURIComponent(id)}/sync`, { method: 'POST' }),
};
