import Free from './pages/Free'
import FreeThanks from './pages/FreeThanks'
import Legal from './pages/Legal'
import AdminApp from './admin/AdminApp'

// Tiny path-based router. Seven pages don't need a routing library.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  if (path === '/free/thanks') return <FreeThanks />
  if (path === '/privacy' || path === '/terms' || path === '/refunds') return <Legal page={path.slice(1)} />
  // Until the sales page is built, the home page shows the free kit page.
  return <Free />
}
