import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Address, CaptureSellerProtection, GoodsType, PaymentSource } from 'rules';

// SPEC.md section 5 "orders" table. `label` is a Slice 2 addition (fixture label, FIXTURES.md).
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['sandbox', 'fixture'] }).notNull(),
  paypalOrderId: text('paypal_order_id'),
  captureId: text('capture_id'),
  amountValue: text('amount_value').notNull(),
  currency: text('currency').notNull(),
  paymentSource: text('payment_source').$type<PaymentSource>().notNull(),
  txnShipTo: text('txn_ship_to', { mode: 'json' }).$type<Address>(),
  captureSellerProtection: text('capture_seller_protection').$type<CaptureSellerProtection>(),
  goodsType: text('goods_type').$type<GoodsType>().notNull(),
  label: text('label'),
  createdAt: text('created_at').notNull(),
});

export type OrderRow = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
