import { useQuery } from '@tanstack/react-query';
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo, useState } from 'react';
import { api, type OrderRow } from '../api';

// UNVERIFIED (AG Grid API written from memory for v33+): module registration and quickFilterText.
ModuleRegistry.registerModules([AllCommunityModule]);

type SourceFilter = 'all' | 'sandbox' | 'fixture';

const columns: ColDef<OrderRow>[] = [
  { headerName: 'Order', field: 'id', minWidth: 170 },
  { headerName: 'Source', field: 'source', maxWidth: 110 },
  {
    headerName: 'Label',
    field: 'label',
    valueFormatter: (p) => (p.value as string | null) ?? 'sandbox order',
  },
  {
    headerName: 'Amount',
    valueGetter: (p) => (p.data ? `${p.data.amountValue} ${p.data.currency}` : ''),
    maxWidth: 130,
  },
  { headerName: 'Payment source', field: 'paymentSource' },
  {
    headerName: 'PayPal capture field: seller_protection.status',
    field: 'captureSellerProtection',
    valueFormatter: (p) => (p.value as string | null) ?? '— (not available)',
    minWidth: 220,
  },
  {
    headerName: 'Ship-to of record',
    valueGetter: (p) => {
      const a = p.data?.txnShipTo;
      return a ? `${a.line1}, ${a.city}, ${a.region ?? ''} ${a.postal}` : '—';
    },
    minWidth: 240,
  },
];

export function OrderQueue() {
  const { data, error, isLoading } = useQuery({ queryKey: ['orders'], queryFn: api.listOrders });
  const [quick, setQuick] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');

  const rows = useMemo(
    () => (data ?? []).filter((r) => source === 'all' || r.source === source),
    [data, source],
  );

  if (isLoading) return <p className="text-sm">Loading orders…</p>;
  if (error) return <p className="text-sm text-red-700">{error.message}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-64 rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Quick filter"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
        />
        <select
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          value={source}
          onChange={(e) => setSource(e.target.value as SourceFilter)}
        >
          <option value="all">All orders</option>
          <option value="sandbox">Sandbox orders</option>
          <option value="fixture">Fixtures (synthetic / unverified anecdote)</option>
        </select>
        <span className="text-xs text-slate-500">{rows.length} orders</span>
      </div>
      <div style={{ height: 520 }}>
        <AgGridReact<OrderRow>
          rowData={rows}
          columnDefs={columns}
          quickFilterText={quick}
          defaultColDef={{ sortable: true, resizable: true, flex: 1, minWidth: 110 }}
        />
      </div>
      <p className="text-xs text-slate-500">
        The PayPal column shows the capture field as PayPal returned it. The sandbox may return a
        constant value (STATE.md U2). Verdict, stage and outstanding columns arrive in Slice 3.
      </p>
    </div>
  );
}
