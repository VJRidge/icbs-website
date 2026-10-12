import { Navigate } from 'react-router-dom';

/** Legacy route — resource starters live under Admin → Templates. */
export default function ResourceTemplatesAdminPage() {
  return <Navigate to="/admin/templates" replace />;
}
