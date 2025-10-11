import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  User,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Clock,
  X,
  Filter,
  ArrowRight
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { GlobalSearchService } from '@/services/globalSearchService'
import type { SearchResult, SearchCriteria } from '@/types'

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void
  onClose?: () => void
  autoFocus?: boolean
  placeholder?: string
}

export default function GlobalSearch({
  onResultSelect,
  onClose,
  autoFocus = true,
  placeholder = "🔍 ابحث في المرضى، المواعيد، الدفعات، العلاجات... (F)"
}: GlobalSearchProps) {
  const {
    globalSearchQuery,
    globalSearchResults,
    isSearching,
    searchHistory,
    setGlobalSearchQuery,
    performGlobalSearch,
    clearSearchResults,
    addToSearchHistory
  } = useGlobalStore()

  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [autoFocus])

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    // إضافة مستمع الحدث دائماً عندما يكون المكون مفتوحاً
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, []) // إزالة التبعية على showResults لتعمل دائماً

  // Handle search
  const handleSearch = async (query: string) => {
    setGlobalSearchQuery(query)

    if (query.trim().length > 0) {
      const criteria: SearchCriteria = {
        query: query.trim(),
        sortBy: 'relevance',
        sortOrder: 'desc',
        limit: 20
      }

      try {
        await performGlobalSearch(criteria)
        setShowResults(true)
        setSelectedIndex(-1)

        // Show search feedback
        console.log('🔍 Search performed:', query.trim())
        console.log('🔍 Search results:', globalSearchResults)
      } catch (error) {
        console.error('Search error:', error)
        // Show error message instead of demo results
        setShowResults(true)
      }
    } else {
      setShowResults(false)
      clearSearchResults()
    }
  }



  // Handle input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (globalSearchQuery) {
        handleSearch(globalSearchQuery)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [globalSearchQuery])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!globalSearchResults || !showResults) return

    const allResults = [
      ...globalSearchResults.patients,
      ...globalSearchResults.appointments,
      ...globalSearchResults.payments,
      ...globalSearchResults.treatments,
      ...globalSearchResults.prescriptions
    ]

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < allResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && allResults[selectedIndex]) {
          handleResultSelect(allResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        handleClose()
        break
    }
  }

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    addToSearchHistory(globalSearchQuery)
    onResultSelect?.(result)
    handleClose()
  }

  // Handle close
  const handleClose = () => {
    setShowResults(false)
    clearSearchResults()
    setGlobalSearchQuery('')
    onClose?.()
  }

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'patient': return <User className="w-4 h-4 text-blue-500" />
      case 'appointment': return <Calendar className="w-4 h-4 text-purple-500" />
      case 'payment': return <DollarSign className="w-4 h-4 text-green-500" />
      case 'treatment': return <Activity className="w-4 h-4 text-red-500" />
      case 'prescription': return <FileText className="w-4 h-4 text-orange-500" />
      default: return <Search className="w-4 h-4 text-gray-500" />
    }
  }

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'patient': return 'مريض'
      case 'appointment': return 'موعد'
      case 'payment': return 'دفعة'
      case 'treatment': return 'علاج'
      case 'prescription': return 'وصفة'
      default: return type
    }
  }

  // Render result item
  const renderResultItem = (result: SearchResult, index: number) => (
    <div
      key={result.id}
      className={`p-3 cursor-pointer border-r-2 transition-colors ${
        selectedIndex === index
          ? 'bg-accent border-r-primary'
          : 'hover:bg-muted border-r-transparent'
      }`}
      onClick={() => handleResultSelect(result)}
    >
      <div className="flex items-start gap-3" dir="rtl">
        {getResultIcon(result.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{result.title}</h4>
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(result.type)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{result.subtitle}</p>
          {result.description && (
            <p className="text-xs text-muted-foreground">{result.description}</p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )

  // Render results section
  const renderResultsSection = (title: string, results: SearchResult[], startIndex: number) => {
    if (results.length === 0) return null

    return (
      <div>
        <div className="px-3 py-2 bg-muted/50">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title} ({results.length})
          </h3>
        </div>
        {results.map((result, index) =>
          renderResultItem(result, startIndex + index)
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={searchInputRef}
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-10 pl-10 h-12 text-base"
          dir="rtl"
        />
        {globalSearchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        {isSearching && (
          <div className="absolute left-10 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && globalSearchResults && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-hidden shadow-lg z-50">
          <CardContent className="p-0">
            {globalSearchResults.totalCount > 0 ? (
              <div ref={resultsRef} className="max-h-96 overflow-y-auto">
                {/* Results Header */}
                <div className="px-3 py-2 bg-primary/5 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {globalSearchResults.totalCount} نتيجة في {globalSearchResults.searchTime}ms
                    </span>
                    <span className="text-muted-foreground">
                      "{globalSearchResults.query}"
                    </span>
                  </div>
                </div>

                {/* Results Sections */}
                {renderResultsSection(
                  'المرضى',
                  globalSearchResults.patients,
                  0
                )}

                {globalSearchResults.patients.length > 0 && globalSearchResults.appointments.length > 0 && (
                  <Separator />
                )}

                {renderResultsSection(
                  'المواعيد',
                  globalSearchResults.appointments,
                  globalSearchResults.patients.length
                )}

                {(globalSearchResults.patients.length > 0 || globalSearchResults.appointments.length > 0) &&
                 globalSearchResults.payments.length > 0 && (
                  <Separator />
                )}

                {renderResultsSection(
                  'الدفعات',
                  globalSearchResults.payments,
                  globalSearchResults.patients.length + globalSearchResults.appointments.length
                )}

                {(globalSearchResults.patients.length > 0 || globalSearchResults.appointments.length > 0 || globalSearchResults.payments.length > 0) &&
                 globalSearchResults.treatments.length > 0 && (
                  <Separator />
                )}

                {renderResultsSection(
                  'العلاجات',
                  globalSearchResults.treatments,
                  globalSearchResults.patients.length + globalSearchResults.appointments.length + globalSearchResults.payments.length
                )}

                {(globalSearchResults.patients.length > 0 || globalSearchResults.appointments.length > 0 || globalSearchResults.payments.length > 0 || globalSearchResults.treatments.length > 0) &&
                 globalSearchResults.prescriptions.length > 0 && (
                  <Separator />
                )}

                {renderResultsSection(
                  'الوصفات',
                  globalSearchResults.prescriptions,
                  globalSearchResults.patients.length + globalSearchResults.appointments.length + globalSearchResults.payments.length + globalSearchResults.treatments.length
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد نتائج للبحث "{globalSearchQuery}"</p>
                {searchHistory.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs mb-2">عمليات البحث الأخيرة:</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {searchHistory.slice(0, 5).map((query, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => setGlobalSearchQuery(query)}
                        >
                          {query}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
