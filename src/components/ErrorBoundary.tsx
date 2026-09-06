import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logAppEvent } from '@/lib/appLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Wraps the whole app (outside BrowserRouter — see App.tsx) so a crash anywhere still logs and
 * shows a recoverable screen instead of a blank white page. No router hooks in the fallback: this
 * boundary sits above BrowserRouter, so useNavigate/Link aren't available here.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logAppEvent({
      level: 'error',
      eventType: 'react_error_boundary',
      message: error.message,
      metadata: { stack: error.stack, componentStack: info.componentStack },
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              We've logged the error. Refreshing the page usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
