import { createClient } from '@supabase/supabase-js'

// supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// console.log('supabase url:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
