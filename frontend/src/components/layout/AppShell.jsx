import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

/**
 * AppShell - authenticated layout wrapper.
 * Provides the fixed sidebar + header + scrollable main content area.
 * Redirects to /login if not authenticated.
 */
export default function AppShell() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="shell-root">
      <Sidebar />
      <Header />

      <main className="shell-main" id="main-content" role="main">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
