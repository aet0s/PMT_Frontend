// client/src/components/shared/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /loading chunk/i.test(error?.message || '') ||
      /failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /error loading dynamically imported module/i.test(error?.message || '') ||
      /unexpected token '<'/i.test(error?.message || '');

    if (isChunkError && typeof window !== 'undefined' && window.sessionStorage) {
      const hasRetried = window.sessionStorage.getItem('eb_chunk_retry');
      if (!hasRetried) {
        window.sessionStorage.setItem('eb_chunk_retry', '1');
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('eb_chunk_retry');
    }
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-surface border border-border rounded-xl shadow-sm m-4">
          <div className="w-12 h-12 rounded-full bg-danger-tint text-danger-text flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary max-w-md mb-5">
            {this.state.error?.message || 'An unexpected error occurred while rendering this view.'}
          </p>
          <Button
            variant="primary"
            onClick={this.handleReset}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
