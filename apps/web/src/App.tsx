import { useState } from 'react';
import { OrderQueue } from './pages/OrderQueue';
import { Storefront } from './pages/Storefront';

type Tab = 'orders' | 'store';

export function App() {
  const [tab, setTab] = useState<Tab>('orders');
  const tabClass = (t: Tab) =>
    `px-3 py-2 text-sm font-medium border-b-2 ${
      tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'
    }`;
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="flex items-center gap-6 border-b border-slate-200 pt-4">
        <h1 className="pb-2 text-lg font-semibold">ShipGate</h1>
        <nav className="flex gap-2">
          <button className={tabClass('orders')} onClick={() => setTab('orders')}>
            Order queue
          </button>
          <button className={tabClass('store')} onClick={() => setTab('store')}>
            Demo storefront
          </button>
        </nav>
      </header>
      <main className="flex-1 py-6">{tab === 'orders' ? <OrderQueue /> : <Storefront />}</main>
      <footer className="border-t border-slate-200 py-3 text-xs text-slate-500">
        Checks published requirements only. PayPal decides eligibility in its sole discretion.
      </footer>
    </div>
  );
}
