import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { PayPalButtons } from '../PayPalButtons';

const input = 'rounded border border-slate-300 px-2 py-1 text-sm';
const btn = 'rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50';

export function Storefront() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('120.00');
  const [line1, setLine1] = useState('123 Main St');
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState('');
  const [importId, setImportId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn());
      await qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Sandbox demo storefront. No real shop and no real money. Use a sandbox personal account.
      </p>

      <section className="space-y-3">
        <h2 className="font-medium">Demo item</h2>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            Amount (USD)
            <input
              className={`${input} ml-2 w-28`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Ship-to street
            <input
              className={`${input} ml-2 w-56`}
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          City, state and ZIP are fixed: Springfield, IL 62701, US.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Pay with PayPal buttons</h2>
        <PayPalButtons
          amount={amount}
          line1={line1}
          onCaptured={(id) => {
            setMsg(`Captured order ${id}. It is in the order queue.`);
            void qc.invalidateQueries({ queryKey: ['orders'] });
          }}
          onError={setMsg}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Fallback: redirect flow</h2>
        <button
          className={btn}
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const r = await api.createOrder(amount, line1);
              setApproveUrl(r.approveUrl);
              setPendingId(r.paypalOrderId);
              return `Created order ${r.paypalOrderId} (${r.status}). Approve it as the sandbox buyer, then capture.`;
            })
          }
        >
          Create order
        </button>
        {approveUrl && (
          <p className="text-sm">
            <a
              className="text-blue-700 underline"
              href={approveUrl}
              target="_blank"
              rel="noreferrer"
            >
              Approve in PayPal sandbox
            </a>
          </p>
        )}
        <div className="flex gap-2">
          <input
            className={`${input} w-64`}
            placeholder="order id"
            value={pendingId}
            onChange={(e) => setPendingId(e.target.value.trim())}
          />
          <button
            className={btn}
            disabled={busy || !pendingId}
            onClick={() =>
              void run(async () => `Captured ${(await api.captureOrder(pendingId)).id}`)
            }
          >
            Capture
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Import an already captured sandbox order</h2>
        <div className="flex gap-2">
          <input
            className={`${input} w-64`}
            placeholder="order id"
            value={importId}
            onChange={(e) => setImportId(e.target.value.trim())}
          />
          <button
            className={btn}
            disabled={busy || !importId}
            onClick={() => void run(async () => `Imported ${(await api.syncOrder(importId)).id}`)}
          >
            Import
          </button>
        </div>
      </section>

      {msg && <p className="text-sm text-slate-800">{msg}</p>}
    </div>
  );
}
