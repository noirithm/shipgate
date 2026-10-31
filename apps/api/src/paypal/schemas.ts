import { z } from 'zod';

// Shapes derived ONLY from the real sandbox JSON (create, capture, get) pasted on 2026-10-31.
// Unknown keys are stripped by Zod. address_line_2 is not mapped: it never appeared in the JSON.

const Money = z.object({ currency_code: z.string(), value: z.string() });

export const PpAddress = z.object({
  address_line_1: z.string(),
  admin_area_2: z.string(),
  admin_area_1: z.string(),
  postal_code: z.string(),
  country_code: z.string(),
});

const Capture = z.object({
  id: z.string(),
  status: z.string(),
  amount: Money,
  seller_protection: z
    .object({ status: z.string(), dispute_categories: z.array(z.string()).optional() })
    .optional(),
  create_time: z.string().optional(),
});

const PurchaseUnit = z.object({
  shipping: z
    .object({
      name: z.object({ full_name: z.string() }).optional(),
      address: PpAddress.optional(),
    })
    .optional(),
  payments: z.object({ captures: z.array(Capture) }).optional(),
});

/** Capture response and get-order response share these fields. */
export const PpOrder = z.object({
  id: z.string(),
  status: z.string(),
  purchase_units: z.array(PurchaseUnit).min(1),
});
export type PpOrderT = z.infer<typeof PpOrder>;

/** Create-order response (status PAYER_ACTION_REQUIRED, links incl. rel "payer-action"). */
export const PpCreated = z.object({
  id: z.string(),
  status: z.string(),
  links: z.array(z.object({ href: z.string(), rel: z.string(), method: z.string() })),
});
