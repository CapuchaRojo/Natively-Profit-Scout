import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Target,
  Factory,
  Plus,
  Globe,
  Download,
  Building2,
  Search,
  XCircle,
  Users,
  Wrench,
  Zap,
  FileText,
  FileSearch,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}
const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/pipeline', label: 'Pipeline Scout', icon: <Target size={18} /> },
  { path: '/new-analysis', label: 'New Analysis', icon: <Plus size={18} /> },
  { path: '/ai-factory', label: 'AI Factory Channel Sales', icon: <Factory size={18} /> },
  { path: '/public-intel', label: 'Public Intel', icon: <Globe size={18} /> },
  { path: '/crm-export', label: 'CRM Export', icon: <Download size={18} /> },
];
const companyNavItems: NavItem[] = [
  { path: '/company', label: 'Company Profile', icon: <Building2 size={18} /> },
  { path: '/auto-fill-recon', label: 'Auto-Fill Recon', icon: <Search size={18} /> },
  { path: '/pain-points', label: 'Pain Point Map', icon: <XCircle size={18} /> },
  { path: '/stakeholders', label: 'Stakeholder Map', icon: <Users size={18} /> },
  { path: '/tools', label: 'Tool & Workflow', icon: <Wrench size={18} /> },
  { path: '/opportunities', label: 'Opportunity Engine', icon: <Zap size={18} /> },
  { path: '/plan', label: 'Profit Builder', icon: <FileText size={18} /> },
  { path: '/partner-intel', label: 'Partner Intel Brief', icon: <FileSearch size={18} /> },
  { path: '/executive-summary', label: 'Executive Summary', icon: <ClipboardList size={18} /> },
  { path: '/export', label: 'Company Export', icon: <Download size={18} /> },
];

function LogoutButton() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div
      onClick={handleLogout}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        margin: '4px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
        color: '#64748b',
        borderTop: '1px solid #2a3a5c',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = '#ef4444';
        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = '#64748b';
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0 }}>
        <LogOut size={18} />
      </span>
      <span>Sign Out</span>
      {user && (
        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>
          {user.email?.split('@')[0]}
        </span>
      )}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const currentCompanyId = state.currentCompanyId;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/pipeline') return location.pathname === '/pipeline';
    if (path === '/new-analysis') return location.pathname === '/new-analysis';
    if (path === '/ai-factory') return location.pathname === '/ai-factory';
    if (path === '/public-intel') return location.pathname === '/public-intel';
    if (path === '/crm-export') return location.pathname === '/crm-export';
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
        {navItems.map((item) => (
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
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

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
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}

        {/* Settings */}
        <div style={{
          padding: '16px 16px 4px',
          fontSize: 10,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: 8,
        }}>
          System
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            margin: '0 8px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            color: isActive('/settings') ? '#3b82f6' : '#94a3b8',
            background: isActive('/settings') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            transition: 'all 0.15s',
          }}
          onClick={() => navigate('/settings')}
          onMouseEnter={(e) => {
            if (!isActive('/settings')) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
          }}
          onMouseLeave={(e) => {
            if (!isActive('/settings')) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0 }}><Settings size={18} /></span>
          <span>Settings</span>
        </div>
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

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
