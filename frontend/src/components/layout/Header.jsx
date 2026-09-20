import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/':               'Airport Command Center',
  '/telemetry':      'Live Telemetry',
  '/incidents':      'Incidents',
  '/maintenance':    'Maintenance & Dispatch',
  '/cleaning':       'Cleaning',
  '/sustainability': 'Sustainability',
  '/sensors':        'Sensor Health',
};

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const date = time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const clock = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return (
    <span className="header-clock" aria-label="Current time" aria-live="off">
      <span className="header-clock-date">{date}</span>
      <span className="header-clock-sep" aria-hidden="true">·</span>
      <span className="header-clock-time">{clock}</span>
    </span>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const title = PAGE_TITLES[pathname] || 'Facility Command Center';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-header" role="banner">
      <span className="header-title">{title}</span>
      <div className="header-right">
        <LiveClock />
        <div className="header-user-meta" aria-label={`Signed in as ${user?.username || 'Operator'}`}>
          <span className="header-user-dot" aria-hidden="true" />
          <span className="header-user-name">{user?.username || 'Operator'}</span>
          <button
            id="header-logout-btn"
            className="header-logout-btn"
            onClick={handleLogout}
            title="Sign out of console"
            aria-label="Sign out"
          >
            <LogOut size={13} strokeWidth={2} aria-hidden="true" />
            <span className="header-logout-text">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}