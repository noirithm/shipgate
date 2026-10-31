import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from './api';

// UNVERIFIED (written from memory, no PayPal JS SDK doc text was provided): the script URL
// and the paypal.Buttons({ createOrder, onApprove }) callback shape. Check against PayPal's docs.
interface ButtonsOptions {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (err: unknown) => void;
}
declare global {
  interface Window {
    paypal?: { Buttons: (o: ButtonsOptions) => { render: (el: HTMLElement) => Promise<void> } };
  }
}

function loadScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve();
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the PayPal JS SDK'));
    document.head.appendChild(s);
  });
}

interface Props {
  amount: string;
  line1: string;
  onCaptured: (orderId: string) => void;
  onError: (message: string) => void;
}

export function PayPalButtons({ amount, line1, onCaptured, onError }: Props) {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: api.config });
  const container = useRef<HTMLDivElement>(null);
  // Refs so the callbacks always read the latest form values and handlers.
  const latest = useRef({ amount, line1, onCaptured, onError });
  latest.current = { amount, line1, onCaptured, onError };

  useEffect(() => {
    const clientId = config?.paypalClientId;
    const el = container.current;
    if (!clientId || !el) return;
    let cancelled = false;
    loadScript(clientId)
      .then(() => {
        if (cancelled || !window.paypal) return;
        el.innerHTML = '';
        return window.paypal
          .Buttons({
            createOrder: async () =>
              (await api.createOrder(latest.current.amount, latest.current.line1)).paypalOrderId,
            onApprove: async (data) => {
              await api.captureOrder(data.orderID);
              latest.current.onCaptured(data.orderID);
            },
            onError: (err) =>
              latest.current.onError(err instanceof Error ? err.message : String(err)),
          })
          .render(el);
      })
      .catch((e: unknown) => latest.current.onError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [config?.paypalClientId]);

  if (config && !config.paypalClientId) {
    return (
      <p className="text-sm text-amber-700">Set PAYPAL_CLIENT_ID in .env to show the buttons.</p>
    );
  }
  return <div ref={container} className="max-w-sm" />;
}
