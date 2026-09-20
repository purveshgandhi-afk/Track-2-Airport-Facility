import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';

// Pages
import Login from './pages/Login';
import CommandCenter from './pages/CommandCenter';
import LiveTelemetry from './pages/LiveTelemetry';
import Incidents from './pages/Incidents';
import Maintenance from './pages/Maintenance';
import Cleaning from './pages/Cleaning';
import Sustainability from './pages/Sustainability';
import SensorHealth from './pages/SensorHealth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected  AppShell handles auth redirect */}
          <Route element={<AppShell />}>
            <Route index element={<CommandCenter />} />
            <Route path="/telemetry"      element={<LiveTelemetry />} />
            <Route path="/incidents"      element={<Incidents />} />
            <Route path="/maintenance"    element={<Maintenance />} />
            <Route path="/cleaning"       element={<Cleaning />} />
            <Route path="/sustainability" element={<Sustainability />} />
            <Route path="/sensors"        element={<SensorHealth />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
