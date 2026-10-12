import { useCallback, useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canReadPurchases } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type PurchaseRow = {
  id: string;
  email: string;
  product_key: string;
  amount_total: number | null;
  currency: string | null;
  status: string;
  stripe_session_id: string;
  fulfilled_at: string | null;
  created_at: string;
};

function formatMoney(cents: number | null, currency: string | null): string {
  if (typeof cents !== 'number') return '—';
  const cur = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}

export default function PurchasesListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = canReadPurchases(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('purchases')
      .select(
        'id, email, product_key, amount_total, currency, status, stripe_session_id, fulfilled_at, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as PurchaseRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Sales" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to view sales.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Sales"
      titleIcon={<CreditCard size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Sales</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Stripe Checkout sessions for the book PDF. Fulfillment is webhook-driven; this list is read-only.
        </p>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900">{row.email}</div>
                  <div className="text-xs text-slate-500">
                    {row.product_key} · {row.status}
                    {row.fulfilled_at ? ` · fulfilled ${new Date(row.fulfilled_at).toLocaleString()}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">{formatMoney(row.amount_total, row.currency)}</div>
                  <div className="font-mono text-[10px] text-slate-400">{row.stripe_session_id}</div>
                </div>
              </div>
            </li>
          ))}
          {!loading && rows.length === 0 ? (
            <li className="px-4 py-8 text-sm text-slate-500">
              No sales yet. Configure Stripe keys and complete a test Checkout to see rows here.
            </li>
          ) : null}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
