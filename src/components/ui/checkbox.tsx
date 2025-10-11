import * as React from "react"
import { Check } from "lucide-react"

interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className = "", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`
            w-5 h-5 border-2 rounded-md cursor-pointer transition-all duration-200 shadow-sm
            ${checked
              ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 dark:bg-blue-600 dark:border-blue-600'
              : 'bg-white border-gray-400 hover:border-blue-400 hover:shadow-md dark:bg-gray-800 dark:border-gray-600 dark:hover:border-blue-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            flex items-center justify-center
            ${className}
          `}
          onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
        >
          {checked && <Check className="w-4 h-4 text-white font-bold" />}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }
