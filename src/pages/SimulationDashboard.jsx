import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MapVisualization from '../components/MapVisualization';
import { 
  AlertTriangle, ShieldAlert, Activity, 
  RefreshCw, MousePointer2, Thermometer, 
  Wind, Zap, Info, Clock, DollarSign, History, Globe
} from 'lucide-react';
import { TacticalCommandCenter } from '../repo-components/components/TacticalCommandCenter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const SimulationDashboard = () => {
  const [shipments, setShipments] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [activeDisruptions, setActiveDisruptions] = useState([]);
  const [systemImpact, setSystemImpact] = useState({ totalCostIncrease: 0, totalCarbonIncrease: 0, avgDelay: 0 });
  const [loading, setLoading] = useState(true);
  const [tickCount, setTickCount] = useState(0);
  const [isTickActive, setIsTickActive] = useState(true);
  const [injectionMode, setInjectionMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);
  
  // Stats
  const stats = {
    active: shipments.filter(s => s.status === 'in_transit').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    rerouted: shipments.filter(s => s.rerouted).length,
    economicImpact: systemImpact.totalCostIncrease,
    carbonImpact: systemImpact.totalCarbonIncrease,
  };

  const fetchState = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const [shRes, riskRes] = await Promise.all([
        axios.get(`${API_BASE}/simulate/tick`),
        axios.get(`${API_BASE}/risk-zones`)
      ]);
      setShipments(shRes.data.shipments);
      setTickCount(shRes.data.tickCount);
      setSystemImpact(shRes.data.systemImpact || { totalCostIncrease: 0, totalCarbonIncrease: 0, avgDelay: 0 });
      setRiskZones(riskRes.data.riskZones);
      setActiveDisruptions(riskRes.data.activeDisruptions);
    } catch (err) {
      console.error('Fetch state failed', err);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchState(true);
    setLoading(false);
  }, []);

  // Simulation loop (5 seconds)
  useEffect(() => {
    let interval;
    if (isTickActive) {
      interval = setInterval(() => {
        fetchState();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isTickActive]);

  const handleMapClick = (lat, lng) => {
    if (injectionMode) {
      setPendingCoords({ lat, lng });
    }
  };

  const addDisruption = async (type) => {
    const coords = pendingCoords || { lat: 20, lng: 0 };
    const types = {
      flood: { name: 'Regional Flooding', radius: 400, riskScore: 85 },
      strike: { name: 'Labor Strike / Blockade', radius: 150, riskScore: 75 },
      war: { name: 'Conflict Escalation', radius: 300, riskScore: 95 },
      weather: { name: 'Severe Weather Cell', radius: 500, riskScore: 80 },
    };
    
    const config = { ...types[type], ...coords, type };
    try {
      await axios.post(`${API_BASE}/simulate/disruption`, config);
      setPendingCoords(null);
      setInjectionMode(false);
      fetchState();
    } catch (err) {
      alert('Failed to add disruption');
    }
  };

  const resolveDisruption = async (id) => {
    try {
      await axios.delete(`${API_BASE}/simulate/disruption/${id}`);
      fetchState();
    } catch (err) {
      alert('Failed to resolve disruption');
    }
  };

  const clearSim = async () => {
    try {
      await axios.post(`${API_BASE}/simulate/clear`);
      setPendingCoords(null);
      setInjectionMode(false);
      fetchState();
    } catch (err) {
      console.error('Reset failed', err);
    }
  };

  return (
    <div className="simulation-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
      {/* HEADER HUD */}
      <div className="grid-4">
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', padding: '0.75rem', borderRadius: '12px' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACTIVE SHIPMENTS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.active} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>/ {shipments.length}</span></div>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '12px' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI REROUTES</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.rerouted}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.75rem', borderRadius: '12px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ECONOMIC IMPACT</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>+${stats.economicImpact.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '12px' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AVG DELAY</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{systemImpact.avgDelay} hrs</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px', flex: 1, gap: '1.5rem', minHeight: 0 }}>
        {/* MAP PANEL */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: injectionMode ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Globe size={18}/> 
               {injectionMode ? 'Select Location on Map...' : 'Global Transit Network'}
             </h3>
             <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`btn ${injectionMode ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => {setInjectionMode(!injectionMode); setPendingCoords(null);}} 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                >
                  {injectionMode ? 'Cancel' : 'Inject Incident'}
                </button>
                <button className="btn btn-secondary" onClick={clearSim} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                  Reset
                </button>
             </div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <MapVisualization 
              shipments={shipments} 
              activeDisruptions={(activeDisruptions || []).filter(d => !d.isAutonomous)}
              riskZones={[]}
              onMapClick={handleMapClick}
              onResolveDisruption={resolveDisruption}
            />
            {pendingCoords && (
              <div style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                zIndex: 2000, background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', 
                border: '1px solid var(--primary)', width: '280px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}>
                <h4 style={{ marginBottom: '1rem', textAlign: 'center' }}>Select Incident Type</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '1rem' }}>
                  Pos: {pendingCoords.lat.toFixed(2)}, {pendingCoords.lng.toFixed(2)}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => addDisruption('flood')} style={{ fontSize: '0.7rem' }}>Flood</button>
                  <button className="btn btn-secondary" onClick={() => addDisruption('strike')} style={{ fontSize: '0.7rem' }}>Strike</button>
                  <button className="btn btn-secondary" onClick={() => addDisruption('war')} style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>Conflict</button>
                  <button className="btn btn-secondary" onClick={() => addDisruption('weather')} style={{ fontSize: '0.7rem' }}>Weather</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR PANEL - locked height, no outer scroll */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {/* AI COMMAND CENTER - grows to fill space */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <TacticalCommandCenter />
          </div>

          {/* ACTIVE SHIPMENTS LIST - fixed cap, scrolls internally */}
          <div className="card" style={{ flex: '0 0 auto', maxHeight: '36%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, fontSize: '0.85rem' }}>
              <History size={15}/> Active Shipments
            </h4>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {shipments.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>No shipments currently in transit.</p>
              ) : (
                shipments.map(s => (
                  <div key={s.id} className="card" style={{ padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', border: s.rerouted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.72rem' }}>{s.input.origin} ➝ {s.input.destination}</span>
                      {s.rerouted && <span className="badge badge-high" style={{ fontSize: '0.55rem', padding: '1px 4px' }}>REROUTED</span>}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'capitalize' }}>Mode: {s.currentSegmentMode} ({s.route.modes.join('+')})</span>
                      <span style={{ color: s.status === 'delivered' ? 'var(--success)' : 'var(--info)' }}>{s.status.toUpperCase()}</span>
                    </div>
                    <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', margin: '5px 0', overflow: 'hidden' }}>
                      <div style={{
                        width: s.status === 'delivered' ? '100%' : `${((s.currentSegmentIndex + s.progress) / (s.totalSegments || 1)) * 100}%`,
                        height: '100%',
                        background: s.rerouted ? 'var(--danger)' : (s.currentSegmentMode === 'air' ? '#a855f7' : s.currentSegmentMode === 'sea' ? '#06b6d4' : 'var(--primary)')
                      }}></div>
                    </div>
                    {s.impactDelta && s.impactDelta.cost > 0 && (
                      <div style={{ marginBottom: '4px', fontSize: '0.58rem', padding: '2px 5px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--danger)' }}>+${s.impactDelta.cost.toLocaleString()}</span>
                        <span style={{ color: 'var(--warning)' }}>+{s.impactDelta.delayHours}hrs</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={10}/> {new Date(s.eta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>${s.cost.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationDashboard;
