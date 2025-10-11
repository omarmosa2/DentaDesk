import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyboardShortcut } from '@/components/ui/KeyboardShortcut'
import { Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useShortcutsHelp } from '@/hooks/useKeyboardShortcuts'

interface ShortcutsPanelProps {
  onClose?: () => void
  className?: string
}

export default function ShortcutsPanel({ onClose, className }: ShortcutsPanelProps) {
  // إخفاء لوحة الاختصارات تماماً
  return null
}
