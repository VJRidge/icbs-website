import BlogEditorModulePanel from './BlogEditorModulePanel';

/** Block/module inspector — below CMS nav; parent column handles scroll + width. */
export default function BlogAdminModuleBay() {
  return (
    <div className="border-t border-white/10 bg-white shadow-[inset_0_4px_12px_rgba(0,0,0,0.06)]">
      <BlogEditorModulePanel />
    </div>
  );
}
