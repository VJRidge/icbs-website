import { writeFileSync } from 'node:fs';
import {
  NEWSLETTER_TEMPLATE_KIND,
  starterNewsletterTemplates,
} from '../src/lib/newsletter/newsletterTemplates.ts';

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const starters = starterNewsletterTemplates();
const values = starters
  .map((t) => {
    const doc = sqlString(JSON.stringify(t.document));
    return `(${sqlString(t.id)}, ${sqlString(t.title)}, ${sqlString(NEWSLETTER_TEMPLATE_KIND)}, true, ${doc}::jsonb)`;
  })
  .join(',\n');

const sql = `-- Newsletter email templates (kind=newsletter) — starter gallery + staff saves.
-- Uses existing public.templates table (same as page/post templates).

insert into public.templates (id, title, kind, is_global, document)
values
${values}
on conflict (id) do update set
  title = excluded.title,
  kind = excluded.kind,
  is_global = excluded.is_global,
  document = excluded.document;
`;

writeFileSync(new URL('../supabase/migrations/20261029_newsletter_templates.sql', import.meta.url), sql);
console.log('Wrote supabase/migrations/20261029_newsletter_templates.sql');
