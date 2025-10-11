import React, { Component, ErrorInfo, ReactNode } from 'react'
import { safeString } from '@/utils/safeStringUtils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ReportsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error safely
    console.error('ReportsErrorBoundary caught an error:', {
      error: safeString(error),
      errorInfo: safeString(errorInfo),
      componentStack: safeString(errorInfo.componentStack)
    })

    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-lg font-semibold mb-4">
            خطأ في تحميل التقرير
          </div>
          <div className="text-red-500 text-sm mb-4 text-center">
            حدث خطأ أثناء تحميل هذا التقرير. يرجى المحاولة مرة أخرى.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            إعادة المحاولة
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 w-full">
              <summary className="cursor-pointer text-sm text-gray-600">
                تفاصيل الخطأ (للمطورين)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {safeString(this.state.error.message)}
                {'\n\n'}
                {safeString(this.state.error.stack)}
                {'\n\n'}
                Component Stack:
                {safeString(this.state.errorInfo?.componentStack)}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ReportsErrorBoundary
