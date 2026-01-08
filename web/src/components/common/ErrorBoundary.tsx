import { Component, ErrorInfo, ReactNode } from 'react'
import Icon from './Icon'
import { logger } from '@/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child
 * component tree and display a fallback UI instead of crashing the whole app.
 *
 * Usage:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * With custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-background-panel rounded-lg border border-border">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <Icon name="AlertTriangle" className="w-8 h-8" />
            <h2 className="text-xl font-semibold">Something went wrong</h2>
          </div>

          <p className="text-text-muted text-center max-w-md mb-6">
            An unexpected error occurred. This has been logged and we'll look into it.
          </p>

          {this.state.error && (
            <details className="mb-6 w-full max-w-md">
              <summary className="cursor-pointer text-sm text-text-muted hover:text-text">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-background rounded border border-border text-xs text-red-400 overflow-x-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors flex items-center gap-2"
          >
            <Icon name="RefreshCw" className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap any component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`

  return WithErrorBoundary
}

export default ErrorBoundary
