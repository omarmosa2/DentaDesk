import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HelpCircle, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { hashPassword } from '../../utils/crypto'

interface SecurityQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  editMode?: boolean
}

// قائمة أسئلة الأمان المقترحة
const PREDEFINED_QUESTIONS = [
  'ما هو اسم أول مدرسة التحقت بها؟',
  'ما هو اسم حيوانك الأليف الأول؟',
  'في أي مدينة ولدت؟',
  'ما هو اسم أفضل صديق لك في الطفولة؟',
  'ما هو لقب والدتك؟',
  'ما هو اسم الشارع الذي نشأت فيه؟',
  'ما هو اسم مدرستك الثانوية؟',
  'ما هو طعامك المفضل؟',
  'ما هو اسم أول شركة عملت بها؟',
  'ما هو رقمك المفضل؟'
]

export default function SecurityQuestionDialog({
  open,
  onOpenChange,
  onSave,
  editMode = false
}: SecurityQuestionDialogProps) {
  const [questionType, setQuestionType] = useState<'predefined' | 'custom'>('predefined')
  const [selectedQuestion, setSelectedQuestion] = useState('')
  const [customQuestion, setCustomQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      loadCurrentSecurityQuestion()
      setQuestionType('predefined')
      setSelectedQuestion('')
      setCustomQuestion('')
      setAnswer('')
      setError('')
      setSuccess('')
    }
  }, [open])

  const loadCurrentSecurityQuestion = async () => {
    if (editMode) {
      try {
        const settings = await window.electronAPI.settings.get()
        if (settings?.security_question) {
          setCurrentQuestion(settings.security_question)
        }
      } catch (error) {
        console.error('Error loading current security question:', error)
      }
    }
  }

  const handleSave = async () => {
    const question = questionType === 'predefined' ? selectedQuestion : customQuestion

    if (!question.trim()) {
      setError('يرجى اختيار أو إدخال سؤال الأمان')
      return
    }

    if (!answer.trim()) {
      setError('يرجى إدخال إجابة سؤال الأمان')
      return
    }

    if (answer.trim().length < 2) {
      setError('إجابة سؤال الأمان يجب أن تكون حرفين على الأقل')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Hash the answer (convert to lowercase for consistency)
      const hashedAnswer = await hashPassword(answer.trim().toLowerCase())

      // Update settings with security question and answer
      await window.electronAPI.settings.update({
        security_question: question.trim(),
        security_answer: hashedAnswer
      })

      setSuccess(editMode ? 'تم تحديث سؤال الأمان بنجاح' : 'تم حفظ سؤال الأمان بنجاح')

      // Wait a moment then close dialog and notify parent
      setTimeout(() => {
        onSave()
        onOpenChange(false)
      }, 2000)

    } catch (error) {
      console.error('Error saving security question:', error)
      setError('حدث خطأ في حفظ سؤال الأمان')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setQuestionType('predefined')
    setSelectedQuestion('')
    setCustomQuestion('')
    setAnswer('')
    setError('')
    setSuccess('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Shield className="w-5 h-5 text-primary" />
            {editMode ? 'تحديث سؤال الأمان' : 'إعداد سؤال الأمان'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Question (Edit Mode) */}
          {editMode && currentQuestion && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    سؤال الأمان الحالي
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    {currentQuestion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertDescription>
              سؤال الأمان يُستخدم لاستعادة كلمة المرور في حالة نسيانها.
              اختر سؤالاً تتذكر إجابته بسهولة ولا يمكن للآخرين تخمينها.
            </AlertDescription>
          </Alert>

          {/* Question Type Selection */}
          <div className="space-y-3">
            <Label>نوع السؤال</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="radio"
                  name="questionType"
                  value="predefined"
                  checked={questionType === 'predefined'}
                  onChange={(e) => setQuestionType(e.target.value as 'predefined' | 'custom')}
                  className="text-primary"
                />
                <span>اختيار من القائمة</span>
              </label>
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="radio"
                  name="questionType"
                  value="custom"
                  checked={questionType === 'custom'}
                  onChange={(e) => setQuestionType(e.target.value as 'predefined' | 'custom')}
                  className="text-primary"
                />
                <span>سؤال مخصص</span>
              </label>
            </div>
          </div>

          {/* Predefined Question Selection */}
          {questionType === 'predefined' && (
            <div className="space-y-2">
              <Label htmlFor="predefinedQuestion">اختر سؤال الأمان</Label>
              <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر سؤالاً من القائمة" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_QUESTIONS.map((question, index) => (
                    <SelectItem key={index} value={question}>
                      {question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Question Input */}
          {questionType === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customQuestion">سؤال الأمان المخصص</Label>
              <Input
                id="customQuestion"
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="أدخل سؤال الأمان الخاص بك"
                className="text-right"
              />
            </div>
          )}

          {/* Answer Input */}
          <div className="space-y-2">
            <Label htmlFor="answer">إجابة سؤال الأمان</Label>
            <Input
              id="answer"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="أدخل إجابة سؤال الأمان"
              className="text-right"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="text-xs text-muted-foreground">
              ملاحظة: الإجابة حساسة لحالة الأحرف، تأكد من كتابتها بنفس الطريقة التي ستتذكرها بها
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {!success && (
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={isLoading || (!selectedQuestion && !customQuestion) || !answer}
                className="flex-1"
              >
                {isLoading ? 'جاري الحفظ...' : (editMode ? 'تحديث' : 'حفظ')}
              </Button>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                إلغاء
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
