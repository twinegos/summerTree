export function useAuth() {
  const supabase = useSupabase()
  const user = useSupabaseUser()
  const isLoading = ref(false)

  async function signIn(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    isLoading.value = true
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: '이메일 또는 비밀번호가 올바르지 않습니다' }
      }
      return { error: null }
    } catch {
      return { error: '연결에 문제가 발생했습니다. 다시 시도해주세요' }
    } finally {
      isLoading.value = false
    }
  }

  async function signOut(): Promise<void> {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
    } finally {
      isLoading.value = false
    }
  }

  return {
    user: readonly(user),
    isLoading,
    signIn,
    signOut,
  }
}
