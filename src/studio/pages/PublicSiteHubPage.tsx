import { Link } from 'react-router-dom';
import { ExternalLink, Globe2 } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { PUBLIC_SURFACES, type PublicSurface } from '../../lib/site/publicSurfaces';
import type { UserProfile } from '../types';

function editLabel(surface: PublicSurface): string {
  switch (surface.editVia) {
    case 'admin_editor':
      return 'Edit in studio';
    case 'templates_admin':
      return 'Manage templates';
    case 'media':
      return 'Manage media';
    case 'cms_pages':
      return 'Open Pages';
    case 'cms_or_code':
      return 'CMS or code';
    case 'brand_draft':
      return 'Brand / library';
    default:
      return 'Code layout';
  }
}

export default function PublicSiteHubPage({ userProfile }: { userProfile: UserProfile | null }) {
  if (!isAnyAdminProfile(userProfile)) {
    return (
      <AdminCmsShell title="Public site" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage the public site catalog.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Public site"
      titleIcon={<Globe2 size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Site / Public surfaces</p>
          <h1 className="mt-1 font-serif text-3xl font-black text-slate-900">Public site</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Everything visitors can open that is not only a row in Admin → Pages. Use View for the live URL; use Edit
            when a studio editor exists. Resource page prose that still says “Code layout” ships with the app until we
            migrate that copy into a studio editor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/templates"
            className="rounded-lg bg-brand-blue px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-yellow"
          >
            Templates
          </Link>
          <Link
            to="/admin/media"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800"
          >
            Media (Docs)
          </Link>
          <Link
            to="/admin/public-site/book-updates"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800"
          >
            Book updates
          </Link>
          <Link
            to="/admin/pages"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800"
          >
            CMS Pages
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Manage</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PUBLIC_SURFACES.map((surface) => (
                <tr key={surface.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{surface.title}</p>
                    {surface.notes ? <p className="mt-0.5 text-xs text-slate-500">{surface.notes}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{surface.path}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">{surface.kind.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{editLabel(surface)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={surface.path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue"
                      >
                        View <ExternalLink size={12} />
                      </a>
                      {surface.adminPath ? (
                        <Link to={surface.adminPath} className="text-xs font-bold text-slate-800 underline">
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AdminCmsShell>
  );
}
