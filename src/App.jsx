import { Routes, Route, Link, useLocation } from 'react-router-dom';
import SimulationDashboard from './pages/SimulationDashboard';
import RiskDashboard from './pages/RiskDashboard';
import LandingPage from './pages/LandingPage';
import { 
  Activity, ShieldAlert, Globe, 
  LayoutDashboard, Home 
} from 'lucide-react';
import React from 'react';

import { Dashboard } from './repo-components/components/Dashboard';
import { CurrencyProvider } from './repo-components/hooks/useCurrency';
import './repo-components/styles/design-system.css';

function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <nav>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
              <Globe size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              SWERVE <span style={{ color: 'var(--primary)', fontWeight: 400 }}>Intelligence</span>
            </span>
          </div>
        </Link>

        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <Home size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Home
          </Link>
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Main Dashboard
          </Link>
          <Link to="/simulation" className={`nav-link ${location.pathname === '/simulation' ? 'active' : ''}`}>
            <Activity size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Live Simulation
          </Link>
          <Link to="/risk" className={`nav-link ${location.pathname === '/risk' ? 'active' : ''}`}>
            <ShieldAlert size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Global Intel
          </Link>
        </div>

        <div className="nav-actions">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="status-indicator">
              <div className="pulse-dot"></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>NETWORK ACTIVE</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: location.pathname === '/' ? 0 : '2rem', maxWidth: location.pathname === '/' ? '100%' : undefined }}>
        <CurrencyProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/risk" element={<RiskDashboard />} />
            <Route path="/simulation" element={<SimulationDashboard />} />
          </Routes>
        </CurrencyProvider>
      </main>

      <footer style={{ padding: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
        &copy; 2026 SWERVE Supply Chain Intelligence
      </footer>
    </div>
  );
}

export default App;
