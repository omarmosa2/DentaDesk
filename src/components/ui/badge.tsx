import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:shadow-lg dark:shadow-slate-800/20",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:shadow-lg dark:shadow-slate-800/20",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:shadow-lg dark:shadow-slate-800/20",
        success:
          "border-transparent bg-green-600 text-white shadow hover:bg-green-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:shadow-lg dark:shadow-slate-800/20",
        warning:
          "border-transparent bg-amber-600 text-white shadow hover:bg-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:shadow-lg dark:shadow-slate-800/20",
        info:
          "border-transparent bg-blue-600 text-white shadow hover:bg-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:shadow-lg dark:shadow-slate-800/20",
        outline:
          "text-foreground border-border hover:bg-accent hover:text-accent-foreground dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100",
        ghost:
          "border-transparent hover:bg-accent hover:text-accent-foreground dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
