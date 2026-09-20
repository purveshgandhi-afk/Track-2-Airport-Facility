import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Wrench,
  Leaf,
} from 'lucide-react';

/**
 * MobileNav - bottom tab bar, visible only on mobile (< 768px).
 * Shows the 5 primary operational views.
 */

const TABS = [
  { to: '/',               icon: LayoutDashboard, label: 'Command',   id: 'mob-nav-command'     },
  { to: '/telemetry',      icon: Activity,        label: 'Telemetry', id: 'mob-nav-telemetry'   },
  { to: '/incidents',      icon: AlertTriangle,   label: 'Incidents', id: 'mob-nav-incidents'   },
  { to: '/maintenance',    icon: Wrench,          label: 'Dispatch',  id: 'mob-nav-maintenance' },
  { to: '/sustainability', icon: Leaf,            label: 'Sustain',   id: 'mob-nav-sustain'     },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation" role="navigation">
      {TABS.map(({ to, icon: Icon, label, id }) => (
        <NavLink
          key={to}
          to={to}
          id={id}
          end={to === '/'}
          className={({ isActive }) =>
            `mobile-tab${isActive ? ' mobile-tab--active' : ''}`
          }
          aria-label={label}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="mobile-tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
