import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-base flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card rounded-xl border border-border-subtle p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--status-error)]/10 flex items-center justify-center">
              <AlertTriangle size={32} className="text-[var(--status-error)]" />
            </div>

            <h1 className="text-title font-semibold text-foreground mb-2">
              Jokin meni pieleen
            </h1>

            <p className="text-body text-muted-foreground mb-6">
              Sovelluksessa tapahtui odottamaton virhe. Yritä ladata sivu uudelleen.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-caption text-tertiary cursor-pointer hover:text-muted-foreground">
                  Tekninen virheviesti
                </summary>
                <pre className="mt-2 p-3 bg-elevated rounded-lg text-caption text-muted-foreground overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-secondary"
              >
                Yritä uudelleen
              </button>
              <button
                onClick={this.handleReload}
                className="btn-primary"
              >
                <RefreshCw size={16} />
                Lataa sivu
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
