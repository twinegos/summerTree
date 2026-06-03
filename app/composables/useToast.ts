interface ToastState {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

export function useToast() {
  const toast = useState<ToastState>('toast', () => ({
    message: '',
    type: 'success',
    visible: false,
  }))

  let timer: ReturnType<typeof setTimeout> | null = null

  function show(message: string, type: 'success' | 'error') {
    if (timer) clearTimeout(timer)
    toast.value = { message, type, visible: true }
    timer = setTimeout(() => {
      toast.value.visible = false
    }, 3000)
  }

  function showSuccess(message: string) {
    show(message, 'success')
  }

  function showError(message: string) {
    show(message, 'error')
  }

  return { toast, showSuccess, showError }
}
