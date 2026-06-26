// ============================================================
// ErrorBoundary — catches render errors and shows fallback UI
// instead of an empty/black page when components crash.
// ============================================================
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught render error:', error.message);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          minHeight: 300,
          textAlign: 'center',
          background: '#1a2236',
          border: '1px solid #2a3a5c',
          borderRadius: 8,
          margin: 24,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, maxWidth: 500 }}>
            An unexpected error occurred while rendering this page.
          </p>
          <div style={{
            padding: '8px 16px',
            background: '#0f1525',
            borderRadius: 6,
            border: '1px solid #ef4444',
            marginBottom: 20,
            maxWidth: 600,
            textAlign: 'left',
          }}>
            <code style={{ fontSize: 11, color: '#ef4444', wordBreak: 'break-all' }}>
              {this.state.error?.message || 'Unknown error'}
            </code>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              🔄 Reload Page
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              🏠 Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}