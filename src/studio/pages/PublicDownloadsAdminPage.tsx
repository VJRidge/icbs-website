import { Navigate } from 'react-router-dom';

/** Legacy route — PDFs live under Media → Docs; template Markdown under Admin → Templates. */
export default function PublicDownloadsAdminPage() {
  return <Navigate to="/admin/media" replace />;
}
