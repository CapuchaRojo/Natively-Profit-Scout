import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/new-analysis', label: 'New Analysis', icon: '➕' },
  { path: '/public-intel', label: 'Public Intel', icon: '🌐' },
];

const companyNavItems: NavItem[] = [
  { path: '/company', label: 'Company Profile', icon: '🏢' },
  { path: '/auto-fill-recon', label: 'Auto-Fill Recon', icon: '🔍' },
  { path: '/pain-points', label: 'Pain Point Map', icon: '❌' },
  { path: '/stakeholders', label: 'Stakeholder Map', icon: '👥' },
  { path: '/tools', label: 'Tool & Workflow', icon: '🔧' },
  { path: '/opportunities', label: 'Opportunity Engine', icon: '⚡' },
  { path: '/plan', label: 'Profit Builder', icon: '📋' },
  { path: '/export', label: 'CRM Export', icon: '📤' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const currentCompanyId = state.currentCompanyId;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/new-analysis') return location.pathname === '/new-analysis';
    if (path === '/settings') return location.pathname === '/settings';
    return false;
  };

  const isCompanyActive = (suffix: string) => {
    if (!currentCompanyId) return false;
    const fullPath = `/company/${currentCompanyId}${suffix}`;
    return location.pathname === fullPath;
  };

  const handleCompanyNav = (suffix: string) => {
    if (!currentCompanyId) {
      navigate('/');
      return;
    }
    navigate(`/company/${currentCompanyId}${suffix}`);
  };

  return (
    <div className="sidebar">
      {/* Brand */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid #2a3a5c',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'white',
          }}>
            S
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Profit Scout</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Natively AI</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ padding: '12px 0', flex: 1, overflowY: 'auto' }}>
        {navItems.map((item, i) => {
          if (item.icon === '') {
            return (
              <div key={i} style={{
                padding: '8px 16px 4px',
                fontSize: 10,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {item.label}
              </div>
            );
          }
          return (
            <div
              key={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                margin: '0 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                color: isActive(item.path) ? '#3b82f6' : '#94a3b8',
                background: isActive(item.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onClick={() => navigate(item.path)}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}

        {/* Company-specific nav */}
        <div style={{
          padding: '16px 16px 4px',
          fontSize: 10,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Company Pages
        </div>
        {companyNavItems.map((item) => {
          const suffix = item.path === '/company' ? '' : item.path;
          const active = isCompanyActive(suffix);
          return (
            <div
              key={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                margin: '0 8px',
                borderRadius: 6,
                cursor: currentCompanyId ? 'pointer' : 'not-allowed',
                fontSize: 13,
                color: active ? '#3b82f6' : currentCompanyId ? '#94a3b8' : '#4a5568',
                background: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                opacity: currentCompanyId ? 1 : 0.4,
                transition: 'all 0.15s',
              }}
              onClick={() => handleCompanyNav(suffix)}
              onMouseEnter={(e) => {
                if (currentCompanyId && !active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom status */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #2a3a5c',
        fontSize: 11,
        color: '#64748b',
      }}>
        {currentCompanyId ? (
          <span>Active: {state.companies.find(c => c.id === currentCompanyId)?.basic.name || 'Unknown'}</span>
        ) : (
          <span>No company selected</span>
        )}
      </div>
    </div>
  );
}
