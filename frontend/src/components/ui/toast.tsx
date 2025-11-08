import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive"
  onClose?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = "default", children, onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
          variant === "destructive"
            ? "border-red-500 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200"
            : "border bg-background text-foreground",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-2 top-2 rounded-sm p-1 opacity-0 transition-opacity hover:bg-opacity-20 focus:opacity-100 focus:outline-none group-hover:opacity-100",
            variant === "destructive"
              ? "text-red-500 hover:bg-red-500/20 focus:ring-red-500"
              : "text-foreground/50 hover:bg-foreground/10 focus:ring-foreground/20"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }
