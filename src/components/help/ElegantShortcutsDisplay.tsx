import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Keyboard,
  ChevronDown,
  ChevronUp,
  Settings,
  Users,
  Calendar,
  DollarSign,
  RefreshCw,
  Search,
  X,
  FlaskConical,
  FileText,
  BarChart3,
  Home,
  Plus,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

interface ShortcutItem {
  key: string
  arabicKey: string
  description: string
  icon: React.ReactNode
  category: string
}

const shortcuts: ShortcutItem[] = [
  // التنقل
  { key: '0', arabicKey: '٠', description: 'لوحة التحكم', icon: <Home className="w-4 h-4" />, category: 'تنقل' },
  { key: '1', arabicKey: '١', description: 'المرضى', icon: <Users className="w-4 h-4" />, category: 'تنقل' },
  { key: '2', arabicKey: '٢', description: 'المواعيد', icon: <Calendar className="w-4 h-4" />, category: 'تنقل' },
  { key: '3', arabicKey: '٣', description: 'المدفوعات', icon: <DollarSign className="w-4 h-4" />, category: 'تنقل' },
  { key: '4', arabicKey: '٤', description: 'المختبرات', icon: <FlaskConical className="w-4 h-4" />, category: 'تنقل' },
  { key: '5', arabicKey: '٥', description: 'العلاجات السنية', icon: <Zap className="w-4 h-4" />, category: 'تنقل' },
  { key: '6', arabicKey: '٦', description: 'مصروفات العيادة', icon: <FileText className="w-4 h-4" />, category: 'تنقل' },
  { key: '7', arabicKey: '٧', description: 'التقارير', icon: <BarChart3 className="w-4 h-4" />, category: 'تنقل' },
  { key: '8', arabicKey: '٨', description: 'الإعدادات', icon: <Settings className="w-4 h-4" />, category: 'تنقل' },

  // الإجراءات
  { key: 'A', arabicKey: 'ش', description: 'إضافة مريض جديد', icon: <Plus className="w-4 h-4" />, category: 'إجراءات' },
  { key: 'S', arabicKey: 'س', description: 'إضافة موعد جديد', icon: <Plus className="w-4 h-4" />, category: 'إجراءات' },
  { key: 'D', arabicKey: 'ي', description: 'إضافة دفعة جديدة', icon: <Plus className="w-4 h-4" />, category: 'إجراءات' },

  // العمليات
  { key: 'F1', arabicKey: 'F1', description: 'فتح الإعدادات', icon: <Settings className="w-4 h-4" />, category: 'عمليات' },
  { key: 'R', arabicKey: 'ق', description: 'تحديث الصفحة', icon: <RefreshCw className="w-4 h-4" />, category: 'عمليات' },
  { key: 'F', arabicKey: 'ب', description: 'فتح البحث', icon: <Search className="w-4 h-4" />, category: 'عمليات' },
  { key: 'ESC', arabicKey: 'ESC', description: 'إغلاق النوافذ', icon: <X className="w-4 h-4" />, category: 'عمليات' },
]

interface ElegantShortcutsDisplayProps {
  className?: string
  compact?: boolean
}

export default function ElegantShortcutsDisplay({ className, compact = false }: ElegantShortcutsDisplayProps) {
  const { isDarkMode } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(shortcuts.map(s => s.category)))
  const filteredShortcuts = selectedCategory
    ? shortcuts.filter(s => s.category === selectedCategory)
    : shortcuts

  if (compact) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Card className={cn(
          "shadow-xl border backdrop-blur-sm",
          isDarkMode
            ? "border-border/30 bg-gradient-to-br from-background/90 to-muted/90 shadow-2xl shadow-black/30"
            : "border-border/50 bg-gradient-to-br from-background/95 to-muted/95 shadow-lg"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md",
                  isDarkMode ? "bg-primary/20" : "bg-primary/10"
                )}>
                  <Keyboard className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  اختصارات سريعة
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "h-7 w-7 p-0 rounded-md transition-all duration-200",
                  isDarkMode
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {/* Category Filter */}
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="h-7 text-xs px-3 rounded-full transition-all duration-200 hover:scale-105"
                  >
                    الكل
                  </Button>
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="h-7 text-xs px-3 rounded-full transition-all duration-200 hover:scale-105"
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {/* Shortcuts List */}
                <div className="space-y-1.5">
                  {filteredShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-card/50 border border-border/30 hover:bg-card/80 hover:border-border/60 transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-md bg-muted/50">
                          {shortcut.icon}
                        </div>
                        <span className="text-xs text-foreground font-medium">
                          {shortcut.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-mono font-semibold"
                        >
                          {shortcut.key}
                        </Badge>
                        {shortcut.arabicKey !== shortcut.key && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 font-mono font-semibold"
                          >
                            {shortcut.arabicKey}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Full display version
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
          <Keyboard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-2xl text-foreground dark:text-white">اختصارات لوحة المفاتيح</h3>
          <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
            تعرف على جميع اختصارات لوحة المفاتيح المتاحة لتسريع عملك
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {categories.map((category, categoryIndex) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary to-primary/70 shadow-lg"></div>
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary/40 animate-pulse"></div>
              </div>
              <h4 className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/80 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
                {category}
              </h4>
            </div>
            <div className="space-y-3">
              {shortcuts.filter(s => s.category === category).map((shortcut, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 dark:from-gray-800/50 dark:to-gray-800/30 border border-border/40 dark:border-gray-700/40 hover:from-card/80 hover:to-card/60 dark:hover:from-gray-800/80 dark:hover:to-gray-800/60 hover:border-border/60 dark:hover:border-gray-700/60 hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 group-hover:from-primary/20 group-hover:to-primary/10 dark:group-hover:from-primary/30 dark:group-hover:to-primary/20 transition-all duration-300">
                      {shortcut.icon}
                    </div>
                    <span className="text-sm font-semibold text-foreground dark:text-white group-hover:text-primary dark:group-hover:text-primary/90 transition-colors duration-300">
                      {shortcut.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 text-primary border-primary/30 dark:border-primary/40 font-mono font-bold shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300"
                    >
                      {shortcut.key}
                    </Badge>
                    {shortcut.arabicKey !== shortcut.key && (
                      <Badge
                        variant="outline"
                        className="text-xs px-3 py-1.5 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 font-mono font-bold shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300"
                      >
                        {shortcut.arabicKey}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
