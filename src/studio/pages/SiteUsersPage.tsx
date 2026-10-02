import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile, isSuperAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import type { UserProfile } from '../types';

const ROLES = ['owner', 'admin', 'editor', 'author'] as const;
type Role = (typeof ROLES)[number];

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  staff_approved: boolean;
  disabled_at: string | null;
};

function asRole(raw: unknown): Role {
  return ROLES.includes(raw as Role) ? (raw as Role) : 'author';
}

export default function SiteUsersPage({ userProfile }: { userProfile: UserProfile | null }) {
  const owner = isSuperAdminProfile(userProfile);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, staff_approved, disabled_at')
      .order('created_at');
    if (loadError) {
      setError(loadError.message);
      setRows(
        userProfile
          ? [
              {
                id: userProfile.id,
                email: userProfile.email ?? null,
                display_name: userProfile.display_name ?? null,
                role: asRole(userProfile.role),
                staff_approved: true,
                disabled_at: null,
              },
            ]
          : [],
      );
    } else {
      setError(null);
      const list = ((data as Row[]) ?? []).map((r) => ({ ...r, role: asRole(r.role) }));
      if (list.length === 0 && userProfile) {
        list.push({
          id: userProfile.id,
          email: userProfile.email ?? null,
          display_name: userProfile.display_name ?? null,
          role: asRole(userProfile.role),
          staff_approved: true,
          disabled_at: null,
        });
      }
      setRows(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile]);

  const patch = async (id: string, next: Partial<Row>) => {
    if (!owner) return;
    if (id === userProfile?.id && next.role && next.role !== 'owner') {
      window.alert('You cannot demote your own owner account.');
      return;
    }
    const { error: saveError } = await supabase.from('profiles').update(next).eq('id', id);
    if (saveError) window.alert(saveError.message);
    else await load();
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <p className="font-semibold text-slate-700">Administrator access required.</p>
      </div>
    );
  }

  return (
    <AdminCmsShell
      title="Users & roles"
      titleIcon={<Users size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Users & roles</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {owner
            ? 'You are the owner. The public site has no sign-up. If you need staff, have them create an account at /admin, then approve them here.'
            : 'View only. Ask the owner to change roles or approve staff.'}
        </p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Access</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const you = r.id === userProfile?.id;
                  return (
                    <tr key={r.id} className="border-t border-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {r.display_name || r.email || 'Studio user'}
                          {you ? <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-brand-blue">You</span> : null}
                        </p>
                        <p className="text-xs text-slate-500">{r.email || r.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {owner ? (
                          <select
                            value={r.role}
                            onChange={(e) => void patch(r.id, { role: e.target.value as Role })}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="capitalize">{r.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {owner ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void patch(r.id, { staff_approved: !r.staff_approved, disabled_at: r.staff_approved ? r.disabled_at : null })
                              }
                              className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                r.staff_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.staff_approved ? 'Approved' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patch(r.id, {
                                  disabled_at: r.disabled_at ? null : new Date().toISOString(),
                                  staff_approved: r.disabled_at ? r.staff_approved : false,
                                })
                              }
                              className="rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50"
                            >
                              {r.disabled_at ? 'Re-enable' : 'Disable'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {r.disabled_at ? 'Disabled' : r.staff_approved ? 'Approved' : 'Pending'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminCmsShell>
  );
}
