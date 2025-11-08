import { useState, useCallback } from "react"
import { Toast } from "@/components/ui/toast"

type ToastType = "success" | "error" | "info" | "warning"

interface ToastState {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 5000) => {
      const id = Math.random().toString(36).substring(2, 9)
      
      setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }])
      
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
      
      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.type === "error" ? "destructive" : "default"}
          onClose={() => removeToast(toast.id)}
          className="w-full"
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {toast.type === "error" && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {toast.type === "warning" && (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            {toast.type === "info" && (
              <Info className="h-5 w-5 text-blue-500" />
            )}
            <span>{toast.message}</span>
          </div>
        </Toast>
      ))}
    </div>
  )

  return {
    showToast,
    removeToast,
    ToastContainer,
    success: (message: string, duration?: number) =>
      showToast(message, "success", duration),
    error: (message: string, duration?: number) =>
      showToast(message, "error", duration),
    info: (message: string, duration?: number) =>
      showToast(message, "info", duration),
    warning: (message: string, duration?: number) =>
      showToast(message, "warning", duration),
  }
}
