// Trimmed from the real sandbox get-order response pasted on 2026-10-31 (order 75L28331XD192951T).
// Only the fields our schema reads are kept. Sandbox data, no secrets.
export const REAL_ORDER = {
  id: '75L28331XD192951T',
  status: 'COMPLETED',
  purchase_units: [
    {
      shipping: {
        name: { full_name: 'Test Buyer' },
        address: {
          address_line_1: '123 Main St',
          admin_area_2: 'Springfield',
          admin_area_1: 'IL',
          postal_code: '62701',
          country_code: 'US',
        },
      },
      payments: {
        captures: [
          {
            id: '1PC61470YS347600L',
            status: 'COMPLETED',
            amount: { currency_code: 'USD', value: '120.00' },
            seller_protection: {
              status: 'ELIGIBLE',
              dispute_categories: ['ITEM_NOT_RECEIVED', 'UNAUTHORIZED_TRANSACTION'],
            },
            create_time: '2026-10-31T06:44:08Z',
          },
        ],
      },
    },
  ],
};
