import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Wrench,
  Sparkles,
  Leaf,
  Wifi,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar - primary navigation.
 * Desktop: full width (240px) with labels.
 * Tablet: collapsed to icon-only (64px) - labels hidden, tooltips via title attr.
 * Mobile: hidden entirely (MobileNav used instead).
 */

const NAV_ITEMS = [
  { to: '/',               icon: LayoutDashboard, label: 'Command Center',  id: 'nav-command-center'  },
  { to: '/telemetry',      icon: Activity,        label: 'Live Telemetry',  id: 'nav-telemetry'       },
  { to: '/incidents',      icon: AlertTriangle,   label: 'Incidents',       id: 'nav-incidents'       },
  { to: '/maintenance',    icon: Wrench,          label: 'Maintenance',     id: 'nav-maintenance'     },
  { to: '/cleaning',       icon: Sparkles,        label: 'Cleaning',        id: 'nav-cleaning'        },
  { to: '/sustainability', icon: Leaf,            label: 'Sustainability',  id: 'nav-sustainability'  },
  { to: '/sensors',        icon: Wifi,            label: 'Sensor Health',   id: 'nav-sensors'         },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-top">
        {/* Brand */}
        <div className="sidebar-brand" aria-label="KOHLER Facility Command Center">
          <span className="sidebar-wordmark">KOHLER</span>
          <span className="sidebar-sub">Airport Ops</span>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={to}
              to={to}
              id={id}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
              }
              title={label}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Operator Session Info + Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-user-name">{user?.username || 'Operator'}</span>
          <span className="sidebar-user-role">{user?.role || 'Operations Lead'}</span>
        </div>
        <button
          className="sidebar-logout"
          onClick={handleLogout}
          aria-label="Sign out of console"
          title="Sign out"
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
