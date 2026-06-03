import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

let client: ReturnType<typeof createClient<Database>> | null = null

export function useSupabase() {
  if (!client) {
    const config = useRuntimeConfig()
    client = createClient<Database>(
      config.public.supabaseUrl as string,
      config.public.supabaseKey as string
    )
  }
  return client
}
