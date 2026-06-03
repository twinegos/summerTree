const SESSION_KEY = 'summertree_session_id'

export function useSession() {
  const sessionId = ref('')

  function init() {
    if (!import.meta.client) return
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    sessionId.value = id
  }

  if (import.meta.client) {
    init()
  }

  return { sessionId }
}
