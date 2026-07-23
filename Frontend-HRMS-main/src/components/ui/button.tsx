import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          variant === 'default' && "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100",
          variant === 'destructive' && "bg-red-600 text-white hover:bg-red-700",
          variant === 'outline' && "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
          variant === 'secondary' && "bg-slate-100 text-slate-900 hover:bg-slate-200",
          variant === 'ghost' && "hover:bg-slate-100 text-slate-600",
          variant === 'link' && "text-indigo-600 underline-offset-4 hover:underline",
          size === 'default' && "h-10 px-4 py-2",
          size === 'sm' && "h-8 rounded-lg px-3",
          size === 'lg' && "h-11 px-8",
          size === 'icon' && "h-10 w-10",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
