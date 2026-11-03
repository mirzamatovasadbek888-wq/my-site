import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://klprkdfnxlswngldxelz.supabase.co'
const supabaseKey = 'sb_publishable_3JNxbGJCJH_K12UTZOTE6Q_ggdkH2wY'

export const supabase = createClient(supabaseUrl, supabaseKey)
