export type RuleStatus = 'PASS' | 'FAIL' | 'PENDING' | 'UNKNOWN' | 'N/A';
export type Verdict = 'MEETS' | 'FAILS' | 'CANNOT_EVALUATE';
export type Stage = 'pre_ship' | 'shipped' | 'delivered';
export type GoodsType = 'tangible' | 'intangible';
export type PaymentSource = 'paypal_checkout' | 'off_platform' | 'unknown';
export type TrackingStatus = 'none' | 'in_transit' | 'delivered';
export type CaptureSellerProtection = 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';
export type ClaimType = 'INR' | 'UNAUTHORIZED' | 'SNAD';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal: string;
  country: string;
}

export interface OrderFacts {
  amountUsd: number;
  goodsType: GoodsType;
  paymentSource: PaymentSource;
  txnShipTo: Address | null;
  labelAddress: Address | null;
  shipped: boolean;
  trackingNumber: string | null;
  trackingStatus: TrackingStatus;
  deliveredAddress: Address | null;
  signatureConfirmation: boolean | null;
  buyerArrangedShipping: boolean | null;
  addressChangeRequested: boolean;
  captureSellerProtection: CaptureSellerProtection | null;
  claimType: ClaimType;
}

export interface RuleResult {
  id: string;
  status: RuleStatus;
  severity: 'blocking' | 'advisory';
  reasonCode: string;
  message: string;
  sourceUrl: string;
}

export interface Evaluation {
  stage: Stage;
  verdict: Verdict;
  results: RuleResult[];
  warnings: RuleResult[];
  outstanding: string[];
  scopeNotes: string[];
  rulesVersion: string;
}
