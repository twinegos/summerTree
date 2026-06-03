import type { User } from '@supabase/supabase-js'

export function useSupabaseUser() {
  const user = useState<User | null>('supabase-user', () => null)

  // 클라이언트 사이드에서만 세션 복원 및 상태 변경 감지
  if (import.meta.client) {
    const supabase = useSupabase()

    // 초기 세션 복원 (한 번만 실행)
    supabase.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
    })

    // 인증 상태 변경 감지
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  return user
}
