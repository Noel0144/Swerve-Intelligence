import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Zap, RefreshCw, ShieldAlert, CheckCircle,
  Navigation2, Clock, DollarSign, ChevronDown, ChevronUp, Key, X
} from 'lucide-react';

import { analyzeTacticalIncident } from '../../services/tacticalAiService';

interface ShipmentRecommendation {
  shipmentId: string;
  origin: string;
  destination: string;
  currentProgress: number;
  riskExposure: string;
  recommendedAction: string;
  alternativeRoute: string;
  estimatedExtraCostPercent: number;
  estimatedExtraDelayDays: number;
  urgency: 'IMMEDIATE' | 'MONITOR' | 'LOW';
}

interface GeminiAnalysis {
  overallSummary: string;
  disruptionClassification: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedShipments: ShipmentRecommendation[];
  unaffectedShipments: string[];
  suggestedSystemDisruption?: {
    name: string; lat: number; lng: number; radius: number;
    riskType: string; riskScore: number;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  analysis?: GeminiAnalysis;
  shipmentCount?: number;
  timestamp: number;
  isError?: boolean;
}

const SEVERITY_CONFIG = {
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',     label: 'LOW' },
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',    label: 'MEDIUM' },
  HIGH:     { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',     label: 'HIGH' },
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)',     label: 'CRITICAL' },
} as const;

const URGENCY_CONFIG = {
  IMMEDIATE: { color: '#ef4444', icon: '🔴' },
  MONITOR:   { color: '#f59e0b', icon: '🟡' },
  LOW:       { color: '#22c55e', icon: '🟢' },
} as const;

interface Props {
  apiKey?: string;
}

export const TacticalCommandCenter: React.FC<Props> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await analyzeTacticalIncident(msg);

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.analysis.overallSummary,
        analysis: data.analysis,
        shipmentCount: data.shipmentCount,
        timestamp: Date.now(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Analysis failed: ${err.message}`,
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnalysis = (analysis: GeminiAnalysis, shipmentCount: number) => {
    const sev = SEVERITY_CONFIG[analysis.severityLevel] || SEVERITY_CONFIG.MEDIUM;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: sev.bg, color: sev.color, fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>
            {sev.label} SEVERITY
          </span>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: 10, fontWeight: 700 }}>
            {analysis.disruptionClassification}
          </span>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: 10 }}>
            {shipmentCount} shipments scanned
          </span>
        </div>

        {/* Affected Shipments */}
        {analysis.affectedShipments?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {analysis.affectedShipments.length} Shipment{analysis.affectedShipments.length > 1 ? 's' : ''} Affected
            </div>
            {analysis.affectedShipments.map((s, i) => {
              const urg = URGENCY_CONFIG[s.urgency] || URGENCY_CONFIG.MONITOR;
              const cardKey = `${s.shipmentId}-${i}`;
              const isOpen = expandedCards.has(cardKey);
              return (
                <div key={cardKey} style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${urg.color}40`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* Card Header */}
                  <button
                    onClick={() => toggleCard(cardKey)}
                    style={{ width: '100%', background: 'transparent', border: 'none', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 12 }}>{urg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                        #{s.shipmentId} — {s.origin} → {s.destination}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {s.currentProgress}% complete · {s.urgency}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
                  </button>

                  {/* Expanded Detail */}
                  {isOpen && (
                    <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 10, color: '#f87171', lineHeight: 1.5, padding: '8px 10px', background: 'rgba(239,68,68,0.06)', borderRadius: 6 }}>
                        <strong>Risk:</strong> {s.riskExposure}
                      </div>
                      <div style={{ fontSize: 10, color: '#6ee7b7', lineHeight: 1.5, padding: '8px 10px', background: 'rgba(34,197,94,0.06)', borderRadius: 6 }}>
                        <strong>Action:</strong> {s.recommendedAction}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        <Navigation2 size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {s.alternativeRoute}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(245,158,11,0.06)', borderRadius: 6, fontSize: 10, color: '#fbbf24', textAlign: 'center' }}>
                          <DollarSign size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                          +{s.estimatedExtraCostPercent}% cost
                        </div>
                        <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(139,92,246,0.06)', borderRadius: 6, fontSize: 10, color: '#a78bfa', textAlign: 'center' }}>
                          <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                          +{s.estimatedExtraDelayDays}d delay
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unaffected */}
        {analysis.unaffectedShipments?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#22c55e', padding: '6px 10px', background: 'rgba(34,197,94,0.05)', borderRadius: 6 }}>
            <CheckCircle size={11} />
            {analysis.unaffectedShipments.length} shipment{analysis.unaffectedShipments.length > 1 ? 's' : ''} unaffected — proceed normally
          </div>
        )}

        {/* System Disruption registered */}
        {analysis.suggestedSystemDisruption && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#f87171', padding: '6px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: 6 }}>
            <ShieldAlert size={11} />
            Disruption zone auto-registered: <strong>{analysis.suggestedSystemDisruption.name}</strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.2)' }}>
        <Zap size={16} color="var(--accent-cyan)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>Tactical AI Command</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>Powered by Gemini 3 Flash · Real-time shipment intelligence</div>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '30px 20px' }}>
            <ShieldAlert size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Awaiting incident report</div>
            <div style={{ fontSize: 10, lineHeight: 1.6, maxWidth: 240, margin: '0 auto' }}>
              Describe any disruption in natural language. The system will scan all active shipments and recommend precise rerouting actions.
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 4 }}>
              {msg.role === 'user' ? 'YOU' : 'GEMINI TACTICAL'} · {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
            <div style={{
              maxWidth: '95%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user' ? 'rgba(99,102,241,0.15)' : msg.isError ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user' ? '1px solid rgba(99,102,241,0.25)' : msg.isError ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border-dim)',
              fontSize: 12,
              lineHeight: 1.6,
              color: msg.isError ? '#fca5a5' : '#e2e8f0',
            }}>
              {msg.text}
              {msg.analysis && renderAnalysis(msg.analysis, msg.shipmentCount || 0)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 12, alignSelf: 'flex-start' }}>
            <RefreshCw size={13} color="var(--accent-cyan)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gemini scanning {' '}<strong style={{ color: 'var(--accent-cyan)' }}>all live shipments</strong>…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '10px 14px', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Report a disruption in plain English (AI Ready)..."
          style={{
            flex: 1, padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-bright)',
            borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: '10px 14px', background: 'var(--accent-primary)', color: '#fff',
            border: 'none', borderRadius: 10, cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
            opacity: (isLoading || !input.trim()) ? 0.5 : 1,
          }}
        >
          {isLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </form>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
