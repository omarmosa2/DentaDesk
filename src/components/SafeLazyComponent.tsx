import React, { Suspense, ComponentType } from 'react'
import { safeString } from '@/utils/safeStringUtils'
import ReportsErrorBoundary from './ReportsErrorBoundary'
import PageLoading from './ui/PageLoading'

interface SafeLazyComponentProps {
  component: ComponentType<any>
  fallbackMessage?: string
  [key: string]: any
}

/**
 * Safe wrapper for lazy-loaded components that prevents primitive conversion errors
 */
const SafeLazyComponent: React.FC<SafeLazyComponentProps> = ({ 
  component: Component, 
  fallbackMessage = "جاري التحميل...",
  ...props 
}) => {
  return (
    <ReportsErrorBoundary>
      <Suspense fallback={<PageLoading message={fallbackMessage} />}>
        <Component {...props} />
      </Suspense>
    </ReportsErrorBoundary>
  )
}

export default SafeLazyComponent
