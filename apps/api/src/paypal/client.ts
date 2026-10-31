import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export class PayPalError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, detail: string, message?: string) {
    super(message ?? `PayPal request failed (HTTP ${status})`);
    this.name = 'PayPalError';
    this.status = status;
    this.detail = detail;
  }
}

export interface PayPalConfig {
  baseUrl: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
}

// Verified by curl: POST /v1/oauth2/token with Basic auth and grant_type=client_credentials,
// response has access_token. expires_in was never shown to me (unverified), so it is optional.
const TokenResponse = z.object({ access_token: z.string(), expires_in: z.number().optional() });

export class PayPalHttp {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly cfg: PayPalConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async accessToken(force: boolean): Promise<string> {
    if (!force && this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const { clientId, clientSecret } = this.cfg;
    if (!clientId || !clientSecret) {
      throw new PayPalError(
        0,
        'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env',
        'PayPal credentials are not configured',
      );
    }
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await this.fetchImpl(`${this.cfg.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const text = await res.text();
    if (!res.ok)
      throw new PayPalError(res.status, text.slice(0, 500), 'PayPal token request failed');
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new PayPalError(res.status, text.slice(0, 200), 'PayPal token response was not JSON');
    }
    const parsed = TokenResponse.safeParse(json);
    if (!parsed.success)
      throw new PayPalError(res.status, 'missing access_token', 'Bad token response');
    const ttlMs = (parsed.data.expires_in ?? 300) * 1000;
    this.token = {
      value: parsed.data.access_token,
      expiresAt: Date.now() + Math.max(ttlMs - 60_000, 30_000),
    };
    return this.token.value;
  }

  async request<S extends z.ZodType>(
    method: 'GET' | 'POST',
    path: string,
    schema: S,
    opts: { body?: unknown; idempotent?: boolean } = {},
  ): Promise<z.output<S>> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.accessToken(attempt > 0);
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      // The verified curl calls sent Content-Type: application/json on every POST, even the
      // body-less capture, so we do the same.
      if (method === 'POST') headers['Content-Type'] = 'application/json';
      if (opts.idempotent) headers['PayPal-Request-Id'] = `shipgate-${randomUUID()}`;
      const res = await this.fetchImpl(`${this.cfg.baseUrl}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
      const text = await res.text();
      if (res.status === 401 && attempt === 0) continue; // token may have expired: refresh once
      if (!res.ok) throw new PayPalError(res.status, text.slice(0, 2000));
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new PayPalError(res.status, text.slice(0, 200), 'PayPal returned non-JSON');
      }
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new PayPalError(
          res.status,
          parsed.error.message.slice(0, 1000),
          'PayPal response did not match the expected shape',
        );
      }
      return parsed.data;
    }
    throw new PayPalError(401, 'Token rejected twice');
  }
}
