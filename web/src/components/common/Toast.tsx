import { useEffect } from 'react'
import Icon from './Icon'
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'turn'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random()}`
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    // Auto-remove after duration (default 5s)
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearAll: () => set({ toasts: [] }),
}))

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  readonly toast: Toast
  readonly onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    // Request notification permission on mount (for browser notifications)
    if (toast.type === 'turn' && 'Notification' in window) {
      Notification.requestPermission()
    }
  }, [toast.type])

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500/90 text-white border-green-600'
      case 'error':
        return 'bg-red-500/90 text-white border-red-600'
      case 'warning':
        return 'bg-amber-500/90 text-white border-amber-600'
      case 'info':
        return 'bg-blue-500/90 text-white border-blue-600'
      case 'turn':
        return 'bg-primary/95 text-white border-primary shadow-2xl shadow-primary/50 ring-2 ring-primary/50'
      default:
        return 'bg-background-panel text-text border-border'
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Icon name="Check" className="w-5 h-5" />
      case 'error':
        return <Icon name="X" className="w-5 h-5" />
      case 'warning':
        return <Icon name="AlertTriangle" className="w-5 h-5" />
      case 'info':
        return <Icon name="Info" className="w-5 h-5" />
      case 'turn':
        return <Icon name="Swords" className="w-5 h-5" />
      default:
        return null
    }
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm min-w-[320px] max-w-md shadow-lg animate-slide-in-right ${getToastStyles()}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              onClose()
            }}
            className="mt-2 text-sm font-semibold underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <Icon name="X" className="w-4 h-4" />
      </button>
    </div>
  )
}

// Helper function to show toast notifications
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'error', duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'warning', duration }),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'info', duration }),
  turn: (message: string, action?: { label: string; onClick: () => void }) =>
    useToastStore.getState().addToast({
      message,
      type: 'turn',
      duration: 8000, // Show turn notifications longer
      action,
    }),
}
